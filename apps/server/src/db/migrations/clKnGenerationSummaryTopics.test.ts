import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

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

test("025 migration installs CL and KN summary source mappings without enabled direct generation mappings", () => {
  migrateDatabase();
  seedDatabase();
  migrateDatabase();
  seedDatabase();

  const rows = getDatabase()
    .prepare(
      `
        SELECT metric_key, topic, unit, value_path, multiplier, decimal_places, enabled
        FROM topic_mappings
        WHERE metric_key LIKE 'factoryGeneration.%'
        ORDER BY metric_key
      `
    )
    .all();

  assert.deepEqual(rows, [
    { metric_key: "factoryGeneration.cl.monthMwh", topic: "solar/CL/summary", unit: "MWh", value_path: "$.month_mwh", multiplier: 1, decimal_places: 3, enabled: 1 },
    { metric_key: "factoryGeneration.cl.todayMwh", topic: "solar/CL/summary", unit: "MWh", value_path: "$.today_mwh", multiplier: 1, decimal_places: 3, enabled: 1 },
    { metric_key: "factoryGeneration.cl.totalMwh", topic: "solar/CL/summary", unit: "MWh", value_path: "$.total_mwh", multiplier: 1, decimal_places: 3, enabled: 1 },
    { metric_key: "factoryGeneration.kn.monthMwh", topic: "solar/KN/summary", unit: "MWh", value_path: "$.month_mwh", multiplier: 1, decimal_places: 3, enabled: 1 },
    { metric_key: "factoryGeneration.kn.todayMwh", topic: "solar/KN/summary", unit: "MWh", value_path: "$.today_mwh", multiplier: 1, decimal_places: 3, enabled: 1 },
    { metric_key: "factoryGeneration.kn.totalMwh", topic: "solar/KN/summary", unit: "MWh", value_path: "$.total_mwh", multiplier: 1, decimal_places: 3, enabled: 1 }
  ]);

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
