import assert from "node:assert/strict";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildApp,
  getDatabase,
  seedManagedImageAsset,
  uploadsDir
} from "./display-pages-asset-governance.test-support.js";

type InjectableApp = Awaited<ReturnType<typeof buildApp>>;

function upsertStageConfig(input: {
  config: Record<string, unknown>;
  pageKey: string;
  publishedAt?: string | null;
  publishedBy?: string | null;
  stage: "draft" | "live";
  updatedAt: string;
  version: number;
}) {
  getDatabase()
    .prepare(
      `
        INSERT INTO display_page_stage_configs (
          page_key,
          stage,
          config_json,
          version,
          updated_at,
          published_at,
          published_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(page_key, stage) DO UPDATE SET
          config_json = excluded.config_json,
          version = excluded.version,
          updated_at = excluded.updated_at,
          published_at = excluded.published_at,
          published_by = excluded.published_by
      `
    )
    .run(
      input.pageKey,
      input.stage,
      JSON.stringify(input.config),
      input.version,
      input.updatedAt,
      input.publishedAt ?? null,
      input.publishedBy ?? null
    );
}

async function saveShellDecorationDraft(
  app: InjectableApp,
  channel: { footerObjects: unknown[]; headerObjects: unknown[] }
) {
  const current = (await app.inject({
    method: "GET",
    url: "/api/shell-decorations/draft"
  })).json() as { config: { version: number } };

  return app.inject({
    method: "PUT",
    url: "/api/shell-decorations/draft",
    payload: {
      ...channel,
      baseVersion: current.config.version
    }
  });
}

test("GET /api/display-ops summarizes pending drafts, skip reasons, and live publish state", async () => {
  const asset = seedManagedImageAsset();
  upsertStageConfig({
    config: {
      heroMedia: {
        assetId: asset.assetId
      }
    },
    pageKey: "overview",
    publishedAt: "2026-05-18T08:00:00.000Z",
    publishedBy: "ops.live",
    stage: "live",
    updatedAt: "2026-05-18T08:00:00.000Z",
    version: 2
  });
  upsertStageConfig({
    config: {
      heroMedia: {
        assetId: asset.assetId
      },
      messageCard: {
        text: "draft overlay"
      }
    },
    pageKey: "overview",
    stage: "draft",
    updatedAt: "2026-05-18T09:00:00.000Z",
    version: 3
  });

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-ops"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      summary: {
        blockingIssues: Array<{ code: string; pageId?: string }>;
        draftPending: boolean;
        pages: Array<{
          draftPending: boolean;
          pageId: string;
          publishState: string;
          skipReason: string | null;
        }>;
      };
    };

    const overview = body.summary.pages.find((page) => page.pageId === "overview");
    assert.equal(body.summary.draftPending, true);
    assert.ok(overview);
    assert.equal(overview.publishState, "draft-pending");
    assert.equal(overview.draftPending, true);
    assert.equal(overview.skipReason, "stale-runtime");
    assert.equal(
      body.summary.blockingIssues.some(
        (issue) => issue.code === "draft-pending" && issue.pageId === "overview"
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("GET /api/display-ops denies untrusted remote readers", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-ops",
      headers: {
        host: "player.example",
        origin: "https://evil.example"
      }
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json<{ access: string }>().access, "denied");
  } finally {
    await app.close();
  }
});

