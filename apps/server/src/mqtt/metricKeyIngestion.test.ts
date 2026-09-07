import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import {
  type DisplaySyncEvent
} from "@solar-display/shared";
import type { MqttClient } from "mqtt";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-ingest-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ MqttClientService }, { migrateDatabase }, { seedDatabase }, { getDatabase, closeDatabaseConnection }, { readLiveMetricsSnapshot, readScopedLiveMetricsSnapshot }, registry] =
  await Promise.all([
    import("./MqttClientService.js"),
    import("../db/migrate.js"),
    import("../db/seed.js"),
    import("../db/index.js"),
    import("../metrics/liveMetrics.js"),
    import("../services/derivedMetricRegistryService.js")
  ]);

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

class FakeMqttClient extends EventEmitter {
  connected = true;

  subscribe(_topics: string[], callback: (error?: Error | null) => void) {
    queueMicrotask(() => callback(null));
    return this;
  }

  unsubscribe(_topics: string[], callback: (error?: Error | null) => void) {
    queueMicrotask(() => callback(null));
    return this;
  }

  end(_force: boolean, _options: Record<string, never>, callback: () => void) {
    callback();
    return this;
  }
}

test("enabled topic mapping ingests under its metric_key without a metric_key whitelist", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database
    .prepare(
      `
        INSERT INTO topic_mappings (
          metric_scope, metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
        ) VALUES ('cl', ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .run("phaseRVoltage", "kuozui/plant/phase/r/voltage", "V", null, 1, 0, 1);

  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: {
      debug: () => undefined,
      error: () => undefined,
      info: () => undefined,
      warn: () => undefined
    }
  });

  try {
    await service.connect();
    client.emit("message", "kuozui/plant/phase/r/voltage", Buffer.from(JSON.stringify({ value: 220.5 })));
    await new Promise((resolve) => setImmediate(resolve));

    const snapshot = readLiveMetricsSnapshot(database);
    assert.ok(snapshot.metrics.phaseRVoltage, "expected phaseRVoltage to be present in the live snapshot");
    assert.equal(snapshot.metrics.phaseRVoltage.value, 220.5);
  } finally {
    await service.disconnect();
  }
});

test("E1 production callback gates retained replay, collision and late samples before generic live writes", async () => {
  migrateDatabase();
  seedDatabase();
  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare("DELETE FROM meter_sources").run();
  database.prepare("DELETE FROM meter_readings_accepted").run();
  database.prepare("DELETE FROM meter_readings_quarantine").run();
  database.prepare("DELETE FROM meter_live_state").run();
  database.prepare(`
    INSERT INTO meter_sources (
      meter_id, channel_id, metric_scope, metric_key, measurement_kind, energy_flow_role,
      input_unit, scale_decimal, source_revision, epoch_id, enabled, review_status,
      source_timestamp_time_zone, timestamp_policy, expected_cadence_seconds, created_at
    ) VALUES ('kn-main', 'main', 'kn', 'consumptionEnergy', 'cumulative-energy', 'consumption',
      'kWh', '1', 1, 'epoch-1', 1, 'reviewed', 'UTC', 'source-required', 60, CURRENT_TIMESTAMP)
  `).run();
  database.prepare(`
    INSERT INTO topic_mappings (
      metric_scope, metric_key, topic, unit, value_path, selector_json,
      multiplier, offset, decimal_places, enabled, created_at, updated_at
    ) VALUES ('kn', 'consumptionEnergy', 'e1/kn/main', 'Wh', '$.value', ?, 99, 7, 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(JSON.stringify({
    path: ["value"],
    tagEquals: "MAIN",
    selectorVersion: 7,
    timestampPath: ["timestamp"]
  }));

  const client = new FakeMqttClient();
  const events: Array<{ late: boolean; sourceTimestamp: string | null }> = [];
  const historyEvents: Array<{ metricScope?: string; scope: string }> = [];
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: { debug: () => undefined, error: () => undefined, info: () => undefined, warn: () => undefined },
    managedSourceAdapters: [],
    socketService: {
      emitDisplaySync: (event) => { if (event.scope === "monitoring-history") historyEvents.push(event); },
      emitLiveMetrics: () => undefined, emitCircuitMetrics: () => undefined, emitMqttStatus: () => undefined,
      emitSystemError: () => undefined, emitSystemRecovered: () => undefined
    },
    meterReadingEventSink: (event) => events.push({ late: event.late, sourceTimestamp: event.sourceTimestamp })
  });
  const publish = async (value: string, timestamp: string | undefined, packet: { dup: boolean; qos: number; retain: boolean }) => {
    client.emit("message", "e1/kn/main", Buffer.from(JSON.stringify({
      tag: "MAIN",
      value,
      ...(timestamp ? { timestamp } : {})
    })), packet);
    await new Promise((resolve) => setImmediate(resolve));
  };

  try {
    await service.connect();
    await publish("10100", "2026-09-01T01:00:00Z", { dup: false, qos: 1, retain: false });
    const firstLive = database.prepare(`
      SELECT value, unit, timestamp FROM live_metric_values
      WHERE metric_scope = 'kn' AND metric_key = 'consumptionEnergy'
    `).get() as { value: number; unit: string; timestamp: string };
    assert.equal(firstLive.value, 10100);
    assert.equal(firstLive.unit, "kWh");
    assert.equal(firstLive.timestamp, "2026-09-01T01:00:00Z");
    assert.deepEqual(events, [{ late: false, sourceTimestamp: "2026-09-01T01:00:00Z" }]);

    for (let index = 0; index < 10; index += 1) {
      await publish("10000", undefined, { dup: index % 2 === 0, qos: 1, retain: true });
    }
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count, 1);
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_quarantine").get() as { count: number }).count, 10);
    assert.deepEqual(
      database.prepare(`SELECT value, timestamp FROM live_metric_values WHERE metric_scope = 'kn' AND metric_key = 'consumptionEnergy'`).get(),
      { value: 10100, timestamp: "2026-09-01T01:00:00Z" }
    );
    assert.equal(events.length, 1);
    assert.equal(historyEvents.length, 1);

    await publish("9999", "2026-09-01T01:00:00Z", { dup: false, qos: 1, retain: false });
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count, 1);
    assert.equal(events.length, 1);
    assert.equal(historyEvents.length, 1);

    await publish("10050", "2026-09-01T00:30:00Z", { dup: false, qos: 1, retain: false });
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count, 2);
    assert.deepEqual(events, [
      { late: false, sourceTimestamp: "2026-09-01T01:00:00Z" },
      { late: true, sourceTimestamp: "2026-09-01T00:30:00Z" }
    ]);
    assert.deepEqual(
      database.prepare(`SELECT value, timestamp FROM live_metric_values WHERE metric_scope = 'kn' AND metric_key = 'consumptionEnergy'`).get(),
      { value: 10100, timestamp: "2026-09-01T01:00:00Z" }
    );

    database.prepare("UPDATE topic_mappings SET selector_json = ? WHERE metric_scope = 'kn'").run(JSON.stringify({
      path: ["value"],
      tagEquals: "WRONG-TAG",
      selectorVersion: 8,
      timestampPath: ["timestamp"]
    }));
    await publish("10300", "2026-09-01T01:03:00Z", { dup: false, qos: 1, retain: false });
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count, 2);
    assert.equal(events.length, 2);
    assert.deepEqual(
      database.prepare(`SELECT value, timestamp FROM live_metric_values WHERE metric_scope = 'kn' AND metric_key = 'consumptionEnergy'`).get(),
      { value: 10100, timestamp: "2026-09-01T01:00:00Z" }
    );

    assert.equal(historyEvents.length, 2);
    assert.ok(historyEvents.every((event) => event.metricScope === "kn"));
    database.prepare("UPDATE topic_mappings SET selector_json = ? WHERE metric_scope = 'kn'")
      .run(JSON.stringify({ path: ["value"], tagEquals: "MAIN", selectorVersion: 7, timestampPath: ["timestamp"] }));
    database.exec(`
      CREATE TRIGGER reject_generic_energy_live
      BEFORE INSERT ON live_metric_values
      BEGIN
        SELECT RAISE(ABORT, 'generic live write rejected');
      END;
    `);
    await publish("10200", "2026-09-01T01:02:00Z", { dup: false, qos: 1, retain: false });
    database.exec("DROP TRIGGER reject_generic_energy_live");
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count, 2);
    assert.equal(events.length, 2);
    assert.deepEqual(
      database.prepare(`SELECT value, timestamp FROM live_metric_values WHERE metric_scope = 'kn' AND metric_key = 'consumptionEnergy'`).get(),
      { value: 10100, timestamp: "2026-09-01T01:00:00Z" }
    );
    assert.equal(historyEvents.length, 2);
    await publish("10200", "2026-09-01T01:02:00Z", { dup: false, qos: 1, retain: false });
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count, 3);
    assert.equal(historyEvents.length, 3);
  } finally {
    await service.disconnect();
  }
});

