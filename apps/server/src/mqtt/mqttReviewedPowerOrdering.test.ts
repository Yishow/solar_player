import assert from "node:assert/strict";
import test from "node:test";
import {
  initializeDerivedMetricRegistry,
  saveDerivedMetricDefinition
} from "../services/derivedMetricRegistryService.js";
import {
  countRows,
  getDatabase,
  powerSource,
  powerTopic,
  readLive,
  reviewMapping,
  type TestLogger,
  withRuntime
} from "./mqttPowerIngest.test-support.js";

test("F2 a late reviewed power packet cannot rewind the production live measurement", async () => {
  const database = getDatabase();
  reviewMapping(database, powerSource, powerTopic, { path: ["value"] }, "power-ordering-f2");
  initializeDerivedMetricRegistry(database);
  saveDerivedMetricDefinition({
    description: "Power ordering regression",
    enabled: true,
    expression: "source * 2",
    fallbackPolicy: "unavailable",
    inputs: [{ alias: "source", kind: "metric", metricKey: powerSource.metricKey, scope: "kn", unit: "kW" }],
    managed: false,
    metricKey: "custom.powerOrderingDerived",
    name: "Power ordering regression",
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 1,
    revision: 0
  }, database);
  await withRuntime(async (emit) => {
    await emit(powerTopic, { value: 20, timestamp: "2026-09-08T10:02:00Z" });
    const saved = readLive(powerSource.metricScope, powerSource.metricKey);
    assert.deepEqual(saved, {
      quality: "source",
      raw_payload: JSON.stringify({ value: 20, timestamp: "2026-09-08T10:02:00Z" }),
      timestamp: "2026-09-08T10:02:00Z",
      unit: "kW",
      value: 20
    });
    assert.deepEqual(database.prepare(`
      SELECT value FROM derived_metric_evaluations
      WHERE metric_scope = 'kn' AND metric_key = 'custom.powerOrderingDerived'
    `).get(), { value: 40 });
    database.prepare(`
      UPDATE derived_metric_evaluations SET evaluated_at = '2000-01-01T00:00:00.000Z'
      WHERE metric_scope = 'kn' AND metric_key = 'custom.powerOrderingDerived'
    `).run();

    await emit(powerTopic, { value: 5, timestamp: "2026-09-08T10:01:00Z" });
    assert.deepEqual(
      readLive(powerSource.metricScope, powerSource.metricKey),
      saved,
      "a later delivery of an older source observation must preserve the persisted live row"
    );
    assert.equal(
      (database.prepare(`
        SELECT evaluated_at FROM derived_metric_evaluations
        WHERE metric_scope = 'kn' AND metric_key = 'custom.powerOrderingDerived'
      `).get() as { evaluated_at: string }).evaluated_at,
      "2000-01-01T00:00:00.000Z",
      "an ignored power observation must not reevaluate dependent derived metrics"
    );
  });
});

