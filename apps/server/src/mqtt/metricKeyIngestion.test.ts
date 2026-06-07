import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import type { MqttClient } from "mqtt";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-ingest-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ MqttClientService }, { migrateDatabase }, { seedDatabase }, { getDatabase }, { readLiveMetricsSnapshot }] =
  await Promise.all([
    import("./MqttClientService.js"),
    import("../db/migrate.js"),
    import("../db/seed.js"),
    import("../db/index.js"),
    import("../metrics/liveMetrics.js")
  ]);

after(() => {
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
