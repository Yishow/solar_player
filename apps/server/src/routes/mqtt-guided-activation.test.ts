import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { MeterSourceDefinition } from "@solar-display/shared";
import type { MqttClient } from "mqtt";
import { MqttClientService } from "../mqtt/MqttClientService.js";
import { buildApp, getDatabase } from "./display-pages-asset-governance.test-support.js";

const source: MeterSourceDefinition = {
  channelId: "kn-main", meterId: "kn-main", metricKey: "consumptionEnergy", metricScope: "kn",
  enabled: true, reviewStatus: "reviewed", measurementKind: "cumulative-energy", energyFlowRole: "consumption",
  inputUnit: "kWh", scaleDecimal: "1", sourceRevision: 1, epochId: "one", expectedCadenceSeconds: 60,
  sourceTimestampTimeZone: null, timestampPolicy: "source-required"
};
const draft = {
  channelId: source.channelId, energyFlowRole: source.energyFlowRole, measurementKind: source.measurementKind,
  metricScope: source.metricScope, selector: { path: ["value"] }, source,
  timestampPolicy: source.timestampPolicy, topic: "factory/kn/main"
};
const previewUrl = "/api/data-hub/mqtt-mappings/preview";
const applyUrl = "/api/data-hub/mqtt-mappings/apply";
const silentLogger = { error: () => undefined, info: () => undefined, warn: () => undefined };

class FakeMqttClient extends EventEmitter {
  connected = true;
  subscribeError: Error | null = null;
  subscriptions: string[][] = [];

  subscribe(topics: string[], callback: (error?: Error | null) => void) {
    this.subscriptions.push([...topics]);
    queueMicrotask(() => callback(this.subscribeError));
    return this;
  }

  unsubscribe(_topics: string[], callback: (error?: Error | null) => void) {
    queueMicrotask(() => callback(null));
    return this;
  }

  publish(_topic: string, _payload: string, _options: unknown, callback?: (error?: Error | null) => void) {
    queueMicrotask(() => callback?.(null));
    return this;
  }

  end(_force: boolean, _options: Record<string, never>, callback: () => void) {
    callback();
    return this;
  }
}

/** Synthetic broker seam: records what the route hands the runtime owner and what it grants back. */
function attachSyntheticBroker(app: Awaited<ReturnType<typeof buildApp>>) {
  const state = { connected: true, granted: new Set<string>(), refuse: null as Error | null, requests: [] as string[][] };
  app.mqttClientService.subscribe = async (topics: string[]) => {
    state.requests.push([...topics]);
    if (state.refuse) throw state.refuse;
    state.granted = new Set(topics);
  };
  app.mqttClientService.getActiveTopics = () => [...state.granted];
  app.mqttClientService.getStatus = () => ({
    broker: "synthetic:1883", clientId: "synthetic", connected: state.connected,
    reason: state.connected ? "connected" : "offline", updatedAt: new Date().toISOString()
  });
  return state;
}

async function reviewedApplyPayload(
  app: Awaited<ReturnType<typeof buildApp>>,
  idempotencyKey: string,
  overrides: Partial<typeof draft> = {}
) {
  const previewDraft = { ...draft, ...overrides };
  const preview = await app.inject({ method: "POST", payload: previewDraft, url: previewUrl });
  assert.equal(preview.statusCode, 200, preview.body);
  return {
    canonicalDraft: preview.json().canonicalDraft, idempotencyKey,
    meterId: previewDraft.source.meterId, previewToken: preview.json().previewToken,
    source: previewDraft.source
  };
}

async function applyReviewedMapping(
  app: Awaited<ReturnType<typeof buildApp>>,
  idempotencyKey: string,
  overrides: Partial<typeof draft> = {}
) {
  return app.inject({ method: "POST", payload: await reviewedApplyPayload(app, idempotencyKey, overrides), url: applyUrl });
}

