import assert from "node:assert/strict";
import test from "node:test";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { readGuidedMappingReception } from "../services/guidedMappingActivationService.js";
import { saveMeterSource } from "../services/meterSourceCatalogService.js";
import {
  FakeMqttClient,
  getDatabase,
  powerSource,
  powerTopic,
  reviewMapping,
  silentLogger
} from "./mqttPowerIngest.test-support.js";
import { MqttClientService } from "./MqttClientService.js";
import {
  PowerReceptionEvidenceStore,
  powerReceptionSourceIdentity
} from "./powerReceptionEvidence.js";

function createRuntime() {
  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as never;
    },
    database: getDatabase(),
    logger: silentLogger
  });
  return { client, service };
}

async function emit(
  client: FakeMqttClient,
  topic: string,
  payload: unknown,
  packet: { dup?: boolean; qos?: number; retain?: boolean } = {}
) {
  client.emit("message", topic, Buffer.from(JSON.stringify(payload)), {
    dup: false,
    qos: 0,
    retain: false,
    ...packet
  });
  await new Promise((resolve) => setImmediate(resolve));
}

function countRows(table: string) {
  return (getDatabase().prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
}

function readPowerEvidence(service: MqttClientService, source: MeterSourceDefinition) {
  return service.readPowerReceptionEvidence(powerReceptionSourceIdentity(source));
}

test("power evidence stays bounded and removes stale source identities", () => {
  const database = getDatabase();
  reviewMapping(database, powerSource, powerTopic, { path: ["value"] }, "evidence-bounded");
  const store = new PowerReceptionEvidenceStore(database);
  const identity = powerReceptionSourceIdentity(powerSource);
  assert.equal(Object.isFrozen(identity), true);
  assert.deepEqual(store.read(identity), { lastAcceptedAt: null, observed: false });

  for (let index = 0; index < 20; index += 1) {
    store.record(identity, `2026-09-09T00:00:${String(index).padStart(2, "0")}Z`);
  }
  assert.deepEqual(store.read(identity), {
    lastAcceptedAt: "2026-09-09T00:00:19Z",
    observed: true
  });
  assert.equal(
    (store as unknown as { evidence: Map<string, unknown> }).evidence.size,
    1,
    "repeated packets keep one source-bound entry"
  );

  const revised = {
    ...powerSource,
    epochId: "evidence-two",
    meterId: "kn-reception-power-replaced",
    sourceRevision: 2
  } satisfies MeterSourceDefinition;
  saveMeterSource(database, revised, { actor: "test", reason: "source-revision" });
  assert.deepEqual(store.read(identity), { lastAcceptedAt: null, observed: false });
  assert.equal(
    (store as unknown as { evidence: Map<string, unknown> }).evidence.size,
    0,
    "a replaced catalog identity is pruned rather than retained"
  );
});

test("an isolated power reception reader without a runtime provider fails closed", () => {
  const database = getDatabase();
  reviewMapping(database, powerSource, powerTopic, { path: ["value"] }, "evidence-no-provider");
  assert.deepEqual(readGuidedMappingReception(database, powerSource), {
    lastAcceptedAt: null,
    observed: false
  });
});

test("record prunes removed channels before retaining the next source without reading the old channel", () => {
  const database = getDatabase();
  reviewMapping(database, powerSource, powerTopic, { path: ["value"] }, "evidence-channel-churn-old");
  const store = new PowerReceptionEvidenceStore(database);
  const oldIdentity = powerReceptionSourceIdentity(powerSource);
  store.record(oldIdentity, "2026-09-09T00:00:00Z");

  database.prepare(`
    DELETE FROM meter_sources
    WHERE metric_scope = ? AND channel_id = ?
  `).run(powerSource.metricScope, powerSource.channelId);
  const nextSource = {
    ...powerSource,
    channelId: "kn-reception-power-next",
    meterId: "kn-reception-power-next",
    metricKey: "receptionPowerNext"
  } satisfies MeterSourceDefinition;
  reviewMapping(database, nextSource, "factory/kn/reception-power-next", { path: ["value"] }, "evidence-channel-churn-next");
  const nextIdentity = powerReceptionSourceIdentity(nextSource);
  store.record(nextIdentity, "2026-09-09T00:01:00Z");

  const entries = (store as unknown as { evidence: Map<string, unknown> }).evidence;
  assert.equal(entries.size, 1, "a new channel packet must clean the removed channel first");
  assert.equal(entries.has(`${powerSource.metricScope}:${powerSource.channelId}`), false);
  assert.equal(entries.has(`${nextSource.metricScope}:${nextSource.channelId}`), true);
});

test("power evidence uses the reviewed source tuple and ignores generic live rows or payload identity", async () => {
  const database = getDatabase();
  reviewMapping(database, powerSource, powerTopic, { path: ["value"] }, "evidence-source-tuple");
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    powerSource.metricScope,
    powerSource.metricKey,
    99,
    "kW",
    "2026-09-08T00:00:00Z",
    "source",
    JSON.stringify({ value: 99 })
  );

  const { client, service } = createRuntime();
  try {
    await service.connect();
    assert.deepEqual(readPowerEvidence(service, powerSource), { lastAcceptedAt: null, observed: false });
    await emit(client, powerTopic, {
      channelId: "forged-channel",
      epochId: "forged-epoch",
      meterId: "forged-meter",
      metricKey: powerSource.metricKey,
      metricScope: "cl",
      sourceRevision: 99,
      sourceTimestamp: "2026-09-08T01:00:00Z",
      value: 12.5
    });

    const evidence = readPowerEvidence(service, powerSource);
    assert.equal(evidence.observed, true);
    assert.notEqual(evidence.lastAcceptedAt, "2026-09-08T01:00:00Z");
    assert.deepEqual(
      database.prepare(`
        SELECT value, unit, timestamp
        FROM live_metric_values
        WHERE metric_scope = ? AND metric_key = ?
      `).get(powerSource.metricScope, powerSource.metricKey),
      { value: 12.5, unit: "kW", timestamp: "2026-09-08T01:00:00Z" }
    );
    assert.deepEqual(
      service.readPowerReceptionEvidence(powerReceptionSourceIdentity({
        ...powerSource,
        channelId: "forged-channel",
        meterId: "forged-meter",
        sourceRevision: 99,
        epochId: "forged-epoch"
      })),
      { lastAcceptedAt: null, observed: false }
    );
    assert.equal(countRows("meter_readings_accepted"), 0);
    assert.equal(countRows("meter_readings_quarantine"), 0);
    assert.equal(countRows("meter_live_state"), 0);
  } finally {
    await service.disconnect();
  }
});

