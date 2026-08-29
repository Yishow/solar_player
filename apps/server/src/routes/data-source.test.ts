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

const [{ buildApp }, { migrateDatabase }, { seedDatabase }, { getDatabase, closeDatabaseConnection }, { buildDataSourceOverview }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js"),
  import("./data-source.js")
]);

function toLocalDateKey(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLocalTimestamp(date: Date, hours: number, minutes = 0) {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${toLocalDateKey(date)} ${pad(hours)}:${pad(minutes)}:00`;
}

after(() => {
  closeDatabaseConnection();
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
  const now = new Date();
  const today = toLocalDateKey(now);
  mkdirSync(uploadsDir, { recursive: true });
  mkdirSync(brandUploadsDir, { recursive: true });
  writeFileSync(join(uploadsDir, "panel.png"), "image-bytes");
  writeFileSync(join(brandUploadsDir, "logo.png"), "brand-bytes");

  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('global', ?, ?)").run(42, `${today} 00:00:00`);

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/data-source/overview?metricScope=global"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      browserLocalCache: { status: string };
      monitoring: {
        anomalyMessages: string[];
        hasCurrentDaySnapshots: boolean;
        latestSnapshotAt: string | null;
        latestSnapshotDate: string | null;
        localDate: string;
        metricScope: string;
      };
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
    assert.equal(body.monitoring.hasCurrentDaySnapshots, true);
    assert.equal(body.monitoring.metricScope, "global");
    assert.equal(body.monitoring.latestSnapshotAt, `${today} 00:00:00`);
    assert.equal(body.monitoring.latestSnapshotDate, today);
    assert.equal(body.monitoring.anomalyMessages.length, 0);
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

test("GET /api/data-source/overview requires and isolates an explicit diagnostics scope", async () => {
  migrateDatabase();
  seedDatabase();
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare(`
    INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at)
    VALUES
      ('cl', 100, ?),
      ('kn', 200, ?)
  `).run(toLocalTimestamp(now, 10), toLocalTimestamp(yesterday, 10));
  const app = await buildApp();

  try {
    const missingScope = await app.inject({
      method: "GET",
      url: "/api/data-source/overview"
    });
    assert.equal(missingScope.statusCode, 400);

    const cl = await app.inject({
      method: "GET",
      url: "/api/data-source/overview?metricScope=cl"
    });
    const kn = await app.inject({
      method: "GET",
      url: "/api/data-source/overview?metricScope=kn"
    });
    assert.deepEqual(
      {
        hasCurrentDaySnapshots: cl.json().monitoring.hasCurrentDaySnapshots,
        metricScope: cl.json().monitoring.metricScope
      },
      { hasCurrentDaySnapshots: true, metricScope: "cl" }
    );
    assert.deepEqual(
      {
        hasCurrentDaySnapshots: kn.json().monitoring.hasCurrentDaySnapshots,
        metricScope: kn.json().monitoring.metricScope
      },
      { hasCurrentDaySnapshots: false, metricScope: "kn" }
    );
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

test("GET /api/data-source/overview reports stale-day and suspicious nighttime generation diagnostics", async () => {
  migrateDatabase();
  seedDatabase();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('global', ?, ?)").run(2100, `${toLocalDateKey(yesterday)} 18:00:00`);
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('global', ?, ?)").run(2000, `${toLocalDateKey(yesterday)} 02:00:00`);

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/data-source/overview?metricScope=global"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      monitoring: {
        anomalyMessages: string[];
        hasCurrentDaySnapshots: boolean;
        latestSnapshotDate: string | null;
        localDate: string;
      };
    };

    assert.equal(body.monitoring.localDate, toLocalDateKey(today));
    assert.equal(body.monitoring.latestSnapshotDate, toLocalDateKey(yesterday));
    assert.equal(body.monitoring.hasCurrentDaySnapshots, false);
    assert.equal(body.monitoring.anomalyMessages.some((message) => message.includes("尚無今日 snapshot")), true);
    assert.equal(body.monitoring.anomalyMessages.some((message) => message.includes("02:00")), true);
  } finally {
    await app.close();
  }
});

test("POST /api/data-source/reset-today-trend deletes only current-day snapshots", async () => {
  process.env.MANAGEMENT_ACCESS_TOKEN = "management-secret-value";
  migrateDatabase();
  seedDatabase();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM live_metric_values").run();

  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('global', ?, ?)").run(1800, `${toLocalDateKey(yesterday)} 23:50:00`);
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('global', ?, ?)").run(600, toLocalTimestamp(today, 1));
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('global', ?, ?)").run(2400, toLocalTimestamp(today, 9));
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('cl', ?, ?)").run(1200, toLocalTimestamp(today, 10));
  database.prepare("INSERT INTO daily_energy_summaries (metric_scope, date, generation_total) VALUES ('global', ?, ?)").run(toLocalDateKey(today), 3200);
  database.prepare("INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count) VALUES ('global', ?, ?, ?, ?)").run(
    "generation",
    12000,
    `${toLocalDateKey(today)}T09:00:00.000Z`,
    0
  );
  database.prepare("INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload) VALUES ('global', ?, ?, ?, ?, ?, ?)").run(
    "realTimePower",
    2400,
    "kW",
    `${toLocalDateKey(today)}T09:00:00.000Z`,
    "good",
    "{\"value\":2400}"
  );

  const app = await buildApp();

  try {
    const response = await app.inject({
      body: { metricScope: "global" },
      method: "POST",
      url: "/api/data-source/reset-today-trend",
      headers: {
        "x-solar-management-token": "management-secret-value"
      }
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      data: {
        deletedSnapshots: number;
        resetDate: string;
      };
      success: boolean;
    };

    assert.equal(body.success, true);
    assert.equal(body.data.deletedSnapshots, 2);
    assert.equal(body.data.resetDate, toLocalDateKey(today));

    const remainingSnapshots = database
      .prepare("SELECT metric_scope, captured_at FROM metric_snapshots ORDER BY captured_at ASC")
      .all() as Array<{ captured_at: string; metric_scope: string }>;
    assert.deepEqual(remainingSnapshots, [
      { captured_at: `${toLocalDateKey(yesterday)} 23:50:00`, metric_scope: "global" },
      { captured_at: toLocalTimestamp(today, 10), metric_scope: "cl" }
    ]);

    const dailySummaryCount = database.prepare("SELECT COUNT(*) AS count FROM daily_energy_summaries").get() as { count: number };
    const counterCount = database.prepare("SELECT COUNT(*) AS count FROM cumulative_counters").get() as { count: number };
    const liveValueCount = database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get() as { count: number };
    assert.equal(dailySummaryCount.count, 1);
    assert.equal(counterCount.count, 1);
    assert.equal(liveValueCount.count, 1);
  } finally {
    await app.close();
  }
});

test("trend reset requires an explicit valid metric scope before deleting history", async () => {
  process.env.MANAGEMENT_ACCESS_TOKEN = "management-secret-value";
  migrateDatabase();
  seedDatabase();
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare(`
    INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at)
    VALUES ('cl', 100, CURRENT_TIMESTAMP)
  `).run();
  const app = await buildApp();

  try {
    for (const body of [{}, { metricScope: "all" }]) {
      const response = await app.inject({
        body,
        headers: { "x-solar-management-token": "management-secret-value" },
        method: "POST",
        url: "/api/data-source/reset-today-trend"
      });
      assert.equal(response.statusCode, 400);
      assert.equal(response.json<{ code: string }>().code, "INVALID_METRIC_SCOPE");
    }

    const count = database.prepare("SELECT COUNT(*) AS count FROM metric_snapshots").get() as { count: number };
    assert.equal(count.count, 1);
  } finally {
    await app.close();
  }
});

test("POST /api/data-source/reset-month-trend deletes only current calendar-month trend data", async () => {
  process.env.MANAGEMENT_ACCESS_TOKEN = "management-secret-value";
  migrateDatabase();
  seedDatabase();

  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonth = new Date(currentMonth);
  previousMonth.setDate(0);

  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM live_metric_values").run();

  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('global', ?, ?)").run(1800, `${toLocalDateKey(previousMonth)} 23:50:00`);
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('global', ?, ?)").run(600, toLocalTimestamp(currentMonth, 1));
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('global', ?, ?)").run(2400, toLocalTimestamp(now, 9));
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('kn', ?, ?)").run(1200, toLocalTimestamp(now, 10));
  database.prepare("INSERT INTO daily_energy_summaries (metric_scope, date, generation_total, consumption_total) VALUES ('global', ?, ?, ?)").run(
    toLocalDateKey(previousMonth),
    100,
    1000
  );
  database.prepare("INSERT INTO daily_energy_summaries (metric_scope, date, generation_total, consumption_total) VALUES ('global', ?, ?, ?)").run(
    toLocalDateKey(currentMonth),
    200,
    2000
  );
  database.prepare("INSERT INTO daily_energy_summaries (metric_scope, date, generation_total, consumption_total) VALUES ('kn', ?, ?, ?)").run(
    toLocalDateKey(currentMonth),
    300,
    3000
  );
  database.prepare("INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count) VALUES ('global', ?, ?, ?, ?)").run(
    "generation",
    12000,
    `${toLocalDateKey(now)}T09:00:00.000Z`,
    0
  );
  database.prepare("INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload) VALUES ('global', ?, ?, ?, ?, ?, ?)").run(
    "realTimePower",
    2400,
    "kW",
    `${toLocalDateKey(now)}T09:00:00.000Z`,
    "good",
    "{\"value\":2400}"
  );

  const app = await buildApp();

  try {
    const response = await app.inject({
      body: { metricScope: "global" },
      method: "POST",
      url: "/api/data-source/reset-month-trend",
      headers: {
        "x-solar-management-token": "management-secret-value"
      }
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      data: {
        deletedDailySummaries: number;
        deletedSnapshots: number;
        resetMonthStart: string;
      };
      success: boolean;
    };

    assert.equal(body.success, true);
    assert.equal(body.data.deletedSnapshots, 2);
    assert.equal(body.data.deletedDailySummaries, 1);
    assert.equal(body.data.resetMonthStart, toLocalDateKey(currentMonth));

    const remainingSnapshots = database
      .prepare("SELECT metric_scope, captured_at FROM metric_snapshots ORDER BY captured_at ASC")
      .all() as Array<{ captured_at: string; metric_scope: string }>;
    assert.deepEqual(remainingSnapshots, [
      { captured_at: `${toLocalDateKey(previousMonth)} 23:50:00`, metric_scope: "global" },
      { captured_at: toLocalTimestamp(now, 10), metric_scope: "kn" }
    ]);

    const remainingSummaries = database
      .prepare("SELECT metric_scope, date FROM daily_energy_summaries ORDER BY date ASC, metric_scope ASC")
      .all() as Array<{ date: string; metric_scope: string }>;
    assert.deepEqual(remainingSummaries, [
      { date: toLocalDateKey(previousMonth), metric_scope: "global" },
      { date: toLocalDateKey(currentMonth), metric_scope: "kn" }
    ]);

    const counterCount = database.prepare("SELECT COUNT(*) AS count FROM cumulative_counters").get() as { count: number };
    const liveValueCount = database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get() as { count: number };
    assert.equal(counterCount.count, 1);
    assert.equal(liveValueCount.count, 1);
  } finally {
    await app.close();
  }
});