test("E1 production selector keeps CL and KN decimal records isolated", async () => {
  migrateDatabase();
  seedDatabase();
  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare("DELETE FROM meter_sources").run();
  database.prepare("DELETE FROM meter_readings_accepted").run();
  database.prepare("DELETE FROM meter_readings_quarantine").run();
  database.prepare("DELETE FROM meter_live_state").run();
  const insertSource = database.prepare(`
    INSERT INTO meter_sources (
      meter_id, channel_id, metric_scope, metric_key, measurement_kind, energy_flow_role,
      input_unit, scale_decimal, source_revision, epoch_id, enabled, review_status,
      source_timestamp_time_zone, timestamp_policy, expected_cadence_seconds, created_at
    ) VALUES (?, 'main', ?, 'consumptionEnergy', 'interval-energy', 'consumption',
      'kWh', '1', 1, 'epoch-1', 1, 'reviewed', 'UTC', 'source-required', 60, CURRENT_TIMESTAMP)
  `);
  insertSource.run("cl-main", "cl");
  insertSource.run("kn-main", "kn");
  const insertMapping = database.prepare(`
    INSERT INTO topic_mappings (
      metric_scope, metric_key, topic, unit, value_path, selector_json,
      multiplier, offset, decimal_places, enabled, created_at, updated_at
    ) VALUES (?, 'consumptionEnergy', 'e1/shared', 'Wh', '$.value', ?, 100, 9, 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  insertMapping.run("cl", JSON.stringify({ path: ["value"], tagEquals: "CL", selectorVersion: 3, timestampPath: ["timestamp"] }));
  insertMapping.run("kn", JSON.stringify({ path: ["value"], tagEquals: "KN", selectorVersion: 4, timestampPath: ["timestamp"] }));

  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: { debug: () => undefined, error: () => undefined, info: () => undefined, warn: () => undefined },
    managedSourceAdapters: []
  });
  try {
    await service.connect();
    client.emit("message", "e1/shared", Buffer.from(JSON.stringify([
      { tag: "KN", value: "2.125", timestamp: "2026-09-01T00:00:01Z" },
      { tag: "CL", value: "1.25", timestamp: "2026-09-01T00:00:02Z" }
    ])), { dup: false, qos: 1, retain: false });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(
      database.prepare(`
        SELECT metric_scope, raw_value_decimal, normalized_value_kwh, measurement_kind, selector_version
        FROM meter_readings_accepted ORDER BY metric_scope
      `).all(),
      [
        { metric_scope: "cl", raw_value_decimal: "1.25", normalized_value_kwh: "1.25", measurement_kind: "interval-energy", selector_version: 3 },
        { metric_scope: "kn", raw_value_decimal: "2.125", normalized_value_kwh: "2.125", measurement_kind: "interval-energy", selector_version: 4 }
      ]
    );
    assert.deepEqual(
      database.prepare(`
        SELECT metric_scope, value, unit FROM live_metric_values
        WHERE metric_key = 'consumptionEnergy' ORDER BY metric_scope
      `).all(),
      [
        { metric_scope: "cl", value: 1.25, unit: "kWh" },
        { metric_scope: "kn", value: 2.125, unit: "kWh" }
      ]
    );
  } finally {
    await service.disconnect();
  }
});

test("MQTT source updates evaluate only transitively affected derived metrics", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare(`
    INSERT INTO topic_mappings (
      metric_scope, metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
    ) VALUES
      ('cl', 'realTimePower', 'test/changed-source', 'kW', '$.value', 1, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('cl', 'custom.ingestUnrelatedSource', 'test/unrelated-source', 'kW', '$.value', 1, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition({
    metricKey: "custom.ingestDouble",
    name: "custom.ingestDouble",
    description: "test definition",
    outputScopePolicy: "site",
    expression: "source * 2",
    outputUnit: "kW",
    precision: 1,
    fallbackPolicy: "unavailable",
    enabled: true,
    managed: false,
    revision: 0,
    inputs: [{ alias: "source", kind: "metric", metricKey: "realTimePower", scope: "output-site", unit: "kW" }]
  }, database);
  registry.saveDerivedMetricDefinition({
    metricKey: "custom.ingestQuad",
    name: "custom.ingestQuad",
    description: "test definition",
    outputScopePolicy: "site",
    expression: "upstream * 2",
    outputUnit: "kW",
    precision: 1,
    fallbackPolicy: "unavailable",
    enabled: true,
    managed: false,
    revision: 0,
    inputs: [{ alias: "upstream", kind: "metric", metricKey: "custom.ingestDouble", scope: "output-site", unit: "kW" }]
  }, database);
  registry.saveDerivedMetricDefinition({
    metricKey: "custom.ingestUnrelated",
    name: "custom.ingestUnrelated",
    description: "test definition",
    outputScopePolicy: "site",
    expression: "source * 3",
    outputUnit: "kW",
    precision: 1,
    fallbackPolicy: "unavailable",
    enabled: true,
    managed: false,
    revision: 0,
    inputs: [{ alias: "source", kind: "metric", metricKey: "custom.ingestUnrelatedSource", scope: "cl", unit: "kW" }]
  }, database);

  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: { debug: () => undefined, error: () => undefined, info: () => undefined, warn: () => undefined }
  });

  try {
    await service.connect();
    client.emit("message", "test/unrelated-source", Buffer.from(JSON.stringify({ value: 5 })));
    await new Promise((resolve) => setImmediate(resolve));
    client.emit("message", "test/changed-source", Buffer.from(JSON.stringify({ value: 12 })));
    await new Promise((resolve) => setImmediate(resolve));

    const readEvaluation = () => database.prepare(`
      SELECT * FROM derived_metric_evaluations
      WHERE metric_scope = 'cl' AND metric_key = 'custom.ingestUnrelated'
    `).get();
    const readLive = () => database.prepare(`
      SELECT * FROM live_metric_values
      WHERE metric_scope = 'cl' AND metric_key = 'custom.ingestUnrelated'
    `).get();
    const previousEvaluation = readEvaluation();
    const previousLive = readLive();

    client.emit("message", "test/changed-source", Buffer.from(JSON.stringify({ value: 13 })));
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.ingestDouble", database)?.value, 26);
    assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.ingestQuad", database)?.value, 52);
    assert.deepEqual(readEvaluation(), previousEvaluation);
    assert.deepEqual(readLive(), previousLive);
  } finally {
    await service.disconnect();
  }
});

test("managed adapter rejection does not block an unrelated generic Solar mapping", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare(`
    INSERT INTO topic_mappings (
      metric_scope, metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
    ) VALUES ('cl', 'customSolarDiagnostic', 'solar/XX/summary', 'count', '$.value', 1, 0, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();

  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: { debug: () => undefined, error: () => undefined, info: () => undefined, warn: () => undefined }
  });

  try {
    await service.connect();
    client.emit("message", "solar/XX/summary", Buffer.from(JSON.stringify({ value: 42 })));
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(
      database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = 'customSolarDiagnostic'").pluck().get(),
      42
    );
    assert.deepEqual(service.readSolarSourceManagementSnapshot().errors, [{
      code: "unsupported-site",
      message: "Unsupported Solar site: XX",
      observedAt: service.readSolarSourceManagementSnapshot().errors[0]?.observedAt,
      sourceTopic: "solar/XX/summary"
    }]);
  } finally {
    await service.disconnect();
  }
});

test("one MQTT topic persists CL and KN mappings with the same semantic key independently", async () => {
  migrateDatabase();
  seedDatabase();
  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare(`
    INSERT INTO topic_mappings
      (metric_scope, metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at)
    VALUES ('cl', 'realTimePower', 'shared/power', 'kW', '$.cl', 1, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
           ('kn', 'realTimePower', 'shared/power', 'kW', '$.kn', 1, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => { queueMicrotask(() => client.emit("connect")); return client as unknown as MqttClient; },
    database,
    logger: { debug: () => undefined, error: () => undefined, info: () => undefined, warn: () => undefined }
  });
  try {
    await service.connect();
    client.emit("message", "shared/power", Buffer.from(JSON.stringify({ cl: 12, kn: 34 })));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(
      database.prepare("SELECT metric_scope, metric_key, value FROM live_metric_values WHERE metric_key = 'realTimePower' ORDER BY metric_scope").all(),
      [
        { metric_scope: "cl", metric_key: "realTimePower", value: 12 },
        { metric_scope: "kn", metric_key: "realTimePower", value: 34 }
      ]
    );
  } finally {
    await service.disconnect();
  }
});

test("CL and KN summaries produce canonical generation while a disabled legacy direct topic cannot overwrite it", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("UPDATE mqtt_settings SET message_timeout = 60, data_mode = 'mqtt'").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare(`
    INSERT INTO topic_mappings (
      metric_scope, metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
    ) VALUES ('global', 'totalGeneration', 'legacy/solar/total', 'kWh', '$.value', 1, 0, 3, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();

  const client = new FakeMqttClient();
  const circuitMetricEvents: Array<{ metricKeys: string[]; metricScope: string }> = [];
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: {
      debug: () => undefined,
      error: () => undefined,
      info: () => undefined,
      warn: () => undefined
    },
    socketService: {
      emitCircuitMetrics: (metricScope, snapshot) => {
        circuitMetricEvents.push({ metricKeys: Object.keys(snapshot.metrics), metricScope });
      },
      emitDisplaySync: () => undefined,
      emitLiveMetrics: () => undefined,
      emitMqttStatus: () => undefined,
      emitSystemError: () => undefined,
      emitSystemRecovered: () => undefined
    }
  });
  const clTimestamp = new Date(Date.now() - 10_000).toISOString();
  const knTimestamp = new Date(Date.now() - 20_000).toISOString();

  try {
    await service.connect();
    client.emit("message", "solar/CL/summary", Buffer.from(JSON.stringify({
      factory: "CL",
      today_mwh: 3.49,
      month_mwh: 366.93,
      total_mwh: 9986.306,
      total_power_kw: 120.5,
      timestamp: clTimestamp
    })));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'").get(), undefined);

    client.emit("message", "solar/KN/summary", Buffer.from(JSON.stringify({
      factory: "KN",
      today_mwh: 2.92,
      month_mwh: 265.77,
      total_mwh: 3659.570,
      total_power_kw: 98.2,
      timestamp: knTimestamp
    })));
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(
      database
        .prepare(
          `
            SELECT metric_key, value, unit, timestamp
            FROM live_metric_values
            WHERE metric_scope = 'global'
              AND metric_key IN ('todayGeneration', 'monthGeneration', 'totalGeneration')
            ORDER BY metric_key
          `
        )
        .all(),
      [
        { metric_key: "monthGeneration", value: 632.7, unit: "MWh", timestamp: knTimestamp },
        { metric_key: "todayGeneration", value: 6.41, unit: "MWh", timestamp: knTimestamp },
        { metric_key: "totalGeneration", value: 13645.876, unit: "MWh", timestamp: knTimestamp }
      ]
    );

    client.emit("message", "legacy/solar/total", Buffer.from(JSON.stringify({ value: 999999999 })));
    client.emit("message", "solar/CL/today_mwh", Buffer.from(JSON.stringify({ value: 999999999 })));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(
      database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'").pluck().get(),
      13645.876
    );
    assert.equal(
      database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = 'factoryGeneration.todayMwh'").pluck().get(),
      3.49
    );
    assert.deepEqual(circuitMetricEvents, [
      {
        metricKeys: [
          "factoryGeneration.powerKw",
          "factoryGeneration.todayMwh",
          "factoryGeneration.monthMwh",
          "factoryGeneration.totalMwh"
        ],
        metricScope: "cl"
      },
      {
        metricKeys: [
          "factoryGeneration.powerKw",
          "factoryGeneration.todayMwh",
          "factoryGeneration.monthMwh",
          "factoryGeneration.totalMwh"
        ],
        metricScope: "kn"
      }
    ]);
  } finally {
    await service.disconnect();
  }
});

test("managed CL and KN summaries update canonical generation without generic mappings", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare("UPDATE mqtt_settings SET message_timeout = 60, data_mode = 'mqtt'").run();
  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: {
      debug: () => undefined,
      error: () => undefined,
      info: () => undefined,
      warn: () => undefined
    }
  });
  const clTimestamp = new Date(Date.now() - 10_000).toISOString();
  const knTimestamp = new Date(Date.now() - 20_000).toISOString();

  try {
    await service.connect();
    client.emit("message", "solar/CL/summary", Buffer.from(JSON.stringify({
      factory: "CL",
      month_mwh: 366.93,
      timestamp: clTimestamp,
      today_mwh: 3.49,
      total_mwh: 9986.306,
      total_power_kw: 120.5
    })));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(
      database.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'").get(),
      undefined
    );

    client.emit("message", "solar/KN/summary", Buffer.from(JSON.stringify({
      factory: "KN",
      month_mwh: 265.77,
      timestamp: knTimestamp,
      today_mwh: 2.92,
      total_mwh: 3659.57,
      total_power_kw: 98.2
    })));
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(
      database.prepare(`
        SELECT metric_key, value, unit, timestamp
        FROM live_metric_values
        WHERE metric_scope = 'global'
          AND metric_key IN ('todayGeneration', 'monthGeneration', 'totalGeneration')
        ORDER BY metric_key
      `).all(),
      [
        { metric_key: "monthGeneration", timestamp: knTimestamp, unit: "MWh", value: 632.7 },
        { metric_key: "todayGeneration", timestamp: knTimestamp, unit: "MWh", value: 6.41 },
        { metric_key: "totalGeneration", timestamp: knTimestamp, unit: "MWh", value: 13645.876 }
      ]
    );
  } finally {
    await service.disconnect();
  }
});

test("mapped MQTT live metrics publish playback sync only when runtime availability changes", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  const requiredMetricKeys = ["realTimePower", "todayGeneration", "totalGeneration"];
  const insertTopicMapping = database.prepare(
    `
      INSERT INTO topic_mappings (
      metric_scope, metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
    ) VALUES ('cl', ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
  );
  for (const metricKey of requiredMetricKeys) {
    insertTopicMapping.run(metricKey, "kuozui/plant/overview/runtime", "kW", null, 1, 0, 2);
  }

  const client = new FakeMqttClient();
  const displaySyncEvents: Array<Pick<DisplaySyncEvent, "reason" | "scope">> = [];
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: {
      debug: () => undefined,
      error: () => undefined,
      info: () => undefined,
      warn: () => undefined
    },
    socketService: {
      emitCircuitMetrics: () => undefined,
      emitDisplaySync: (event) => {
        displaySyncEvents.push(event);
      },
      emitLiveMetrics: () => undefined,
      emitMqttStatus: () => undefined,
      emitSystemError: () => undefined,
      emitSystemRecovered: () => undefined
    }
  });

  try {
    await service.connect();
    client.emit("message", "kuozui/plant/overview/runtime", Buffer.from(JSON.stringify({ value: 3842 })));
    await new Promise((resolve) => setImmediate(resolve));
    client.emit("message", "kuozui/plant/overview/runtime", Buffer.from(JSON.stringify({ value: 4001 })));
    await new Promise((resolve) => setImmediate(resolve));

    const snapshot = readScopedLiveMetricsSnapshot("cl", database);
    assert.equal(snapshot.metrics.todayGeneration?.value, 4001);
    assert.deepEqual(
      displaySyncEvents.map((event) => ({ reason: event.reason, scope: event.scope })),
      [{ reason: "mqtt-live-runtime-availability-updated", scope: "mqtt" }]
    );
  } finally {
    await service.disconnect();
  }
});

