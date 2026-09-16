import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-engineering-route-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ buildApp }, { migrateDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js")
]);

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

test("Engineering Sources API: Preview, Apply, Fetch, and Results", async () => {
  migrateDatabase();
  const app = await buildApp();

  // 1. GET /api/data-hub/engineering-sources
  const listRes = await app.inject({
    method: "GET",
    url: "/api/data-hub/engineering-sources"
  });
  assert.equal(listRes.statusCode, 200);
  const listJson = listRes.json();
  assert.equal(listJson.success, true);
  assert.equal(listJson.sources.length, 16);

  // 2. POST /api/data-hub/engineering-sources/preview
  const previewRes = await app.inject({
    method: "POST",
    url: "/api/data-hub/engineering-sources/preview",
    payload: {
      sourceRef: "kn-eng-painting-energy",
      sourceKind: "engineering",
      site: "kn",
      engineeringId: "painting",
      purpose: "energy",
      mode: "daily-report",
      approvedPublisherId: "pub-1",
      reviewStatus: "approved",
      unit: "kWh",
      enabled: true
    }
  });
  assert.equal(previewRes.statusCode, 200);
  const previewJson = previewRes.json();
  assert.ok(previewJson.previewToken);

  // 3. POST /api/data-hub/engineering-sources/apply
  const applyRes = await app.inject({
    method: "POST",
    url: "/api/data-hub/engineering-sources/apply",
    payload: {
      previewToken: previewJson.previewToken,
      expectedRevision: 0,
      draft: previewJson.canonicalDraft
    }
  });
  assert.equal(applyRes.statusCode, 200);
  const applyJson = applyRes.json();
  assert.equal(applyJson.success, true);
  assert.equal(applyJson.source.configurationRevision, 1);
  assert.equal(applyJson.source.mode, "daily-report");

  // 4. Conflict test: Apply again with stale expectedRevision 0
  const conflictRes = await app.inject({
    method: "POST",
    url: "/api/data-hub/engineering-sources/apply",
    payload: {
      previewToken: previewJson.previewToken,
      expectedRevision: 0,
      draft: previewJson.canonicalDraft
    }
  });
  assert.equal(conflictRes.statusCode, 409);

  // 5. POST /api/data-hub/engineering-reports/import
  const report = {
    schemaVersion: 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "painting",
    publisherId: "pub-1",
    definitionRevision: 1,
    calendarRevision: 1,
    measurementKind: "interval-energy",
    unit: "kWh",
    value: "150.0",
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 1,
    publishedAt: "2026-09-16T01:00:00Z"
  };

  const importRes = await app.inject({
    method: "POST",
    url: "/api/data-hub/engineering-reports/import",
    payload: {
      records: [report]
    }
  });
  assert.equal(importRes.statusCode, 200);
  const importJson = importRes.json();
  assert.equal(importJson.total, 1);
  assert.equal(importJson.accepted, 1);

  // 6. GET /api/data-hub/engineering-results
  const resultsRes = await app.inject({
    method: "GET",
    url: "/api/data-hub/engineering-results?scope=kn&engineeringId=painting"
  });
  assert.equal(resultsRes.statusCode, 200);
  const resultsJson = resultsRes.json();
  assert.equal(resultsJson.success, true);
  assert.equal(resultsJson.heads.length, 1);
  assert.equal(resultsJson.heads[0].value, "150.0");

  const periodRes = await app.inject({
    method: "GET",
    url: "/api/data-hub/engineering-results?scope=kn&engineeringId=painting&periodStart=2026-09-14T16:00:00Z&periodEnd=2026-09-15T16:00:00Z"
  });
  assert.equal(periodRes.statusCode, 200);
  const periodJson = periodRes.json();
  assert.equal(periodJson.periodSummary.totalKWh, 150);
  assert.equal(periodJson.periodSummary.isComplete, true);
  assert.equal(periodJson.periodSummary.itemsByEngineering.painting, 150);
});

test("Engineering source mutation redacts unexpected internal errors", async () => {
  const app = await buildApp();
  const sourceRef = "kn-eng-assembly-energy";
  try {
    const previewRes = await app.inject({
      method: "POST",
      url: "/api/data-hub/engineering-sources/preview",
      payload: {
        sourceRef,
        sourceKind: "engineering",
        site: "kn",
        engineeringId: "assembly",
        purpose: "energy",
        mode: "daily-report",
        approvedPublisherId: "pub-redaction-test",
        reviewStatus: "approved",
        unit: "kWh",
        enabled: true
      }
    });
    assert.equal(previewRes.statusCode, 200);
    const previewJson = previewRes.json() as { previewToken: string; canonicalDraft: unknown };

    const originalSubscribe = app.mqttClientService.subscribe;
    app.mqttClientService.subscribe = async () => {
      throw new Error("secret broker credentials must not escape");
    };
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/data-hub/engineering-sources/apply",
        payload: {
          previewToken: previewJson.previewToken,
          expectedRevision: 0,
          draft: previewJson.canonicalDraft
        }
      });
      assert.equal(response.statusCode, 500);
      const body = response.json() as { error: string; success: boolean };
      assert.equal(body.error, "Internal Server Error");
      assert.equal(body.success, false);
      assert.doesNotMatch(JSON.stringify(body), /secret broker credentials/);
    } finally {
      app.mqttClientService.subscribe = originalSubscribe;
    }
  } finally {
    await app.close();
  }
});
