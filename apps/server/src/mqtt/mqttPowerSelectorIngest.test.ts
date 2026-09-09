import assert from "node:assert/strict";
import test from "node:test";
import type { MeterSourceDefinition } from "@solar-display/shared";
import {
  countRows,
  getDatabase,
  powerSource,
  powerTopic,
  readLive,
  reviewMapping,
  withRuntime
} from "./mqttPowerIngest.test-support.js";

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

test("R2 a legacy tagged array value_path mapping keeps indexed compatibility", async () => {
  const database = getDatabase();
  database.prepare(`
    UPDATE topic_mappings
    SET topic = ?, value_path = ?, selector_json = NULL
    WHERE metric_scope = 'cl' AND metric_key = 'factoryCircuit.stampingPower'
  `).run("factory/power/tagged-array", "1.value");

  await withRuntime(async (emit) => {
    await emit("factory/power/tagged-array", [
      { tag: "P2", value: 99 },
      { tag: "P1", value: 42 }
    ]);
    const live = readLive("cl", "factoryCircuit.stampingPower");
    assert.ok(live, "unreviewed legacy array mappings must keep working");
    assert.equal(live.value, 42, "the legacy value_path must still select the configured array record");
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
  const events: Array<{ late: boolean; sourceTimestamp: string | null }> = [];
  const errors: unknown[] = [];
  const warnings: unknown[] = [];
  await withRuntime(async (emit) => {
    await emit("factory/kn/main", { sourceTimestamp: "2026-09-08T01:00:00Z", value: 1000.5 }, { dup: false, qos: 1, retain: false });
    await emit("factory/kn/main", { sourceTimestamp: "2026-09-08T01:05:00Z", value: 1002.5 }, { dup: false, qos: 1, retain: false });
    await emit("factory/kn/main", { sourceTimestamp: "2026-09-08T01:05:00Z", value: 1002.5 }, { dup: true, qos: 1, retain: false });
    await emit("factory/kn/main", { sourceTimestamp: "2026-09-08T01:02:00Z", value: 1001.5 }, { dup: false, qos: 1, retain: false });
    const accepted = database.prepare(`
      SELECT normalized_value_kwh, source_timestamp, timestamp_quality, measurement_kind
      FROM meter_readings_accepted WHERE metric_scope = ? AND channel_id = ?
      ORDER BY source_timestamp
    `).all(energySource.metricScope, energySource.channelId) as Array<{ normalized_value_kwh: string }>;
    assert.deepEqual(accepted, [
      { normalized_value_kwh: "1000.5", source_timestamp: "2026-09-08T01:00:00Z", timestamp_quality: "source", measurement_kind: "cumulative-energy" },
      { normalized_value_kwh: "1001.5", source_timestamp: "2026-09-08T01:02:00Z", timestamp_quality: "source", measurement_kind: "cumulative-energy" },
      { normalized_value_kwh: "1002.5", source_timestamp: "2026-09-08T01:05:00Z", timestamp_quality: "source", measurement_kind: "cumulative-energy" }
    ], "exact replay is deduplicated while the late observation remains in accepted history");
    assert.deepEqual(events, [
      { late: false, sourceTimestamp: "2026-09-08T01:00:00Z" },
      { late: false, sourceTimestamp: "2026-09-08T01:05:00Z" },
      { late: true, sourceTimestamp: "2026-09-08T01:02:00Z" }
    ]);
    assert.deepEqual(readLive(energySource.metricScope, energySource.metricKey), {
      quality: "source",
      raw_payload: JSON.stringify({ sourceTimestamp: "2026-09-08T01:05:00Z", value: 1002.5 }),
      timestamp: "2026-09-08T01:05:00Z",
      unit: "kWh",
      value: 1002.5
    }, "a late cumulative-energy observation must not rewind live state");
    assert.deepEqual(
      database.prepare(`
        SELECT live_value_kwh, last_source_timestamp
        FROM meter_live_state
        WHERE metric_scope = ? AND meter_id = ? AND channel_id = ? AND source_revision = ? AND epoch_id = ?
      `).get(
        energySource.metricScope,
        energySource.meterId,
        energySource.channelId,
        energySource.sourceRevision,
        energySource.epochId
      ),
      { live_value_kwh: "1002.5", last_source_timestamp: "2026-09-08T01:05:00Z" },
      "the E1 baseline must not rewind when a late cumulative-energy observation is saved"
    );
    assert.equal(countRows("meter_readings_quarantine"), 0);
  }, {
    logger: {
      error: (payload) => errors.push(payload),
      info: () => undefined,
      warn: (payload) => warnings.push(payload)
    },
    meterReadingEventSink: (event) => events.push({ late: event.late, sourceTimestamp: event.sourceTimestamp })
  });
  assert.deepEqual(errors, [], "the exact replay must be handled as an E1 duplicate, not as a generic callback failure");
  assert.deepEqual(warnings, [], "the exact replay must not fall through to a failed duplicate insert");
});