test("power evidence isolates CL and KN sources with the same metric key", async () => {
  const database = getDatabase();
  const clSource = {
    ...powerSource,
    channelId: "cl-shared-power",
    meterId: "cl-shared-power",
    metricScope: "cl" as const
  } satisfies MeterSourceDefinition;
  const knSource = {
    ...powerSource,
    channelId: "kn-shared-power",
    meterId: "kn-shared-power",
    metricScope: "kn" as const
  } satisfies MeterSourceDefinition;
  reviewMapping(database, clSource, "factory/cl/shared-power", { path: ["value"] }, "evidence-cl");
  reviewMapping(database, knSource, "factory/kn/shared-power", { path: ["value"] }, "evidence-kn");

  const { client, service } = createRuntime();
  try {
    await service.connect();
    await emit(client, "factory/cl/shared-power", { value: 4, sourceTimestamp: "2026-09-08T01:00:00Z" });
    await emit(client, "factory/kn/shared-power", { value: 8, sourceTimestamp: "2026-09-08T01:01:00Z" });
    assert.equal(readPowerEvidence(service, clSource).observed, true);
    assert.equal(readPowerEvidence(service, knSource).observed, true);
    assert.equal(
      service.readPowerReceptionEvidence(powerReceptionSourceIdentity({
        ...clSource,
        metricScope: "kn",
        channelId: clSource.channelId,
        meterId: clSource.meterId
      })).observed,
      false,
      "a different scope/channel tuple cannot borrow the same-name evidence"
    );
    assert.equal(countRows("meter_readings_accepted"), 0);
    assert.equal(countRows("meter_live_state"), 0);
  } finally {
    await service.disconnect();
  }
});