test("reviewed power equal instants preserve the row and diagnose a value conflict", async () => {
  const database = getDatabase();
  reviewMapping(database, powerSource, powerTopic, { path: ["value"] }, "power-ordering-equal");
  const warnings: Array<{ payload: Record<string, unknown>; message?: string }> = [];
  const logger: TestLogger = {
    error: () => undefined,
    info: () => undefined,
    warn: (payload, message) => {
      warnings.push({
        message,
        payload: payload && typeof payload === "object"
          ? payload as Record<string, unknown>
          : {}
      });
    }
  };
  const liveSnapshots: Array<{ metricTimestamp: string | null; snapshotTimestamp: string | null }> = [];
  await withRuntime(async (emit) => {
    await emit(powerTopic, { value: 20, timestamp: "2026-09-08T10:02:00Z" });
    const saved = readLive(powerSource.metricScope, powerSource.metricKey);
    assert.ok(saved);

    await emit(powerTopic, { value: 20, timestamp: "2026-09-08T18:02:00+08:00" });
    assert.deepEqual(readLive(powerSource.metricScope, powerSource.metricKey), saved);

    await emit(powerTopic, { value: 5, timestamp: "2026-09-08T10:02:00Z" });
    assert.deepEqual(readLive(powerSource.metricScope, powerSource.metricKey), saved);
    assert.deepEqual(
      warnings.filter(({ payload }) => payload.code === "REVIEWED_POWER_EQUAL_INSTANT_CONFLICT").map(({ payload }) => payload),
      [{
        candidateTimestamp: "2026-09-08T10:02:00Z",
        candidateUnit: "kW",
        candidateValue: 5,
        code: "REVIEWED_POWER_EQUAL_INSTANT_CONFLICT",
        metricKey: powerSource.metricKey,
        metricScope: powerSource.metricScope,
        persistedTimestamp: "2026-09-08T10:02:00Z",
        persistedUnit: "kW",
        persistedValue: 20,
        topic: powerTopic
      }]
    );
    const conflict = warnings.find(({ payload }) => payload.code === "REVIEWED_POWER_EQUAL_INSTANT_CONFLICT");
    assert.ok(conflict);
    assert.equal(Object.hasOwn(conflict.payload, "rawPayload"), false);
    assert.equal(Object.hasOwn(conflict.payload, "raw_payload"), false);

    reviewMapping(
      database,
      { ...powerSource, inputUnit: "W", sourceRevision: 2 },
      powerTopic,
      { path: ["value"] },
      "power-ordering-equal-unit"
    );
    await emit(powerTopic, { value: 20, timestamp: "2026-09-08T10:02:00Z" });
    assert.deepEqual(readLive(powerSource.metricScope, powerSource.metricKey), saved);
    assert.deepEqual(
      warnings
        .filter(({ payload }) => payload.code === "REVIEWED_POWER_EQUAL_INSTANT_CONFLICT")
        .at(-1)?.payload,
      {
        candidateTimestamp: "2026-09-08T10:02:00Z",
        candidateUnit: "W",
        candidateValue: 20,
        code: "REVIEWED_POWER_EQUAL_INSTANT_CONFLICT",
        metricKey: powerSource.metricKey,
        metricScope: powerSource.metricScope,
        persistedTimestamp: "2026-09-08T10:02:00Z",
        persistedUnit: "kW",
        persistedValue: 20,
        topic: powerTopic
      }
    );
  }, {
    logger,
    socketService: {
      emitCircuitMetrics: () => undefined,
      emitDisplaySync: () => undefined,
      emitLiveMetrics: (_metricScope, snapshot) => {
        liveSnapshots.push({
          metricTimestamp: snapshot.metrics[powerSource.metricKey]?.timestamp ?? null,
          snapshotTimestamp: snapshot.timestamp
        });
      },
      emitMqttStatus: () => undefined,
      emitSystemError: () => undefined,
      emitSystemRecovered: () => undefined
    }
  });
  assert.ok(liveSnapshots.length >= 4);
  assert.ok(liveSnapshots.every(({ metricTimestamp, snapshotTimestamp }) =>
    metricTimestamp === "2026-09-08T10:02:00Z" && snapshotTimestamp === "2026-09-08T10:02:00Z"
  ));
});

