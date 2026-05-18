import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-display-pages-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ buildApp }, { migrateDatabase }, { seedDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
]);

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

test("GET /api/display-pages/:pageId/config returns an empty persisted config envelope by default", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/config"
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      config: {
        pageId: "overview",
        regions: {},
        updatedAt: null,
        version: 1
      }
    });
  } finally {
    await app.close();
  }
});

test("PUT /api/display-pages/:pageId/config persists partial region overrides for later runtime merges", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const updateResponse = await app.inject({
      method: "PUT",
      url: "/api/display-pages/solar/config",
      payload: {
        regions: {
          flowNodes: {
            inverter: {
              left: 1208
            }
          }
        }
      }
    });

    assert.equal(updateResponse.statusCode, 200);
    assert.deepEqual(updateResponse.json(), {
      config: {
        pageId: "solar",
        regions: {
          flowNodes: {
            inverter: {
              left: 1208
            }
          }
        },
        updatedAt: updateResponse.json().config.updatedAt,
        version: 1
      }
    });
    assert.ok(updateResponse.json().config.updatedAt);

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/solar/config"
    });

    assert.equal(readResponse.statusCode, 200);
    assert.deepEqual(readResponse.json(), updateResponse.json());
  } finally {
    await app.close();
  }
});
