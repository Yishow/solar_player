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

test("GET /api/data-source/monitoring-diagnostics keeps concrete scope summaries separate", async () => {
  process.env.MANAGEMENT_ACCESS_TOKEN = "management-secret-value";
  migrateDatabase();
  seedDatabase();

  const now = new Date();
  const today = toLocalDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES (?, ?, ?)").run(
    "cl",
    100,
    `${toLocalDateKey(yesterday)} 10:00:00`
  );
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES (?, ?, ?)").run(
    "kn",
    200,
    `${today} 10:00:00`
  );
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES (?, ?, ?)").run(
    "global",
    300,
    `${today} 11:00:00`
  );

  const app = await buildApp();

  try {
    const response = await app.inject({
      headers: { "x-solar-management-token": "management-secret-value" },
      method: "GET",
      url: "/api/data-source/monitoring-diagnostics?metricScope=all"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      generatedAt: string;
      requestedScope: string;
      summaries: Array<{
        anomalyMessages: string[];
        currentDaySnapshotCount: number;
        hasCurrentDaySnapshots: boolean;
        latestSnapshotAt: string | null;
        latestSnapshotDate: string | null;
        localDate: string;
        metricScope: string;
        snapshotCount: number;
        snapshotSampleLimit: number;
      }>;
    };

    assert.equal(typeof body.generatedAt, "string");
    assert.equal(body.requestedScope, "all");
    assert.deepEqual(
      body.summaries.map((summary) => ({
        currentDaySnapshotCount: summary.currentDaySnapshotCount,
        hasCurrentDaySnapshots: summary.hasCurrentDaySnapshots,
        latestSnapshotDate: summary.latestSnapshotDate,
        localDate: summary.localDate,
        metricScope: summary.metricScope,
        snapshotCount: summary.snapshotCount,
        snapshotSampleLimit: summary.snapshotSampleLimit
      })),
      [
        {
          currentDaySnapshotCount: 0,
          hasCurrentDaySnapshots: false,
          latestSnapshotDate: toLocalDateKey(yesterday),
          localDate: today,
          metricScope: "cl",
          snapshotCount: 1,
          snapshotSampleLimit: 2000
        },
        {
          currentDaySnapshotCount: 1,
          hasCurrentDaySnapshots: true,
          latestSnapshotDate: today,
          localDate: today,
          metricScope: "kn",
          snapshotCount: 1,
          snapshotSampleLimit: 2000
        },
        {
          currentDaySnapshotCount: 1,
          hasCurrentDaySnapshots: true,
          latestSnapshotDate: today,
          localDate: today,
          metricScope: "global",
          snapshotCount: 1,
          snapshotSampleLimit: 2000
        }
      ]
    );
    assert.equal(body.summaries[0]?.anomalyMessages.some((message) => message.includes("尚無今日 snapshot")), true);
    assert.equal(body.summaries[1]?.anomalyMessages.some((message) => message.includes("尚無今日 snapshot")), false);
    assert.equal(body.summaries[2]?.anomalyMessages.some((message) => message.includes("尚無今日 snapshot")), false);
  } finally {
    await app.close();
  }
});

