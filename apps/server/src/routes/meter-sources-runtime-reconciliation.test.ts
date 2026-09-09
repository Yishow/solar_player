import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import Database from "better-sqlite3";
import Fastify from "fastify";
import type { MeterSourceDefinition } from "@solar-display/shared";
import type { MqttClient } from "mqtt";
import { MqttClientService } from "../mqtt/MqttClientService.js";
import { migrateScopedMetricIdentity } from "../db/scopedMetricMigration.js";
import { createManagementAccessControl } from "../plugins/managementAuth.js";
import meterSourcesRoute from "./meter-sources.js";

const managementHeaders = { "x-solar-management-token": "secret" };
const remoteAddress = "198.51.100.2";
const silentLogger = { debug: () => undefined, error: () => undefined, info: () => undefined, warn: () => undefined };

class FakeMqttClient extends EventEmitter {
  connected = true;
  autoAcknowledge = true;
  subscribeError: Error | null = null;
  subscribeRequests: string[][] = [];
  unsubscribeRequests: string[][] = [];
  pendingSubscribeCallbacks: Array<(error?: Error | null) => void> = [];
  readonly subscriptionChecks: Array<{ enabled: number | undefined; topics: string[] }> = [];

  constructor(private readonly database: Database.Database) {
    super();
  }

  subscribe(topics: string[], callback: (error?: Error | null) => void) {
    const enabled = (this.database.prepare(
      "SELECT enabled FROM topic_mappings WHERE metric_scope = 'kn' AND metric_key = 'directRuntimeEnergy'"
    ).get() as { enabled: number } | undefined)?.enabled;
    this.subscribeRequests.push([...topics]);
    this.subscriptionChecks.push({ enabled, topics: [...topics] });
    if (this.autoAcknowledge) {
      queueMicrotask(() => callback(this.subscribeError));
    } else {
      this.pendingSubscribeCallbacks.push(callback);
    }
    return this;
  }

  acknowledgeSubscribe(index = 0, error = this.subscribeError) {
    const callback = this.pendingSubscribeCallbacks.splice(index, 1)[0];
    assert.ok(callback, "the fake broker must have a pending subscribe callback");
    callback(error);
  }

  unsubscribe(topics: string[], callback: (error?: Error | null) => void) {
    this.unsubscribeRequests.push([...topics]);
    queueMicrotask(() => callback(null));
    return this;
  }

  publish(
    _topic: string,
    _payload: string,
    _options: unknown,
    callback?: (error?: Error | null) => void
  ) {
    queueMicrotask(() => callback?.(null));
    return this;
  }

  end(_force: boolean, _options: Record<string, never>, callback: () => void) {
    callback();
    return this;
  }
}

function migratedDatabase() {
  const database = new Database(":memory:");
  for (const file of readdirSync("src/db/migrations").filter((file) => file.endsWith(".sql")).sort()) {
    if (file === "035_scoped_metric_identity.sql") {
      migrateScopedMetricIdentity(database, { legacySiteScope: "cl" });
    } else {
      database.exec(readFileSync(`src/db/migrations/${file}`, "utf8"));
    }
  }
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare(`
    INSERT INTO mqtt_settings (
      broker_host, broker_port, username, password, client_id,
      reconnect_interval, message_timeout, data_mode
    ) VALUES ('fake-broker', 1883, 'user', 'secret', 'runtime-test', 0, 1, 'mqtt')
  `).run();
  return database;
}

function runtimeSource(overrides: Partial<MeterSourceDefinition> = {}): MeterSourceDefinition {
  return {
    channelId: "kn-direct",
    meterId: "kn-direct",
    metricKey: "directRuntimeEnergy",
    metricScope: "kn",
    enabled: false,
    reviewStatus: "reviewed",
    measurementKind: "cumulative-energy",
    energyFlowRole: "consumption",
    inputUnit: "kWh",
    scaleDecimal: "1",
    sourceRevision: 1,
    epochId: "direct-one",
    expectedCadenceSeconds: 60,
    sourceTimestampTimeZone: null,
    timestampPolicy: "source-required",
    ...overrides
  };
}

function insertMapping(database: Database.Database, source: MeterSourceDefinition, topic: string, enabled: boolean) {
  database.prepare(`
    INSERT INTO topic_mappings (
      metric_scope, metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled
    ) VALUES (?, ?, ?, ?, NULL, 1, 0, 2, ?)
  `).run(source.metricScope, source.metricKey, topic, source.inputUnit, enabled ? 1 : 0);
}

