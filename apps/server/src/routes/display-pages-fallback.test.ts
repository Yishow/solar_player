import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-display-pages-fallback-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display-fallback.sqlite");
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

test("GET /api/display-pages/:pageId/fallback reports active empty-content fallback for an empty live page", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/fallback"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      fallback: {
        isFallbackActive: boolean;
        items: Array<{ active: boolean; key: string; mode: string }>;
        pageId: string;
      };
    };

    assert.equal(body.fallback.pageId, "overview");
    assert.equal(body.fallback.isFallbackActive, true);
    assert.deepEqual(
      body.fallback.items.find((item) => item.key === "emptyContent"),
      {
        active: true,
        key: "emptyContent",
        mode: "hide"
      }
    );
  } finally {
    await app.close();
  }
});
