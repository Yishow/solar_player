import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-shell-decorations-route-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [{ buildApp }, { closeDatabaseConnection, getDatabase }, { migrateDatabase }, { seedDatabase }] =
  await Promise.all([
    import("../app.js"),
    import("../db/index.js"),
    import("../db/migrate.js"),
    import("../db/seed.js")
  ]);

function lineObject(id: string, overrides: Record<string, unknown> = {}) {
  return {
    frame: { height: 4, left: 40, top: 20, width: 200 },
    id,
    locked: false,
    metadata: {},
    mount: "header",
    source: { kind: "line" },
    style: { color: "#fff", thickness: 4 },
    type: "line",
    visible: true,
    zIndex: 1,
    ...overrides
  };
}

function footerOrnament(id: string) {
  return {
    frame: { height: 40, left: 10, top: 10, width: 40 },
    id,
    locked: false,
    metadata: {},
    mount: "footer",
    source: { kind: "ornament-image", ornamentKey: "leaf" },
    style: {},
    type: "ornament-image",
    visible: true,
    zIndex: 1
  };
}

type InjectableApp = Awaited<ReturnType<typeof buildApp>>;

async function saveDraft(app: InjectableApp, channel: { footerObjects: unknown[]; headerObjects: unknown[] }) {
  const current = (await app.inject({ method: "GET", url: "/api/shell-decorations/draft" })).json() as {
    config: { version: number };
  };
  return app.inject({
    method: "PUT",
    url: "/api/shell-decorations/draft",
    payload: { ...channel, baseVersion: current.config.version }
  });
}

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

test("saving a draft keeps the published live channel unchanged", async () => {
  const app = await buildApp();

  try {
    await saveDraft(app, { footerObjects: [footerOrnament("ornament-1")], headerObjects: [] });
    const publishResponse = await app.inject({ method: "POST", url: "/api/shell-decorations/publish" });
    assert.equal(publishResponse.statusCode, 200);

    const draftSave = await saveDraft(app, {
      footerObjects: [],
      headerObjects: [lineObject("line-1", { zIndex: 1 }), lineObject("line-2", { zIndex: 2 })]
    });
    assert.equal(draftSave.statusCode, 200);
    const draft = draftSave.json() as { config: { headerObjects: unknown[] } };
    assert.equal(draft.config.headerObjects.length, 2);

    const live = (await app.inject({ method: "GET", url: "/api/shell-decorations/live" })).json() as {
      config: { footerObjects: Array<{ id: string }>; headerObjects: unknown[] };
    };
    assert.equal(live.config.footerObjects.length, 1);
    assert.equal(live.config.footerObjects[0]?.id, "ornament-1");
    assert.equal(live.config.headerObjects.length, 0);
  } finally {
    await app.close();
  }
});

test("public read returns sorted live objects without management metadata", async () => {
  const app = await buildApp();

  try {
    await saveDraft(app, {
      footerObjects: [],
      headerObjects: [lineObject("b", { zIndex: 5 }), lineObject("a", { zIndex: 1 })]
    });
    await app.inject({ method: "POST", url: "/api/shell-decorations/publish", payload: { publishedBy: "operator" } });

    const publicResponse = await app.inject({ method: "GET", url: "/api/shell-decorations" });
    assert.equal(publicResponse.statusCode, 200);
    const body = publicResponse.json() as {
      config: { headerObjects: Array<{ id: string }>; publishedBy?: string };
    };
    assert.deepEqual(body.config.headerObjects.map((object) => object.id), ["a", "b"]);
    assert.equal("publishedBy" in body.config, false);
  } finally {
    await app.close();
  }
});

test("publish is rejected when a header object overflows its band", async () => {
  const app = await buildApp();

  try {
    await saveDraft(app, {
      footerObjects: [],
      headerObjects: [lineObject("line-overflow", { frame: { height: 28, left: 40, top: 96, width: 200 } })]
    });

    const publishResponse = await app.inject({ method: "POST", url: "/api/shell-decorations/publish" });
    assert.equal(publishResponse.statusCode, 422);
    const body = publishResponse.json() as {
      validation: { findings: Array<{ code: string; regionId?: string }> };
    };
    assert.ok(body.validation.findings.some((finding) => finding.code === "SHELL_OBJECT_BAND_OVERFLOW"));
  } finally {
    await app.close();
  }
});