async function waitForSubscribeRequest(client: FakeMqttClient, count: number) {
  for (let attempts = 0; attempts < 20 && client.subscribeRequests.length < count; attempts += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

async function buildRuntime(options: {
  managedSourceAdapters?: Array<{ subscriptionFilters: readonly string[]; handleMessage: () => void }>;
  source?: MeterSourceDefinition;
  mappingEnabled?: boolean;
  mappingTopic?: string;
  withMapping?: boolean;
} = {}) {
  const database = migratedDatabase();
  const source = options.source ?? runtimeSource();
  if (options.withMapping !== false) {
    insertMapping(database, source, options.mappingTopic ?? "direct/runtime", options.mappingEnabled ?? false);
  }
  const client = new FakeMqttClient(database);
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: silentLogger,
    managedSourceAdapters: options.managedSourceAdapters ?? []
  });
  const app = Fastify({ logger: false });
  app.decorate("managementAccess", createManagementAccessControl({ managementAccessToken: "secret", trustedOrigins: [] }));
  app.decorate("mqttClientService", service);
  await app.register(meterSourcesRoute, { database });
  return { app, client, database, service, source };
}

async function createSource(
  app: Awaited<ReturnType<typeof buildRuntime>>["app"],
  source: MeterSourceDefinition,
  reason = "register"
) {
  return app.inject({
    method: "POST",
    url: "/api/data-hub/sites/kn/meter-sources",
    headers: managementHeaders,
    remoteAddress,
    payload: { source, reason }
  });
}

async function updateSource(
  app: Awaited<ReturnType<typeof buildRuntime>>["app"],
  source: MeterSourceDefinition,
  reason = "update"
) {
  return app.inject({
    method: "PUT",
    url: `/api/data-hub/sites/kn/meter-sources/${source.channelId}`,
    headers: managementHeaders,
    remoteAddress,
    payload: { source, reason }
  });
}

test("direct enable reconciles after commit and delivers the next production packet", async () => {
  const runtime = await buildRuntime();
  const { app, client, database, service, source } = runtime;
  try {
    const created = await createSource(app, source);
    assert.equal(created.statusCode, 201, created.body);
    await service.connect();
    assert.equal(client.subscribeRequests.length, 0, "disabled startup must not subscribe to the generic topic");

    const enabled = await updateSource(app, { ...source, enabled: true });
    assert.equal(enabled.statusCode, 200, enabled.body);
    assert.equal(enabled.json().source.enabled, true);
    assert.equal(client.subscriptionChecks.at(-1)?.enabled, 1, "the database commit must precede subscribe");
    assert.equal(client.subscribeRequests.some((topics) => topics.includes("direct/runtime")), true);

    client.emit(
      "message",
      "direct/runtime",
      Buffer.from(JSON.stringify({ sourceTimestamp: "2026-09-09T01:00:00Z", value: 12.5 })),
      { dup: false, qos: 0, retain: false }
    );
    await new Promise((resolve) => setImmediate(resolve));
    const accepted = database.prepare(`
      SELECT normalized_value_kwh FROM meter_readings_accepted
      WHERE metric_scope = 'kn' AND meter_id = ? AND channel_id = ?
    `).all(source.meterId, source.channelId) as Array<{ normalized_value_kwh: string }>;
    assert.deepEqual(accepted, [{ normalized_value_kwh: "12.5" }]);
  } finally {
    await service.disconnect();
    await app.close();
    database.close();
  }
});

test("broker refusal preserves the saved source, logs safely, and retries without a new revision", async () => {
  const runtime = await buildRuntime();
  const { app, client, database, service, source } = runtime;
  const warnings: unknown[][] = [];
  const originalWarn = app.log.warn;
  app.log.warn = ((...args: unknown[]) => { warnings.push(args); }) as typeof app.log.warn;
  try {
    const created = await createSource(app, source);
    assert.equal(created.statusCode, 201, created.body);
    await service.connect();
    client.subscribeError = Object.assign(new Error("password=secret raw payload"), {
      code: "BROKER_CREDENTIALS_SHOULD_NOT_LEAK"
    });

    const refused = await updateSource(app, { ...source, enabled: true });
    assert.equal(refused.statusCode, 200, refused.body);
    assert.equal(refused.json().source.enabled, true);
    assert.deepEqual(
      database.prepare("SELECT source_revision, epoch_id, enabled FROM meter_sources WHERE channel_id = ?")
        .get(source.channelId),
      { source_revision: 1, epoch_id: source.epochId, enabled: 1 }
    );
    assert.equal(service.getActiveTopics().includes("direct/runtime"), false);
    assert.equal(warnings.length, 1);
    const warningText = JSON.stringify(warnings);
    assert.doesNotMatch(warningText, /secret|raw payload|BROKER_CREDENTIALS_SHOULD_NOT_LEAK/);

    client.subscribeError = null;
    const retried = await updateSource(app, { ...source, enabled: true }, "retry");
    assert.equal(retried.statusCode, 200, retried.body);
    assert.equal(service.getActiveTopics().includes("direct/runtime"), true);
    assert.deepEqual(
      database.prepare("SELECT source_revision, epoch_id, enabled FROM meter_sources WHERE channel_id = ?")
        .get(source.channelId),
      { source_revision: 1, epoch_id: source.epochId, enabled: 1 }
    );
  } finally {
    app.log.warn = originalWarn;
    await service.disconnect();
    await app.close();
    database.close();
  }
});

