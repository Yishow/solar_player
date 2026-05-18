import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-display-pages-test-"));
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

test("GET /api/display-pages/:pageId/config returns an empty persisted config envelope by default", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/config"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { config: { pageId: string; regions: Record<string, unknown>; updatedAt: string | null; version: number } };
    assert.equal(body.config.pageId, "overview");
    assert.deepEqual(body.config.regions, {});
    assert.equal(body.config.updatedAt, null);
    assert.equal(body.config.version, 1);
  } finally {
    await app.close();
  }
});

test("PUT /api/display-pages/:pageId/config persists partial region overrides for later runtime merges", async () => {
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
    const updateBody = updateResponse.json() as { config: { regions: Record<string, unknown>; updatedAt: string | null } };
    assert.deepEqual(updateBody.config.regions, { flowNodes: { inverter: { left: 1208 } } });
    assert.ok(updateBody.config.updatedAt);

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

test("GET /api/display-pages/:pageId/draft returns draft stage config", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/draft"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { config: { pageId: string; stage: string; regions: Record<string, unknown> } };
    assert.equal(body.config.pageId, "overview");
    assert.equal(body.config.stage, "draft");
    assert.deepEqual(body.config.regions, {});
  } finally {
    await app.close();
  }
});

test("PUT /api/display-pages/:pageId/draft saves draft without affecting live", async () => {
  const app = await buildApp();

  try {
    const draftRes = await app.inject({
      method: "PUT",
      url: "/api/display-pages/overview/draft",
      payload: { regions: { heroCopyLayout: { left: 120 } } }
    });

    assert.equal(draftRes.statusCode, 200);
    const draftBody = draftRes.json() as { config: { stage: string; regions: { heroCopyLayout: { left: number } } } };
    assert.equal(draftBody.config.stage, "draft");
    assert.equal(draftBody.config.regions.heroCopyLayout.left, 120);

    const liveRes = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/live"
    });

    assert.equal(liveRes.statusCode, 200);
    const liveBody = liveRes.json() as { config: { stage: string; regions: Record<string, unknown> } };
    assert.equal(liveBody.config.stage, "live");
    assert.deepEqual(liveBody.config.regions, {});
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/:pageId/live returns live stage config", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/solar/live"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { config: { stage: string } };
    assert.equal(body.config.stage, "live");
  } finally {
    await app.close();
  }
});

test("POST /api/display-pages/:pageId/publish promotes draft to live", async () => {
  const app = await buildApp();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/display-pages/overview/draft",
      payload: { regions: { heroCopyLayout: { left: 120 } } }
    });

    const publishRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/overview/publish",
      payload: { publishedBy: "test-operator" }
    });

    assert.equal(publishRes.statusCode, 200);
    const publishBody = publishRes.json() as { config: { version: number; stage?: string; publishedBy?: string | null }; validation: { canPublish: boolean } };
    assert.equal(publishBody.config.version, 2);
    assert.equal(publishBody.validation.canPublish, true);

    const liveRes = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/live"
    });
    const liveBody = liveRes.json() as { config: { regions: { heroCopyLayout: { left: number } }; publishedBy: string | null } };
    assert.equal(liveBody.config.regions.heroCopyLayout.left, 120);
    assert.equal(liveBody.config.publishedBy, "test-operator");
  } finally {
    await app.close();
  }
});

