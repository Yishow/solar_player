import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-profile-routes-"));
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
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.DATA_DIR;
  delete process.env.DATABASE_PATH;
  delete process.env.UPLOADS_DIR;
});

test("Playback Profile routes preview both Sites and append publish/rollback history", async () => {
  const app = await buildApp();
  try {
    const createdResponse = await app.inject({
      method: "POST",
      payload: { name: "Operations" },
      url: "/api/playback-profiles"
    });
    assert.equal(createdResponse.statusCode, 201);
    const profileId = createdResponse.json<{ data: { id: number } }>().data.id;

    const draftResponse = await app.inject({
      method: "GET",
      url: `/api/playback-profiles/${profileId}/draft`
    });
    const draft = draftResponse.json<{
      data: {
        pages: Array<{ id: number; pageKey: string }>;
        revision: number;
        settings: Record<string, unknown>;
      };
    }>().data;
    const savedResponse = await app.inject({
      method: "PUT",
      payload: {
        expectedRevision: draft.revision,
        pages: draft.pages,
        settings: { ...draft.settings, startPage: draft.pages[0]!.id }
      },
      url: `/api/playback-profiles/${profileId}/draft`
    });
    assert.equal(savedResponse.statusCode, 200);

    const previewResponse = await app.inject({
      method: "POST",
      url: `/api/playback-profiles/${profileId}/preview`
    });
    assert.equal(previewResponse.statusCode, 200);
    const preview = previewResponse.json<{
      data: {
        cl: {
          configured: Array<{ pageKey: string }>;
          diagnostics: { freshness: string[]; readiness: string[]; site: string[] };
          effective: Array<{ pageKey: string }>;
          skipped: Array<{ pageKey: string; skipReason: string }>;
        };
        kn: {
          configured: Array<{ pageKey: string }>;
          diagnostics: { freshness: string[]; readiness: string[]; site: string[] };
          effective: Array<{ pageKey: string }>;
          skipped: Array<{ pageKey: string; skipReason: string }>;
        };
      };
    }>().data;
    assert.ok(preview.cl.configured.some((page) => page.pageKey === "factory-circuit"));
    assert.ok(preview.cl.skipped.some(
      (page) => page.pageKey === "factory-circuit-guanyin" && page.skipReason === "site-scope"
    ));
    assert.ok(preview.kn.configured.some((page) => page.pageKey === "factory-circuit-guanyin"));
    assert.ok(preview.kn.skipped.some(
      (page) => page.pageKey === "factory-circuit" && page.skipReason === "site-scope"
    ));
    assert.ok(preview.cl.diagnostics.site.length > 0);
    assert.ok(
      preview.cl.diagnostics.readiness.length > 0
      || preview.cl.diagnostics.freshness.length > 0
      || preview.cl.effective.length > 0
    );

    const publishedResponse = await app.inject({
      method: "POST",
      payload: {
        expectedRevision: savedResponse.json<{ data: { revision: number } }>().data.revision
      },
      url: `/api/playback-profiles/${profileId}/publish`
    });
    assert.equal(publishedResponse.statusCode, 201);
    const version1 = publishedResponse.json<{
      data: { createdBy: string; id: number; versionNumber: number };
    }>().data;
    assert.equal(version1.versionNumber, 1);
    assert.equal(version1.createdBy, "management-trusted");

    const rollbackResponse = await app.inject({
      method: "POST",
      payload: { versionId: version1.id },
      url: `/api/playback-profiles/${profileId}/rollback`
    });
    assert.equal(rollbackResponse.statusCode, 201);
    const rollback = rollbackResponse.json<{
      data: { rollbackFromVersionId: number; versionNumber: number };
    }>().data;
    assert.deepEqual(
      {
        rollbackFromVersionId: rollback.rollbackFromVersionId,
        versionNumber: rollback.versionNumber
      },
      { rollbackFromVersionId: version1.id, versionNumber: 2 }
    );
  } finally {
    await app.close();
  }
});

