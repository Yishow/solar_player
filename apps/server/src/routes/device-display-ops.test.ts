import assert from "node:assert/strict";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildApp,
  seedManagedImageAsset,
  uploadsDir
} from "./display-pages-asset-governance.test-support.js";
import { getDatabase } from "../db/index.js";

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

test("GET /api/device-display-ops returns display summary, alerts, and safe diagnostics metadata", async () => {
  const asset = seedManagedImageAsset("device-summary.png");
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
    version: 4
  });
  upsertStageConfig({
    config: {
      heroMedia: {
        assetId: asset.assetId
      },
      draftBadge: {
        text: "pending"
      }
    },
    pageKey: "overview",
    stage: "draft",
    updatedAt: "2026-05-18T09:00:00.000Z",
    version: 5
  });
  unlinkSync(join(uploadsDir, asset.filename));

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/device-display-ops"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      summary: {
        alerts: Array<{ code: string }>;
        assetHealthSummary: { unhealthyCount: number };
        diagnosticActions: Array<{ action: string }>;
        draftCount: number;
        liveVersion: number | null;
        readinessSummary: { blockingCount: number };
        skipSummary: { count: number };
      };
    };

    assert.equal(body.summary.liveVersion, 4);
    assert.equal(body.summary.draftCount, 1);
    assert.ok(body.summary.skipSummary.count >= 1);
    assert.ok(body.summary.readinessSummary.blockingCount >= 1);
    assert.equal(body.summary.assetHealthSummary.unhealthyCount, 1);
    assert.equal(
      body.summary.alerts.some((alert) => alert.code === "asset-unhealthy"),
      true
    );
    assert.deepEqual(
      body.summary.diagnosticActions.map((action) => action.action),
      ["refresh-readiness", "export-summary"]
    );
  } finally {
    await app.close();
  }
});

test("POST /api/device-display-ops/diagnostics reuses the current summary findings", async () => {
  const app = await buildApp();

  try {
    const [summaryResponse, diagnosticResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/device-display-ops"
      }),
      app.inject({
        method: "POST",
        payload: {
          action: "export-summary"
        },
        url: "/api/device-display-ops/diagnostics"
      })
    ]);

    assert.equal(summaryResponse.statusCode, 200);
    assert.equal(diagnosticResponse.statusCode, 200);

    const summaryBody = summaryResponse.json() as {
      summary: {
        draftCount: number;
        skipSummary: { count: number };
      };
    };
    const diagnosticBody = diagnosticResponse.json() as {
      success: boolean;
      data: {
        action: string;
        summary: {
          draftCount: number;
          skipSummary: { count: number };
        };
      };
    };

    assert.equal(diagnosticBody.success, true);
    assert.equal(diagnosticBody.data.action, "export-summary");
    assert.equal(
      diagnosticBody.data.summary.draftCount,
      summaryBody.summary.draftCount
    );
    assert.equal(
      diagnosticBody.data.summary.skipSummary.count,
      summaryBody.summary.skipSummary.count
    );
  } finally {
    await app.close();
  }
});

test("GET /api/device/status keeps host health while adding a degraded display summary payload", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/device/status"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      data: {
        cpu: { cores: number };
        displayOps: {
          degraded: boolean;
          diagnosticActions: Array<{ action: string }>;
        };
        hostname: string;
      };
      success: boolean;
    };

    assert.equal(body.success, true);
    assert.equal(typeof body.data.hostname, "string");
    assert.ok(body.data.cpu.cores >= 1);
    assert.equal(typeof body.data.displayOps.degraded, "boolean");
    assert.deepEqual(
      body.data.displayOps.diagnosticActions.map((action) => action.action),
      ["refresh-readiness", "export-summary"]
    );
  } finally {
    await app.close();
  }
});