test("POST /api/display-pages/:pageId/rollback restores previous version", async () => {
  const app = await buildApp();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/display-pages/solar/draft",
      payload: { regions: { heroCopyLayout: { left: 100 } } }
    });
    const pub1 = await app.inject({
      method: "POST",
      url: "/api/display-pages/solar/publish"
    });
    assert.equal(pub1.statusCode, 200);

    await app.inject({
      method: "PUT",
      url: "/api/display-pages/solar/draft",
      payload: { regions: { heroCopyLayout: { left: 200 } } }
    });
    const pub2 = await app.inject({
      method: "POST",
      url: "/api/display-pages/solar/publish"
    });
    assert.equal(pub2.statusCode, 200);

    const liveBefore = await app.inject({ method: "GET", url: "/api/display-pages/solar/live" });
    const liveBeforeBody = liveBefore.json() as { config: { regions: { heroCopyLayout: { left: number } }; version: number } };
    assert.equal(liveBeforeBody.config.regions.heroCopyLayout.left, 200);
    assert.equal(liveBeforeBody.config.version, 3);

    const rollbackRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/solar/rollback",
      payload: { targetVersion: 2, publishedBy: "rollback-operator" }
    });

    assert.equal(rollbackRes.statusCode, 200);
    const rollbackBody = rollbackRes.json() as { config: { regions: { heroCopyLayout: { left: number } }; version: number } };
    assert.equal(rollbackBody.config.regions.heroCopyLayout.left, 100);
    assert.equal(rollbackBody.config.version, 4);
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/:pageId/history returns publish history", async () => {
  const app = await buildApp();

  try {
    await app.inject({ method: "PUT", url: "/api/display-pages/images/draft", payload: { regions: { gallery: { cols: 3 } } } });
    await app.inject({ method: "POST", url: "/api/display-pages/images/publish", payload: { publishedBy: "op1" } });

    await app.inject({ method: "PUT", url: "/api/display-pages/images/draft", payload: { regions: { gallery: { cols: 4 } } } });
    await app.inject({ method: "POST", url: "/api/display-pages/images/publish", payload: { publishedBy: "op2" } });

    const historyRes = await app.inject({ method: "GET", url: "/api/display-pages/images/history" });
    assert.equal(historyRes.statusCode, 200);
    const historyBody = historyRes.json() as { history: Array<{ version: number; action: string; publishedBy: string | null }> };
    assert.equal(historyBody.history.length, 2);
    assert.equal(historyBody.history[0]!.action, "publish");
    assert.equal(historyBody.history[0]!.publishedBy, "op2");
    assert.equal(historyBody.history[1]!.publishedBy, "op1");
  } finally {
    await app.close();
  }
});

test("POST rollback to non-existent version returns 404", async () => {
  const app = await buildApp();

  try {
    const res = await app.inject({
      method: "POST",
      url: "/api/display-pages/overview/rollback",
      payload: { targetVersion: 999 }
    });

    assert.equal(res.statusCode, 404);
  } finally {
    await app.close();
  }
});

test("POST publish with out-of-bounds geometry is rejected", async () => {
  const app = await buildApp();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/display-pages/overview/draft",
      payload: { regions: { heroRegion: { left: 1800, top: 0, width: 200, height: 100 } } }
    });

    const publishRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/overview/publish"
    });

    assert.equal(publishRes.statusCode, 422);
    const body = publishRes.json() as { success: false; validation: { canPublish: boolean; findings: Array<{ code: string; severity: string }> } };
    assert.equal(body.success, false);
    assert.equal(body.validation.canPublish, false);
    assert.ok(body.validation.findings.some((f) => f.code === "GEOMETRY_OUT_OF_BOUNDS"));
  } finally {
    await app.close();
  }
});

test("POST publish with negative dimensions is rejected", async () => {
  const app = await buildApp();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/display-pages/solar/draft",
      payload: { regions: { kpiCard: { left: 0, top: 0, width: -10, height: 50 } } }
    });

    const publishRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/solar/publish"
    });

    assert.equal(publishRes.statusCode, 422);
    const body = publishRes.json() as { validation: { canPublish: boolean; findings: Array<{ code: string; regionId?: string }> } };
    assert.equal(body.validation.canPublish, false);
    assert.ok(body.validation.findings.some((f) => f.code === "GEOMETRY_INVALID_VALUE" && f.regionId === "kpiCard"));
  } finally {
    await app.close();
  }
});

test("POST publish with valid config succeeds", async () => {
  const app = await buildApp();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/display-pages/sustainability/draft",
      payload: { regions: { heroBanner: { left: 0, top: 0, width: 1920, height: 400 } } }
    });

    const publishRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/sustainability/publish"
    });

    assert.equal(publishRes.statusCode, 200);
    const body = publishRes.json() as { config: { regions: { heroBanner: { width: number } } }; validation: { canPublish: boolean } };
    assert.equal(body.config.regions.heroBanner.width, 1920);
    assert.equal(body.validation.canPublish, true);
  } finally {
    await app.close();
  }
});

test("POST /api/display-pages/:pageId/validate returns validation without publishing", async () => {
  const app = await buildApp();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/display-pages/overview/draft",
      payload: { regions: { badRegion: { left: -10, top: 0, width: 100, height: 100 } } }
    });

    const validateRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/overview/validate"
    });

    assert.equal(validateRes.statusCode, 200);
    const body = validateRes.json() as { validation: { canPublish: boolean; findings: Array<{ code: string }> } };
    assert.equal(body.validation.canPublish, false);
    assert.ok(body.validation.findings.some((f) => f.code === "GEOMETRY_OUT_OF_BOUNDS"));

    const liveRes = await app.inject({ method: "GET", url: "/api/display-pages/overview/live" });
    const liveBody = liveRes.json() as { config: { regions: Record<string, unknown> } };
    assert.deepEqual(liveBody.config.regions, {});
  } finally {
    await app.close();
  }
});