test("GET /api/data-source/monitoring-diagnostics requires a valid scope and isolates concrete reads", async () => {
  process.env.MANAGEMENT_ACCESS_TOKEN = "management-secret-value";
  migrateDatabase();
  seedDatabase();
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('cl', ?, CURRENT_TIMESTAMP)").run(100);
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES ('kn', ?, CURRENT_TIMESTAMP)").run(200);
  const app = await buildApp();

  try {
    for (const metricScope of [undefined, "bogus"]) {
      const query = metricScope ? `?metricScope=${metricScope}` : "";
      const response = await app.inject({
        headers: { "x-solar-management-token": "management-secret-value" },
        method: "GET",
        url: `/api/data-source/monitoring-diagnostics${query}`
      });
      assert.equal(response.statusCode, 400);
      assert.equal(response.json<{ code: string }>().code, "INVALID_METRIC_SCOPE");
    }

    const response = await app.inject({
      headers: { "x-solar-management-token": "management-secret-value" },
      method: "GET",
      url: "/api/data-source/monitoring-diagnostics?metricScope=cl"
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      requestedScope: string;
      summaries: Array<{ metricScope: string; snapshotCount: number; snapshotSampleLimit: number }>;
    };
    assert.equal(body.requestedScope, "cl");
    assert.deepEqual(body.summaries.map(({ metricScope, snapshotCount, snapshotSampleLimit }) => ({
      metricScope,
      snapshotCount,
      snapshotSampleLimit
    })), [{
      metricScope: "cl",
      snapshotCount: 1,
      snapshotSampleLimit: 2000
    }]);
  } finally {
    await app.close();
  }
});

test("GET /api/data-source/monitoring-diagnostics denies untrusted management callers", async () => {
  process.env.MANAGEMENT_ACCESS_TOKEN = "management-secret-value";
  migrateDatabase();
  seedDatabase();
  const app = await buildApp();

  try {
    const response = await app.inject({
      headers: {
        host: "player.example",
        origin: "https://evil.example"
      },
      method: "GET",
      url: "/api/data-source/monitoring-diagnostics?metricScope=all"
    });

    assert.equal(response.statusCode, 403);
    const serialized = JSON.stringify(response.json());
    assert.equal(serialized.includes("metric_snapshots"), false);
    assert.equal(serialized.includes("summaries"), false);
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
  const liveValueCountBeforeReset = (
    database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get() as { count: number }
  ).count;

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
    assert.equal(liveValueCount.count, liveValueCountBeforeReset);
  } finally {
    await app.close();
  }
});

test("POST /api/data-source/reset-today-trend deletes only the selected CL scope and emits a scoped refresh", async () => {
  process.env.MANAGEMENT_ACCESS_TOKEN = "management-secret-value";
  migrateDatabase();
  seedDatabase();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayKey = toLocalDateKey(today);
  const yesterdayKey = toLocalDateKey(yesterday);
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM live_metric_values").run();

  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES (?, ?, ?)").run(
    "cl",
    101,
    toLocalTimestamp(today, 1)
  );
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES (?, ?, ?)").run(
    "cl",
    102,
    toLocalTimestamp(yesterday, 1)
  );
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES (?, ?, ?)").run(
    "kn",
    201,
    toLocalTimestamp(today, 2)
  );
  database.prepare("INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at) VALUES (?, ?, ?)").run(
    "global",
    301,
    toLocalTimestamp(today, 3)
  );
  for (const [metricScope, generationTotal] of [["cl", 11], ["kn", 22], ["global", 33]] as const) {
    database.prepare(
      "INSERT INTO daily_energy_summaries (metric_scope, date, generation_total) VALUES (?, ?, ?)"
    ).run(metricScope, todayKey, generationTotal);
  }
  for (const [metricScope, totalValue] of [["cl", 111], ["kn", 222], ["global", 333]] as const) {
    database.prepare(
      "INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count) VALUES (?, ?, ?, ?, ?)"
    ).run(metricScope, "generation", totalValue, `${todayKey}T09:00:00.000Z`, 0);
  }
  for (const [metricScope, value] of [["cl", 1111], ["kn", 2222], ["global", 3333]] as const) {
    database.prepare(
      "INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(metricScope, "realTimePower", value, "kW", `${todayKey}T09:00:00.000Z`, "good", JSON.stringify({ value }));
  }

  const app = await buildApp();
  const dailySummariesBefore = database
    .prepare("SELECT metric_scope, date, generation_total FROM daily_energy_summaries ORDER BY metric_scope")
    .all();
  const cumulativeCountersBefore = database
    .prepare("SELECT metric_scope, metric_key, total_value, last_updated, reset_count FROM cumulative_counters ORDER BY metric_scope")
    .all();
  const liveMetricValuesBefore = database
    .prepare("SELECT metric_scope, metric_key, value, unit, timestamp, quality, raw_payload FROM live_metric_values ORDER BY metric_scope")
    .all();
  const emittedEvents: unknown[] = [];
  const originalEmitDisplaySync = app.socketService.emitDisplaySync.bind(app.socketService);
  app.socketService.emitDisplaySync = ((payload) => {
    emittedEvents.push(payload);
  }) as typeof app.socketService.emitDisplaySync;

  try {
    const response = await app.inject({
      body: { metricScope: "cl" },
      headers: { "x-solar-management-token": "management-secret-value" },
      method: "POST",
      url: "/api/data-source/reset-today-trend"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      data: { deletedSnapshots: number; metricScope: string; resetAt: string; resetDate: string };
      success: boolean;
    };
    assert.equal(body.success, true);
    assert.deepEqual(
      {
        deletedSnapshots: body.data.deletedSnapshots,
        metricScope: body.data.metricScope,
        resetDate: body.data.resetDate
      },
      { deletedSnapshots: 1, metricScope: "cl", resetDate: todayKey }
    );
    assert.equal(typeof body.data.resetAt, "string");

    const remainingSnapshots = database
      .prepare("SELECT metric_scope, generation_power, captured_at FROM metric_snapshots ORDER BY metric_scope, captured_at")
      .all();
    assert.deepEqual(remainingSnapshots, [
      { captured_at: toLocalTimestamp(yesterday, 1), generation_power: 102, metric_scope: "cl" },
      { captured_at: toLocalTimestamp(today, 3), generation_power: 301, metric_scope: "global" },
      { captured_at: toLocalTimestamp(today, 2), generation_power: 201, metric_scope: "kn" }
    ]);
    assert.deepEqual(
      database.prepare("SELECT metric_scope, date, generation_total FROM daily_energy_summaries ORDER BY metric_scope").all(),
      dailySummariesBefore
    );
    assert.deepEqual(
      database.prepare("SELECT metric_scope, metric_key, total_value, last_updated, reset_count FROM cumulative_counters ORDER BY metric_scope").all(),
      cumulativeCountersBefore
    );
    assert.deepEqual(
      database.prepare("SELECT metric_scope, metric_key, value, unit, timestamp, quality, raw_payload FROM live_metric_values ORDER BY metric_scope").all(),
      liveMetricValuesBefore
    );

    assert.equal(emittedEvents.length, 1);
    const emitted = emittedEvents[0] as {
      generatedAt: string;
      metricScope: string;
      reason: string;
      scope: string;
    };
    assert.deepEqual(
      { metricScope: emitted.metricScope, reason: emitted.reason, scope: emitted.scope },
      { metricScope: "cl", reason: "today-trend-reset", scope: "monitoring-history" }
    );
    assert.equal(typeof emitted.generatedAt, "string");
  } finally {
    app.socketService.emitDisplaySync = originalEmitDisplaySync;
    await app.close();
  }
});