test("factory generation summary publishes playback sync when fresh data replaces an existing summary", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare("UPDATE mqtt_settings SET message_timeout = 60, data_mode = 'mqtt'").run();
  const client = new FakeMqttClient();
  const displaySyncEvents: Array<Pick<DisplaySyncEvent, "reason" | "scope">> = [];
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: {
      debug: () => undefined,
      error: () => undefined,
      info: () => undefined,
      warn: () => undefined
    },
    socketService: {
      emitCircuitMetrics: () => undefined,
      emitDisplaySync: (event) => {
        displaySyncEvents.push(event);
      },
      emitLiveMetrics: () => undefined,
      emitMqttStatus: () => undefined,
      emitSystemError: () => undefined,
      emitSystemRecovered: () => undefined
    }
  });

  try {
    await service.connect();
    client.emit("message", "solar/CL/summary", Buffer.from(JSON.stringify({
      factory: "CL",
      month_mwh: 2345,
      timestamp: new Date(Date.now() - 120_000).toISOString(),
      today_mwh: 123.4,
      total_mwh: 45678,
      total_power_kw: 120.5
    })));
    await new Promise((resolve) => setImmediate(resolve));
    displaySyncEvents.length = 0;

    client.emit("message", "solar/CL/summary", Buffer.from(JSON.stringify({
      factory: "CL",
      month_mwh: 2345,
      timestamp: new Date().toISOString(),
      today_mwh: 123.4,
      total_mwh: 45678,
      total_power_kw: 120.5
    })));
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(
      displaySyncEvents.map((event) => ({ reason: event.reason, scope: event.scope })),
      [{ reason: "mqtt-factory-generation-updated", scope: "mqtt" }]
    );
  } finally {
    await service.disconnect();
  }
});