function countRows(table: string) {
  return (getDatabase().prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
}

test("R1 apply activates a new topic without restart and separates saved, activated and observed", async () => {
  const app = await buildApp();
  const broker = attachSyntheticBroker(app);
  try {
    const applied = await applyReviewedMapping(app, "activate-new-topic");
    assert.equal(applied.statusCode, 200, applied.body);
    const body = applied.json();
    assert.equal(body.applied, true);
    assert.equal(body.saved, true);
    assert.equal(body.activation.state, "active");
    assert.equal(body.activation.topic, draft.topic);
    assert.equal(body.activation.retryable, false);
    assert.equal(body.activation.reason, null);
    assert.equal(body.reception.observed, false, "activation must not claim a measurement was received");
    assert.equal(broker.requests.length, 1);
    assert.ok(broker.requests[0]!.includes(draft.topic), "the newly saved topic must reach the runtime owner");
    assert.deepEqual(
      [...broker.requests[0]!].sort(),
      (getDatabase().prepare("SELECT DISTINCT topic FROM topic_mappings WHERE enabled = 1 AND TRIM(topic) != ''").all() as Array<{ topic: string }>)
        .map((row) => row.topic).sort(),
      "the route may only hand over generic enabled topics, never managed adapter filters"
    );
    assert.equal(countRows("meter_readings_accepted"), 0, "preview samples must not be replayed into accepted history");
  } finally {
    await app.close();
  }
});

test("R1 broker refusal keeps the committed configuration and the same key retries activation once", async () => {
  const app = await buildApp();
  const broker = attachSyntheticBroker(app);
  try {
    broker.refuse = new Error("Subscribe refused");
    const request = await reviewedApplyPayload(app, "retry-after-refusal");
    const refused = await app.inject({ method: "POST", payload: request, url: applyUrl });
    assert.equal(refused.statusCode, 200, refused.body);
    const refusedBody = refused.json();
    assert.equal(refusedBody.saved, true);
    assert.equal(refusedBody.activation.state, "failed");
    assert.equal(refusedBody.activation.retryable, true);
    assert.equal(refusedBody.activation.reason, "BROKER_SUBSCRIBE_REFUSED");
    assert.equal(countRows("meter_sources"), 1);
    assert.equal(countRows("mapping_apply_receipts"), 1);

    broker.refuse = null;
    const retried = await app.inject({ method: "POST", payload: request, url: applyUrl });
    assert.equal(retried.statusCode, 200, retried.body);
    const retriedBody = retried.json();
    assert.deepEqual(retriedBody.source, refusedBody.source, "a replayed receipt must not create a new source revision");
    assert.equal(retriedBody.channelId, refusedBody.channelId);
    assert.equal(retriedBody.activation.state, "active", "a retried key must attempt activation again");
    assert.equal(countRows("meter_sources"), 1);
    assert.equal(countRows("mapping_apply_receipts"), 1);
    assert.equal(broker.requests.length, 2);
  } finally {
    await app.close();
  }
});

test("R1 a saved mapping stays pending while the runtime is disconnected and reports a retryable reason", async () => {
  const app = await buildApp();
  const broker = attachSyntheticBroker(app);
  try {
    broker.connected = false;
    app.mqttClientService.subscribe = async (topics: string[]) => { broker.requests.push([...topics]); };
    const applied = await applyReviewedMapping(app, "pending-while-offline");
    assert.equal(applied.statusCode, 200, applied.body);
    const body = applied.json();
    assert.equal(body.saved, true);
    assert.equal(body.activation.state, "pending");
    assert.equal(body.activation.retryable, true);
    assert.equal(body.activation.reason, "RUNTIME_NOT_CONNECTED");
    assert.equal(body.reception.observed, false);
  } finally {
    await app.close();
  }
});

test("R1 an activated topic delivers a production packet to the selected source and survives reconnect", async () => {
  const database = getDatabase();
  const app = await buildApp();
  attachSyntheticBroker(app);
  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: silentLogger
  });
  try {
    const applied = await applyReviewedMapping(app, "runtime-delivery");
    assert.equal(applied.statusCode, 200, applied.body);
    await service.connect();
    assert.ok(service.getActiveTopics().includes(draft.topic), "the saved topic must be part of the runtime subscription");
    const subscriptionCount = client.subscriptions.length;

    client.emit(
      "message",
      draft.topic,
      Buffer.from(JSON.stringify({ sourceTimestamp: "2026-09-08T01:00:00Z", value: 12.5 })),
      { dup: false, qos: 0, retain: false }
    );
    await new Promise((resolve) => setImmediate(resolve));
    const accepted = database.prepare(`
      SELECT normalized_value_kwh FROM meter_readings_accepted
      WHERE metric_scope = ? AND meter_id = ? AND channel_id = ?
    `).all(source.metricScope, source.meterId, source.channelId) as Array<{ normalized_value_kwh: string }>;
    assert.equal(accepted.length, 1, "a production packet on the activated topic must reach the selected source");
    assert.equal(accepted[0]!.normalized_value_kwh, "12.5");

    client.emit("reconnect");
    client.emit("connect");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(client.subscriptions.length, subscriptionCount + 1);
    assert.ok(client.subscriptions.at(-1)!.includes(draft.topic), "reconnect must restore the activated topic");
  } finally {
    await service.disconnect();
    await app.close();
  }
});

