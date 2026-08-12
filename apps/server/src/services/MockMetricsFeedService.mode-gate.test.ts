import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { MockMetricsFeedService } from "./MockMetricsFeedService.js";

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(`
    CREATE TABLE mqtt_settings (
      data_mode TEXT NOT NULL
    );
    INSERT INTO mqtt_settings (data_mode) VALUES ('mqtt');

    CREATE TABLE live_metric_values (
      metric_key TEXT PRIMARY KEY,
      value REAL,
      unit TEXT,
      timestamp DATETIME,
      quality TEXT,
      raw_payload TEXT
    );
  `);
  return database;
}

test("MockMetricsFeedService gates scheduled writes by the current persisted data mode", () => {
  const database = createDatabase();
  const service = new MockMetricsFeedService({
    database,
    now: () => new Date(2026, 7, 12, 12, 0, 0)
  });

  assert.equal(service.writeReadingIfMockMode(), false);
  assert.equal(
    (database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get() as { count: number }).count,
    0
  );

  database.prepare("UPDATE mqtt_settings SET data_mode = 'mock'").run();
  assert.equal(service.writeReadingIfMockMode(), true);
  assert.equal(
    (database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get() as { count: number }).count,
    14
  );

  database.prepare("UPDATE mqtt_settings SET data_mode = 'mqtt'").run();
  database.prepare("UPDATE live_metric_values SET value = 12345 WHERE metric_key = 'realTimePower'").run();
  assert.equal(service.writeReadingIfMockMode(), false);
  assert.equal(
    (database.prepare("SELECT value FROM live_metric_values WHERE metric_key = 'realTimePower'").get() as { value: number }).value,
    12345
  );

  database.close();
});