test("solar runtime availability accepts derived self consumption inputs", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  const insertTopicMapping = database.prepare(
    `
      INSERT INTO topic_mappings (
        metric_scope, metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
      ) VALUES ('cl', ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
  );
  for (const metricKey of [
    "realTimePower",
    "factoryGeneration.cl.todayMwh",
    "factoryGeneration.cl.monthMwh",
    "factoryGeneration.cl.totalMwh",
    "factoryGeneration.kn.todayMwh",
    "factoryGeneration.kn.monthMwh",
    "factoryGeneration.kn.totalMwh",
    "selfConsumptionEnergy",
    "consumptionEnergy",
    "systemEfficiency"
  ]) {
    insertTopicMapping.run(metricKey, "kuozui/plant/solar/runtime", "kW", null, 1, 0, 2);
  }
  const timestamp = "2026-07-07T00:00:00.000Z";
  const insertLiveMetric = database.prepare(
    `
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES (?, ?, ?, ?, ?, 'good', '{}')
    `
  );
  for (const metricKey of [
    "realTimePower",
    "todayGeneration",
    "totalGeneration",
    "factoryGeneration.cl.todayMwh",
    "factoryGeneration.cl.monthMwh",
    "factoryGeneration.cl.totalMwh",
    "factoryGeneration.kn.todayMwh",
    "factoryGeneration.kn.monthMwh",
    "factoryGeneration.kn.totalMwh",
    "selfConsumptionEnergy",
    "consumptionEnergy"
  ]) {
    insertLiveMetric.run("cl", metricKey, 1, "kW", timestamp);
  }

  const client = new FakeMqttClient();
  const displaySyncEvents: Array<Pick<DisplaySyncEvent, "reason" | "scope">> = [];
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: {
      debug: () => undefined,
      error: () => undefined,
      info: () => undefined,
      warn: () => undefined
    },
    socketService: {
      emitCircuitMetrics: () => undefined,
      emitDisplaySync: (event) => {
        displaySyncEvents.push(event);
      },
      emitLiveMetrics: () => undefined,
      emitMqttStatus: () => undefined,
      emitSystemError: () => undefined,
      emitSystemRecovered: () => undefined
    }
  });

  try {
    await service.connect();
    client.emit("message", "kuozui/plant/solar/runtime", Buffer.from(JSON.stringify({ value: 3842 })));
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(
      displaySyncEvents.map((event) => ({ reason: event.reason, scope: event.scope })),
      [{ reason: "mqtt-live-runtime-availability-updated", scope: "mqtt" }]
    );
  } finally {
    await service.disconnect();
  }
});

test("managed Solar summaries evaluate only dependent derived metrics", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare("DELETE FROM derived_metric_evaluations").run();
  database.prepare("DELETE FROM derived_metric_definitions").run();
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'realTimePower', 5, 'kW', '2026-08-30T08:00:00.000Z', 'good', '{}')
  `).run();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition({
    metricKey: "custom.managedSummaryUnrelated",
    name: "custom.managedSummaryUnrelated",
    description: "test definition",
    outputScopePolicy: "site",
    expression: "source * 2",
    outputUnit: "kW",
    precision: 1,
    fallbackPolicy: "unavailable",
    enabled: true,
    managed: false,
    revision: 0,
    inputs: [{ alias: "source", kind: "metric", metricKey: "realTimePower", scope: "cl", unit: "kW" }]
  }, database);
  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: { debug: () => undefined, error: () => undefined, info: () => undefined, warn: () => undefined }
  });

  try {
    await service.connect();
    const readUnrelated = () => database.prepare(`
      SELECT * FROM derived_metric_evaluations
      WHERE metric_scope = 'cl' AND metric_key = 'custom.managedSummaryUnrelated'
    `).get();
    const previous = readUnrelated();
    client.emit("message", "solar/CL/summary", Buffer.from(JSON.stringify({
      factory: "CL",
      month_mwh: 366.93,
      timestamp: "2026-08-30T08:00:10.000Z",
      today_mwh: 3.49,
      total_mwh: 9986.306,
      total_power_kw: 120.5
    })));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(readUnrelated(), previous);
  } finally {
    await service.disconnect();
  }
});

