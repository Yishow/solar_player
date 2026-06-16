import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-data-source-test-"));
const uploadsDir = join(tempDir, "uploads", "images");
const brandUploadsDir = join(tempDir, "uploads", "brand");
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = uploadsDir;
process.env.BRAND_UPLOADS_DIR = brandUploadsDir;

const [{ buildApp }, { migrateDatabase }, { seedDatabase }, { getDatabase }, { buildDataSourceOverview }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js"),
  import("./data-source.js")
]);

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.CWA_AUTHORIZATION;
  delete process.env.MANAGEMENT_ACCESS_TOKEN;
  delete process.env.MANAGEMENT_TRUSTED_ORIGINS;
  delete process.env.MQTT_PASSWORD;
  delete process.env.UPLOADS_DIR;
  delete process.env.BRAND_UPLOADS_DIR;
});

test("GET /api/data-source/overview returns read-only diagnostics for trusted management callers", async () => {
  process.env.MQTT_PASSWORD = "mqtt-secret-value";
  process.env.MANAGEMENT_ACCESS_TOKEN = "management-secret-value";
  process.env.CWA_AUTHORIZATION = "cwa-secret-value";
  migrateDatabase();
  seedDatabase();
  mkdirSync(uploadsDir, { recursive: true });
  mkdirSync(brandUploadsDir, { recursive: true });
  writeFileSync(join(uploadsDir, "panel.png"), "image-bytes");
  writeFileSync(join(brandUploadsDir, "logo.png"), "brand-bytes");

  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("INSERT INTO metric_snapshots (generation_power, captured_at) VALUES (?, ?)").run(42, "2026-06-16T00:00:00.000Z");

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/data-source/overview"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      browserLocalCache: { status: string };
      mqtt: { dataMode: string; password: string };
      relatedRoutes: Array<{ path: string }>;
      retention: { dailySummaryRetentionDays: number; metricSnapshotRetentionDays: number };
      runtimeStorage: { databasePath: string; dataDir: string; status: string };
      sqlite: { status: string; tableCounts: Record<string, number> };
      uploads: {
        brandUploads: { fileCount: number; status: string };
        imageUploads: { fileCount: number; status: string };
      };
      warnings: string[];
      weather: { cwaAuthorization: string };
    };

    assert.equal(body.runtimeStorage.status, "ready");
    assert.equal(body.runtimeStorage.dataDir, tempDir);
    assert.equal(body.runtimeStorage.databasePath, join(tempDir, "solar-display.sqlite"));
    assert.equal(body.sqlite.status, "ready");
    assert.equal(body.sqlite.tableCounts.metric_snapshots, 1);
    assert.equal(body.uploads.imageUploads.status, "ready");
    assert.ok(body.uploads.imageUploads.fileCount >= 1);
    assert.equal(body.uploads.brandUploads.status, "ready");
    assert.ok(body.uploads.brandUploads.fileCount >= 1);
    assert.equal(body.mqtt.password, "configured");
    assert.equal(body.weather.cwaAuthorization, "configured");
    assert.equal(body.retention.metricSnapshotRetentionDays, 90);
    assert.equal(body.retention.dailySummaryRetentionDays, 1825);
    assert.equal(body.browserLocalCache.status, "browser-managed");
    assert.equal(body.relatedRoutes.some((route) => route.path === "/settings/mqtt"), true);
    assert.deepEqual(body.warnings, []);

    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes("mqtt-secret-value"), false);
    assert.equal(serialized.includes("management-secret-value"), false);
    assert.equal(serialized.includes("cwa-secret-value"), false);
  } finally {
    await app.close();
  }
});

test("GET /api/data-source/overview denies untrusted management callers without diagnostics content", async () => {
  process.env.MANAGEMENT_ACCESS_TOKEN = "management-secret-value";
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/data-source/overview",
      headers: {
        host: "player.example",
        origin: "https://evil.example"
      }
    });

    assert.equal(response.statusCode, 403);
    const body = response.json() as { access: string };
    assert.equal(body.access, "denied");
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes(tempDir), false);
    assert.equal(serialized.includes("metric_snapshots"), false);
  } finally {
    await app.close();
  }
});

test("buildDataSourceOverview keeps partial diagnostics when upload summaries fail", () => {
  migrateDatabase();
  seedDatabase();

  const overview = buildDataSourceOverview({
    summarizeDirectory: () => {
      throw new Error("directory unavailable");
    }
  });

  assert.equal(overview.runtimeStorage.status, "ready");
  assert.equal(overview.sqlite.status, "ready");
  assert.equal(overview.uploads.imageUploads.status, "unavailable");
  assert.equal(overview.uploads.brandUploads.status, "unavailable");
  assert.ok(overview.warnings.some((warning) => warning.includes("uploads/images")));
});

test("buildDataSourceOverview keeps partial diagnostics when sqlite counts fail", () => {
  const overview = buildDataSourceOverview({
    readTableCounts: () => {
      throw new Error("database locked");
    }
  });

  assert.equal(overview.runtimeStorage.status, "ready");
  assert.equal(overview.sqlite.status, "unavailable");
  assert.equal(overview.uploads.status, "ready");
  assert.ok(overview.warnings.some((warning) => warning.includes("SQLite")));
});
