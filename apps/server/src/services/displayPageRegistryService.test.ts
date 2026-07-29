import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import { displayPageTemplateKeys, isDisplayPageTemplateKey } from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-page-registry-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { closeDatabaseConnection, getDatabase },
  { archiveDisplayPageInstance, createDisplayPageInstance, listDisplayPageInstances, updateDisplayPageInstance }
] = await Promise.all([
  import("../db/index.js"),
  import("./displayPageRegistryService.js")
]);

function bootstrapRegistryTable() {
  const database = getDatabase();
  database.exec(`
    CREATE TABLE IF NOT EXISTS display_page_registry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_key TEXT NOT NULL UNIQUE,
      template_key TEXT NOT NULL,
      route_slug TEXT NOT NULL,
      label_zh TEXT NOT NULL,
      label_en TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      archived_at TEXT,
      display_order INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 15,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playback_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playback_profile_pages (
      profile_id INTEGER NOT NULL,
      page_id INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 15,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (profile_id, page_id)
    );

    INSERT INTO playback_profiles (id, profile_key, name, is_default)
    VALUES (1, 'default', 'Default Playback Profile', 1);

    CREATE TABLE IF NOT EXISTS display_page_stage_configs (
      page_key TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'draft',
      config_json TEXT NOT NULL DEFAULT '{}',
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      published_at TEXT,
      published_by TEXT,
      PRIMARY KEY (page_key, stage)
    );
  `);

  database
    .prepare(
      `INSERT INTO display_page_registry (
        page_key,
        template_key,
        route_slug,
        label_zh,
        label_en,
        enabled,
        archived_at,
        display_order,
        duration_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run("images", "images", "images", "圖庫", "Images", 0, null, 0, 15);

  database
    .prepare(
      `INSERT INTO playback_profile_pages (
        profile_id,
        page_id,
        enabled,
        display_order,
        duration_seconds
      ) VALUES (
        1,
        (SELECT id FROM display_page_registry WHERE page_key = 'images'),
        1,
        5,
        15
      )`
    )
    .run();

  database
    .prepare(
      `INSERT INTO display_page_stage_configs (
        page_key,
        stage,
        config_json,
        version,
        updated_at,
        published_at,
        published_by
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`
    )
    .run("images", "draft", "{\"hero\":true}", 3, null, null);

  database
    .prepare(
      `INSERT INTO display_page_stage_configs (
        page_key,
        stage,
        config_json,
        version,
        updated_at,
        published_at,
        published_by
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`
    )
    .run("images", "live", "{\"hero\":true}", 2, "2026-05-20T00:00:00.000Z", "operator");
}

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  bootstrapRegistryTable();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("display page registry creates a second template-derived instance without overwriting the built-in page", () => {
  assert.deepEqual(displayPageTemplateKeys, [
    "overview",
    "solar",
    "factory-circuit",
    "images",
    "sustainability"
  ]);
  assert.equal(isDisplayPageTemplateKey("images"), true);
  assert.equal(isDisplayPageTemplateKey("custom-template"), false);

  const created = createDisplayPageInstance({
    displayNameEn: "Images Secondary",
    displayNameZh: "圖庫副本",
    routeSlug: "images-secondary",
    templateKey: "images"
  });

  assert.equal(created.pageKey, "images-2");
  assert.equal(created.templateKey, "images");
  assert.equal(created.routeSlug, "images-secondary");
  assert.equal(created.route, "/images-secondary");
  assert.equal(created.displayNameZh, "圖庫副本");
  assert.equal(created.displayNameEn, "Images Secondary");
  assert.equal(created.archivedAt, null);

  const registry = listDisplayPageInstances();
  assert.deepEqual(
    registry.map((page) => ({
      draftVersion: page.draftVersion,
      hasDraftChanges: page.hasDraftChanges,
      lastPublishedAt: page.lastPublishedAt,
      pageKey: page.pageKey,
      routeSlug: page.routeSlug,
      templateKey: page.templateKey
    })),
    [
      {
        draftVersion: 3,
        hasDraftChanges: false,
        lastPublishedAt: "2026-05-20T00:00:00.000Z",
        pageKey: "images",
        routeSlug: "images",
        templateKey: "images"
      },
      {
        draftVersion: null,
        hasDraftChanges: false,
        lastPublishedAt: null,
        pageKey: "images-2",
        routeSlug: "images-secondary",
        templateKey: "images"
      }
    ]
  );
  assert.equal(registry[0]?.id === registry[1]?.id, false);
});

test("display page registry reports draft changes when draft and live content differ", () => {
  getDatabase()
    .prepare(
      `UPDATE display_page_stage_configs
       SET config_json = ?
       WHERE page_key = 'images' AND stage = 'draft'`
    )
    .run("{\"hero\":false}");

  const registry = listDisplayPageInstances();
  assert.equal(registry[0]?.pageKey, "images");
  assert.equal(registry[0]?.draftVersion, 3);
  assert.equal(registry[0]?.liveVersion, 2);
  assert.equal(registry[0]?.hasDraftChanges, true);
});

test("display page registry updates and archives an instance without changing its stable page key", () => {
  const created = createDisplayPageInstance({
    displayOrder: 8,
    displayNameEn: "Images Secondary",
    displayNameZh: "圖庫副本",
    durationSeconds: 29,
    enabled: true,
    routeSlug: "images-secondary",
    templateKey: "images"
  });

  const updated = updateDisplayPageInstance(created.pageKey, {
    displayOrder: 9,
    displayNameEn: "Images Gallery",
    displayNameZh: "圖庫展區",
    durationSeconds: 31,
    enabled: false,
    routeSlug: "images-gallery"
  });

  assert.equal(updated.pageKey, "images-2");
  assert.equal(updated.routeSlug, "images-gallery");
  assert.equal(updated.route, "/images-gallery");
  assert.equal(updated.displayNameZh, "圖庫展區");
  assert.equal(updated.displayNameEn, "Images Gallery");
  assert.equal(updated.enabled, false);

  const persistedState = getDatabase()
    .prepare(
      `
        SELECT
          registry.enabled AS registry_enabled,
          registry.display_order AS registry_display_order,
          registry.duration_seconds AS registry_duration_seconds,
          profile_page.enabled AS profile_enabled,
          profile_page.display_order AS profile_display_order,
          profile_page.duration_seconds AS profile_duration_seconds
        FROM display_page_registry AS registry
        INNER JOIN playback_profile_pages AS profile_page ON profile_page.page_id = registry.id
        WHERE registry.page_key = ?
      `
    )
    .get(created.pageKey);

  assert.deepEqual(persistedState, {
    profile_display_order: 9,
    profile_duration_seconds: 31,
    profile_enabled: 0,
    registry_display_order: 0,
    registry_duration_seconds: 15,
    registry_enabled: 0
  });

  const archived = archiveDisplayPageInstance(created.pageKey);
  assert.equal(archived.pageKey, "images-2");
  assert.equal(archived.enabled, false);
  assert.ok(archived.archivedAt);
});

test("display page registry creation rolls back when Default Profile membership cannot be created", () => {
  getDatabase()
    .prepare("DELETE FROM playback_profiles WHERE profile_key = 'default'")
    .run();

  assert.throws(
    () => createDisplayPageInstance({
      displayNameEn: "Images Secondary",
      displayNameZh: "圖庫副本",
      routeSlug: "images-secondary",
      templateKey: "images"
    }),
    /Default Playback Profile is not initialized/
  );
  assert.deepEqual(
    getDatabase()
      .prepare("SELECT COUNT(*) AS total FROM display_page_registry WHERE page_key = 'images-2'")
      .get(),
    { total: 0 }
  );
});