test("reviewed power ordering is isolated by destination metric key and site scope", async () => {
  const database = getDatabase();
  const clPower = {
    ...powerSource,
    channelId: "cl-main-power",
    meterId: "cl-main-power",
    metricKey: "sharedPower",
    metricScope: "cl" as const
  };
  const knPower = {
    ...powerSource,
    channelId: "kn-shared-power",
    meterId: "kn-shared-power",
    metricKey: "sharedPower"
  };
  const knAuxiliary = {
    ...powerSource,
    channelId: "kn-auxiliary-power",
    meterId: "kn-auxiliary-power",
    metricKey: "auxiliaryPower"
  };
  const topic = "factory/shared/power";
  reviewMapping(database, clPower, topic, { path: ["value"], tagEquals: "CL" }, "power-ordering-cl");
  reviewMapping(database, knPower, topic, { path: ["value"], tagEquals: "KN" }, "power-ordering-kn");
  reviewMapping(database, knAuxiliary, topic, { path: ["value"], tagEquals: "AUX" }, "power-ordering-aux");

  await withRuntime(async (emit) => {
    await emit(topic, [
      { tag: "CL", value: 10, timestamp: "2026-09-08T10:02:00Z" },
      { tag: "KN", value: 20, timestamp: "2026-09-08T10:01:00Z" },
      { tag: "AUX", value: 30, timestamp: "2026-09-08T10:02:00Z" }
    ]);
    await emit(topic, [
      { tag: "CL", value: 5, timestamp: "2026-09-08T10:01:00Z" },
      { tag: "KN", value: 25, timestamp: "2026-09-08T10:03:00Z" },
      { tag: "AUX", value: 35, timestamp: "2026-09-08T10:01:00Z" }
    ]);

    assert.deepEqual(readLive("cl", "sharedPower"), {
      quality: "source",
      raw_payload: JSON.stringify([
        { tag: "CL", value: 10, timestamp: "2026-09-08T10:02:00Z" },
        { tag: "KN", value: 20, timestamp: "2026-09-08T10:01:00Z" },
        { tag: "AUX", value: 30, timestamp: "2026-09-08T10:02:00Z" }
      ]),
      timestamp: "2026-09-08T10:02:00Z",
      unit: "kW",
      value: 10
    });
    assert.deepEqual(readLive("kn", "sharedPower"), {
      quality: "source",
      raw_payload: JSON.stringify([
        { tag: "CL", value: 5, timestamp: "2026-09-08T10:01:00Z" },
        { tag: "KN", value: 25, timestamp: "2026-09-08T10:03:00Z" },
        { tag: "AUX", value: 35, timestamp: "2026-09-08T10:01:00Z" }
      ]),
      timestamp: "2026-09-08T10:03:00Z",
      unit: "kW",
      value: 25
    });
    assert.deepEqual(readLive("kn", "auxiliaryPower"), {
      quality: "source",
      raw_payload: JSON.stringify([
        { tag: "CL", value: 10, timestamp: "2026-09-08T10:02:00Z" },
        { tag: "KN", value: 20, timestamp: "2026-09-08T10:01:00Z" },
        { tag: "AUX", value: 30, timestamp: "2026-09-08T10:02:00Z" }
      ]),
      timestamp: "2026-09-08T10:02:00Z",
      unit: "kW",
      value: 30
    });
  });
});

test("reviewed power ordering survives a new runtime and source revision for a retained packet", async () => {
  const database = getDatabase();
  reviewMapping(database, powerSource, powerTopic, { path: ["value"] }, "power-ordering-restart");
  const warnings: Array<Record<string, unknown>> = [];
  const logger: TestLogger = {
    error: () => undefined,
    info: () => undefined,
    warn: (payload) => {
      if (payload && typeof payload === "object") {
        warnings.push(payload as Record<string, unknown>);
      }
    }
  };

  await withRuntime(async (emit) => {
    await emit(powerTopic, { value: 20, timestamp: "2026-09-08T10:02:00Z" });
  }, { logger });
  const saved = readLive(powerSource.metricScope, powerSource.metricKey);
  assert.ok(saved);

  database.prepare(`
    UPDATE meter_sources
    SET source_revision = 2
    WHERE metric_scope = ? AND metric_key = ?
  `).run(powerSource.metricScope, powerSource.metricKey);

  await withRuntime(async (emit) => {
    await emit(
      powerTopic,
      { value: 5, timestamp: "2026-09-08T10:01:00Z" },
      { dup: false, qos: 1, retain: true }
    );
  }, { logger });

  assert.deepEqual(readLive(powerSource.metricScope, powerSource.metricKey), saved);
  assert.ok(warnings.some((payload) => payload.code === "REVIEWED_POWER_LATE_OBSERVATION"));
});

