import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-scoped-metric-migration-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ closeDatabaseConnection, getDatabase }, { migrateDatabase }] = await Promise.all([
  import("../index.js"),
  import("../migrate.js")
]);

const legacyTables = [
  "topic_mappings",
  "live_metric_values",
  "metric_snapshots",
  "daily_energy_summaries",
  "cumulative_counters",
  "display_value_overrides"
];

function resetLegacyDatabase() {
  closeDatabaseConnection();
  rmSync(process.env.DATABASE_PATH!, { force: true });
  rmSync(`${process.env.DATABASE_PATH}-shm`, { force: true });
  rmSync(`${process.env.DATABASE_PATH}-wal`, { force: true });

  // Apply all migrations that exist today, then replace the six affected tables
  // with their pre-scope shapes. The pending scoped migration is the only thing
  // this fixture is intended to exercise.
  migrateDatabase();
  const database = getDatabase();
  database.prepare("DELETE FROM schema_migrations WHERE version = '035_scoped_metric_identity'").run();
  database.exec(legacyTables.map((table) => `DROP TABLE ${table}`).join(";"));
  database.exec(`
    CREATE TABLE topic_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_key TEXT NOT NULL,
      topic TEXT NOT NULL,
      unit TEXT,
      value_path TEXT,
      multiplier REAL DEFAULT 1,
      offset REAL DEFAULT 0,
      decimal_places INTEGER DEFAULT 2,
      enabled BOOLEAN DEFAULT 1,
      created_at DATETIME,
      updated_at DATETIME
    );
    CREATE TABLE live_metric_values (
      metric_key TEXT PRIMARY KEY,
      value REAL,
      unit TEXT,
      timestamp DATETIME,
      quality TEXT,
      raw_payload TEXT
    );
    CREATE TABLE metric_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generation_power REAL,
      generation REAL,
      consumption REAL,
      self_consumption REAL,
      co2 REAL,
      ratio REAL,
      efficiency REAL,
      captured_at DATETIME
    );
    CREATE TABLE daily_energy_summaries (
      date TEXT PRIMARY KEY,
      generation_total REAL,
      consumption_total REAL,
      self_consumption_total REAL,
      co2_total REAL,
      peak_generation REAL,
      peak_generation_time DATETIME,
      peak_consumption REAL,
      peak_consumption_time DATETIME
    );
    CREATE TABLE cumulative_counters (
      metric_key TEXT PRIMARY KEY,
      total_value REAL,
      last_updated DATETIME,
      reset_count INTEGER DEFAULT 0
    );
    CREATE TABLE display_value_overrides (
      target_id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      display_value REAL NOT NULL,
      unit TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      reason TEXT,
      expires_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return database;
}

function seedLegacySiteDatabase(site: "cl" | "kn") {
  const database = resetLegacyDatabase();
  const topicMetricKey = site === "cl"
    ? "factoryStampingPower"
    : "factoryCircuit.guanyin.stampingPower";
  const topic = site === "cl" ? "factory/power/stamping" : "factory/guanyin/power/stamping";
  const rawPayload = JSON.stringify({ value: site === "cl" ? 12 : 34, site });

  database.prepare(`
    INSERT INTO topic_mappings
      (metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at)
    VALUES (?, ?, 'kW', '$.value', 1, 0, 2, 1, ?, ?)
  `).run(topicMetricKey, topic, "2026-08-29T00:00:00.000Z", "2026-08-29T00:00:01.000Z");
  database.prepare(`
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('realTimePower', ?, 'kW', '2026-08-29T00:00:02.000Z', 'good', ?)
  `).run(site === "cl" ? 12 : 34, rawPayload);
  database.prepare(`
    INSERT INTO metric_snapshots
      (generation_power, generation, consumption, self_consumption, co2, ratio, efficiency, captured_at)
    VALUES (?, 100, 80, 20, 10, 0.2, 0.95, '2026-08-29T00:00:03.000Z')
  `).run(site === "cl" ? 12 : 34);
  database.prepare(`
    INSERT INTO daily_energy_summaries
      (date, generation_total, consumption_total, self_consumption_total, co2_total, peak_generation, peak_generation_time, peak_consumption, peak_consumption_time)
    VALUES ('2026-08-29', 100, 80, 20, 10, 12, '2026-08-29T12:00:00.000Z', 80, '2026-08-29T13:00:00.000Z')
  `).run();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
    VALUES ('totalGeneration', ?, '2026-08-29T00:00:04.000Z', 1)
  `).run(site === "cl" ? 1000 : 2000);
  database.prepare(`
    INSERT INTO display_value_overrides
      (target_id, page_id, card_id, metric_key, display_value, unit, enabled, reason, expires_at, updated_at)
    VALUES ('overview:realTimePower', 'overview', 'power', 'realTimePower', ?, 'kW', 1, 'legacy fixture', NULL, '2026-08-29T00:00:05.000Z')
  `).run(site === "cl" ? 99 : 199);
  return database;
}

