import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-weather-interval-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ migrateDatabase }, { getDatabase }] = await Promise.all([
  import("../migrate.js"),
  import("../index.js")
]);

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

test("017_weather_update_interval adds update_interval_minutes column to weather_settings", () => {
  migrateDatabase();

  const columns = (
    getDatabase().prepare("PRAGMA table_info(weather_settings)").all() as Array<{ name: string }>
  ).map((column) => column.name);

  assert.equal(columns.includes("update_interval_minutes"), true);
});

test("migrateDatabase is idempotent when weather_settings re-run", () => {
  assert.doesNotThrow(() => {
    migrateDatabase();
    migrateDatabase();
  });

  const columns = (
    getDatabase().prepare("PRAGMA table_info(weather_settings)").all() as Array<{ name: string }>
  ).filter((column) => column.name === "update_interval_minutes");

  assert.equal(columns.length, 1);
});