test("direct source reconciliation retains managed filters and the last shared-topic owner", async () => {
  const runtime = await buildRuntime({
    managedSourceAdapters: [{ subscriptionFilters: ["managed/runtime/+"], handleMessage: () => undefined }]
  });
  const { app, client, database, service, source } = runtime;
  try {
    const second = runtimeSource({ channelId: "cl-direct", meterId: "cl-direct", metricScope: "cl", metricKey: "clDirectEnergy", epochId: "cl-one" });
    database.prepare(`
      INSERT INTO topic_mappings (
        metric_scope, metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled
      ) VALUES ('cl', ?, 'direct/runtime', 'kWh', NULL, 1, 0, 2, 0)
    `).run(second.metricKey);

    assert.equal((await createSource(app, source)).statusCode, 201);
    const clCreated = await app.inject({
      method: "POST", url: "/api/data-hub/sites/cl/meter-sources", headers: managementHeaders, remoteAddress,
      payload: { source: second, reason: "register" }
    });
    assert.equal(clCreated.statusCode, 201, clCreated.body);
    await service.connect();
    const enabledFirst = await updateSource(app, { ...source, enabled: true });
    assert.equal(enabledFirst.statusCode, 200, enabledFirst.body);
    const enabledSecond = await app.inject({
      method: "PUT", url: "/api/data-hub/sites/cl/meter-sources/cl-direct", headers: managementHeaders, remoteAddress,
      payload: { source: { ...second, enabled: true }, reason: "enable" }
    });
    assert.equal(enabledSecond.statusCode, 200, enabledSecond.body);
    assert.ok(service.getActiveTopics().includes("managed/runtime/+"));
    assert.ok(service.getActiveTopics().includes("direct/runtime"));

    const disabledFirst = await app.inject({
      method: "DELETE", url: "/api/data-hub/sites/kn/meter-sources/kn-direct", headers: managementHeaders, remoteAddress,
      payload: { expectedRevision: 1, reason: "disable" }
    });
    assert.equal(disabledFirst.statusCode, 200, disabledFirst.body);
    assert.ok(service.getActiveTopics().includes("direct/runtime"), "the cross-scope owner keeps the shared topic");
    assert.ok(service.getActiveTopics().includes("managed/runtime/+"), "managed filters are not removed by generic reconciliation");

    const disabledSecond = await app.inject({
      method: "DELETE", url: "/api/data-hub/sites/cl/meter-sources/cl-direct", headers: managementHeaders, remoteAddress,
      payload: { expectedRevision: 1, reason: "disable" }
    });
    assert.equal(disabledSecond.statusCode, 200, disabledSecond.body);
    assert.equal(service.getActiveTopics().includes("direct/runtime"), false, "the last generic owner removes the topic");
    assert.ok(service.getActiveTopics().includes("managed/runtime/+"));
  } finally {
    await service.disconnect();
    await app.close();
    database.close();
  }
});

test("a disconnected direct write updates desired state and reconnect restores the topic", async () => {
  const runtime = await buildRuntime();
  const { app, client, database, service, source } = runtime;
  try {
    assert.equal((await createSource(app, source)).statusCode, 201);
    const enabled = await updateSource(app, { ...source, enabled: true });
    assert.equal(enabled.statusCode, 200, enabled.body);
    assert.equal(service.getStatus().connected, false);
    assert.equal(service.getActiveTopics().includes("direct/runtime"), false);
    assert.equal(
      (service as unknown as { desiredTopics: Set<string> }).desiredTopics.has("direct/runtime"),
      true,
      "a disconnected write must still update the runtime desired set"
    );
    assert.equal(client.subscribeRequests.length, 0);

    await service.connect();
    assert.ok(service.getActiveTopics().includes("direct/runtime"));
  } finally {
    await service.disconnect();
    await app.close();
    database.close();
  }
});

