import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-calculation-settings-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [{ migrateDatabase }, { getDatabase, closeDatabaseConnection }, { seedDatabase }] = await Promise.all([
  import("../migrate.js"),
  import("../index.js"),
  import("../seed.js")
]);

function removeDatabaseFiles() {
  if (!databasePath) {
    return;
  }

  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
}

beforeEach(() => {
  closeDatabaseConnection();
  removeDatabaseFiles();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("012_calculation_settings creates the singleton coefficient table with the expected columns", () => {
  migrateDatabase();

  const columns = (
    getDatabase().prepare("PRAGMA table_info(calculation_settings)").all() as Array<{ name: string }>
  ).map((column) => column.name);

  assert.deepEqual(columns, [
    "id",
    "carbon_emission_factor",
    "tree_equivalent_factor",
    "household_daily_usage_kwh",
    "household_monthly_usage_kwh",
    "estimated_tariff_per_kwh",
    "created_at",
    "updated_at"
  ]);
});

test("seedDatabase bootstraps the singleton calculation settings row with recommended defaults", () => {
  migrateDatabase();
  seedDatabase();

  const row = getDatabase()
    .prepare(
      `
        SELECT
          id,
          carbon_emission_factor,
          tree_equivalent_factor,
          household_daily_usage_kwh,
          household_monthly_usage_kwh,
          estimated_tariff_per_kwh
        FROM calculation_settings
        WHERE id = 1
      `
    )
    .get() as
    | {
        carbon_emission_factor: number;
        estimated_tariff_per_kwh: number;
        household_daily_usage_kwh: number;
        household_monthly_usage_kwh: number;
        id: number;
        tree_equivalent_factor: number;
      }
    | undefined;

  assert.deepEqual(row, {
    id: 1,
    carbon_emission_factor: 0.495,
    tree_equivalent_factor: 2.6,
    household_daily_usage_kwh: 4,
    household_monthly_usage_kwh: 120,
    estimated_tariff_per_kwh: 5
  });
});