test("generic factory generation mappings evaluate only affected derived metrics", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare("DELETE FROM derived_metric_evaluations").run();
  database.prepare("DELETE FROM derived_metric_definitions").run();
  database.prepare(`
    INSERT INTO topic_mappings (
      metric_scope, metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
    ) VALUES
      ('cl', 'factoryGeneration.powerKw', 'test/factory-generation', 'kW', '$.value', 1, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('cl', 'custom.factoryUnrelatedSource', 'test/factory-unrelated', 'kW', '$.value', 1, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition({
    metricKey: "custom.factoryUnrelated",
    name: "custom.factoryUnrelated",
    description: "test definition",
    outputScopePolicy: "site",
    expression: "source * 2",
    outputUnit: "kW",
    precision: 1,
    fallbackPolicy: "unavailable",
    enabled: true,
    managed: false,
    revision: 0,
    inputs: [{ alias: "source", kind: "metric", metricKey: "custom.factoryUnrelatedSource", scope: "cl", unit: "kW" }]
  }, database);
  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: { debug: () => undefined, error: () => undefined, info: () => undefined, warn: () => undefined }
  });

  try {
    await service.connect();
    client.emit("message", "test/factory-unrelated", Buffer.from(JSON.stringify({ value: 5 })));
    await new Promise((resolve) => setImmediate(resolve));
    const readUnrelated = () => database.prepare(`
      SELECT * FROM derived_metric_evaluations
      WHERE metric_scope = 'cl' AND metric_key = 'custom.factoryUnrelated'
    `).get();
    const previous = readUnrelated();
    client.emit("message", "test/factory-generation", Buffer.from(JSON.stringify({ value: 42 })));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(readUnrelated(), previous);
  } finally {
    await service.disconnect();
  }
});

test("failed MQTT mappings do not reevaluate their dependent rows", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare("DELETE FROM derived_metric_evaluations").run();
  database.prepare("DELETE FROM derived_metric_definitions").run();
  database.prepare(`
    INSERT INTO topic_mappings (
      metric_scope, metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
    ) VALUES
      ('cl', 'custom.multiSuccessSource', 'test/multi-mapping', 'kW', '$.value', 1, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('cl', 'custom.multiFailedSource', 'test/multi-mapping', 'kW', '$.missing', 1, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  registry.initializeDerivedMetricRegistry(database);
  for (const [metricKey, sourceKey] of [
    ["custom.multiSuccess", "custom.multiSuccessSource"],
    ["custom.multiFailed", "custom.multiFailedSource"]
  ] as const) {
    registry.saveDerivedMetricDefinition({
      metricKey,
      name: metricKey,
      description: "test definition",
      outputScopePolicy: "site",
      expression: "source * 2",
      outputUnit: "kW",
      precision: 1,
      fallbackPolicy: "unavailable",
      enabled: true,
      managed: false,
      revision: 0,
      inputs: [{ alias: "source", kind: "metric", metricKey: sourceKey, scope: "cl", unit: "kW" }]
    }, database);
  }
  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: { debug: () => undefined, error: () => undefined, info: () => undefined, warn: () => undefined }
  });

  try {
    await service.connect();
    client.emit("message", "test/multi-mapping", Buffer.from(JSON.stringify({ value: 5 })));
    await new Promise((resolve) => setImmediate(resolve));
    const readFailed = () => database.prepare(`
      SELECT * FROM derived_metric_evaluations
      WHERE metric_scope = 'cl' AND metric_key = 'custom.multiFailed'
    `).get();
    const previousFailed = readFailed();
    assert.ok(previousFailed);
    client.emit("message", "test/multi-mapping", Buffer.from(JSON.stringify({ value: 6 })));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.multiSuccess", database)?.value, 12);
    assert.deepEqual(readFailed(), previousFailed);
  } finally {
    await service.disconnect();
  }
});