test("GET /api/display-ops/assets/:id/references returns display-page and slideshow references", async () => {
  const asset = seedManagedImageAsset("reference-asset.png");
  getDatabase()
    .prepare(
      `
        UPDATE image_assets
        SET included_in_slideshow = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .run(asset.assetId);
  upsertStageConfig({
    config: {
      heroMedia: {
        assetId: asset.assetId
      }
    },
    pageKey: "overview",
    publishedAt: "2026-05-18T08:00:00.000Z",
    publishedBy: "ops.live",
    stage: "live",
    updatedAt: "2026-05-18T08:00:00.000Z",
    version: 1
  });
  upsertStageConfig({
    config: {
      stageMedia: {
        assetId: asset.assetId
      }
    },
    pageKey: "solar",
    stage: "draft",
    updatedAt: "2026-05-18T09:30:00.000Z",
    version: 2
  });

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: `/api/display-ops/assets/${asset.assetId}/references`
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      references: {
        blockingIssues: Array<{ code: string }>;
        draftCount: number;
        liveCount: number;
        references: Array<{
          kind: string;
          pageId: string | null;
          stage: string;
        }>;
      };
    };

    assert.equal(body.references.liveCount, 2);
    assert.equal(body.references.draftCount, 1);
    assert.equal(
      body.references.references.some(
        (reference) =>
          reference.kind === "display-page" &&
          reference.pageId === "overview" &&
          reference.stage === "live"
      ),
      true
    );
    assert.equal(
      body.references.references.some(
        (reference) =>
          reference.kind === "display-page" &&
          reference.pageId === "solar" &&
          reference.stage === "draft"
      ),
      true
    );
    assert.equal(
      body.references.references.some(
        (reference) => reference.kind === "slideshow" && reference.stage === "live"
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("GET /api/display-ops/assets/:id/references returns shell-decoration and page-object references", async () => {
  const asset = seedManagedImageAsset("cross-surface-asset.png");
  upsertStageConfig({
    config: {
      freeformObjects: [
        {
          frame: { height: 96, left: 240, top: 120, width: 96 },
          id: "overview-icon",
          locked: false,
          metadata: {},
          mount: "content",
          source: { assetId: asset.assetId, fallbackSrc: `/uploads/images/${asset.filename}`, kind: "icon-asset" },
          style: {},
          type: "icon-asset",
          visible: true,
          zIndex: 3
        }
      ],
      regions: {}
    },
    pageKey: "overview",
    stage: "draft",
    updatedAt: "2026-05-18T09:30:00.000Z",
    version: 4
  });

  const app = await buildApp();

  try {
    const shellSave = await saveShellDecorationDraft(app, {
      footerObjects: [
        {
          frame: { height: 36, left: 32, top: 18, width: 36 },
          id: "footer-badge",
          locked: false,
          metadata: {},
          mount: "footer",
          source: { assetId: asset.assetId, fallbackSrc: `/uploads/images/${asset.filename}`, kind: "asset-image" },
          style: {},
          type: "asset-image",
          visible: true,
          zIndex: 1
        }
      ],
      headerObjects: []
    });
    assert.equal(shellSave.statusCode, 200);

    const publishResponse = await app.inject({
      method: "POST",
      url: "/api/shell-decorations/publish",
      payload: { publishedBy: "ops.live" }
    });
    assert.equal(publishResponse.statusCode, 200);

    const response = await app.inject({
      method: "GET",
      url: `/api/display-ops/assets/${asset.assetId}/references`
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      references: {
        draftCount: number;
        liveCount: number;
        references: Array<{
          bindingId: string | null;
          kind: string;
          pageId: string | null;
          stage: string;
        }>;
      };
    };

    assert.equal(body.references.liveCount, 1);
    assert.equal(body.references.draftCount, 2);
    assert.equal(
      body.references.references.some(
        (reference) =>
          reference.kind === "shell-decoration"
          && reference.bindingId === "footer-badge"
          && reference.pageId === null
          && reference.stage === "live"
      ),
      true
    );
    assert.equal(
      body.references.references.some(
        (reference) =>
          reference.kind === "page-object"
          && reference.bindingId === "overview-icon"
          && reference.pageId === "overview"
          && reference.stage === "draft"
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("DELETE /api/images/:id blocks removal when the asset is still referenced by a live display page", async () => {
  const asset = seedManagedImageAsset("live-blocker.png");
  upsertStageConfig({
    config: {
      heroMedia: {
        assetId: asset.assetId
      }
    },
    pageKey: "overview",
    publishedAt: "2026-05-18T08:00:00.000Z",
    publishedBy: "ops.live",
    stage: "live",
    updatedAt: "2026-05-18T08:00:00.000Z",
    version: 1
  });

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/images/${asset.assetId}`
    });

    assert.equal(response.statusCode, 409);
    const body = response.json() as {
      error: string;
      references?: {
        liveCount: number;
        references: Array<{ kind: string; pageId: string | null; stage: string }>;
      };
      success: boolean;
    };

    assert.equal(body.success, false);
    assert.match(body.error, /live display/i);
    assert.equal(body.references?.liveCount, 1);
    assert.equal(
      body.references?.references.some(
        (reference) =>
          reference.kind === "display-page" &&
          reference.pageId === "overview" &&
          reference.stage === "live"
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("DELETE /api/images/:id blocks removal when the asset is still referenced by a live shell decoration", async () => {
  const asset = seedManagedImageAsset("live-shell-blocker.png");
  const app = await buildApp();

  try {
    const draftSave = await saveShellDecorationDraft(app, {
      footerObjects: [
        {
          frame: { height: 42, left: 24, top: 12, width: 42 },
          id: "footer-shell-logo",
          locked: false,
          metadata: {},
          mount: "footer",
          source: { assetId: asset.assetId, fallbackSrc: `/uploads/images/${asset.filename}`, kind: "asset-image" },
          style: {},
          type: "asset-image",
          visible: true,
          zIndex: 1
        }
      ],
      headerObjects: []
    });
    assert.equal(draftSave.statusCode, 200);

    const publishResponse = await app.inject({
      method: "POST",
      url: "/api/shell-decorations/publish",
      payload: { publishedBy: "ops.live" }
    });
    assert.equal(publishResponse.statusCode, 200);

    const response = await app.inject({
      method: "DELETE",
      url: `/api/images/${asset.assetId}`
    });

    assert.equal(response.statusCode, 409);
    const body = response.json() as {
      error: string;
      references?: {
        blockingIssues: Array<{ code: string }>;
        references: Array<{ bindingId: string | null; kind: string; stage: string }>;
      };
      success: boolean;
    };

    assert.equal(body.success, false);
    assert.equal(body.references?.blockingIssues.some((issue) => issue.code === "live-reference"), true);
    assert.equal(
      body.references?.references.some(
        (reference) =>
          reference.kind === "shell-decoration"
          && reference.bindingId === "footer-shell-logo"
          && reference.stage === "live"
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("DELETE /api/images/:id blocks removal when the asset is used by a managed shell ornament", async () => {
  const asset = seedManagedImageAsset("live-shell-ornament.png");
  const app = await buildApp();

  try {
    const draftSave = await saveShellDecorationDraft(app, {
      footerObjects: [
        {
          frame: { height: 48, left: 28, top: 8, width: 48 },
          id: "footer-managed-leaf",
          locked: false,
          metadata: {},
          mount: "footer",
          source: {
            assetId: asset.assetId,
            fallbackSrc: `/uploads/images/${asset.filename}`,
            kind: "ornament-image",
            ornamentKey: "leaf"
          },
          style: {},
          type: "ornament-image",
          visible: true,
          zIndex: 1
        }
      ],
      headerObjects: []
    });
    assert.equal(draftSave.statusCode, 200);

    const publishResponse = await app.inject({
      method: "POST",
      url: "/api/shell-decorations/publish",
      payload: { publishedBy: "ops.live" }
    });
    assert.equal(publishResponse.statusCode, 200);

    const response = await app.inject({
      method: "DELETE",
      url: `/api/images/${asset.assetId}`
    });

    assert.equal(response.statusCode, 409);
    const body = response.json() as {
      references?: {
        references: Array<{ bindingId: string | null; kind: string; stage: string }>;
      };
      success: boolean;
    };

    assert.equal(body.success, false);
    assert.equal(
      body.references?.references.some(
        (reference) =>
          reference.kind === "shell-decoration" &&
          reference.bindingId === "footer-managed-leaf" &&
          reference.stage === "live"
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("DELETE /api/images/:id allows removal when the asset is only referenced by a draft display page", async () => {
  const asset = seedManagedImageAsset("draft-only-reference.png");
  upsertStageConfig({
    config: {
      heroMedia: {
        assetId: asset.assetId
      }
    },
    pageKey: "overview",
    stage: "draft",
    updatedAt: "2026-05-18T09:00:00.000Z",
    version: 3
  });

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/images/${asset.assetId}`
    });

    assert.equal(response.statusCode, 200);
  } finally {
    await app.close();
  }
});

test("DELETE /api/images/:id blocks removal when the asset is still referenced by a bootstrapped playlist runtime row", async () => {
  const asset = seedManagedImageAsset("playlist-blocker.png");
  getDatabase()
    .prepare(
      `
        UPDATE image_assets
        SET included_in_slideshow = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .run(asset.assetId);

  const app = await buildApp();

  try {
    const bootstrapResponse = await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });
    assert.equal(bootstrapResponse.statusCode, 200);

    const response = await app.inject({
      method: "DELETE",
      url: `/api/images/${asset.assetId}`
    });

    assert.equal(response.statusCode, 409);
    const body = response.json() as {
      error: string;
      references?: {
        blockingIssues: Array<{ code: string; message: string }>;
        references: Array<{ kind: string; stage: string }>;
      };
      success: boolean;
    };

    assert.equal(body.success, false);
    assert.match(body.error, /playlist runtime/i);
    assert.equal(
      body.references?.blockingIssues.some((issue) => /playlist/i.test(issue.message)),
      true
    );
    assert.equal(
      body.references?.references.some(
        (reference) => reference.kind === "slideshow" && reference.stage === "live"
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("DELETE /api/images/:id blocks removal when slideshow runtime is resolved from assets without governance rows", async () => {
  const asset = seedManagedImageAsset("playlist-legacy-delete.png");
  getDatabase()
    .prepare(
      `
        UPDATE image_assets
        SET included_in_slideshow = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .run(asset.assetId);

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/images/${asset.assetId}`
    });

    assert.equal(response.statusCode, 409);
  } finally {
    await app.close();
  }
});

test("GET /api/display-ops/assets/:id/references treats asset-backed runtime slideshow usage as a blocking live reference", async () => {
  const asset = seedManagedImageAsset("playlist-legacy-reference.png");
  getDatabase()
    .prepare(
      `
        UPDATE image_assets
        SET included_in_slideshow = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .run(asset.assetId);

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: `/api/display-ops/assets/${asset.assetId}/references`
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      references: {
        blockingIssues: Array<{ code: string; message: string }>;
        liveCount: number;
        references: Array<{ bindingId: string | null; kind: string; stage: string; targetLabel: string | null }>;
      };
    };

    assert.equal(body.references.liveCount, 1);
    assert.equal(
      body.references.references.some(
        (reference) =>
          reference.kind === "slideshow" &&
          reference.stage === "live" &&
          reference.bindingId === `runtime-asset-${asset.assetId}` &&
          reference.targetLabel === "playlist-runtime"
      ),
      true
    );
    assert.equal(body.references.blockingIssues.length, 1);
  } finally {
    await app.close();
  }
});

test("GET /api/display-ops/assets/:id/references ignores legacy slideshow fallback when playlist rows already exist but are disabled", async () => {
  const asset = seedManagedImageAsset("playlist-disabled-fallback.png");
  const app = await buildApp();

  try {
    await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });

    getDatabase()
      .prepare(
        `
          UPDATE image_assets
          SET included_in_slideshow = 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      )
      .run(asset.assetId);

    getDatabase()
      .prepare(
        `
          UPDATE image_playlist_entries
          SET enabled = 0,
              updated_at = CURRENT_TIMESTAMP
          WHERE asset_id = ?
        `
      )
      .run(asset.assetId);

    const response = await app.inject({
      method: "GET",
      url: `/api/display-ops/assets/${asset.assetId}/references`
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      references: {
        blockingIssues: Array<{ code: string }>;
        liveCount: number;
        references: Array<{ kind: string; stage: string }>;
      };
    };

    assert.equal(body.references.liveCount, 0);
    assert.equal(
      body.references.references.some(
        (reference) => reference.kind === "slideshow" && reference.stage === "live"
      ),
      false
    );
    assert.equal(body.references.blockingIssues.length, 0);
  } finally {
    await app.close();
  }
});

test("GET /api/display-ops/assets/:id/references ignores the legacy slideshow flag when a playlist row is disabled", async () => {
  const first = seedManagedImageAsset("playlist-disable-first.png");
  const app = await buildApp();

  try {
    await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });

    getDatabase()
      .prepare(
        `
          UPDATE image_assets
          SET included_in_slideshow = 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      )
      .run(first.assetId);

    const updateResponse = await app.inject({
      method: "PUT",
      payload: {
        enabled: false
      },
      url: "/api/image-playlist/IMG-01"
    });

    assert.equal(updateResponse.statusCode, 200);

    const firstAsset = getDatabase()
      .prepare("SELECT included_in_slideshow FROM image_assets WHERE id = ?")
      .get(first.assetId) as { included_in_slideshow: number };

    const response = await app.inject({
      method: "GET",
      url: `/api/display-ops/assets/${first.assetId}/references`
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      references: {
        blockingIssues: Array<{ code: string }>;
        liveCount: number;
        references: Array<{ kind: string; stage: string }>;
      };
    };

    assert.equal(firstAsset.included_in_slideshow, 1);
    assert.equal(body.references.liveCount, 0);
    assert.equal(
      body.references.references.some(
        (reference) => reference.kind === "slideshow" && reference.stage === "live"
      ),
      false
    );
    assert.equal(body.references.blockingIssues.length, 0);
  } finally {
    await app.close();
  }
});

test("GET /api/display-ops includes asset-health blockers when a live display asset file is missing", async () => {
  const asset = seedManagedImageAsset("missing-health.png");
  upsertStageConfig({
    config: {
      heroMedia: {
        assetId: asset.assetId
      }
    },
    pageKey: "overview",
    publishedAt: "2026-05-18T08:00:00.000Z",
    publishedBy: "ops.live",
    stage: "live",
    updatedAt: "2026-05-18T08:00:00.000Z",
    version: 1
  });
  unlinkSync(join(uploadsDir, asset.filename));

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-ops"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      summary: {
        blockingIssues: Array<{ code: string; pageId?: string }>;
      };
    };

    assert.equal(
      body.summary.blockingIssues.some(
        (issue) => issue.code === "asset-unhealthy" && issue.pageId === "overview"
      ),
      true
    );
  } finally {
    await app.close();
  }
});