test("publish is rejected when an asset-image object omits its source reference", async () => {
  const app = await buildApp();

  try {
    await saveDraft(app, {
      footerObjects: [
        {
          frame: { height: 48, left: 0, top: 0, width: 48 },
          id: "asset-missing",
          locked: false,
          metadata: {},
          mount: "footer",
          source: { kind: "asset-image" },
          style: {},
          type: "asset-image",
          visible: true,
          zIndex: 1
        }
      ],
      headerObjects: []
    });

    const publishResponse = await app.inject({ method: "POST", url: "/api/shell-decorations/publish" });
    assert.equal(publishResponse.statusCode, 422);
    const body = publishResponse.json() as {
      validation: { findings: Array<{ code: string; regionId?: string }> };
    };
    const finding = body.validation.findings.find((entry) => entry.code === "SHELL_OBJECT_INVALID_SOURCE");
    assert.ok(finding);
    assert.equal(finding?.regionId, "asset-missing");
  } finally {
    await app.close();
  }
});

test("denies untrusted remote readers for draft and live channels", async () => {
  const app = await buildApp();

  try {
    const draftResponse = await app.inject({
      method: "GET",
      url: "/api/shell-decorations/draft",
      headers: { host: "player.example", origin: "https://evil.example" }
    });
    assert.equal(draftResponse.statusCode, 403);
    assert.equal(draftResponse.json<{ access: string }>().access, "denied");

    const liveResponse = await app.inject({
      method: "GET",
      url: "/api/shell-decorations/live",
      headers: { host: "player.example", origin: "https://evil.example" }
    });
    assert.equal(liveResponse.statusCode, 403);

    // The public-safe runtime read stays open for non-management clients.
    const publicResponse = await app.inject({
      method: "GET",
      url: "/api/shell-decorations",
      headers: { host: "player.example", origin: "https://evil.example" }
    });
    assert.equal(publicResponse.statusCode, 200);
  } finally {
    await app.close();
  }
});

test("denies untrusted remote writers for draft and publish endpoints", async () => {
  const app = await buildApp();

  try {
    const draftResponse = await app.inject({
      method: "PUT",
      url: "/api/shell-decorations/draft",
      headers: { host: "player.example", origin: "https://evil.example" },
      payload: { baseVersion: 1, footerObjects: [], headerObjects: [lineObject("blocked")] }
    });
    assert.equal(draftResponse.statusCode, 403);
    assert.equal(draftResponse.json<{ access: string }>().access, "denied");

    const publishResponse = await app.inject({
      method: "POST",
      url: "/api/shell-decorations/publish",
      headers: { host: "player.example", origin: "https://evil.example" },
      payload: { publishedBy: "evil" }
    });
    assert.equal(publishResponse.statusCode, 403);
    assert.equal(publishResponse.json<{ access: string }>().access, "denied");
  } finally {
    await app.close();
  }
});

test("masks corrupted live config on the public route but stays diagnosable for management", async () => {
  const app = await buildApp();

  try {
    getDatabase()
      .prepare(
        `INSERT INTO shell_decoration_stage_configs (stage, config_json, version, updated_at)
         VALUES ('live', ?, 2, ?)
         ON CONFLICT(stage) DO UPDATE SET config_json = excluded.config_json, version = excluded.version`
      )
      .run("{not valid json", new Date().toISOString());

    const publicResponse = await app.inject({ method: "GET", url: "/api/shell-decorations" });
    assert.equal(publicResponse.statusCode, 500);
    assert.equal(publicResponse.json<{ success: boolean }>().success, false);
    assert.doesNotMatch(publicResponse.body, /corrupt/i);

    const managementResponse = await app.inject({ method: "GET", url: "/api/shell-decorations/live" });
    assert.equal(managementResponse.statusCode, 500);
    assert.match(managementResponse.body, /corrupt/i);
  } finally {
    await app.close();
  }
});

test("surfaces partially corrupted stored objects instead of truncating them", async () => {
  const app = await buildApp();

  try {
    getDatabase()
      .prepare(
        `INSERT INTO shell_decoration_stage_configs (stage, config_json, version, updated_at)
         VALUES ('live', ?, 2, ?)
         ON CONFLICT(stage) DO UPDATE SET config_json = excluded.config_json, version = excluded.version`
      )
      .run(JSON.stringify({ footerObjects: [], headerObjects: [lineObject("ok"), "not-an-object"] }), new Date().toISOString());

    const managementResponse = await app.inject({ method: "GET", url: "/api/shell-decorations/live" });
    assert.equal(managementResponse.statusCode, 500);
    assert.match(managementResponse.body, /corrupt/i);
  } finally {
    await app.close();
  }
});

