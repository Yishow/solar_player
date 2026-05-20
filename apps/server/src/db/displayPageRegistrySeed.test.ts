import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import { displayPageTemplateKeys } from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-db-registry-seed-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
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
});

test("database migration and seed bootstrap the first five supported display page registry instances", () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  const rows = database
    .prepare(
      `
        SELECT
          page_key,
          template_key,
          route_slug,
          label_zh,
          label_en,
          display_order
        FROM display_page_registry
        ORDER BY display_order ASC, id ASC
      `
    )
    .all() as Array<{
      display_order: number;
      label_en: string;
      label_zh: string;
      page_key: string;
      route_slug: string;
      template_key: string;
    }>;

  assert.deepEqual(displayPageTemplateKeys, [
    "overview",
    "solar",
    "factory-circuit",
    "images",
    "sustainability"
  ]);
  assert.deepEqual(rows, [
    {
      display_order: 1,
      label_en: "Overview",
      label_zh: "總覽",
      page_key: "overview",
      route_slug: "overview",
      template_key: "overview"
    },
    {
      display_order: 2,
      label_en: "Solar",
      label_zh: "太陽能",
      page_key: "solar",
      route_slug: "solar",
      template_key: "solar"
    },
    {
      display_order: 3,
      label_en: "Factory Circuit",
      label_zh: "廠區迴路",
      page_key: "factory-circuit",
      route_slug: "factory-circuit",
      template_key: "factory-circuit"
    },
    {
      display_order: 4,
      label_en: "Images",
      label_zh: "綠能影像",
      page_key: "images",
      route_slug: "images",
      template_key: "images"
    },
    {
      display_order: 5,
      label_en: "Sustainability",
      label_zh: "永續成果",
      page_key: "sustainability",
      route_slug: "sustainability",
      template_key: "sustainability"
    }
  ]);

  assert.throws(
    () =>
      database
        .prepare(
          `
            INSERT INTO display_page_registry (
              page_key,
              template_key,
              route_slug,
              label_zh,
              label_en,
              enabled,
              display_order,
              duration_seconds
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .run("custom-page", "custom-template", "custom-page", "自訂頁", "Custom Page", 1, 6, 15),
    /constraint|check/i
  );
});
