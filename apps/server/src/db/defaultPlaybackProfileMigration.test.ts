import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-default-profile-migration-test-"));
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

test("migration creates one idempotent Default Playback Profile without overwriting profile state", () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  const defaultProfile = database
    .prepare(
      `
        SELECT id, profile_key, name
        FROM playback_profiles
        WHERE is_default = 1
      `
    )
    .get() as { id: number; name: string; profile_key: string };

  assert.deepEqual(
    { name: defaultProfile.name, profileKey: defaultProfile.profile_key },
    { name: "Default Playback Profile", profileKey: "default" }
  );

  const initialCounts = database
    .prepare(
      `
        SELECT
          (SELECT COUNT(*) FROM playback_profiles WHERE is_default = 1) AS default_profiles,
          (SELECT COUNT(*) FROM playback_profile_settings WHERE profile_id = ?) AS settings_rows,
          (SELECT COUNT(*) FROM playback_profile_pages WHERE profile_id = ?) AS page_rows
      `
    )
    .get(defaultProfile.id, defaultProfile.id) as {
      default_profiles: number;
      page_rows: number;
      settings_rows: number;
    };

  assert.deepEqual(initialCounts, {
    default_profiles: 1,
    page_rows: 6,
    settings_rows: 1
  });

  database
    .prepare("UPDATE playback_profile_settings SET brightness = 73 WHERE profile_id = ?")
    .run(defaultProfile.id);
  database
    .prepare(
      `
        UPDATE playback_profile_pages
        SET duration_seconds = 37
        WHERE profile_id = ?
          AND page_id = (SELECT id FROM display_page_registry WHERE page_key = 'overview')
      `
    )
    .run(defaultProfile.id);
  database
    .prepare("DELETE FROM schema_migrations WHERE version = '027_default_playback_profile'")
    .run();

  migrateDatabase();

  const rerunState = database
    .prepare(
      `
        SELECT
          (SELECT COUNT(*) FROM playback_profiles WHERE is_default = 1) AS default_profiles,
          (SELECT COUNT(*) FROM playback_profile_settings WHERE profile_id = ?) AS settings_rows,
          (SELECT COUNT(*) FROM playback_profile_pages WHERE profile_id = ?) AS page_rows,
          (SELECT brightness FROM playback_profile_settings WHERE profile_id = ?) AS brightness,
          (
            SELECT profile_page.duration_seconds
            FROM playback_profile_pages AS profile_page
            INNER JOIN display_page_registry AS registry ON registry.id = profile_page.page_id
            WHERE profile_page.profile_id = ? AND registry.page_key = 'overview'
          ) AS overview_duration
      `
    )
    .get(defaultProfile.id, defaultProfile.id, defaultProfile.id, defaultProfile.id) as {
      brightness: number;
      default_profiles: number;
      overview_duration: number;
      page_rows: number;
      settings_rows: number;
    };

  assert.deepEqual(rerunState, {
    brightness: 73,
    default_profiles: 1,
    overview_duration: 37,
    page_rows: 6,
    settings_rows: 1
  });
});
