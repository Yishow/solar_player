import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-page-registry-route-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [{ buildApp }, { closeDatabaseConnection }, { migrateDatabase }, { seedDatabase }] = await Promise.all([
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
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("POST /api/display-page-registry rejects duplicate route slugs and unknown templates", async () => {
  const app = await buildApp();

  try {
    const duplicateRouteResponse = await app.inject({
      method: "POST",
      url: "/api/display-page-registry",
      payload: {
        displayNameEn: "Images Secondary",
        displayNameZh: "綠能影像副本",
        routeSlug: "images",
        templateKey: "images"
      }
    });

    assert.equal(duplicateRouteResponse.statusCode, 409);

    const unsupportedTemplateResponse = await app.inject({
      method: "POST",
      url: "/api/display-page-registry",
      payload: {
        displayNameEn: "Custom Runtime",
        displayNameZh: "自訂頁",
        routeSlug: "custom-runtime",
        templateKey: "custom-template"
      }
    });

    assert.equal(unsupportedTemplateResponse.statusCode, 400);
  } finally {
    await app.close();
  }
});

test("POST /api/display-page-registry/:pageKey/archive blocks archiving the last remaining template instance but allows duplicate instances", async () => {
  const app = await buildApp();

  try {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/display-page-registry",
      payload: {
        displayNameEn: "Images Secondary",
        displayNameZh: "綠能影像副本",
        routeSlug: "images-secondary",
        templateKey: "images"
      }
    });

    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json() as { page: { pageKey: string } };

    const archiveDuplicateResponse = await app.inject({
      method: "POST",
      url: `/api/display-page-registry/${created.page.pageKey}/archive`
    });

    assert.equal(archiveDuplicateResponse.statusCode, 200);
    const archived = archiveDuplicateResponse.json() as { page: { archivedAt: string | null; enabled: boolean } };
    assert.equal(archived.page.enabled, false);
    assert.ok(archived.page.archivedAt);

    const archiveLastOverviewResponse = await app.inject({
      method: "POST",
      url: "/api/display-page-registry/overview/archive"
    });

    assert.equal(archiveLastOverviewResponse.statusCode, 409);
  } finally {
    await app.close();
  }
});