test("duplicate, late, equal-conflict, invalid and rolled-back power packets do not advance evidence", async () => {
  const database = getDatabase();
  const requiredSource = {
    ...powerSource,
    channelId: "kn-required-evidence-power",
    meterId: "kn-required-evidence-power",
    metricKey: "requiredEvidencePower",
    timestampPolicy: "source-required" as const
  } satisfies MeterSourceDefinition;
  const topic = "factory/kn/required-evidence-power";
  reviewMapping(database, requiredSource, topic, { path: ["value"] }, "evidence-ordering");
  const { client, service } = createRuntime();
  try {
    await service.connect();
    assert.deepEqual(readPowerEvidence(service, requiredSource), { lastAcceptedAt: null, observed: false });
    await emit(client, topic, { value: 12.5, sourceTimestamp: "2026-09-08T01:00:00Z" });
    const first = readPowerEvidence(service, requiredSource);
    assert.equal(first.observed, true);
    await emit(client, topic, { value: 12.5, sourceTimestamp: "2026-09-08T01:00:00Z" }, { dup: true, qos: 1 });
    await emit(client, topic, { value: 13, sourceTimestamp: "2026-09-08T01:00:00Z" });
    await emit(client, topic, { value: 11, sourceTimestamp: "2026-09-08T00:59:00Z" });
    await emit(client, topic, { value: 10 });
    await emit(client, topic, { value: Number.POSITIVE_INFINITY, sourceTimestamp: "2026-09-08T01:02:00Z" });
    assert.deepEqual(readPowerEvidence(service, requiredSource), first);
    assert.deepEqual(
      database.prepare(`
        SELECT value, timestamp
        FROM live_metric_values
        WHERE metric_scope = ? AND metric_key = ?
      `).get(requiredSource.metricScope, requiredSource.metricKey),
      { value: 12.5, timestamp: "2026-09-08T01:00:00Z" }
    );
    assert.equal(countRows("meter_readings_accepted"), 0);
    assert.equal(countRows("meter_readings_quarantine"), 0);
    assert.equal(countRows("meter_live_state"), 0);
  } finally {
    await service.disconnect();
  }

  reviewMapping(database, powerSource, powerTopic, { path: ["value"] }, "evidence-rollback");
  database.exec(`
    CREATE TRIGGER fail_power_reception_live
    BEFORE INSERT ON live_metric_values
    WHEN NEW.metric_scope = 'kn' AND NEW.metric_key = 'consumptionPower'
    BEGIN SELECT RAISE(ABORT, 'rollback power live update'); END
  `);
  const rollbackRuntime = createRuntime();
  try {
    await rollbackRuntime.service.connect();
    await emit(rollbackRuntime.client, powerTopic, {
      value: 12.5,
      sourceTimestamp: "2026-09-08T02:00:00Z"
    });
    assert.deepEqual(readPowerEvidence(rollbackRuntime.service, powerSource), {
      lastAcceptedAt: null,
      observed: false
    });
  } finally {
    await rollbackRuntime.service.disconnect();
  }
});

test("reconnect preserves current-runtime evidence but a replacement service starts false", async () => {
  const database = getDatabase();
  reviewMapping(database, powerSource, powerTopic, { path: ["value"] }, "evidence-restart");
  const firstRuntime = createRuntime();
  try {
    await firstRuntime.service.connect();
    await emit(firstRuntime.client, powerTopic, { value: 12.5, sourceTimestamp: "2026-09-08T01:00:00Z" });
    const beforeReconnect = readPowerEvidence(firstRuntime.service, powerSource);
    firstRuntime.client.emit("reconnect");
    firstRuntime.client.emit("connect");
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(readPowerEvidence(firstRuntime.service, powerSource), beforeReconnect);
  } finally {
    await firstRuntime.service.disconnect();
  }

  const replacement = createRuntime();
  try {
    await replacement.service.connect();
    assert.deepEqual(readPowerEvidence(replacement.service, powerSource), {
      lastAcceptedAt: null,
      observed: false
    });
    await emit(replacement.client, powerTopic, { value: 13, sourceTimestamp: "2026-09-08T01:01:00Z" });
    assert.equal(readPowerEvidence(replacement.service, powerSource).observed, true);
  } finally {
    await replacement.service.disconnect();
  }
});

test("energy reception remains persisted across service replacement", async () => {
  const database = getDatabase();
  const energySource = {
    ...powerSource,
    channelId: "kn-persisted-energy",
    meterId: "kn-persisted-energy",
    metricKey: "persistedEnergy",
    measurementKind: "cumulative-energy" as const,
    inputUnit: "kWh",
    timestampPolicy: "source-required" as const
  } satisfies MeterSourceDefinition;
  const topic = "factory/kn/persisted-energy";
  reviewMapping(database, energySource, topic, { path: ["value"] }, "evidence-energy");
  const firstRuntime = createRuntime();
  try {
    await firstRuntime.service.connect();
    await emit(firstRuntime.client, topic, { value: 100, sourceTimestamp: "2026-09-08T01:00:00Z" });
    assert.equal(readGuidedMappingReception(database, energySource).observed, true);
  } finally {
    await firstRuntime.service.disconnect();
  }

  const replacement = createRuntime();
  try {
    await replacement.service.connect();
    assert.equal(readGuidedMappingReception(database, energySource).observed, true);
    assert.equal(countRows("meter_readings_accepted"), 1);
  } finally {
    await replacement.service.disconnect();
  }
});