function assertScopedSchemaAndRows(site: "cl" | "kn") {
  const database = getDatabase();
  const expectedTopicKey = "factoryCircuit.stampingPower";
  assert.ok(database.prepare("SELECT 1 FROM pragma_table_info('topic_mappings') WHERE name = 'metric_scope'").get());
  assert.ok(database.prepare("SELECT 1 FROM pragma_table_info('live_metric_values') WHERE name = 'metric_scope'").get());
  assert.ok(database.prepare("SELECT 1 FROM pragma_table_info('metric_snapshots') WHERE name = 'metric_scope'").get());
  assert.ok(database.prepare("SELECT 1 FROM pragma_table_info('daily_energy_summaries') WHERE name = 'metric_scope'").get());
  assert.ok(database.prepare("SELECT 1 FROM pragma_table_info('cumulative_counters') WHERE name = 'metric_scope'").get());
  assert.ok(database.prepare("SELECT 1 FROM pragma_table_info('display_value_overrides') WHERE name = 'metric_scope'").get());

  assert.deepEqual(
    database.prepare("SELECT metric_scope, metric_key, topic FROM topic_mappings").get(),
    { metric_scope: site, metric_key: expectedTopicKey, topic: site === "cl" ? "factory/power/stamping" : "factory/guanyin/power/stamping" }
  );
  assert.deepEqual(
    database.prepare("SELECT metric_scope, metric_key, value, quality, raw_payload FROM live_metric_values").get(),
    { metric_scope: site, metric_key: "realTimePower", value: site === "cl" ? 12 : 34, quality: "good", raw_payload: JSON.stringify({ value: site === "cl" ? 12 : 34, site }) }
  );
  assert.equal((database.prepare("SELECT metric_scope FROM metric_snapshots").get() as { metric_scope: string } | undefined)?.metric_scope, site);
  assert.equal((database.prepare("SELECT metric_scope FROM daily_energy_summaries").get() as { metric_scope: string } | undefined)?.metric_scope, site);
  assert.deepEqual(
    database.prepare("SELECT metric_scope, metric_key, total_value, last_updated, reset_count FROM cumulative_counters").get(),
    { metric_scope: site, metric_key: "totalGeneration", total_value: site === "cl" ? 1000 : 2000, last_updated: "2026-08-29T00:00:04.000Z", reset_count: 1 }
  );
  assert.deepEqual(
    database.prepare("SELECT metric_scope, target_id, display_value, updated_at FROM display_value_overrides").get(),
    { metric_scope: site, target_id: "overview:realTimePower", display_value: site === "cl" ? 99 : 199, updated_at: "2026-08-29T00:00:05.000Z" }
  );
}

beforeEach(() => {
  resetLegacyDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("migrates a legacy CL-only database into scoped identities when explicitly assigned CL", () => {
  seedLegacySiteDatabase("cl");
  migrateDatabase({ legacySiteScope: "cl" });
  assertScopedSchemaAndRows("cl");
});

test("migrates a legacy KN-only database into scoped identities when explicitly assigned KN", () => {
  seedLegacySiteDatabase("kn");
  migrateDatabase({ legacySiteScope: "kn" });
  assertScopedSchemaAndRows("kn");
});

test("refuses mixed legacy site data with unscoped history when no explicit legacy scope is supplied", () => {
  const database = resetLegacyDatabase();
  database.prepare(`
    INSERT INTO topic_mappings (metric_key, topic, unit, enabled)
    VALUES ('factoryStampingPower', 'factory/power/stamping', 'kW', 1),
           ('factoryCircuit.guanyin.stampingPower', 'factory/guanyin/power/stamping', 'kW', 1)
  `).run();
  database.prepare(`
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('realTimePower', 12, 'kW', '2026-08-29T00:00:02.000Z', 'good', '{"site":"unknown"}')
  `).run();
  database.prepare("INSERT INTO metric_snapshots (generation_power, captured_at) VALUES (12, '2026-08-29T00:00:03.000Z')").run();
  database.prepare("INSERT INTO daily_energy_summaries (date, generation_total) VALUES ('2026-08-29', 100)").run();
  database.prepare("INSERT INTO cumulative_counters (metric_key, total_value) VALUES ('totalGeneration', 1000)").run();
  database.prepare(`
    INSERT INTO display_value_overrides (target_id, page_id, card_id, metric_key, display_value)
    VALUES ('overview:realTimePower', 'overview', 'power', 'realTimePower', 99)
  `).run();

  assert.throws(
    () => migrateDatabase(),
    /ambiguous|legacy.*scope|explicit.*scope/iu
  );
  assert.equal(
    database.prepare("SELECT 1 FROM pragma_table_info('topic_mappings') WHERE name = 'metric_scope'").get(),
    undefined
  );
  assert.equal(
    (database.prepare("SELECT COUNT(*) AS count FROM schema_migrations WHERE version = '035_scoped_metric_identity'").get() as { count: number } | undefined)?.count,
    0
  );
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get() as { count: number } | undefined)?.count, 1);
});

