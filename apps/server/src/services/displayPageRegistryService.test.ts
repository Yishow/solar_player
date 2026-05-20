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
    .run("images", "images", "images", "圖庫", "Images", 1, null, 5, 15);

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
        hasDraftChanges: true,
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

test("display page registry updates and archives an instance without changing its stable page key", () => {
  const created = createDisplayPageInstance({
    displayNameEn: "Images Secondary",
    displayNameZh: "圖庫副本",
    routeSlug: "images-secondary",
    templateKey: "images"
  });

  const updated = updateDisplayPageInstance(created.pageKey, {
    displayNameEn: "Images Gallery",
    displayNameZh: "圖庫展區",
    enabled: false,
    routeSlug: "images-gallery"
  });

  assert.equal(updated.pageKey, "images-2");
  assert.equal(updated.routeSlug, "images-gallery");
  assert.equal(updated.route, "/images-gallery");
  assert.equal(updated.displayNameZh, "圖庫展區");
  assert.equal(updated.displayNameEn, "Images Gallery");
  assert.equal(updated.enabled, false);

  const archived = archiveDisplayPageInstance(created.pageKey);
  assert.equal(archived.pageKey, "images-2");
  assert.equal(archived.enabled, false);
  assert.ok(archived.archivedAt);
});
