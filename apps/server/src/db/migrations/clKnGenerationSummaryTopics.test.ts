import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import Database from "better-sqlite3";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-cl-kn-topics-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ migrateDatabase }, { seedDatabase }, { getDatabase, closeDatabaseConnection }] = await Promise.all([
  import("../migrate.js"),
  import("../seed.js"),
  import("../index.js")
]);

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("managed Solar adapter migration removes legacy CL and KN summary source mappings", () => {
  migrateDatabase();
  seedDatabase();
  migrateDatabase();
  seedDatabase();

  const rows = getDatabase()
    .prepare(
      `
        SELECT metric_scope, metric_key, topic, unit, value_path, multiplier, decimal_places, enabled
        FROM topic_mappings
        WHERE metric_key LIKE 'factoryGeneration.%'
        ORDER BY metric_key
      `
    )
    .all();

  assert.deepEqual(rows, []);

  const enabledDirectMappings = getDatabase()
    .prepare(
      `
        SELECT metric_key
        FROM topic_mappings
        WHERE metric_key IN (
          'todayGeneration',
          'monthGeneration',
          'totalGeneration',
          'todayCo2Reduction',
          'totalCo2Reduction'
        )
          AND enabled = 1
      `
    )
    .all();
  assert.deepEqual(enabledDirectMappings, []);
});

test("managed Solar migration preserves custom and disabled operator mappings", () => {
  const database = new Database(":memory:");
  database.exec(`
    CREATE TABLE topic_mappings (
      metric_scope TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      topic TEXT,
      value_path TEXT,
      enabled INTEGER NOT NULL
    );
    INSERT INTO topic_mappings VALUES
      ('cl', 'factoryGeneration.todayMwh', 'solar/CL/summary', '$.today_mwh', 1),
      ('kn', 'factoryGeneration.totalMwh', 'custom/kn/total', '$.value', 1),
      ('cl', 'solarZone.12.powerKw', 'custom/cl/zone/12', '$.value', 0);
  `);

  try {
    database.exec(readFileSync(
      join(import.meta.dirname, "036_remove_managed_solar_topic_mappings.sql"),
      "utf8"
    ));

    assert.deepEqual(
      database.prepare("SELECT metric_scope, metric_key, topic, enabled FROM topic_mappings ORDER BY topic").all(),
      [
        { enabled: 0, metric_key: "solarZone.12.powerKw", metric_scope: "cl", topic: "custom/cl/zone/12" },
        { enabled: 0, metric_key: "factoryGeneration.totalMwh", metric_scope: "kn", topic: "custom/kn/total" }
      ]
    );
  } finally {
    database.close();
  }
});