test("treats a stored object with an invalid mount or a missing band as corruption", async () => {
  const app = await buildApp();

  try {
    const writeLive = (configJson: string) =>
      getDatabase()
        .prepare(
          `INSERT INTO shell_decoration_stage_configs (stage, config_json, version, updated_at)
           VALUES ('live', ?, 2, ?)
           ON CONFLICT(stage) DO UPDATE SET config_json = excluded.config_json, version = excluded.version`
        )
        .run(configJson, new Date().toISOString());

    writeLive(JSON.stringify({ footerObjects: [], headerObjects: [lineObject("bad", { mount: "content" })] }));
    const invalidMount = await app.inject({ method: "GET", url: "/api/shell-decorations/live" });
    assert.equal(invalidMount.statusCode, 500);

    writeLive(JSON.stringify({ headerObjects: [] }));
    const missingBand = await app.inject({ method: "GET", url: "/api/shell-decorations/live" });
    assert.equal(missingBand.statusCode, 500);
  } finally {
    await app.close();
  }
});

test("publishing a valid draft heals a corrupted live config", async () => {
  const app = await buildApp();

  try {
    getDatabase()
      .prepare(
        `INSERT INTO shell_decoration_stage_configs (stage, config_json, version, updated_at)
         VALUES ('live', ?, 3, ?)
         ON CONFLICT(stage) DO UPDATE SET config_json = excluded.config_json, version = excluded.version`
      )
      .run("{not valid json", new Date().toISOString());

    await saveDraft(app, { footerObjects: [], headerObjects: [lineObject("fresh", { zIndex: 1 })] });
    const publishResponse = await app.inject({ method: "POST", url: "/api/shell-decorations/publish" });
    assert.equal(publishResponse.statusCode, 200);

    const live = (await app.inject({ method: "GET", url: "/api/shell-decorations/live" })).json() as {
      config: { headerObjects: Array<{ id: string }>; version: number };
    };
    assert.equal(live.config.headerObjects[0]?.id, "fresh");
    assert.equal(live.config.version, 4);
  } finally {
    await app.close();
  }
});

test("publishing a valid shell decoration draft emits a display-pages sync invalidation", async () => {
  const app = await buildApp();
  const emitted: Array<{ reason: string; scope: string }> = [];
  const originalEmitDisplaySync = app.socketService.emitDisplaySync.bind(app.socketService);
  app.socketService.emitDisplaySync = ((payload) => {
    emitted.push({ reason: payload.reason, scope: payload.scope });
    return originalEmitDisplaySync(payload);
  }) as typeof app.socketService.emitDisplaySync;

  try {
    await saveDraft(app, { footerObjects: [footerOrnament("ornament-sync")], headerObjects: [] });

    const publishResponse = await app.inject({
      method: "POST",
      url: "/api/shell-decorations/publish",
      payload: { publishedBy: "operator" }
    });
    assert.equal(publishResponse.statusCode, 200);
    assert.deepEqual(emitted, [{ reason: "shell-decoration-published", scope: "display-pages" }]);
  } finally {
    app.socketService.emitDisplaySync = originalEmitDisplaySync;
    await app.close();
  }
});

test("rejects a stale shell draft write with a 409 conflict", async () => {
  const app = await buildApp();

  try {
    const firstSave = await saveDraft(app, { footerObjects: [], headerObjects: [lineObject("a", { zIndex: 1 })] });
    assert.equal(firstSave.statusCode, 200);

    // Re-submitting against the now-stale baseVersion 1 must be rejected.
    const staleSave = await app.inject({
      method: "PUT",
      url: "/api/shell-decorations/draft",
      payload: { baseVersion: 1, footerObjects: [], headerObjects: [lineObject("b", { zIndex: 1 })] }
    });
    assert.equal(staleSave.statusCode, 409);
    const body = staleSave.json<{ code: string; conflict: { currentVersion: number } }>();
    assert.equal(body.code, "management_draft_conflict");
    assert.equal(body.conflict.currentVersion, 2);
  } finally {
    await app.close();
  }
});

test("rejects malformed draft bodies", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "PUT",
      url: "/api/shell-decorations/draft",
      payload: { headerObjects: {} }
    });
    assert.equal(response.statusCode, 400);
  } finally {
    await app.close();
  }
});

test("rejects a draft entry that is not a valid object instead of dropping it", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "PUT",
      url: "/api/shell-decorations/draft",
      payload: { baseVersion: 1, footerObjects: [], headerObjects: [lineObject("ok"), 123] }
    });
    assert.equal(response.statusCode, 400);
  } finally {
    await app.close();
  }
});