test("stale Draft route returns profile_draft_conflict with currentRevision", async () => {
  const app = await buildApp();
  try {
    const profileId = (
      await app.inject({
        method: "POST",
        payload: { name: "Conflict" },
        url: "/api/playback-profiles"
      })
    ).json<{ data: { id: number } }>().data.id;
    const draft = (
      await app.inject({
        method: "GET",
        url: `/api/playback-profiles/${profileId}/draft`
      })
    ).json<{ data: { pages: unknown[]; revision: number; settings: object } }>().data;
    await app.inject({
      method: "PUT",
      payload: {
        expectedRevision: draft.revision,
        pages: draft.pages,
        settings: draft.settings
      },
      url: `/api/playback-profiles/${profileId}/draft`
    });
    const stale = await app.inject({
      method: "PUT",
      payload: {
        expectedRevision: draft.revision,
        pages: draft.pages,
        settings: draft.settings
      },
      url: `/api/playback-profiles/${profileId}/draft`
    });

    assert.equal(stale.statusCode, 409);
    assert.equal(stale.json<{ code: string }>().code, "profile_draft_conflict");
    assert.equal(stale.json<{ currentRevision: number }>().currentRevision, 2);
  } finally {
    await app.close();
  }
});

test("Publish route rejects stale revision and malformed Draft payloads", async () => {
  const app = await buildApp();
  try {
    const profileId = (
      await app.inject({
        method: "POST",
        payload: { name: "Validated route" },
        url: "/api/playback-profiles"
      })
    ).json<{ data: { id: number } }>().data.id;
    const draft = (
      await app.inject({
        method: "GET",
        url: `/api/playback-profiles/${profileId}/draft`
      })
    ).json<{ data: { pages: Array<Record<string, unknown>>; revision: number; settings: object } }>().data;
    const malformed = await app.inject({
      method: "PUT",
      payload: {
        expectedRevision: draft.revision,
        pages: draft.pages.map((page, index) => (
          index === 0 ? { ...page, durationSeconds: 0 } : page
        )),
        settings: draft.settings
      },
      url: `/api/playback-profiles/${profileId}/draft`
    });
    assert.equal(malformed.statusCode, 400);
    assert.equal(malformed.json<{ code: string }>().code, "profile_draft_invalid");

    const saved = await app.inject({
      method: "PUT",
      payload: {
        expectedRevision: draft.revision,
        pages: draft.pages,
        settings: {
          ...draft.settings,
          startPage: draft.pages[0]!.id
        }
      },
      url: `/api/playback-profiles/${profileId}/draft`
    });
    assert.equal(saved.statusCode, 200);
    const stalePublish = await app.inject({
      method: "POST",
      payload: { expectedRevision: draft.revision },
      url: `/api/playback-profiles/${profileId}/publish`
    });
    assert.equal(stalePublish.statusCode, 409);
    assert.equal(stalePublish.json<{ code: string }>().code, "profile_draft_conflict");
  } finally {
    await app.close();
  }
});

test("legacy Playback settings update the Default Profile Draft without reviving legacy state", async () => {
  const app = await buildApp();
  try {
    const profiles = (
      await app.inject({ method: "GET", url: "/api/playback-profiles" })
    ).json<{ data: Array<{ id: number; isDefault: boolean }> }>().data;
    const defaultId = profiles.find((profile) => profile.isDefault)!.id;
    const before = (
      await app.inject({
        method: "GET",
        url: `/api/playback-profiles/${defaultId}/draft`
      })
    ).json<{ data: { revision: number } }>().data;

    const updated = await app.inject({
      method: "PUT",
      payload: { brightness: 64 },
      url: "/api/playback/settings"
    });
    assert.equal(updated.statusCode, 200);
    getDatabase()
      .prepare("UPDATE playback_settings SET brightness = 12")
      .run();

    const draft = (
      await app.inject({
        method: "GET",
        url: `/api/playback-profiles/${defaultId}/draft`
      })
    ).json<{
      data: { revision: number; settings: { brightness: number } };
    }>().data;
    const compatibility = (
      await app.inject({ method: "GET", url: "/api/playback/settings" })
    ).json<{ settings: { brightness: number } }>();

    assert.equal(draft.settings.brightness, 64);
    assert.equal(draft.revision, before.revision + 1);
    assert.equal(compatibility.settings.brightness, 64);

    const rotation = await app.inject({
      method: "PUT",
      payload: { pages: [{ id: 1, displayOrder: 8, durationSeconds: 22, enabled: true }] },
      url: "/api/playback/rotation-plan"
    });
    assert.equal(rotation.statusCode, 200);
    const afterRotation = (
      await app.inject({
        method: "GET",
        url: `/api/playback-profiles/${defaultId}/draft`
      })
    ).json<{ data: { revision: number } }>().data;
    assert.equal(afterRotation.revision, draft.revision + 1);
  } finally {
    await app.close();
  }
});