/** N1 at the HTTP boundary: an ownership conflict is a 409 with zero configuration and zero runtime effect. */
const solarSource: MeterSourceDefinition = {
  ...source, channelId: "cl-solar-total", meterId: "cl-solar-total", metricScope: "cl",
  metricKey: "factoryGeneration.totalKw", measurementKind: "power-gauge",
  energyFlowRole: "generation", inputUnit: "kW"
};

function registerEnabledDerivedMetric(metricKey: string) {
  getDatabase().prepare(`
    INSERT INTO derived_metric_definitions (
      metric_key, name, description, output_scope_policy, expression, output_unit,
      precision, fallback_policy, enabled, managed, revision
    ) VALUES (?, ?, '', 'site', 'a', 'kWh', 3, 'unavailable', 1, 0, 1)
  `).run(metricKey, metricKey);
}

test("M2-R11 preview of a Solar-managed destination returns 409 and issues no usable token", async () => {
  const app = await buildApp();
  const broker = attachSyntheticBroker(app);
  try {
    const previewed = await app.inject({
      method: "POST",
      payload: {
        ...draft, channelId: solarSource.channelId, metricScope: solarSource.metricScope,
        measurementKind: solarSource.measurementKind, energyFlowRole: solarSource.energyFlowRole,
        source: solarSource, topic: "review/isolated/managed"
      },
      url: previewUrl
    });
    assert.equal(previewed.statusCode, 409, previewed.body);
    assert.equal(previewed.json().error, "MANAGED_SOURCE_METRIC_CONFLICT");
    assert.equal(countRows("mapping_preview_tokens"), 0);
    assert.equal(countRows("meter_sources"), 0);
    assert.equal(broker.requests.length, 0, "a rejected preview must not touch the runtime owner");
  } finally {
    await app.close();
  }
});

test("M2-R11 apply of a destination claimed after the preview returns 409 with no write or activation", async () => {
  const app = await buildApp();
  const broker = attachSyntheticBroker(app);
  try {
    const request = await reviewedApplyPayload(app, "claimed-after-preview");
    registerEnabledDerivedMetric(source.metricKey);
    const applied = await app.inject({ method: "POST", payload: request, url: applyUrl });
    assert.equal(applied.statusCode, 409, applied.body);
    assert.equal(applied.json().error, "DERIVED_METRIC_IDENTITY_CONFLICT");
    assert.equal(countRows("meter_sources"), 0);
    assert.equal(countRows("meter_source_audit"), 0);
    assert.equal(countRows("mapping_apply_receipts"), 0);
    assert.equal(
      (getDatabase().prepare("SELECT COUNT(*) AS count FROM topic_mappings WHERE metric_scope = ? AND metric_key = ?")
        .get(source.metricScope, source.metricKey) as { count: number }).count,
      0
    );
    assert.equal(broker.requests.length, 0, "a rejected apply must not reach the runtime owner");
  } finally {
    await app.close();
  }
});

/** N2 at the HTTP boundary: a disabled result must not borrow another owner's live subscription. */
const sharedSecondSource: MeterSourceDefinition = {
  ...source, channelId: "kn-second", meterId: "kn-second", metricKey: "selfConsumptionEnergy"
};

