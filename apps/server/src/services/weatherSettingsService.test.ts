import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-weather-settings-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { closeDatabaseConnection },
  { migrateDatabase },
  { seedDatabase },
  { readWeatherSettings, saveWeatherSettings }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./weatherSettingsService.js")
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

test("weather settings survive a reload with the saved management contract", () => {
  saveWeatherSettings({
    countyName: "臺北市",
    enabled: true,
    fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
    locationMode: "station",
    preset: "standard",
    stationId: "C0I080"
  });

  closeDatabaseConnection();

  assert.deepEqual(readWeatherSettings(), {
    countyName: "臺北市",
    enabled: true,
    fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
    locationMode: "station",
    preset: "standard",
    stationId: "C0I080"
  });
});
