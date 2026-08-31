import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-metric-usage-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ buildApp }, { migrateDatabase }, { seedDatabase }, { getDatabase, closeDatabaseConnection }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js")
]);

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

function insertOverviewPage(pageKey: string, routeSlug: string, labelZh: string) {
  const database = getDatabase();
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
          archived_at,
          display_order,
          duration_seconds,
          created_at,
          updated_at
        ) VALUES (?, 'overview', ?, ?, ?, 1, NULL, 20, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .run(pageKey, routeSlug, labelZh, pageKey);
  database
    .prepare(
      `
        INSERT INTO playback_profile_pages (
          profile_id,
          page_id,
          enabled,
          display_order,
          duration_seconds,
          created_at,
          updated_at
        )
        SELECT profile.id, registry.id, 1, 20, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM playback_profiles AS profile
        INNER JOIN display_page_registry AS registry ON registry.page_key = ?
        WHERE profile.profile_key = 'default' AND profile.is_default = 1
      `
    )
    .run(pageKey);
}

function writeStage(
  pageKey: string,
  stage: "draft" | "live",
  regions: Record<string, unknown>,
  published = stage === "live"
) {
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
        ) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, ?, ?)
        ON CONFLICT(page_key, stage) DO UPDATE SET
          config_json = excluded.config_json,
          version = excluded.version,
          updated_at = excluded.updated_at,
          published_at = excluded.published_at,
          published_by = excluded.published_by
      `
    )
    .run(
      pageKey,
      stage,
      JSON.stringify({ regions }),
      published ? "2026-08-31T00:00:00.000Z" : null,
      published ? "usage-test" : null
    );
}

function readPageInstanceId(pageKey: string) {
  return (getDatabase().prepare(
    "SELECT id FROM display_page_registry WHERE page_key = ?"
  ).get(pageKey) as { id: number }).id;
}

function binding(
  metricKey: string,
  scope: "inherit-device" | "cl" | "kn" | "global" = "inherit-device",
  includeItemId = true
) {
  return {
    customPower: {
      dataBinding: { metricKey, scope, sourceType: "metric" },
      ...(includeItemId ? { itemId: "customPower" } : {})
    }
  };
}

test("GET /api/data-hub/usage indexes published widgets by semantic identity and registered consumers", async () => {
  migrateDatabase();
  seedDatabase();
  insertOverviewPage("overview-2", "overview-secondary", "Overview 副本");
  insertOverviewPage("overview-draft-only", "overview-draft-only", "Draft only");
  writeStage("overview", "live", { dataBindings: binding("custom.derivedPower") });
  writeStage("overview-2", "live", { dataBindings: binding("custom.derivedPower", "inherit-device", false) });
  writeStage("overview-draft-only", "draft", { dataBindings: binding("draft.only") }, false);
  getDatabase().prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('cl', 'topic.only', 'shared/topic', '$.value', 'kW', 1)
  `).run();
  const overviewPageInstanceId = readPageInstanceId("overview");
  const overviewCopyPageInstanceId = readPageInstanceId("overview-2");

  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/data-hub/usage?metricKey=custom.derivedPower&scope=all"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      usage: Array<{
        configuredBindingScope: string | null;
        consumerId: string;
        consumerType: "readiness" | "story" | "widget";
        inherited: boolean;
        itemId: string;
        metricKey: string;
        pageInstanceId: number | null;
        pageKey: string;
        scopeLabel: string;
      }>;
    };
    assert.deepEqual(
      body.usage
        .filter(({ metricKey }) => metricKey === "custom.derivedPower")
        .map(({ consumerType, pageInstanceId, pageKey, itemId, configuredBindingScope, inherited, scopeLabel }) => ({
          consumerType,
          pageInstanceId,
          pageKey,
          itemId,
          configuredBindingScope,
          inherited,
          scopeLabel
        })),
      [
        {
          consumerType: "widget",
          pageInstanceId: overviewPageInstanceId,
          pageKey: "overview",
          itemId: "customPower",
          configuredBindingScope: "inherit-device",
          inherited: true,
          scopeLabel: "inherited"
        },
        {
          consumerType: "widget",
          pageInstanceId: overviewCopyPageInstanceId,
          pageKey: "overview-2",
          itemId: "customPower",
          configuredBindingScope: "inherit-device",
          inherited: true,
          scopeLabel: "inherited"
        }
      ]
    );
    assert.equal(body.usage.some(({ metricKey }) => metricKey === "draft.only"), false);

    const topicOnlyResponse = await app.inject({
      method: "GET",
      url: "/api/data-hub/usage?metricKey=topic.only&scope=all"
    });
    assert.equal(topicOnlyResponse.statusCode, 200);
    assert.deepEqual(topicOnlyResponse.json().usage, []);

    const registeredResponse = await app.inject({
      method: "GET",
      url: "/api/data-hub/usage?metricKey=realTimePower&scope=all"
    });
    assert.equal(registeredResponse.statusCode, 200);
    const registered = registeredResponse.json() as {
      usage: Array<{ consumerType: string; metricKey: string; configuredBindingScope: string | null }>;
    };
    assert.equal(
      registered.usage.some(({ consumerType, metricKey }) => consumerType === "story" && metricKey === "realTimePower"),
      true
    );
    assert.equal(
      registered.usage.some(({ consumerType, metricKey }) => consumerType === "readiness" && metricKey === "realTimePower"),
      true
    );
    assert.equal(registered.usage.some(({ configuredBindingScope }) => configuredBindingScope === undefined), false);

    const denied = await app.inject({
      method: "GET",
      remoteAddress: "198.51.100.24",
      url: "/api/data-hub/usage?scope=all"
    });
    assert.equal(denied.statusCode, 403);
  } finally {
    await app.close();
  }
});

test("usage skips malformed live config without exposing a parser exception", async () => {
  const database = getDatabase();
  database
    .prepare(
      "UPDATE display_page_stage_configs SET config_json = ?, published_at = CURRENT_TIMESTAMP WHERE page_key = 'overview' AND stage = 'live'"
    )
    .run("{ malformed");

  const app = await buildApp();
  try {
    const response = await app.inject({ method: "GET", url: "/api/data-hub/usage?scope=all" });
    assert.equal(response.statusCode, 200);
    assert.doesNotMatch(response.body, /Unexpected token|JSON/u);
  } finally {
    await app.close();
  }
});
