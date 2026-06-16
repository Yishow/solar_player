import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDataSourceSettingsViewModel,
  type DataSourceOverviewResponse
} from "./viewModel";

function createOverview(overrides: Partial<DataSourceOverviewResponse> = {}): DataSourceOverviewResponse {
  return {
    browserLocalCache: {
      description: "Browser cache note",
      status: "browser-managed"
    },
    generatedAt: "2026-06-16T00:00:00.000Z",
    mqtt: {
      dataMode: "mqtt",
      host: "mqtt.local",
      password: "configured",
      port: 1883,
      status: "ready",
      username: "configured"
    },
    recommendations: [
      {
        description: "Export archive",
        status: "recommended",
        title: "Runtime state export"
      },
      {
        description: "Backup flow",
        status: "recommended",
        title: "Database backup and restore"
      },
      {
        description: "Health check",
        status: "recommended",
        title: "Data source health check"
      },
      {
        description: "Evaluate PostgreSQL/MySQL separately",
        status: "recommended",
        title: "External database connector evaluation"
      }
    ],
    relatedRoutes: [
      { category: "mqtt", label: "MQTT 設定", path: "/settings/mqtt" },
      { category: "uploads", label: "圖片管理", path: "/settings/images" },
      { category: "playback", label: "播放設定", path: "/settings/playback" },
      { category: "device", label: "裝置狀態", path: "/device-status" }
    ],
    retention: {
      dailySummaryRetentionDays: 1825,
      metricSnapshotRetentionDays: 90,
      status: "ready",
      vacuumEnabled: true
    },
    runtimeStorage: {
      brandUploadsDir: "/data/solar-display/uploads/brand",
      dataDir: "/data/solar-display/data",
      databasePath: "/data/solar-display/data/solar-display.sqlite",
      status: "ready",
      uploadsDir: "/data/solar-display/uploads/images"
    },
    sqlite: {
      databasePath: "/data/solar-display/data/solar-display.sqlite",
      status: "ready",
      tableCounts: {
        metric_snapshots: 12,
        mqtt_settings: 1
      }
    },
    uploads: {
      brandUploads: {
        dir: "/data/solar-display/uploads/brand",
        fileCount: 1,
        status: "ready",
        totalBytes: 1024
      },
      imageUploads: {
        dir: "/data/solar-display/uploads/images",
        fileCount: 4,
        status: "ready",
        totalBytes: 4096
      },
      status: "ready"
    },
    warnings: [],
    weather: {
      cwaAuthorization: "configured",
      openDataUrl: "https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001",
      requestTimeoutMs: 5000,
      status: "ready"
    },
    ...overrides
  };
}

test("buildDataSourceSettingsViewModel exposes ready source categories without secrets", () => {
  const viewModel = buildDataSourceSettingsViewModel({
    overview: createOverview(),
    state: "ready"
  });

  assert.equal(viewModel.banner.tone, "ready");
  assert.deepEqual(
    viewModel.sections.map((section) => section.title),
    ["Runtime SQLite", "圖片上傳", "品牌上傳", "MQTT", "天氣來源", "歷史保留", "瀏覽器暫存"]
  );
  assert.equal(viewModel.sections.some((section) => section.detail.includes("mqtt.local")), true);
  assert.equal(JSON.stringify(viewModel).includes("mqtt-secret-value"), false);
  assert.equal(JSON.stringify(viewModel).includes("cwa-secret-value"), false);
  assert.equal(JSON.stringify(viewModel).includes("密碼已設定"), true);
});

test("buildDataSourceSettingsViewModel keeps degraded diagnostics visible", () => {
  const viewModel = buildDataSourceSettingsViewModel({
    overview: createOverview({
      sqlite: {
        databasePath: "/data/solar-display/data/solar-display.sqlite",
        status: "unavailable",
        tableCounts: {}
      },
      warnings: ["SQLite table count summary unavailable: database locked"]
    }),
    state: "ready"
  });

  assert.equal(viewModel.banner.tone, "warning");
  assert.match(viewModel.banner.detail, /database locked/);
  assert.equal(viewModel.sections.find((section) => section.title === "Runtime SQLite")?.tone, "warning");
});

test("buildDataSourceSettingsViewModel turns API failure into a degraded page state", () => {
  const viewModel = buildDataSourceSettingsViewModel({
    errorMessage: "Management access denied",
    overview: null,
    state: "error"
  });

  assert.equal(viewModel.banner.tone, "error");
  assert.match(viewModel.banner.detail, /Management access denied/);
  assert.deepEqual(viewModel.sections, []);
});

test("buildDataSourceSettingsViewModel exposes related route actions as read-only navigation", () => {
  const viewModel = buildDataSourceSettingsViewModel({
    overview: createOverview(),
    state: "ready"
  });

  assert.deepEqual(
    viewModel.relatedActions.map((action) => [action.label, action.path, action.kind]),
    [
      ["MQTT 設定", "/settings/mqtt", "navigation"],
      ["圖片管理", "/settings/images", "navigation"],
      ["播放設定", "/settings/playback", "navigation"],
      ["裝置狀態", "/device-status", "navigation"]
    ]
  );
});

test("buildDataSourceSettingsViewModel presents recommendations without active connector controls", () => {
  const viewModel = buildDataSourceSettingsViewModel({
    overview: createOverview(),
    state: "ready"
  });

  assert.deepEqual(
    viewModel.recommendations.map((recommendation) => recommendation.status),
    ["recommended", "recommended", "recommended", "recommended"]
  );
  assert.equal(
    viewModel.recommendations.some((recommendation) => recommendation.title.includes("External database connector")),
    true
  );
  assert.equal(
    viewModel.recommendations.some((recommendation) => (recommendation.kind as string) === "active-control"),
    false
  );
});
