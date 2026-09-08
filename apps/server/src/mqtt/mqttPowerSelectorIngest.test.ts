import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type Database from "better-sqlite3";
import type { MeterSourceDefinition } from "@solar-display/shared";
import type { MqttClient } from "mqtt";
import { applyGuidedMapping, previewGuidedMapping } from "../services/guidedMqttMappingService.js";
import { getDatabase } from "../routes/display-pages-asset-governance.test-support.js";
import { MqttClientService } from "./MqttClientService.js";

const silentLogger = { error: () => undefined, info: () => undefined, warn: () => undefined };

class FakeMqttClient extends EventEmitter {
  connected = true;
  subscriptions: string[][] = [];

  subscribe(topics: string[], callback: (error?: Error | null) => void) {
    this.subscriptions.push([...topics]);
    queueMicrotask(() => callback(null));
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

const powerSource: MeterSourceDefinition = {
  channelId: "kn-main-power", meterId: "kn-main-power", metricKey: "consumptionPower", metricScope: "kn",
  enabled: true, reviewStatus: "reviewed", measurementKind: "power-gauge", energyFlowRole: "consumption",
  inputUnit: "kW", scaleDecimal: "1", sourceRevision: 1, epochId: "one", expectedCadenceSeconds: 60,
  sourceTimestampTimeZone: null, timestampPolicy: "allow-receive-time-estimate"
};
const powerTopic = "factory/kn/power";

function reviewMapping(
  database: Database.Database,
  source: MeterSourceDefinition,
  topic: string,
  selector: { path: string[]; tagEquals?: string },
  idempotencyKey: string
) {
  const draft = {
    channelId: source.channelId, energyFlowRole: source.energyFlowRole, measurementKind: source.measurementKind,
    metricScope: source.metricScope, selector, source, timestampPolicy: source.timestampPolicy, topic
  };
  const preview = previewGuidedMapping(database, draft);
  return applyGuidedMapping(database, {
    canonicalDraft: preview.canonicalDraft, idempotencyKey, meterId: source.meterId,
    previewToken: preview.previewToken, source
  });
}

async function withRuntime(run: (emit: (topic: string, payload: unknown) => Promise<void>) => Promise<void>) {
  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database: getDatabase(),
    logger: silentLogger
  });
  try {
    await service.connect();
    await run(async (topic, payload) => {
      client.emit("message", topic, Buffer.from(JSON.stringify(payload)), { dup: false, qos: 0, retain: false });
      await new Promise((resolve) => setImmediate(resolve));
    });
  } finally {
    await service.disconnect();
  }
}

function readLive(metricScope: string, metricKey: string) {
  return getDatabase().prepare(`
    SELECT value, unit, timestamp, quality FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?
  `).get(metricScope, metricKey) as { quality: string | null; timestamp: string; unit: string; value: number } | undefined;
}

