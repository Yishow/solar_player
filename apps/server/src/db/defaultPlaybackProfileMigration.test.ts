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

test("migration splits legacy playback state into an idempotent Default Profile and global Runtime Policy", () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database
    .prepare(
      `
        UPDATE playback_settings
        SET brightness = 67,
            transition_type = 'slide',
            transition_speed = 420,
            enforce_fresh_runtime_data = 0
        WHERE id = 1
      `
    )
    .run();
  database
    .prepare(
      `
        UPDATE display_page_registry
        SET enabled = 0,
            display_order = 42,
            duration_seconds = 29
        WHERE page_key = 'overview'
      `
    )
    .run();
  database.exec(`
    DELETE FROM playback_profile_pages;
    DELETE FROM playback_profile_settings;
    DELETE FROM playback_profiles;
    DROP TABLE IF EXISTS playback_runtime_policy;
    DELETE FROM schema_migrations
    WHERE version IN ('027_default_playback_profile', '028_global_playback_runtime_policy');
  `);

  migrateDatabase();

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
          (SELECT COUNT(*) FROM playback_profile_pages WHERE profile_id = ?) AS page_rows,
          (SELECT COUNT(*) FROM playback_runtime_policy WHERE id = 1) AS runtime_policy_rows
      `
    )
    .get(defaultProfile.id, defaultProfile.id) as {
      default_profiles: number;
      page_rows: number;
      runtime_policy_rows: number;
      settings_rows: number;
    };

  assert.deepEqual(initialCounts, {
    default_profiles: 1,
    page_rows: 6,
    runtime_policy_rows: 1,
    settings_rows: 1
  });

  const migratedSettings = database
    .prepare(
      `
        SELECT brightness
        FROM playback_profile_settings
        WHERE profile_id = ?
      `
    )
    .get(defaultProfile.id) as { brightness: number };
  const migratedRuntimePolicy = database
    .prepare(
      `
        SELECT transition_type, transition_speed, enforce_fresh_runtime_data
        FROM playback_runtime_policy
        WHERE id = 1
      `
    )
    .get() as {
      enforce_fresh_runtime_data: number;
      transition_speed: number;
      transition_type: string;
    };
  const migratedOverview = database
    .prepare(
      `
        SELECT profile_page.enabled, profile_page.display_order, profile_page.duration_seconds
        FROM playback_profile_pages AS profile_page
        INNER JOIN display_page_registry AS registry ON registry.id = profile_page.page_id
        WHERE profile_page.profile_id = ? AND registry.page_key = 'overview'
      `
    )
    .get(defaultProfile.id) as {
      display_order: number;
      duration_seconds: number;
      enabled: number;
    };

  assert.deepEqual(migratedSettings, { brightness: 67 });
  assert.deepEqual(migratedRuntimePolicy, {
    enforce_fresh_runtime_data: 0,
    transition_speed: 420,
    transition_type: "slide"
  });
  const profileSettingColumns = database
    .prepare("PRAGMA table_info(playback_profile_settings)")
    .all() as Array<{ name: string }>;
  assert.deepEqual(
    profileSettingColumns
      .map((column) => column.name)
      .filter((name) =>
        ["enforce_fresh_runtime_data", "transition_speed", "transition_type"].includes(name)
      ),
    ["transition_type", "transition_speed", "enforce_fresh_runtime_data"]
  );
  assert.deepEqual(migratedOverview, {
    display_order: 42,
    duration_seconds: 29,
    enabled: 0
  });

  database
    .prepare("UPDATE playback_profile_settings SET brightness = 73 WHERE profile_id = ?")
    .run(defaultProfile.id);
  database
    .prepare(
      `
        UPDATE playback_runtime_policy
        SET transition_type = 'fade',
            transition_speed = 333,
            enforce_fresh_runtime_data = 1
        WHERE id = 1
      `
    )
    .run();
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
    .prepare(
      `
        DELETE FROM schema_migrations
        WHERE version IN ('027_default_playback_profile', '028_global_playback_runtime_policy')
      `
    )
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
          (SELECT transition_speed FROM playback_runtime_policy WHERE id = 1) AS transition_speed,
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
      transition_speed: number;
    };

  assert.deepEqual(rerunState, {
    brightness: 73,
    default_profiles: 1,
    overview_duration: 37,
    page_rows: 6,
    settings_rows: 1,
    transition_speed: 333
  });
});

test("028 preserves runtime policy state from an already-applied original 027", () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.exec(`
    DROP TABLE playback_runtime_policy;
    DELETE FROM schema_migrations
    WHERE version = '028_global_playback_runtime_policy';
  `);

  const profileSettingColumns = database
    .prepare("PRAGMA table_info(playback_profile_settings)")
    .all() as Array<{ name: string }>;
  const profileSettingColumnNames = new Set(
    profileSettingColumns.map((column) => column.name)
  );
  if (!profileSettingColumnNames.has("transition_type")) {
    database.exec(`
      ALTER TABLE playback_profile_settings
      ADD COLUMN transition_type TEXT NOT NULL DEFAULT 'fade';
      ALTER TABLE playback_profile_settings
      ADD COLUMN transition_speed INTEGER NOT NULL DEFAULT 250;
      ALTER TABLE playback_profile_settings
      ADD COLUMN enforce_fresh_runtime_data BOOLEAN NOT NULL DEFAULT 1;
    `);
  }

  database
    .prepare(
      `
        UPDATE playback_settings
        SET transition_type = 'fade',
            transition_speed = 50,
            enforce_fresh_runtime_data = 1
        WHERE id = 1
      `
    )
    .run();
  database
    .prepare(
      `
        UPDATE playback_profile_settings
        SET transition_type = 'slide',
            transition_speed = 180,
            enforce_fresh_runtime_data = 0
        WHERE profile_id = (
          SELECT id
          FROM playback_profiles
          WHERE profile_key = 'default'
        )
      `
    )
    .run();

  migrateDatabase();

  const runtimePolicy = database
    .prepare(
      `
        SELECT transition_type, transition_speed, enforce_fresh_runtime_data
        FROM playback_runtime_policy
        WHERE id = 1
      `
    )
    .get();

  assert.deepEqual(runtimePolicy, {
    enforce_fresh_runtime_data: 0,
    transition_speed: 180,
    transition_type: "slide"
  });
});