test("POST /api/data-source/reset-today-trend succeeds with zero deleted rows for a concrete scope", async () => {
  process.env.MANAGEMENT_ACCESS_TOKEN = "management-secret-value";
  migrateDatabase();
  seedDatabase();
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  const app = await buildApp();

  try {
    const response = await app.inject({
      body: { metricScope: "kn" },
      headers: { "x-solar-management-token": "management-secret-value" },
      method: "POST",
      url: "/api/data-source/reset-today-trend"
    });

    assert.equal(response.statusCode, 200);
    const data = response.json().data as {
      deletedSnapshots: number;
      metricScope: string;
      resetAt: string;
      resetDate: string;
    };
    assert.deepEqual(
      {
        deletedSnapshots: data.deletedSnapshots,
        metricScope: data.metricScope,
        resetDate: data.resetDate
      },
      { deletedSnapshots: 0, metricScope: "kn", resetDate: toLocalDateKey(new Date()) }
    );
    assert.equal(typeof data.resetAt, "string");
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
  const emittedEvents: unknown[] = [];
  const originalEmitDisplaySync = app.socketService.emitDisplaySync.bind(app.socketService);
  app.socketService.emitDisplaySync = ((payload) => {
    emittedEvents.push(payload);
  }) as typeof app.socketService.emitDisplaySync;

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
    assert.deepEqual(emittedEvents, []);
  } finally {
    app.socketService.emitDisplaySync = originalEmitDisplaySync;
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
  const liveValueCountBeforeReset = (
    database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get() as { count: number }
  ).count;

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
    assert.equal(liveValueCount.count, liveValueCountBeforeReset);
  } finally {
    await app.close();
  }
});
