import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import {
  resolveLiveMetricKeysForPage,
  type DisplaySyncEvent
} from "@solar-display/shared";
import type { MqttClient } from "mqtt";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-ingest-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ MqttClientService }, { migrateDatabase }, { seedDatabase }, { getDatabase, closeDatabaseConnection }, { readLiveMetricsSnapshot }] =
  await Promise.all([
    import("./MqttClientService.js"),
    import("../db/migrate.js"),
    import("../db/seed.js"),
    import("../db/index.js"),
    import("../metrics/liveMetrics.js")
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
          metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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

test("CL and KN summaries produce canonical generation while a disabled legacy direct topic cannot overwrite it", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("UPDATE mqtt_settings SET message_timeout = 60, data_mode = 'mqtt'").run();
  database.prepare("DELETE FROM topic_mappings WHERE metric_key = 'totalGeneration'").run();
  database.prepare(`
    INSERT INTO topic_mappings (
      metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
    ) VALUES ('totalGeneration', 'legacy/solar/total', 'kWh', '$.value', 1, 0, 3, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();

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
      today_mwh: 3.49,
      month_mwh: 366.93,
      total_mwh: 9986.306,
      timestamp: clTimestamp
    })));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(database.prepare("SELECT value FROM live_metric_values WHERE metric_key = 'totalGeneration'").get(), undefined);

    client.emit("message", "solar/KN/summary", Buffer.from(JSON.stringify({
      today_mwh: 2.92,
      month_mwh: 265.77,
      total_mwh: 3659.570,
      timestamp: knTimestamp
    })));
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(
      database
        .prepare(
          `
            SELECT metric_key, value, unit, timestamp
            FROM live_metric_values
            WHERE metric_key IN ('todayGeneration', 'monthGeneration', 'totalGeneration')
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
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(
      database.prepare("SELECT value FROM live_metric_values WHERE metric_key = 'totalGeneration'").pluck().get(),
      13645.876
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
  const requiredMetricKeys = resolveLiveMetricKeysForPage("overview");
  const insertTopicMapping = database.prepare(
    `
      INSERT INTO topic_mappings (
        metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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

    const snapshot = readLiveMetricsSnapshot(database);
    assert.equal(snapshot.metrics["factoryGeneration.cl.todayMwh"]?.value, 4001);
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
  const insertTopicMapping = database.prepare(
    `
      INSERT INTO topic_mappings (
        metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
      ) VALUES (?, 'solar/CL/summary', 'MWh', ?, 1, 0, 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
  );
  insertTopicMapping.run("factoryGeneration.cl.todayMwh", "$.today_mwh");
  insertTopicMapping.run("factoryGeneration.cl.monthMwh", "$.month_mwh");
  insertTopicMapping.run("factoryGeneration.cl.totalMwh", "$.total_mwh");
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
      month_mwh: 2345,
      timestamp: new Date(Date.now() - 120_000).toISOString(),
      today_mwh: 123.4,
      total_mwh: 45678
    })));
    await new Promise((resolve) => setImmediate(resolve));
    displaySyncEvents.length = 0;

    client.emit("message", "solar/CL/summary", Buffer.from(JSON.stringify({
      month_mwh: 2345,
      timestamp: new Date().toISOString(),
      today_mwh: 123.4,
      total_mwh: 45678
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
        metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
      INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES (?, ?, ?, ?, 'good', '{}')
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
    insertLiveMetric.run(metricKey, 1, "kW", timestamp);
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
