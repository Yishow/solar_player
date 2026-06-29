import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-calculation-settings-route-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { buildApp },
  { closeDatabaseConnection },
  { migrateDatabase },
  { seedDatabase }
] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
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

test("calculation settings expose the seeded defaults and persist updates through the API", async () => {
  const app = await buildApp();

  try {
    const getResponse = await app.inject({
      method: "GET",
      url: "/api/calculation-settings"
    });

    assert.equal(getResponse.statusCode, 200);
    assert.deepEqual(getResponse.json(), {
      settings: {
        carbonEmissionFactor: 0.495,
        co2AutoConvertSmallToKg: false,
        estimatedTariffPerKwh: 5,
        householdDailyUsageKwh: 4,
        householdMonthlyUsageKwh: 120,
        treeEquivalentFactor: 2.6
      }
    });

    const saveResponse = await app.inject({
      method: "PUT",
      payload: {
        carbonEmissionFactor: 0.61,
        co2AutoConvertSmallToKg: true,
        estimatedTariffPerKwh: 6.2,
        householdDailyUsageKwh: 4.5,
        householdMonthlyUsageKwh: 135,
        treeEquivalentFactor: 3.1
      },
      url: "/api/calculation-settings"
    });

    assert.equal(saveResponse.statusCode, 200);
    assert.deepEqual(saveResponse.json(), {
      settings: {
        carbonEmissionFactor: 0.61,
        co2AutoConvertSmallToKg: true,
        estimatedTariffPerKwh: 6.2,
        householdDailyUsageKwh: 4.5,
        householdMonthlyUsageKwh: 135,
        treeEquivalentFactor: 3.1
      }
    });

    const reloadResponse = await app.inject({
      method: "GET",
      url: "/api/calculation-settings"
    });

    assert.equal(reloadResponse.statusCode, 200);
    assert.deepEqual(reloadResponse.json(), {
      settings: {
        carbonEmissionFactor: 0.61,
        co2AutoConvertSmallToKg: true,
        estimatedTariffPerKwh: 6.2,
        householdDailyUsageKwh: 4.5,
        householdMonthlyUsageKwh: 135,
        treeEquivalentFactor: 3.1
      }
    });
  } finally {
    await app.close();
  }
});

test("calculation settings reject non-positive coefficients through the API", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "PUT",
      payload: {
        carbonEmissionFactor: -1,
        co2AutoConvertSmallToKg: false,
        estimatedTariffPerKwh: 5,
        householdDailyUsageKwh: 4,
        householdMonthlyUsageKwh: 120,
        treeEquivalentFactor: 2.6
      },
      url: "/api/calculation-settings"
    });

    assert.equal(response.statusCode, 400);
    assert.equal(
      response.json<{ error: string }>().error,
      "Calculation carbonEmissionFactor must be a positive number"
    );
  } finally {
    await app.close();
  }
});

test("calculation settings reject a non-boolean CO2 display preference through the API", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "PUT",
      payload: {
        carbonEmissionFactor: 0.495,
        co2AutoConvertSmallToKg: "true",
        estimatedTariffPerKwh: 5,
        householdDailyUsageKwh: 4,
        householdMonthlyUsageKwh: 120,
        treeEquivalentFactor: 2.6
      },
      url: "/api/calculation-settings"
    });

    assert.equal(response.statusCode, 400);
    assert.equal(
      response.json<{ error: string }>().error,
      "Calculation co2AutoConvertSmallToKg must be a boolean"
    );
  } finally {
    await app.close();
  }
});