function mappingEnabled(metricScope: string, metricKey: string) {
  return (getDatabase().prepare("SELECT enabled FROM topic_mappings WHERE metric_scope = ? AND metric_key = ?")
    .get(metricScope, metricKey) as { enabled: number } | undefined)?.enabled;
}

test("M2-R15 a disabled guided apply never reports itself active on a shared topic", async () => {
  const app = await buildApp();
  const broker = attachSyntheticBroker(app);
  try {
    assert.equal((await applyReviewedMapping(app, "shared-owner-one")).statusCode, 200);
    const second = await applyReviewedMapping(app, "shared-owner-two", {
      channelId: sharedSecondSource.channelId, source: sharedSecondSource
    });
    assert.equal(second.statusCode, 200, second.body);

    const disabled = await applyReviewedMapping(app, "shared-owner-one-disable", {
      source: { ...source, enabled: false }
    });
    assert.equal(disabled.statusCode, 200, disabled.body);
    const body = disabled.json();
    assert.equal(body.saved, true);
    assert.notEqual(body.activation.state, "active", "a disabled source must not claim the shared topic's subscription");
    assert.equal(body.reception.observed, false);
    assert.equal(mappingEnabled(source.metricScope, source.metricKey), 0);
    assert.equal(mappingEnabled(sharedSecondSource.metricScope, sharedSecondSource.metricKey), 1);
    assert.ok(
      broker.requests.at(-1)!.includes(draft.topic),
      "the remaining owner's subscription must be preserved after the reconciliation"
    );
  } finally {
    await app.close();
  }
});

test("M2-R15 a broker refusal on a re-enable keeps the enabled mapping and stays retryable", async () => {
  const app = await buildApp();
  const broker = attachSyntheticBroker(app);
  try {
    assert.equal((await applyReviewedMapping(app, "reenable-initial")).statusCode, 200);
    assert.equal((await applyReviewedMapping(app, "reenable-disable", { source: { ...source, enabled: false } })).statusCode, 200);
    assert.equal(mappingEnabled(source.metricScope, source.metricKey), 0);

    broker.refuse = new Error("Subscribe refused");
    const request = await reviewedApplyPayload(app, "reenable-after-refusal");
    const refused = await app.inject({ method: "POST", payload: request, url: applyUrl });
    assert.equal(refused.statusCode, 200, refused.body);
    assert.equal(refused.json().activation.state, "failed");
    assert.equal(refused.json().activation.retryable, true);
    assert.equal(mappingEnabled(source.metricScope, source.metricKey), 1, "a broker refusal must not undo the committed enabled state");

    broker.refuse = null;
    const retried = await app.inject({ method: "POST", payload: request, url: applyUrl });
    assert.equal(retried.statusCode, 200, retried.body);
    assert.equal(retried.json().activation.state, "active");
    assert.equal(mappingEnabled(source.metricScope, source.metricKey), 1);
    assert.equal(
      (getDatabase().prepare("SELECT COUNT(*) AS count FROM mapping_apply_receipts WHERE idempotency_key = ?")
        .get("reenable-after-refusal") as { count: number }).count,
      1
    );
  } finally {
    await app.close();
  }
});

