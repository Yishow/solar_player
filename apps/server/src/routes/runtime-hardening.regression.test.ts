import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-runtime-hardening-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { buildApp },
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase }
] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("partial MQTT settings update preserves the stored data mode", async () => {
  const database = getDatabase();
  database.prepare("UPDATE mqtt_settings SET data_mode = 'mock'").run();
  database.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES ('data_mode', 'mock', CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = 'mock', updated_at = CURRENT_TIMESTAMP
  `).run();

  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "PUT",
      payload: { host: "127.0.0.1" },
      url: "/api/settings/mqtt"
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      (database.prepare("SELECT data_mode FROM mqtt_settings LIMIT 1").get() as { data_mode: string }).data_mode,
      "mock"
    );
    assert.equal(
      (database.prepare("SELECT value FROM system_settings WHERE key = 'data_mode'").get() as { value: string }).value,
      "mock"
    );
  } finally {
    await app.close();
  }
});

test("switching MQTT settings to mock seeds mock values immediately", async () => {
  const database = getDatabase();
  database.prepare("UPDATE mqtt_settings SET data_mode = 'mqtt'").run();
  database.prepare("DELETE FROM live_metric_values").run();

  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "PUT",
      payload: { dataMode: "mock" },
      url: "/api/settings/mqtt"
    });

    assert.equal(response.statusCode, 200);
    const row = database
      .prepare("SELECT value, unit FROM live_metric_values WHERE metric_key = 'realTimePower'")
      .get() as { unit: string; value: number } | undefined;
    assert.ok(row);
    assert.equal(row.unit, "kW");
  } finally {
    await app.close();
  }
});

test("bulk playlist duration rejects a missing value without bootstrapping or mutating playlist rows", async () => {
  const database = getDatabase();
  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "PUT",
      payload: {},
      url: "/api/image-playlist/duration-all"
    });

    assert.equal(response.statusCode, 400);
    assert.equal(
      Boolean(
        database.prepare(`
          SELECT name FROM sqlite_master
          WHERE type = 'table' AND name = 'image_playlist_entries'
        `).get()
      ),
      false
    );
  } finally {
    await app.close();
  }
});

test("circuit create rejects negative or inverted thresholds before writing", async () => {
  const database = getDatabase();
  const beforeCount = (
    database.prepare("SELECT COUNT(*) AS count FROM circuit_configs").get() as { count: number }
  ).count;
  const app = await buildApp();

  try {
    const negative = await app.inject({
      method: "POST",
      payload: {
        nameZh: "錯誤迴路",
        ratedCapacity: -10
      },
      url: "/api/circuits"
    });
    assert.equal(negative.statusCode, 400);

    const inverted = await app.inject({
      method: "POST",
      payload: {
        attentionMax: 90,
        attentionMin: 80,
        nameZh: "反向區間",
        normalMax: 70,
        normalMin: 0,
        ratedCapacity: 100,
        warningMax: 95,
        warningMin: 85
      },
      url: "/api/circuits"
    });
    assert.equal(inverted.statusCode, 400);

    const afterCount = (
      database.prepare("SELECT COUNT(*) AS count FROM circuit_configs").get() as { count: number }
    ).count;
    assert.equal(afterCount, beforeCount);
  } finally {
    await app.close();
  }
});
