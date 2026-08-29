import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-data-preview-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { buildApp },
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase },
  { createDisplayPageInstance },
  { writeStageConfig }
] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../services/displayPageRegistryService.js"),
  import("../services/displayPagePublishingService.js")
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

function seedMetric(
  metricScope: "cl" | "kn",
  metricKey: string,
  value: number,
  timestamp: string
) {
  getDatabase().prepare(`
    INSERT INTO live_metric_values
      (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, 'kW', ?, 'good', '{}')
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
      value = excluded.value,
      timestamp = excluded.timestamp
  `).run(metricScope, metricKey, value, timestamp);
}

test("data preview keeps alternating CL and KN values and freshness isolated", async () => {
  const now = Date.now();
  const clTimestamp = new Date(now - 10_000).toISOString();
  const knTimestamp = new Date(now - 120_000).toISOString();
  seedMetric("cl", "realTimePower", 11, clTimestamp);
  seedMetric("kn", "realTimePower", 22, knTimestamp);
  const app = await buildApp();

  try {
    const preview = (siteScope: "cl" | "kn") => app.inject({
      method: "POST",
      payload: { kind: "site", siteScope },
      url: "/api/display-pages/overview/data-preview"
    });
    const clFirst = await preview("cl");
    const kn = await preview("kn");

    seedMetric("cl", "realTimePower", 33, new Date(now).toISOString());
    const clSecond = await preview("cl");

    assert.equal(clFirst.statusCode, 200);
    assert.equal(kn.statusCode, 200);
    assert.equal(clSecond.statusCode, 200);

    const clFirstBody = clFirst.json();
    const knBody = kn.json();
    const clSecondBody = clSecond.json();
    const findPower = (body: any) => body.preview.items.find((item: any) => item.itemId === "power");

    assert.equal(findPower(clFirstBody).value, 11);
    assert.equal(findPower(clFirstBody).timestamp, clTimestamp);
    assert.equal(findPower(clFirstBody).freshness.sourceTimestamp, clTimestamp);
    assert.equal(findPower(knBody).value, 22);
    assert.equal(findPower(knBody).timestamp, knTimestamp);
    assert.equal(findPower(knBody).freshness.sourceTimestamp, knTimestamp);
    assert.equal(findPower(clSecondBody).value, 33);
    assert.equal(findPower(clSecondBody).freshness.sourceTimestamp, new Date(now).toISOString());
    assert.equal(findPower(clFirstBody).effectiveScope, "cl");
    assert.equal(findPower(knBody).effectiveScope, "kn");
    assert.notEqual(clFirstBody.preview.cacheKey, knBody.preview.cacheKey);
    assert.equal(clFirstBody.preview.cacheKey, clSecondBody.preview.cacheKey);
  } finally {
    await app.close();
  }
});

test("data preview cache identity isolates duplicate page instances and live revisions", async () => {
  const timestamp = new Date().toISOString();
  seedMetric("cl", "realTimePower", 11, timestamp);
  seedMetric("cl", "todayGeneration", 77, timestamp);
  const duplicate = createDisplayPageInstance({
    displayNameEn: "Overview Secondary",
    displayNameZh: "總覽副本",
    routeSlug: "overview-secondary",
    templateKey: "overview"
  });
  const firstLive = writeStageConfig(duplicate.pageKey, "live", {
    dataBindings: {
      power: {
        dataBinding: {
          metricKey: "todayGeneration",
          scope: "inherit-device",
          sourceType: "metric"
        },
        itemId: "power"
      }
    }
  });
  const app = await buildApp();

  try {
    const requestPreview = (pageId: string) => app.inject({
      method: "POST",
      payload: { kind: "site", siteScope: "cl" },
      url: `/api/display-pages/${pageId}/data-preview`
    });
    const originalResponse = await requestPreview("overview");
    const duplicateResponse = await requestPreview(duplicate.pageKey);
    const original = originalResponse.json().preview;
    const duplicateFirst = duplicateResponse.json().preview;

    assert.equal(original.items.find((item: any) => item.itemId === "power").value, 11);
    assert.equal(duplicateFirst.items.find((item: any) => item.itemId === "power").value, 77);
    assert.notEqual(original.cacheKey, duplicateFirst.cacheKey);
    assert.equal(duplicateFirst.pageId, duplicate.pageKey);
    assert.equal(duplicateFirst.configRevision, firstLive.version);

    const secondLive = writeStageConfig(duplicate.pageKey, "live", {
      dataBindings: {
        power: {
          dataBinding: {
            metricKey: "realTimePower",
            scope: "inherit-device",
            sourceType: "metric"
          },
          itemId: "power"
        }
      }
    });
    const duplicateSecond = (await requestPreview(duplicate.pageKey)).json().preview;

    assert.equal(duplicateSecond.configRevision, secondLive.version);
    assert.notEqual(duplicateFirst.cacheKey, duplicateSecond.cacheKey);
    assert.equal(duplicateSecond.items.find((item: any) => item.itemId === "power").value, 11);
  } finally {
    await app.close();
  }
});

test("CL Preview Context keeps pinned KN bindings fixed while inherited bindings follow CL", async () => {
  const timestamp = new Date().toISOString();
  seedMetric("cl", "realTimePower", 11, timestamp);
  seedMetric("kn", "todayGeneration", 77, timestamp);
  writeStageConfig("overview", "live", {
    dataBindings: {
      power: {
        dataBinding: {
          metricKey: "realTimePower",
          scope: "inherit-device",
          sourceType: "metric"
        },
        itemId: "power"
      },
      today: {
        dataBinding: {
          metricKey: "todayGeneration",
          scope: "kn",
          sourceType: "metric"
        },
        itemId: "today"
      }
    }
  });
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "POST",
      payload: { kind: "site", siteScope: "cl" },
      url: "/api/display-pages/overview/data-preview"
    });
    const preview = response.json().preview;
    const inherited = preview.items.find((item: any) => item.itemId === "power");
    const pinned = preview.items.find((item: any) => item.itemId === "today");

    assert.equal(response.statusCode, 200);
    assert.equal(inherited.configuredScope, "inherit-device");
    assert.equal(inherited.effectiveScope, "cl");
    assert.equal(inherited.value, 11);
    assert.equal(pinned.configuredScope, "kn");
    assert.equal(pinned.effectiveScope, "kn");
    assert.equal(pinned.value, 77);
  } finally {
    await app.close();
  }
});

test("data preview rejects untrusted remote management callers", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      headers: {
        host: "player.example",
        origin: "https://evil.example"
      },
      method: "POST",
      payload: { kind: "site", siteScope: "cl" },
      remoteAddress: "198.51.100.24",
      url: "/api/display-pages/overview/data-preview"
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "management_access_denied");
  } finally {
    await app.close();
  }
});