test("scoped tables allow the same semantic identity at CL and KN with composite keys", () => {
  seedLegacySiteDatabase("cl");
  migrateDatabase({ legacySiteScope: "cl" });
  const database = getDatabase();

  database.prepare(`
    INSERT INTO topic_mappings
      (metric_scope, metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled)
    VALUES ('kn', 'factoryCircuit.stampingPower', 'factory/guanyin/power/stamping', 'kW', '$.value', 1, 0, 2, 1)
  `).run();
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality)
    VALUES ('kn', 'realTimePower', 34, 'kW', '2026-08-29T00:00:02.000Z', 'good')
  `).run();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
    VALUES ('kn', 'totalGeneration', 2000, '2026-08-29T00:00:04.000Z', 1)
  `).run();

  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM topic_mappings WHERE metric_key = 'factoryCircuit.stampingPower'").get() as { count: number } | undefined)?.count, 2);
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM live_metric_values WHERE metric_key = 'realTimePower'").get() as { count: number } | undefined)?.count, 2);
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM cumulative_counters WHERE metric_key = 'totalGeneration'").get() as { count: number } | undefined)?.count, 2);

  const topicIndex = database.prepare("PRAGMA index_info('idx_topic_mappings_metric_key')").all() as Array<{ name: string }>;
  assert.deepEqual(topicIndex.map((column) => column.name), ["metric_scope", "metric_key"]);
  const livePrimaryKey = database.prepare("PRAGMA table_info(live_metric_values)").all() as Array<{ name: string; pk: number }>;
  assert.deepEqual(livePrimaryKey.filter((column) => column.pk > 0).map((column) => column.name), ["metric_scope", "metric_key"]);
  const snapshotIndex = database.prepare("PRAGMA index_info('idx_metric_snapshots_scope_captured_at')").all() as Array<{ name: string }>;
  assert.deepEqual(snapshotIndex.map((column) => column.name), ["metric_scope", "captured_at"]);
  const dailyPrimaryKey = database.prepare("PRAGMA table_info(daily_energy_summaries)").all() as Array<{ name: string; pk: number }>;
  assert.deepEqual(dailyPrimaryKey.filter((column) => column.pk > 0).map((column) => column.name), ["metric_scope", "date"]);
  const counterPrimaryKey = database.prepare("PRAGMA table_info(cumulative_counters)").all() as Array<{ name: string; pk: number }>;
  assert.deepEqual(counterPrimaryKey.filter((column) => column.pk > 0).map((column) => column.name), ["metric_scope", "metric_key"]);
  const overrideIndex = database.prepare("PRAGMA index_list(display_value_overrides)").all() as Array<{ name: string; unique: number }>;
  assert.ok(overrideIndex.some((index) => index.name.includes("sqlite_autoindex") && index.unique === 1));
});

test("rejects empty, global, and unknown legacy scope inputs before changing the database", () => {
  for (const invalidScope of ["", "global", "all"]) {
    const database = resetLegacyDatabase();
    assert.throws(
      () => migrateDatabase({ legacySiteScope: invalidScope as never }),
      /legacySiteScope.*cl.*kn|global.*empty.*invalid/iu
    );
    assert.equal(
      (database.prepare("SELECT COUNT(*) AS count FROM schema_migrations WHERE version = '035_scoped_metric_identity'").get() as { count: number } | undefined)?.count,
      0
    );
  }
});
