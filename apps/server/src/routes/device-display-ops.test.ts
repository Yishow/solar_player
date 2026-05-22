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
  getDatabase()
    .prepare("UPDATE topic_mappings SET enabled = 0 WHERE metric_key = ?")
    .run("realTimePower");
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
        alerts: Array<{ code: string; domain: string; severity: string }>;
        assetHealthSummary: { unhealthyCount: number };
        configurationReadinessSummary: { blockingCount: number };
        diagnosticActions: Array<{ action: string; safeScope: string }>;
        draftCount: number;
        liveVersion: number | null;
        operationalHealthSummary: { blockingCount: number; degraded: boolean };
        safeOpsGuidance: {
          hostRestartCommand: string;
          runbookPath: string;
          unsupportedOperations: Array<{ action: string }>;
        };
        skipSummary: { count: number };
      };
    };

    assert.equal(body.summary.liveVersion, 4);
    assert.equal(body.summary.draftCount, 1);
    assert.ok(body.summary.skipSummary.count >= 1);
    assert.ok(body.summary.configurationReadinessSummary.blockingCount >= 1);
    assert.ok(body.summary.operationalHealthSummary.blockingCount >= 1);
    assert.equal(body.summary.assetHealthSummary.unhealthyCount, 1);
    assert.equal(
      body.summary.alerts.some(
        (alert) => alert.code === "asset-unhealthy" && alert.domain === "operational-health"
      ),
      true
    );
    assert.equal(
      body.summary.alerts.some((alert) => alert.domain === "configuration-readiness"),
      true
    );
    assert.equal(
      body.summary.configurationReadinessSummary.blockingCount,
      body.summary.alerts.filter((alert) => alert.domain === "configuration-readiness").length
    );
    assert.equal(
      body.summary.operationalHealthSummary.blockingCount,
      body.summary.alerts.filter(
        (alert) => alert.domain === "operational-health" && alert.severity === "blocking"
      ).length
    );
    assert.deepEqual(
      body.summary.diagnosticActions.map((action) => action.action),
      ["refresh-readiness", "export-summary"]
    );
    assert.deepEqual(
      body.summary.diagnosticActions.map((action) => action.safeScope),
      ["safe-refresh", "safe-read"]
    );
    assert.equal(body.summary.safeOpsGuidance.hostRestartCommand, "systemctl restart solar-display");
    assert.equal(
      body.summary.safeOpsGuidance.runbookPath,
      "docs/runbooks/device-diagnostics-safe-ops.md"
    );
    assert.deepEqual(
      body.summary.safeOpsGuidance.unsupportedOperations.map((operation) => operation.action),
      ["reboot", "clear-cache"]
    );
  } finally {
    await app.close();
  }
});

test("POST /api/device-display-ops/diagnostics returns a truthful safe result for the named action", async () => {
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
          action: "refresh-readiness"
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
        guidance: {
          hostRestartCommand: string;
          runbookPath: string;
        };
        message: string;
        safeScope: string;
        generatedAt: string;
        summary: {
          draftCount: number;
          generatedAt: string;
          configurationReadinessSummary: { blockingCount: number };
          operationalHealthSummary: { blockingCount: number; degraded: boolean };
          skipSummary: { count: number };
        };
      };
    };

    assert.equal(diagnosticBody.success, true);
    assert.equal(diagnosticBody.data.action, "refresh-readiness");
    assert.match(diagnosticBody.data.message, /Refreshed the bounded display readiness summary\./);
    assert.equal(diagnosticBody.data.safeScope, "safe-refresh");
    assert.equal(diagnosticBody.data.guidance.hostRestartCommand, "systemctl restart solar-display");
    assert.equal(
      diagnosticBody.data.guidance.runbookPath,
      "docs/runbooks/device-diagnostics-safe-ops.md"
    );
    assert.equal(typeof diagnosticBody.data.generatedAt, "string");
    assert.equal(
      diagnosticBody.data.summary.draftCount,
      summaryBody.summary.draftCount
    );
    assert.equal(
      diagnosticBody.data.summary.skipSummary.count,
      summaryBody.summary.skipSummary.count
    );
    assert.equal(
      diagnosticBody.data.summary.configurationReadinessSummary.blockingCount >= 0,
      true
    );
    assert.equal(
      typeof diagnosticBody.data.summary.operationalHealthSummary.degraded,
      "boolean"
    );
    assert.equal(diagnosticBody.data.generatedAt, diagnosticBody.data.summary.generatedAt);
  } finally {
    await app.close();
  }
});

test("device display diagnostics deny untrusted readers and do not return diagnostic results", async () => {
  const app = await buildApp();

  try {
    const [summaryResponse, diagnosticsResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/device-display-ops",
        headers: {
          host: "player.example",
          origin: "https://evil.example"
        }
      }),
      app.inject({
        method: "POST",
        url: "/api/device-display-ops/diagnostics",
        headers: {
          host: "player.example",
          origin: "https://evil.example"
        },
        payload: {
          action: "refresh-readiness"
        }
      })
    ]);

    assert.equal(summaryResponse.statusCode, 403);
    assert.equal(diagnosticsResponse.statusCode, 403);
    assert.equal(summaryResponse.json<{ access: string }>().access, "denied");
    assert.equal(diagnosticsResponse.json<{ access: string; data?: unknown }>().access, "denied");
    assert.equal("data" in diagnosticsResponse.json<Record<string, unknown>>(), false);
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
        disk: {
          availableMB: number;
          totalMB: number;
          usedMB: number;
          usePercent: number;
        };
        displayOps: {
          degraded: boolean;
          configurationReadinessSummary: { blockingCount: number };
          diagnosticActions: Array<{ action: string }>;
          operationalHealthSummary: { degraded: boolean };
        };
        hostname: string;
      };
      success: boolean;
    };

    assert.equal(body.success, true);
    assert.equal(typeof body.data.hostname, "string");
    assert.ok(body.data.cpu.cores >= 1);
    assert.ok(body.data.disk.totalMB > 0);
    assert.ok(body.data.disk.availableMB >= 0);
    assert.ok(body.data.disk.usedMB >= 0);
    assert.ok(body.data.disk.usePercent >= 0);
    assert.equal(typeof body.data.displayOps.degraded, "boolean");
    assert.ok(body.data.displayOps.configurationReadinessSummary.blockingCount >= 0);
    assert.equal(typeof body.data.displayOps.operationalHealthSummary.degraded, "boolean");
    assert.deepEqual(
      body.data.displayOps.diagnosticActions.map((action) => action.action),
      ["refresh-readiness", "export-summary"]
    );
  } finally {
    await app.close();
  }
});