test("omitted optional summary identities preserve last-good dependencies", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare("DELETE FROM derived_metric_evaluations").run();
  database.prepare("DELETE FROM derived_metric_definitions").run();
  registry.initializeDerivedMetricRegistry(database);
  registry.saveDerivedMetricDefinition({
    metricKey: "custom.summaryTotal",
    name: "custom.summaryTotal",
    description: "test definition",
    outputScopePolicy: "site",
    expression: "source * 2",
    outputUnit: "MWh",
    precision: 1,
    fallbackPolicy: "unavailable",
    enabled: true,
    managed: false,
    revision: 0,
    inputs: [{ alias: "source", kind: "metric", metricKey: "factoryGeneration.totalMwh", scope: "cl", unit: "MWh" }]
  }, database);
  for (const [metricKey, sourceKey] of [
    ["custom.summaryToday", "factoryGeneration.todayMwh"],
    ["custom.summaryMonth", "factoryGeneration.monthMwh"]
  ] as const) {
    registry.saveDerivedMetricDefinition({
      metricKey,
      name: metricKey,
      description: "test definition",
      outputScopePolicy: "site",
      expression: "source * 2",
      outputUnit: "MWh",
      precision: 1,
      fallbackPolicy: "unavailable",
      enabled: true,
      managed: false,
      revision: 0,
      inputs: [{ alias: "source", kind: "metric", metricKey: sourceKey, scope: "cl", unit: "MWh" }]
    }, database);
  }
  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database,
    logger: { debug: () => undefined, error: () => undefined, info: () => undefined, warn: () => undefined }
  });
  const firstTimestamp = new Date(Date.now() - 3_000).toISOString();
  const secondTimestamp = new Date(Date.now() - 1_000).toISOString();

  try {
    await service.connect();
    for (const [site, timestamp, total] of [
      ["CL", firstTimestamp, 10],
      ["KN", firstTimestamp, 20]
    ] as const) {
      client.emit("message", `solar/${site}/summary`, Buffer.from(JSON.stringify({
        factory: site,
        month_mwh: 2,
        timestamp,
        today_mwh: 1,
        total_mwh: total,
        total_power_kw: 5
      })));
      await new Promise((resolve) => setImmediate(resolve));
    }
    registry.evaluateDerivedMetrics(database, new Date());
    assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.summaryTotal", database)?.status, "ready");
    assert.equal(database.prepare(`
      SELECT value FROM live_metric_values
      WHERE metric_scope = 'cl' AND metric_key = 'custom.summaryTotal'
    `).pluck().get(), 20);
    assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.summaryToday", database)?.value, 2);
    assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.summaryMonth", database)?.value, 4);
    const previousTotalSource = database.prepare(`
      SELECT * FROM live_metric_values
      WHERE metric_scope = 'cl' AND metric_key = 'factoryGeneration.totalMwh'
    `).get();
    const previousTotalEvaluation = registry.readDerivedMetricEvaluation(
      "cl",
      "custom.summaryTotal",
      database
    );
    const previousTotalLive = database.prepare(`
      SELECT * FROM live_metric_values
      WHERE metric_scope = 'cl' AND metric_key = 'custom.summaryTotal'
    `).get();
    const previousGlobalEvaluation = registry.readDerivedMetricEvaluation(
      "global",
      "totalGeneration",
      database
    );
    const previousGlobalLive = database.prepare(`
      SELECT * FROM live_metric_values
      WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'
    `).get();

    client.emit("message", "solar/CL/summary", Buffer.from(JSON.stringify({
      factory: "CL",
      month_mwh: 3,
      timestamp: secondTimestamp,
      today_mwh: 2,
      total_power_kw: 6
    })));
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(database.prepare(`
      SELECT * FROM live_metric_values
      WHERE metric_scope = 'cl' AND metric_key = 'factoryGeneration.totalMwh'
    `).get(), previousTotalSource);
    assert.equal(database.prepare(`
      SELECT value FROM live_metric_values
      WHERE metric_scope = 'cl' AND metric_key = 'factoryGeneration.todayMwh'
    `).pluck().get(), 2);
    assert.equal(database.prepare(`
      SELECT value FROM live_metric_values
      WHERE metric_scope = 'cl' AND metric_key = 'factoryGeneration.monthMwh'
    `).pluck().get(), 3);
    assert.deepEqual(
      registry.readDerivedMetricEvaluation("cl", "custom.summaryTotal", database),
      previousTotalEvaluation
    );
    assert.deepEqual(database.prepare(`
      SELECT * FROM live_metric_values
      WHERE metric_scope = 'cl' AND metric_key = 'custom.summaryTotal'
    `).get(), previousTotalLive);
    assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.summaryToday", database)?.value, 4);
    assert.equal(registry.readDerivedMetricEvaluation("cl", "custom.summaryMonth", database)?.value, 6);
    assert.deepEqual(
      registry.readDerivedMetricEvaluation("global", "totalGeneration", database),
      previousGlobalEvaluation
    );
    assert.deepEqual(database.prepare(`
      SELECT * FROM live_metric_values
      WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'
    `).get(), previousGlobalLive);
  } finally {
    await service.disconnect();
  }
});
