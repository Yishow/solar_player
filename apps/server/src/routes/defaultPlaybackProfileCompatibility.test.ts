import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import type { PlaybackPage, PlaybackSettings } from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-default-profile-api-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
const databasePath = process.env.DATABASE_PATH;

const [
  { buildApp },
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase }
] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
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

test("legacy Playback APIs read Default Profile state when legacy rows diverge", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  const defaultProfile = database
    .prepare("SELECT id FROM playback_profiles WHERE is_default = 1")
    .get() as { id: number };

  database
    .prepare(
      `
        UPDATE playback_profile_settings
        SET autoplay = 0,
            brightness = 77
        WHERE profile_id = ?
      `
    )
    .run(defaultProfile.id);
  database
    .prepare(
      `
        UPDATE playback_profile_pages
        SET enabled = CASE
              WHEN page_id = (SELECT id FROM display_page_registry WHERE page_key = 'overview') THEN 1
              WHEN page_id = (SELECT id FROM display_page_registry WHERE page_key = 'solar') THEN 0
              ELSE enabled
            END,
            duration_seconds = CASE
              WHEN page_id = (SELECT id FROM display_page_registry WHERE page_key = 'overview') THEN 31
              WHEN page_id = (SELECT id FROM display_page_registry WHERE page_key = 'solar') THEN 32
              ELSE duration_seconds
            END
        WHERE profile_id = ?
      `
    )
    .run(defaultProfile.id);

  database
    .prepare("UPDATE playback_settings SET autoplay = 1, brightness = 12 WHERE id = 1")
    .run();
  database
    .prepare(
      `
        UPDATE display_page_registry
        SET enabled = CASE page_key WHEN 'overview' THEN 0 WHEN 'solar' THEN 1 ELSE enabled END,
            duration_seconds = CASE page_key WHEN 'overview' THEN 91 WHEN 'solar' THEN 92 ELSE duration_seconds END
        WHERE page_key IN ('overview', 'solar')
      `
    )
    .run();

  const app = await buildApp();

  try {
    const [settingsResponse, pagesResponse, rotationResponse] = await Promise.all([
      app.inject({ method: "GET", url: "/api/playback/settings" }),
      app.inject({ method: "GET", url: "/api/playback/pages" }),
      app.inject({ method: "GET", url: "/api/playback/rotation-plan" })
    ]);

    assert.equal(settingsResponse.statusCode, 200);
    assert.equal(pagesResponse.statusCode, 200);
    assert.equal(rotationResponse.statusCode, 200);

    const settings = (settingsResponse.json() as { settings: PlaybackSettings }).settings;
    const pages = (pagesResponse.json() as { pages: PlaybackPage[] }).pages;
    const rotationPages = (
      rotationResponse.json() as { rotationPlan: { pages: PlaybackPage[] } }
    ).rotationPlan.pages;
    const overview = pages.find((page) => page.pageKey === "overview");
    const solar = pages.find((page) => page.pageKey === "solar");

    assert.equal(settings.autoplay, false);
    assert.equal(settings.brightness, 77);
    assert.deepEqual(
      { durationSeconds: overview?.durationSeconds, enabled: overview?.enabled },
      { durationSeconds: 31, enabled: true }
    );
    assert.deepEqual(
      { durationSeconds: solar?.durationSeconds, enabled: solar?.enabled },
      { durationSeconds: 32, enabled: false }
    );
    assert.deepEqual(
      rotationPages.map((page) => ({
        durationSeconds: page.durationSeconds,
        enabled: page.enabled,
        pageKey: page.pageKey
      })),
      pages.map((page) => ({
        durationSeconds: page.durationSeconds,
        enabled: page.enabled,
        pageKey: page.pageKey
      }))
    );
  } finally {
    await app.close();
  }
});

test("legacy Playback update APIs write only Default Profile state", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  const legacySettingsBefore = database
    .prepare("SELECT autoplay, brightness FROM playback_settings WHERE id = 1")
    .get() as { autoplay: number; brightness: number };
  const legacyOverviewBefore = database
    .prepare(
      "SELECT enabled, display_order, duration_seconds FROM display_page_registry WHERE page_key = 'overview'"
    )
    .get() as { display_order: number; duration_seconds: number; enabled: number };

  const app = await buildApp();

  try {
    const pagesResponse = await app.inject({ method: "GET", url: "/api/playback/pages" });
    assert.equal(pagesResponse.statusCode, 200);
    const pages = (pagesResponse.json() as { pages: PlaybackPage[] }).pages;
    const overview = pages.find((page) => page.pageKey === "overview");
    assert.ok(overview);

    const settingsUpdate = await app.inject({
      method: "PUT",
      url: "/api/playback/settings",
      payload: { autoplay: false, brightness: 66 }
    });
    const pagesUpdate = await app.inject({
      method: "PUT",
      url: "/api/playback/pages",
      payload: {
        pages: pages.map((page) => ({
          displayOrder: page.displayOrder,
          durationSeconds: page.pageKey === "overview" ? 41 : page.durationSeconds,
          enabled: page.pageKey === "overview" ? false : page.enabled,
          id: page.id
        }))
      }
    });

    assert.equal(settingsUpdate.statusCode, 200);
    assert.equal(pagesUpdate.statusCode, 200);

    const profileSettings = database
      .prepare(
        `
          SELECT autoplay, brightness
          FROM playback_profile_settings
          WHERE profile_id = (
            SELECT id FROM playback_profiles WHERE profile_key = 'default' AND is_default = 1
          )
        `
      )
      .get() as { autoplay: number; brightness: number };
    const profileOverview = database
      .prepare(
        `
          SELECT profile_page.enabled, profile_page.display_order, profile_page.duration_seconds
          FROM playback_profile_pages AS profile_page
          INNER JOIN playback_profiles AS profile ON profile.id = profile_page.profile_id
          INNER JOIN display_page_registry AS registry ON registry.id = profile_page.page_id
          WHERE profile.profile_key = 'default'
            AND profile.is_default = 1
            AND registry.page_key = 'overview'
        `
      )
      .get() as { display_order: number; duration_seconds: number; enabled: number };
    const legacySettingsAfter = database
      .prepare("SELECT autoplay, brightness FROM playback_settings WHERE id = 1")
      .get() as { autoplay: number; brightness: number };
    const legacyOverviewAfter = database
      .prepare(
        "SELECT enabled, display_order, duration_seconds FROM display_page_registry WHERE page_key = 'overview'"
      )
      .get() as { display_order: number; duration_seconds: number; enabled: number };

    assert.deepEqual(profileSettings, { autoplay: 0, brightness: 66 });
    assert.deepEqual(profileOverview, {
      display_order: overview.displayOrder,
      duration_seconds: 41,
      enabled: 0
    });
    assert.deepEqual(legacySettingsAfter, legacySettingsBefore);
    assert.deepEqual(legacyOverviewAfter, legacyOverviewBefore);
  } finally {
    await app.close();
  }
});
