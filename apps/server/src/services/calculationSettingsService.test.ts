import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-calculation-settings-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase },
  {
    CalculationSettingsValidationError,
    DEFAULT_CALCULATION_SETTINGS,
    readCalculationSettings,
    saveCalculationSettings
  }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./calculationSettingsService.js")
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
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("readCalculationSettings falls back to recommended defaults when the singleton row is missing", () => {
  const database = getDatabase();

  database.prepare("DELETE FROM calculation_settings").run();

  assert.deepEqual(readCalculationSettings(database), DEFAULT_CALCULATION_SETTINGS);
});

test("saveCalculationSettings persists positive coefficients and survives a reload", () => {
  saveCalculationSettings({
    carbonEmissionFactor: 0.6,
    co2AutoConvertSmallToKg: true,
    estimatedTariffPerKwh: 6.5,
    householdDailyUsageKwh: 5,
    householdMonthlyUsageKwh: 150,
    treeEquivalentFactor: 3.2
  });

  closeDatabaseConnection();

  assert.deepEqual(readCalculationSettings(), {
    carbonEmissionFactor: 0.6,
    co2AutoConvertSmallToKg: true,
    estimatedTariffPerKwh: 6.5,
    householdDailyUsageKwh: 5,
    householdMonthlyUsageKwh: 150,
    treeEquivalentFactor: 3.2
  });
});

test("saveCalculationSettings rejects non-positive coefficients without overwriting the stored row", () => {
  assert.throws(
    () =>
      saveCalculationSettings({
        ...DEFAULT_CALCULATION_SETTINGS,
        carbonEmissionFactor: 0
      }),
    (error: unknown) => {
      assert.ok(error instanceof CalculationSettingsValidationError);
      assert.equal(error.message, "Calculation carbonEmissionFactor must be a positive number");
      return true;
    }
  );

  assert.deepEqual(readCalculationSettings(), DEFAULT_CALCULATION_SETTINGS);
});

test("saveCalculationSettings rejects a non-boolean CO2 display preference without overwriting the stored row", () => {
  assert.throws(
    () =>
      saveCalculationSettings({
        ...DEFAULT_CALCULATION_SETTINGS,
        co2AutoConvertSmallToKg: "yes" as never
      }),
    (error: unknown) => {
      assert.ok(error instanceof CalculationSettingsValidationError);
      assert.equal(error.message, "Calculation co2AutoConvertSmallToKg must be a boolean");
      return true;
    }
  );

  assert.deepEqual(readCalculationSettings(), DEFAULT_CALCULATION_SETTINGS);
});