test("M2-R15 a re-enabled source receives a production packet on its restored subscription", async () => {
  const database = getDatabase();
  const app = await buildApp();
  attachSyntheticBroker(app);
  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: silentLogger
  });
  try {
    assert.equal((await applyReviewedMapping(app, "packet-initial")).statusCode, 200);
    assert.equal((await applyReviewedMapping(app, "packet-disable", { source: { ...source, enabled: false } })).statusCode, 200);
    assert.equal(mappingEnabled(source.metricScope, source.metricKey), 0, "the disable step must actually remove the mapping from the enabled set");
    const reEnabled = await applyReviewedMapping(app, "packet-re-enable");
    assert.equal(reEnabled.statusCode, 200, reEnabled.body);
    assert.equal(reEnabled.json().activation.state, "active");

    await service.connect();
    assert.ok(service.getActiveTopics().includes(draft.topic), "the re-enabled topic must be part of the runtime subscription");
    client.emit(
      "message",
      draft.topic,
      Buffer.from(JSON.stringify({ sourceTimestamp: "2026-09-08T02:00:00Z", value: 31.25 })),
      { dup: false, qos: 0, retain: false }
    );
    await new Promise((resolve) => setImmediate(resolve));
    const accepted = database.prepare(`
      SELECT normalized_value_kwh FROM meter_readings_accepted
      WHERE metric_scope = ? AND meter_id = ? AND channel_id = ?
    `).all(source.metricScope, source.meterId, source.channelId) as Array<{ normalized_value_kwh: string }>;
    assert.equal(accepted.length, 1, "a production packet must reach the re-enabled source");
    assert.equal(accepted[0]!.normalized_value_kwh, "31.25");
  } finally {
    await service.disconnect();
    await app.close();
  }
});

test("M2-R11 a replayed receipt cannot keep activating a destination claimed after the commit", async () => {
  const app = await buildApp();
  const broker = attachSyntheticBroker(app);
  try {
    const request = await reviewedApplyPayload(app, "replay-after-claim");
    assert.equal((await app.inject({ method: "POST", payload: request, url: applyUrl })).statusCode, 200);
    const requestsAfterCommit = broker.requests.length;

    registerEnabledDerivedMetric(source.metricKey);
    const replayed = await app.inject({ method: "POST", payload: request, url: applyUrl });
    assert.equal(replayed.statusCode, 409, replayed.body);
    assert.equal(replayed.json().error, "DERIVED_METRIC_IDENTITY_CONFLICT");
    assert.equal(broker.requests.length, requestsAfterCommit, "a rejected replay must not reach the runtime owner");
    assert.equal(countRows("meter_sources"), 1, "the rejected replay must not redo or undo the committed write");
    assert.equal(countRows("mapping_apply_receipts"), 1);
  } finally {
    await app.close();
  }
});

test("M2-R15 a lost-response retry re-attempts activation without a second source mutation", async () => {
  const app = await buildApp();
  const broker = attachSyntheticBroker(app);
  try {
    const request = await reviewedApplyPayload(app, "lost-response-retry");
    const first = await app.inject({ method: "POST", payload: request, url: applyUrl });
    assert.equal(first.statusCode, 200, first.body);
    assert.equal(first.json().activation.state, "active");

    const retried = await app.inject({ method: "POST", payload: request, url: applyUrl });
    assert.equal(retried.statusCode, 200, retried.body);
    assert.deepEqual(retried.json().source, first.json().source);
    assert.equal(retried.json().activation.state, "active");
    assert.equal(mappingEnabled(source.metricScope, source.metricKey), 1);
    assert.equal(countRows("meter_sources"), 1);
    assert.equal(countRows("meter_source_audit"), 1);
    assert.equal(countRows("mapping_apply_receipts"), 1);
    assert.equal(broker.requests.length, 2, "each retry re-attempts the runtime subscription");
  } finally {
    await app.close();
  }
});

test("M2-R11 preview keeps ordinary draft rejections at 422 while only ownership conflicts reach 409", async () => {
  const app = await buildApp();
  try {
    // An unreviewable draft is a malformed request, not a contest over a destination someone
    // else owns; letting it borrow the ownership 409 would tell clients to retry a different
    // destination instead of fixing the draft.
    const malformed = await app.inject({
      method: "POST",
      payload: { ...draft, source, topic: "review/isolated/+bad" },
      url: previewUrl
    });
    assert.equal(malformed.statusCode, 422, malformed.body);
    assert.equal(malformed.json().error, "SOURCE_REVIEW_REQUIRED");

    const mismatched = await app.inject({
      method: "POST",
      payload: { ...draft, source: { ...source, scaleDecimal: "0" } },
      url: previewUrl
    });
    assert.equal(mismatched.statusCode, 422, mismatched.body);
    assert.equal(mismatched.json().error, "PREVIEW_DRAFT_MISMATCH");
  } finally {
    await app.close();
  }
});