test("reviewed power keeps admission evidence for estimates and rejects unsafe timestamp-free packets", async () => {
  const database = getDatabase();
  const estimatedSource = {
    ...powerSource,
    channelId: "kn-estimated-power",
    meterId: "kn-estimated-power",
    metricKey: "estimatedPower"
  };
  const requiredSource = {
    ...powerSource,
    channelId: "kn-required-power",
    meterId: "kn-required-power",
    metricKey: "requiredPower",
    timestampPolicy: "source-required" as const
  };
  reviewMapping(database, estimatedSource, "factory/kn/estimated-power", { path: ["value"] }, "power-ordering-estimate");
  reviewMapping(database, requiredSource, "factory/kn/required-power", { path: ["value"] }, "power-ordering-required");

  await withRuntime(async (emit) => {
    const before = Date.now();
    await emit("factory/kn/estimated-power", { value: 12.5 });
    const after = Date.now();
    const estimated = readLive("kn", "estimatedPower");
    assert.equal(estimated?.quality, "receive-time-estimated");
    assert.ok(estimated && Date.parse(estimated.timestamp) >= before && Date.parse(estimated.timestamp) <= after);

    await emit(
      "factory/kn/required-power",
      { value: 10 },
      { dup: false, qos: 1, retain: true }
    );
    assert.equal(readLive("kn", "requiredPower"), undefined);

    await emit(
      "factory/kn/required-power",
      { value: 9 },
      { dup: true, qos: 1, retain: false }
    );
    assert.equal(readLive("kn", "requiredPower"), undefined);

    await emit(
      "factory/kn/required-power",
      { value: 8 },
      { dup: null, qos: null, retain: null }
    );
    assert.equal(readLive("kn", "requiredPower"), undefined);

    await emit("factory/kn/required-power", { value: 7, timestamp: "2026-09-08T10:02:00Z" }, { dup: false, qos: 1, retain: false });
    assert.equal(readLive("kn", "requiredPower")?.quality, "source");
    assert.equal(countRows("meter_readings_accepted"), 0);
    assert.equal(countRows("meter_readings_quarantine"), 0);
    assert.equal(countRows("meter_live_state"), 0);
  });
});

test("reviewed source-required power rejects a malformed source timestamp before ordering", async () => {
  const database = getDatabase();
  const requiredSource = {
    ...powerSource,
    channelId: "kn-malformed-timestamp-power",
    meterId: "kn-malformed-timestamp-power",
    metricKey: "malformedTimestampPower",
    timestampPolicy: "source-required" as const
  };
  const topic = "factory/kn/malformed-timestamp-power";
  reviewMapping(database, requiredSource, topic, { path: ["value"] }, "power-ordering-malformed-timestamp");

  await withRuntime(async (emit) => {
    await emit(
      topic,
      { value: 10, timestamp: "not-a-source-timestamp" },
      { dup: false, qos: 1, retain: false }
    );

    assert.equal(readLive(requiredSource.metricScope, requiredSource.metricKey), undefined);
    assert.equal(countRows("meter_readings_accepted"), 0);
    assert.equal(countRows("meter_readings_quarantine"), 0);
    assert.equal(countRows("meter_live_state"), 0);
  });
});

test("reviewed power treats an invalid persisted timestamp as no valid prior observation", async () => {
  const database = getDatabase();
  reviewMapping(database, powerSource, powerTopic, { path: ["value"] }, "power-ordering-invalid-prior");
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    powerSource.metricScope,
    powerSource.metricKey,
    99,
    "kW",
    "not-a-valid-timestamp",
    "source",
    JSON.stringify({ value: 99 })
  );

  await withRuntime(async (emit) => {
    await emit(powerTopic, { value: 20, timestamp: "2026-09-08T10:02:00Z" });
    assert.deepEqual(readLive(powerSource.metricScope, powerSource.metricKey), {
      quality: "source",
      raw_payload: JSON.stringify({ value: 20, timestamp: "2026-09-08T10:02:00Z" }),
      timestamp: "2026-09-08T10:02:00Z",
      unit: "kW",
      value: 20
    });
  });
});

test("reviewed power compares SQLite zone-less live timestamps as UTC instants", async () => {
  const database = getDatabase();
  reviewMapping(database, powerSource, powerTopic, { path: ["value"] }, "power-ordering-zone-less");
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    powerSource.metricScope,
    powerSource.metricKey,
    20,
    "kW",
    "2026-09-08 10:02:00",
    "source",
    JSON.stringify({ value: 20 })
  );

  await withRuntime(async (emit) => {
    await emit(powerTopic, { value: 5, timestamp: "2026-09-08T10:01:00Z" });
    assert.deepEqual(readLive(powerSource.metricScope, powerSource.metricKey), {
      quality: "source",
      raw_payload: JSON.stringify({ value: 20 }),
      timestamp: "2026-09-08 10:02:00",
      unit: "kW",
      value: 20
    });
  });
});
