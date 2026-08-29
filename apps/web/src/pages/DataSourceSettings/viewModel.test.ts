import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDataSourceSettingsViewModel,
  createCalculationSettingsForm,
  type CalculationSettings,
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
    monitoring: {
      anomalyMessages: [],
      hasCurrentDaySnapshots: true,
      latestSnapshotAt: "2026-06-16T09:00:00.000Z",
      latestSnapshotDate: "2026-06-16",
      localDate: "2026-06-16",
      metricScope: "global"
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

function createCalculationSettings(
  overrides: Partial<CalculationSettings> = {}
): CalculationSettings {
  return {
    carbonEmissionFactor: 0.467,
    co2AutoConvertSmallToKg: false,
    estimatedTariffPerKwh: 4.5,
    householdDailyUsageKwh: 13,
    householdMonthlyUsageKwh: 400,
    treeEquivalentFactor: 0.16,
    ...overrides
  };
}

test("buildDataSourceSettingsViewModel exposes ready source categories without secrets", () => {
  const viewModel = buildDataSourceSettingsViewModel({
    calculationSettings: createCalculationSettings(),
    calculationSettingsDraft: createCalculationSettingsForm(createCalculationSettings()),
    calculationSettingsState: "ready",
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
    calculationSettings: createCalculationSettings(),
    calculationSettingsDraft: createCalculationSettingsForm(createCalculationSettings()),
    calculationSettingsState: "ready",
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

test("buildDataSourceSettingsViewModel surfaces monitoring anomalies and reset action state", () => {
  const viewModel = buildDataSourceSettingsViewModel({
    calculationSettings: createCalculationSettings(),
    calculationSettingsDraft: createCalculationSettingsForm(createCalculationSettings()),
    calculationSettingsState: "ready",
    overview: createOverview({
      monitoring: {
        anomalyMessages: ["尚無今日 snapshot，最新資料停留在 2026-06-15。", "偵測到 02:00 夜間高發電 snapshot。"],
        hasCurrentDaySnapshots: false,
        latestSnapshotAt: "2026-06-15T02:00:00.000Z",
        latestSnapshotDate: "2026-06-15",
        localDate: "2026-06-16",
        metricScope: "global"
      }
    }),
    state: "ready"
  });

  assert.equal(viewModel.monitoringCard.banner.tone, "warning");
  assert.equal(viewModel.monitoringCard.banner.title, "今日曲線需要維運注意");
  assert.equal(viewModel.monitoringCard.metrics.includes("目前日期 2026-06-16"), true);
  assert.equal(viewModel.monitoringCard.metrics.includes("最新 snapshot 2026-06-15"), true);
  assert.equal(viewModel.monitoringCard.anomalies.length, 2);
  assert.equal(viewModel.monitoringCard.resetButtonDisabled, false);
  assert.equal(viewModel.monitoringCard.monthResetButtonDisabled, false);
  assert.equal(viewModel.monitoringCard.monthResetButtonLabel, "重設本月曲線");
});

test("buildDataSourceSettingsViewModel turns API failure into a degraded page state", () => {
  const viewModel = buildDataSourceSettingsViewModel({
    calculationSettings: null,
    calculationSettingsDraft: createCalculationSettingsForm(null),
    calculationSettingsState: "loading",
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
    calculationSettings: createCalculationSettings(),
    calculationSettingsDraft: createCalculationSettingsForm(createCalculationSettings()),
    calculationSettingsState: "ready",
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
    calculationSettings: createCalculationSettings(),
    calculationSettingsDraft: createCalculationSettingsForm(createCalculationSettings()),
    calculationSettingsState: "ready",
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

test("buildDataSourceSettingsViewModel exposes synchronized calculation coefficients as a disabled save card", () => {
  const settings = createCalculationSettings();
  const viewModel = buildDataSourceSettingsViewModel({
    calculationSettings: settings,
    calculationSettingsDraft: createCalculationSettingsForm(settings),
    calculationSettingsState: "ready",
    overview: createOverview(),
    state: "ready"
  });

  assert.equal(viewModel.calculationSettingsCard.banner.title, "換算係數已同步");
  assert.equal(viewModel.calculationSettingsCard.saveDisabled, true);
  assert.deepEqual(
    viewModel.calculationSettingsCard.fields.map((field) => [field.key, field.value]),
    [
      ["carbonEmissionFactor", "0.467"],
      ["treeEquivalentFactor", "0.16"],
      ["householdDailyUsageKwh", "13"],
      ["householdMonthlyUsageKwh", "400"],
      ["estimatedTariffPerKwh", "4.5"]
    ]
  );
  const fieldDescriptions = Object.fromEntries(
    viewModel.calculationSettingsCard.fields.map((field) => [field.key, field.description])
  );
  assert.equal(fieldDescriptions.householdDailyUsageKwh, "今日與累積發電量換算四口之家戶數的每日基準。");
  assert.equal(fieldDescriptions.householdMonthlyUsageKwh, "四口之家每月用電說明使用的參考基準。");
  assert.deepEqual(
    viewModel.calculationSettingsCard.toggles.map((toggle) => [toggle.key, toggle.checked]),
    [["co2AutoConvertSmallToKg", false]]
  );
});

test("buildDataSourceSettingsViewModel marks edited calculation coefficients dirty and saveable", () => {
  const settings = createCalculationSettings();
  const draft = createCalculationSettingsForm(settings);
  draft.carbonEmissionFactor = "0.61";

  const viewModel = buildDataSourceSettingsViewModel({
    calculationSettings: settings,
    calculationSettingsDraft: draft,
    calculationSettingsState: "ready",
    overview: createOverview(),
    state: "ready"
  });

  assert.equal(viewModel.calculationSettingsCard.banner.tone, "warning");
  assert.equal(viewModel.calculationSettingsCard.banner.title, "有未儲存的換算係數變更");
  assert.equal(viewModel.calculationSettingsCard.saveDisabled, false);
});

test("buildDataSourceSettingsViewModel marks the CO2 display preference toggle dirty and saveable", () => {
  const settings = createCalculationSettings();
  const draft = createCalculationSettingsForm(settings);
  draft.co2AutoConvertSmallToKg = true;

  const viewModel = buildDataSourceSettingsViewModel({
    calculationSettings: settings,
    calculationSettingsDraft: draft,
    calculationSettingsState: "ready",
    overview: createOverview(),
    state: "ready"
  });

  assert.equal(viewModel.calculationSettingsCard.banner.tone, "warning");
  assert.equal(viewModel.calculationSettingsCard.saveDisabled, false);
  assert.deepEqual(
    viewModel.calculationSettingsCard.toggles.map((toggle) => [toggle.key, toggle.checked]),
    [["co2AutoConvertSmallToKg", true]]
  );
});

test("buildDataSourceSettingsViewModel surfaces calculation coefficient save progress and completion feedback", () => {
  const settings = createCalculationSettings();
  const draft = createCalculationSettingsForm(settings);
  draft.estimatedTariffPerKwh = "6.2";

  const savingModel = buildDataSourceSettingsViewModel({
    calculationSettings: settings,
    calculationSettingsDraft: draft,
    calculationSettingsState: "saving",
    overview: createOverview(),
    state: "ready"
  });
  const successModel = buildDataSourceSettingsViewModel({
    calculationSettings: createCalculationSettings({
      estimatedTariffPerKwh: 6.2
    }),
    calculationSettingsDraft: createCalculationSettingsForm(
      createCalculationSettings({
        estimatedTariffPerKwh: 6.2
      })
    ),
    calculationSettingsState: "success",
    overview: createOverview(),
    state: "ready"
  });

  assert.equal(savingModel.calculationSettingsCard.saveButtonLabel, "儲存中...");
  assert.equal(savingModel.calculationSettingsCard.saveDisabled, true);
  assert.equal(successModel.calculationSettingsCard.banner.title, "換算係數已儲存");
  assert.equal(successModel.calculationSettingsCard.saveDisabled, true);
});