function countRows(table: string) {
  return (getDatabase().prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
}

test("R2 a reviewed power mapping resolves its tag from an array on the production packet path", async () => {
  const database = getDatabase();
  reviewMapping(database, powerSource, powerTopic, { path: ["value"], tagEquals: "P1" }, "power-tag");
  await withRuntime(async (emit) => {
    await emit(powerTopic, [{ tag: "P1", value: 12.5 }, { tag: "P2", value: 99 }]);
    const live = readLive(powerSource.metricScope, powerSource.metricKey);
    assert.ok(live, "the reviewed power source must receive a live value from the production path");
    assert.equal(live.value, 12.5, "the selector must resolve P1, not P2 and not a scalar-only fallback");
    assert.equal(live.unit, "kW", "power must keep its reviewed unit instead of being labelled kWh");
    assert.equal(countRows("meter_readings_accepted"), 0, "power must never enter accepted energy history");
    assert.equal(countRows("meter_live_state"), 0, "power must never become an energy period baseline");
  });
});

test("R2 a reviewed power mapping applies its reviewed scale to the selected tag", async () => {
  const database = getDatabase();
  const scaled = { ...powerSource, scaleDecimal: "0.001" };
  reviewMapping(database, scaled, powerTopic, { path: ["value"], tagEquals: "P1" }, "power-scale");
  await withRuntime(async (emit) => {
    await emit(powerTopic, [{ tag: "P1", value: 12500 }, { tag: "P2", value: 99 }]);
    const live = readLive(scaled.metricScope, scaled.metricKey);
    assert.ok(live);
    assert.equal(live.value, 12.5, "the reviewed scale must be applied on the production path");
    assert.equal(live.unit, "kW");
    assert.equal(countRows("meter_readings_accepted"), 0);
  });
});

test("R2 a missing or ambiguous power tag preserves the last valid value without substituting another record", async () => {
  const database = getDatabase();
  reviewMapping(database, powerSource, powerTopic, { path: ["value"], tagEquals: "P1" }, "power-selector-errors");
  await withRuntime(async (emit) => {
    await emit(powerTopic, [{ tag: "P1", value: 12.5 }, { tag: "P2", value: 99 }]);
    const seeded = readLive(powerSource.metricScope, powerSource.metricKey);
    assert.equal(seeded?.value, 12.5);

    await emit(powerTopic, [{ tag: "P2", value: 99 }]);
    const afterMissing = readLive(powerSource.metricScope, powerSource.metricKey);
    assert.deepEqual(afterMissing, seeded, "a missing tag must not substitute another record, a zero, or a new freshness");

    await emit(powerTopic, [{ tag: "P1", value: 1 }, { tag: "P1", value: 2 }]);
    const afterAmbiguous = readLive(powerSource.metricScope, powerSource.metricKey);
    assert.deepEqual(afterAmbiguous, seeded, "an ambiguous tag must not pick one of the duplicates");
    assert.equal(countRows("meter_readings_accepted"), 0);
    assert.equal(
      (database.prepare("SELECT COUNT(*) AS count FROM meter_readings_quarantine").get() as { count: number }).count,
      0,
      "power selector errors must not be recorded as quarantined energy readings"
    );
  });
});

test("R2 a legacy scalar mapping without a reviewed source keeps the compatibility adapter", async () => {
  await withRuntime(async (emit) => {
    await emit("factory/power/stamping", { value: 42 });
    const live = readLive("cl", "factoryCircuit.stampingPower");
    assert.ok(live, "unreviewed legacy mappings must keep working");
    assert.equal(live.value, 42);
    assert.equal(live.unit, "kW");
    assert.equal(countRows("meter_readings_accepted"), 0);
  });
});

test("R2 a reviewed scalar power mapping is honoured by the shared selector instead of the legacy parser", async () => {
  const database = getDatabase();
  const scalarSource = { ...powerSource, channelId: "kn-aux-power", meterId: "kn-aux-power", metricKey: "auxiliaryPower" };
  reviewMapping(database, scalarSource, "factory/kn/aux-power", { path: ["power"] }, "power-scalar");
  database.prepare("UPDATE topic_mappings SET selector_json = NULL, value_path = 'power', unit = 'W' WHERE metric_key = ?")
    .run(scalarSource.metricKey);
  await withRuntime(async (emit) => {
    await emit("factory/kn/aux-power", { power: 7.5 });
    const live = readLive(scalarSource.metricScope, scalarSource.metricKey);
    assert.ok(live);
    assert.equal(live.value, 7.5);
    assert.equal(live.unit, "kW", "the reviewed source unit decides the output, not the legacy mapping row");
    assert.equal(countRows("meter_readings_accepted"), 0);
  });
});

test("R2 reviewed energy sources keep writing accepted history through the E1 gate", async () => {
  const database = getDatabase();
  const energySource: MeterSourceDefinition = {
    ...powerSource, channelId: "kn-main", meterId: "kn-main", metricKey: "consumptionEnergy",
    measurementKind: "cumulative-energy", inputUnit: "kWh", scaleDecimal: "1", timestampPolicy: "source-required"
  };
  reviewMapping(database, energySource, "factory/kn/main", { path: ["value"] }, "energy-regression");
  await withRuntime(async (emit) => {
    await emit("factory/kn/main", { sourceTimestamp: "2026-09-08T01:00:00Z", value: 1000.5 });
    const accepted = database.prepare(`
      SELECT normalized_value_kwh FROM meter_readings_accepted WHERE metric_scope = ? AND channel_id = ?
    `).all(energySource.metricScope, energySource.channelId) as Array<{ normalized_value_kwh: string }>;
    assert.equal(accepted.length, 1, "energy must still be admitted into accepted history");
    assert.equal(accepted[0]!.normalized_value_kwh, "1000.5");
    assert.equal(readLive(energySource.metricScope, energySource.metricKey)?.unit, "kWh");
  });
});
