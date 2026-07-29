import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import { updateDefaultPlaybackSettingsForTest } from "../testing/defaultPlaybackProfileTestSupport.js";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-seed-persistence-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
const databasePath = process.env.DATABASE_PATH;

const [{ closeDatabaseConnection, getDatabase }, { migrateDatabase }, { seedDatabase }] = await Promise.all([
  import("./index.js"),
  import("./migrate.js"),
  import("./seed.js")
]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.DATA_DIR;
  delete process.env.DATABASE_PATH;
  delete process.env.UPLOADS_DIR;
});

test("seedDatabase preserves operator-saved data source, playback, and calculation settings on restart", () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database
    .prepare("UPDATE topic_mappings SET topic = ?, enabled = 0 WHERE metric_key = ?")
    .run("custom/solar/power", "realTimePower");
  database
    .prepare("UPDATE system_settings SET value = ? WHERE key = 'data_mode'")
    .run("mock");
  database
    .prepare(
      `
        UPDATE calculation_settings
        SET carbon_emission_factor = 0.467,
            co2_auto_convert_small_to_kg = 1
        WHERE id = 1
      `
    )
    .run();
  updateDefaultPlaybackSettingsForTest(database, {
    autoplay: false,
    brightness: 72,
    transitionSpeed: 180,
    transitionType: "slide"
  });

  seedDatabase();

  const topic = database
    .prepare("SELECT topic, enabled FROM topic_mappings WHERE metric_key = ?")
    .get("realTimePower") as { enabled: number; topic: string };
  const dataMode = database
    .prepare("SELECT value FROM system_settings WHERE key = 'data_mode'")
    .get() as { value: string };
  const calculation = database
    .prepare("SELECT carbon_emission_factor, co2_auto_convert_small_to_kg FROM calculation_settings WHERE id = 1")
    .get() as { carbon_emission_factor: number; co2_auto_convert_small_to_kg: number };
  const playback = database
    .prepare(`
      SELECT autoplay, transition_type, transition_speed, brightness
      FROM playback_profile_settings
      WHERE profile_id = (
        SELECT id FROM playback_profiles WHERE profile_key = 'default' AND is_default = 1
      )
    `)
    .get() as { autoplay: number; brightness: number; transition_speed: number; transition_type: string };

  assert.deepEqual(topic, { enabled: 0, topic: "custom/solar/power" });
  assert.deepEqual(dataMode, { value: "mock" });
  assert.deepEqual(calculation, {
    carbon_emission_factor: 0.467,
    co2_auto_convert_small_to_kg: 1
  });
  assert.deepEqual(playback, {
    autoplay: 0,
    brightness: 72,
    transition_speed: 180,
    transition_type: "slide"
  });
});

test("seedDatabase does not reseed intraday snapshots after operators clear runtime history", () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();

  seedDatabase();

  const snapshotCount = database
    .prepare("SELECT COUNT(*) AS count FROM metric_snapshots")
    .get() as { count: number };

  assert.equal(snapshotCount.count, 0);
});