test("a source without a mapping does not invent a topic during reconciliation", async () => {
  const source = runtimeSource({ enabled: true, metricKey: "sourceWithoutMapping" });
  const runtime = await buildRuntime({ source, withMapping: false });
  const { app, client, database, service } = runtime;
  try {
    const created = await createSource(app, source);
    assert.equal(created.statusCode, 201, created.body);
    await service.connect();
    assert.equal(service.getActiveTopics().includes("direct/runtime"), false);
    assert.equal(client.subscribeRequests.length, 0);
  } finally {
    await service.disconnect();
    await app.close();
    database.close();
  }
});

test("serialized direct writes converge after controlled broker callbacks", async () => {
  const runtime = await buildRuntime();
  const { app, client, database, service, source } = runtime;
  const second = runtimeSource({
    channelId: "kn-direct-second",
    meterId: "kn-direct-second",
    metricKey: "directRuntimeEnergySecond",
    epochId: "direct-second"
  });
  insertMapping(database, second, "direct/second", false);
  try {
    assert.equal((await createSource(app, source)).statusCode, 201);
    const createdSecond = await createSource(app, second);
    assert.equal(createdSecond.statusCode, 201, createdSecond.body);
    await service.connect();
    client.autoAcknowledge = false;

    const firstWrite = updateSource(app, { ...source, enabled: true });
    const secondWrite = updateSource(app, { ...second, enabled: true });
    await waitForSubscribeRequest(client, 1);
    assert.equal(client.subscribeRequests.length, 1, "the runtime owner must serialize reconciliation callbacks");
    client.acknowledgeSubscribe();
    await waitForSubscribeRequest(client, 2);
    assert.equal(client.subscribeRequests.length, 2);
    assert.equal(client.subscribeRequests[1]?.includes("direct/second"), true);
    client.acknowledgeSubscribe();
    await Promise.all([firstWrite, secondWrite]);
    assert.deepEqual(
      new Set(service.getActiveTopics()),
      new Set(["direct/runtime", "direct/second"]),
      "the final active set must match the final committed mappings"
    );
  } finally {
    await service.disconnect();
    await app.close();
    database.close();
  }
});

test("authorization, validation, stale revision, ownership and dependency rejects do not touch runtime", async () => {
  const runtime = await buildRuntime({
    source: runtimeSource({ enabled: true, sourceRevision: 2, epochId: "direct-two" }),
    mappingEnabled: true
  });
  const { app, client, database, service, source } = runtime;
  try {
    const created = await createSource(app, source);
    assert.equal(created.statusCode, 201, created.body);
    await service.connect();
    const baseline = { subscriptions: client.subscribeRequests.length, unsubscriptions: client.unsubscribeRequests.length };

    const denied = await app.inject({
      method: "PUT",
      url: `/api/data-hub/sites/kn/meter-sources/${source.channelId}`,
      remoteAddress,
      payload: { source, reason: "denied" }
    });
    assert.equal(denied.statusCode, 403);

    const invalid = await app.inject({
      method: "POST",
      url: "/api/data-hub/sites/kn/meter-sources",
      headers: managementHeaders,
      remoteAddress,
      payload: { source: { ...source, password: "secret" }, reason: "invalid" }
    });
    assert.equal(invalid.statusCode, 422);

    const stale = await updateSource(app, { ...source, sourceRevision: 1, epochId: "direct-one" }, "stale");
    assert.equal(stale.statusCode, 409, stale.body);

    const conflicting = runtimeSource({
      channelId: "kn-owner",
      meterId: "kn-owner",
      metricKey: source.metricKey,
      epochId: "owner-one",
      enabled: true
    });
    const ownership = await createSource(app, conflicting, "ownership");
    assert.equal(ownership.statusCode, 409, ownership.body);

    database.prepare(`
      INSERT INTO display_page_stage_configs (page_key, stage, config_json)
      VALUES ('direct-runtime-dependency', 'draft', ?)
    `).run(JSON.stringify({ dataBindings: { power: { itemId: "power", dataBinding: { metricKey: source.metricKey, scope: "kn" } } } }));
    const dependency = await app.inject({
      method: "DELETE",
      url: `/api/data-hub/sites/kn/meter-sources/${source.channelId}`,
      headers: managementHeaders,
      remoteAddress,
      payload: { expectedRevision: source.sourceRevision, reason: "dependency" }
    });
    assert.equal(dependency.statusCode, 409, dependency.body);

    assert.equal(client.subscribeRequests.length, baseline.subscriptions);
    assert.equal(client.unsubscribeRequests.length, baseline.unsubscriptions);
  } finally {
    await service.disconnect();
    await app.close();
    database.close();
  }
});
