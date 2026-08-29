import assert from "node:assert/strict";
import test from "node:test";
import type {
  DisplayReadinessReport,
  WeatherCurrentSnapshot,
  WeatherDiagnostic,
  WeatherHeaderContract,
  WeatherOptionsResponse,
  WeatherSettings
} from "@solar-display/shared";
import { buildMqttSettingsViewModel, resolveWeatherRefreshFeedback } from "./viewModel";

function createReadinessReport(findings: DisplayReadinessReport["findings"]): DisplayReadinessReport {
  return {
    findings,
    generatedAt: "2026-05-20T10:06:00.000Z",
    pages: [],
    summary: {
      blockingCount: findings.filter((finding) => finding.blocking).length,
      mqttCoverage: {
        blockingCount: findings.filter((finding) => finding.sourceType === "mqtt-metric" && finding.blocking)
          .length,
        readyCount: 0
      },
      readyCount: 0,
      slotCoverage: {
        blockingCount: 0,
        readyCount: 0
      },
      warningCount: findings.filter((finding) => !finding.blocking).length
    }
  };
}

function createWeatherSettings(overrides: Partial<WeatherSettings> = {}): WeatherSettings {
  return {
    countyName: "臺北市",
    enabled: true,
    fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
    locationMode: "station",
    preset: "standard",
    stationId: "C0I080",
    updateIntervalMinutes: 0,
    ...overrides
  };
}

function createWeatherCurrent(overrides: Partial<WeatherCurrentSnapshot> = {}): WeatherCurrentSnapshot {
  return {
    airPressure: 1008.2,
    airTemperature: 31.4,
    countyName: "臺北市",
    dailyHigh: 33.8,
    dailyLow: 25.2,
    fetchState: "fresh",
    observationTime: "2026-05-23T06:18:00.000Z",
    precipitation: 0,
    relativeHumidity: 70,
    staleAt: null,
    stationId: "C0I080",
    stationName: "內湖",
    townName: "內湖區",
    updatedAt: "2026-05-23T06:20:00.000Z",
    weather: "晴",
    windDirection: 180,
    windSpeed: 2.4,
    ...overrides
  };
}

function createWeatherPreviewContract(overrides: Partial<WeatherHeaderContract> = {}): WeatherHeaderContract {
  return {
    current: createWeatherCurrent(),
    settings: {
      enabled: true,
      fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
      locationMode: "station",
      preset: "standard"
    },
    ...overrides
  };
}

function createWeatherOptions(overrides: Partial<WeatherOptionsResponse> = {}): WeatherOptionsResponse {
  return {
    counties: ["新北市", "臺北市"],
    fetchState: "fresh",
    stations: [
      {
        countyName: "臺北市",
        stationId: "C0I080",
        stationName: "內湖",
        townName: "內湖區"
      },
      {
        countyName: "新北市",
        stationId: "C0I090",
        stationName: "板橋",
        townName: "板橋區"
      }
    ],
    updatedAt: "2026-05-23T06:20:00.000Z",
    ...overrides
  };
}

function createWeatherDiagnostic(overrides: Partial<WeatherDiagnostic> = {}): WeatherDiagnostic {
  return {
    code: null,
    httpStatus: null,
    lastSuccessAt: null,
    occurredAt: null,
    operation: null,
    retryable: false,
    safeSummary: "尚未執行天氣資料請求",
    source: "unavailable",
    state: "never-attempted",
    ...overrides
  };
}

test("manual weather refresh only reports success for a live upstream result", () => {
  assert.deepEqual(
    resolveWeatherRefreshFeedback(createWeatherDiagnostic({
      safeSummary: "CWA 天氣資料取得成功",
      source: "upstream",
      state: "ok"
    })),
    {
      errorMessage: "",
      message: "天氣資訊已立即更新。"
    }
  );

  assert.deepEqual(
    resolveWeatherRefreshFeedback(createWeatherDiagnostic({
      code: "WEATHER_DNS_LOOKUP_FAILED",
      safeSummary: "CWA hostname lookup failed",
      source: "stale",
      state: "error"
    })),
    {
      errorMessage: "天氣即時更新失敗（WEATHER_DNS_LOOKUP_FAILED）；目前顯示舊資料。",
      message: ""
    }
  );

  assert.deepEqual(
    resolveWeatherRefreshFeedback(createWeatherDiagnostic({
      safeSummary: "CWA 天氣資料取得成功",
      source: "cache",
      state: "ok"
    })),
    {
      errorMessage: "天氣即時更新未完成；本次只取得快取資料。",
      message: ""
    }
  );
});

test("buildMqttSettingsViewModel centralizes broker status and topic runtime mapping", () => {
  const model = buildMqttSettingsViewModel({
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    errorMessage: "",
    lastConnectionTest: null,
    message: "MQTT 設定已同步。",
    liveMetricsConnectionState: "connected",
    liveMetricsSnapshot: {
      metrics: {},
      timestamp: null
    },
    readiness: null,
    settings: {
      clientId: "kuozui-green-display-01",
      dataMode: "mqtt",
      host: "broker.internal",
      messageTimeout: "30",
      password: "****",
      port: "1883",
      reconnectInterval: "5000",
      username: "kuozui_display"
    },
    status: {
      broker: "broker.internal:1883",
      clientId: "kuozui-green-display-01",
      connected: true,
      reason: null,
      updatedAt: "2026-05-13T10:05:00.000Z"
    },
    topics: [
      {
        enabled: true,
        id: 1,
        lastReceivedAt: "2026-05-13T10:05:00.000Z",
        lastValue: 586.2,
        metricKey: "realTimePower",
        metricScope: "cl" as const,
        nameZh: null,
        nameEn: null,
        quality: "good",
        rawPayload: "{\"value\":586.2}",
        topic: "kuozui/plant/solar/power",
        unit: "kW",
        updatedAt: "2026-05-13T10:05:00.000Z",
        valuePath: "$.value"
      },
      {
        enabled: false,
        id: 2,
        lastReceivedAt: null,
        lastValue: null,
        metricKey: "todayGeneration",
        metricScope: "cl" as const,
        nameZh: null,
        nameEn: null,
        quality: null,
        rawPayload: null,
        topic: "kuozui/plant/solar/today_energy",
        unit: "kWh",
        updatedAt: null,
        valuePath: "$.value"
      }
    ],
    weatherOptions: createWeatherOptions(),
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: createWeatherPreviewContract(),
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings()
  });

  assert.equal(model.connection.statusLabel, "Broker 已連線");
  assert.equal(model.connection.statusTone, "connected");
  assert.equal(model.feedbackBanner.tone, "ready");
  assert.equal(model.feedbackBanner.visualTone, "success");
  assert.equal(model.summary.connectedTopicCount, 1);
  assert.equal(model.summary.enabledTopicCount, 1);
  assert.equal(model.liveTopicRows[0]?.runtimeLabel, "Live");
  assert.equal(model.liveTopicRows[0]?.runtimeTone, "connected");
  assert.equal(model.liveTopicRows[1]?.enabledLabel, "OFF");
  assert.equal(model.brokerFields[0]?.key, "host");
  assert.equal(model.modeOptions[0]?.isActive, true);
  assert.equal(model.previewCards.length, 1);
  assert.equal(model.previewCards[0]?.valueLabel, "586.2");
  assert.equal(model.previewCards[0]?.metricLabelZh, "即時發電功率");
});

test("buildMqttSettingsViewModel surfaces test/save failures and mock mode explicitly", () => {
  const model = buildMqttSettingsViewModel({
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: true,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: true,
      isTestingConnection: true
    },
    errorMessage: "MQTT client error: ECONNREFUSED",
    lastConnectionTest: null,
    liveMetricsConnectionState: "disconnected",
    liveMetricsSnapshot: {
      metrics: {},
      timestamp: null
    },
    message: "測試連線失敗。",
    readiness: null,
    settings: {
      clientId: "solar-display-player",
      dataMode: "mock",
      host: "localhost",
      messageTimeout: "30",
      password: "",
      port: "1883",
      reconnectInterval: "5000",
      username: ""
    },
    status: {
      broker: "",
      clientId: "",
      connected: false,
      reason: "offline",
      updatedAt: "2026-05-13T10:05:00.000Z"
    },
    topics: [],
    weatherOptions: createWeatherOptions({
      fetchState: "unconfigured",
      stations: []
    }),
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: createWeatherPreviewContract({
      current: createWeatherCurrent({
        fetchState: "unconfigured"
      })
    }),
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings({
      enabled: false
    })
  });

  assert.equal(model.connection.statusLabel, "Mock mode");
  assert.equal(model.connection.statusTone, "connecting");
  assert.equal(model.feedbackBanner.tone, "error");
  assert.equal(model.feedbackBanner.visualTone, "danger");
  assert.equal(model.feedbackBanner.title, "MQTT client error: ECONNREFUSED");
  assert.equal(model.liveTopicRows.length, 0);
  assert.match(model.emptyState?.title ?? "", /尚未設定 topic mappings/);
  assert.equal(model.actions.testConnectionLabel, "Testing...");
  assert.equal(model.actions.saveMappingsLabel, "Saving...");
  assert.equal(model.actions.saveMappingsDisabled, true);
});

test("buildMqttSettingsViewModel elevates explicit test-connection success feedback above stale broker status", () => {
  const model = buildMqttSettingsViewModel({
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    errorMessage: "",
    lastConnectionTest: {
      connected: true,
      message: "Connected successfully"
    },
    liveMetricsConnectionState: "connecting",
    liveMetricsSnapshot: {
      metrics: {},
      timestamp: null
    },
    message: "Broker 設定已變更，尚未儲存。",
    readiness: null,
    settings: {
      clientId: "solar-display-smoke",
      dataMode: "mqtt",
      host: "127.0.0.1",
      messageTimeout: "30",
      password: "",
      port: "18830",
      reconnectInterval: "5000",
      username: ""
    },
    status: {
      broker: "127.0.0.1:18830",
      clientId: "solar-display-smoke",
      connected: false,
      reason: "offline",
      updatedAt: "2026-05-13T10:05:00.000Z"
    },
    topics: [],
    weatherOptions: createWeatherOptions(),
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: createWeatherPreviewContract(),
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings()
  });

  assert.equal(model.connection.statusLabel, "Broker 未連線");
  assert.equal(model.feedbackBanner.title, "Test connection 成功");
  assert.equal(model.feedbackBanner.detail, "Connected successfully");
  assert.equal(model.feedbackBanner.tone, "ready");
  assert.equal(model.feedbackBanner.visualTone, "success");
});

test("buildMqttSettingsViewModel prefers streamed live metric updates over stale polled topic snapshots", () => {
  const model = buildMqttSettingsViewModel({
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    errorMessage: "",
    lastConnectionTest: null,
    liveMetricsConnectionState: "connected",
    liveMetricsSnapshot: {
      metrics: {
        realTimePower: {
          quality: "good",
          timestamp: "2026-05-20T10:06:00.000Z",
          unit: "kW",
          value: 601.4
        }
      },
      timestamp: "2026-05-20T10:06:00.000Z"
    },
    message: "Topic mappings 已同步。",
    readiness: createReadinessReport([]),
    settings: {
      clientId: "kuozui-green-display-01",
      dataMode: "mqtt",
      host: "broker.internal",
      messageTimeout: "30",
      password: "****",
      port: "1883",
      reconnectInterval: "5000",
      username: "kuozui_display"
    },
    status: {
      broker: "broker.internal:1883",
      clientId: "kuozui-green-display-01",
      connected: true,
      reason: null,
      updatedAt: "2026-05-20T10:06:00.000Z"
    },
    topics: [
      {
        enabled: true,
        id: 1,
        lastReceivedAt: "2026-05-20T10:05:00.000Z",
        lastValue: 586.2,
        metricKey: "realTimePower",
        metricScope: "cl" as const,
        nameZh: null,
        nameEn: null,
        quality: "good",
        rawPayload: "{\"value\":586.2}",
        topic: "kuozui/plant/solar/power",
        unit: "kW",
        updatedAt: "2026-05-20T10:05:00.000Z",
        valuePath: "$.value"
      }
    ],
    weatherOptions: createWeatherOptions(),
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: createWeatherPreviewContract(),
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings()
  });

  assert.equal(model.previewCards[0]?.valueLabel, "601.4");
  assert.equal(model.liveTopicRows[0]?.runtimeLabel, "Live");
  assert.equal(model.runtimePreview.statusLabel, "即時串流中");
});

test("buildMqttSettingsViewModel distinguishes mapped-but-idle topics from disconnected broker fallback", () => {
  const baseArgs = {
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    errorMessage: "",
    lastConnectionTest: null,
    liveMetricsConnectionState: "connected",
    liveMetricsSnapshot: {
      metrics: {},
      timestamp: null
    },
    message: "Topic mappings 已同步。",
    readiness: createReadinessReport([
      {
        blocking: false,
        metricScope: "cl" as const,
        pageId: "overview",
        reason: "等待 topic 首次收值。",
        requirementKey: "realTimePower",
        sourceId: "realTimePower",
        sourceType: "mqtt-metric",
        status: "warning"
      },
      {
        blocking: false,
        metricScope: "cl" as const,
        pageId: "sustainability",
        reason: "CL + KN MQTT aggregate ready",
        requirementKey: "accumulatedGenerationGwh",
        sourceId: "solar/CL/summary, solar/KN/summary",
        sourceType: "derived-metric",
        status: "ready"
      }
    ]),
    settings: {
      clientId: "kuozui-green-display-01",
      dataMode: "mqtt",
      host: "broker.internal",
      messageTimeout: "30",
      password: "****",
      port: "1883",
      reconnectInterval: "5000",
      username: "kuozui_display"
    },
    status: {
      broker: "broker.internal:1883",
      clientId: "kuozui-green-display-01",
      connected: true,
      reason: null,
      updatedAt: "2026-05-20T10:06:00.000Z"
    },
    topics: [
      {
        enabled: true,
        id: 1,
        lastReceivedAt: null,
        lastValue: null,
        metricKey: "realTimePower",
        metricScope: "cl" as const,
        nameZh: null,
        nameEn: null,
        quality: null,
        rawPayload: null,
        topic: "kuozui/plant/solar/power",
        unit: "kW",
        updatedAt: "2026-05-20T10:05:00.000Z",
        valuePath: "$.value"
      },
      {
        enabled: true,
        id: 2,
        lastReceivedAt: null,
        lastValue: 9986.306,
        metricKey: "factoryGeneration.cl.totalMwh",
        metricScope: "cl" as const,
        nameZh: "中壢累積發電量",
        nameEn: "Jungli Total Generation",
        quality: "good",
        rawPayload: "{}",
        topic: "solar/CL/summary",
        unit: "MWh",
        updatedAt: "2026-05-20T10:05:00.000Z",
        valuePath: "$.total_mwh"
      },
      {
        enabled: true,
        id: 3,
        lastReceivedAt: null,
        lastValue: 3659.57,
        metricKey: "factoryGeneration.kn.totalMwh",
        metricScope: "cl" as const,
        nameZh: "觀音累積發電量",
        nameEn: "Guanyin Total Generation",
        quality: "good",
        rawPayload: "{}",
        topic: "solar/KN/summary",
        unit: "MWh",
        updatedAt: "2026-05-20T10:05:00.000Z",
        valuePath: "$.total_mwh"
      }
    ],
    weatherOptions: createWeatherOptions(),
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: createWeatherPreviewContract(),
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings()
  } satisfies Parameters<typeof buildMqttSettingsViewModel>[0];
  const idleModel = buildMqttSettingsViewModel(baseArgs);
  const disconnectedModel = buildMqttSettingsViewModel({
    ...baseArgs,
    liveMetricsConnectionState: "disconnected",
    status: {
      broker: "broker.internal:1883",
      clientId: "kuozui-green-display-01",
      connected: false,
      reason: "offline",
      updatedAt: "2026-05-20T10:06:00.000Z"
    }
  });

  assert.equal(idleModel.liveTopicRows[0]?.runtimeLabel, "Idle");
  assert.equal(idleModel.coverageRows[0]?.stateLabel, "Idle Runtime");
  assert.equal(idleModel.coverageRows[1]?.stateLabel, "Ready");
  assert.equal(idleModel.coverageRows[1]?.detail, "CL + KN MQTT aggregate ready");
  assert.equal(disconnectedModel.liveTopicRows[0]?.runtimeLabel, "Disconnected");
  assert.equal(disconnectedModel.runtimePreview.statusLabel, "串流不可用");
});

test("buildMqttSettingsViewModel marks polled topic rows as fallback when streaming disconnects", () => {
  const model = buildMqttSettingsViewModel({
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    errorMessage: "",
    lastConnectionTest: null,
    liveMetricsConnectionState: "disconnected",
    liveMetricsSnapshot: {
      metrics: {},
      timestamp: null
    },
    message: "Topic mappings 已同步。",
    readiness: createReadinessReport([]),
    settings: {
      clientId: "kuozui-green-display-01",
      dataMode: "mqtt",
      host: "broker.internal",
      messageTimeout: "30",
      password: "****",
      port: "1883",
      reconnectInterval: "5000",
      username: "kuozui_display"
    },
    status: {
      broker: "broker.internal:1883",
      clientId: "kuozui-green-display-01",
      connected: true,
      reason: null,
      updatedAt: "2026-05-23T09:31:00.000Z"
    },
    topics: [
      {
        enabled: true,
        id: 1,
        lastReceivedAt: "2026-05-23T09:29:00.000Z",
        lastValue: 580.1,
        metricKey: "realTimePower",
        metricScope: "cl" as const,
        nameZh: null,
        nameEn: null,
        quality: "good",
        rawPayload: "{\"value\":580.1}",
        topic: "kuozui/plant/solar/power",
        unit: "kW",
        updatedAt: "2026-05-23T09:28:00.000Z",
        valuePath: "$.value"
      }
    ],
    weatherOptions: createWeatherOptions(),
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: createWeatherPreviewContract(),
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings()
  });

  assert.equal(model.topicWorkspaceSummary.runtimeStatusLabel, "Polling fallback");
  assert.equal(model.topicWorkspaceRows[0]?.runtimeLabel, "Fallback");
  assert.equal(model.topicWorkspaceRows[0]?.valueLabel, "580.1");
  assert.match(model.topicWorkspaceRows[0]?.lastReceivedLabel ?? "", /2026/);
  assert.match(model.topicWorkspaceRows[0]?.lastUpdatedLabel ?? "", /2026/);
});

test("buildMqttSettingsViewModel merges editable topic rows with runtime and coverage summaries", () => {
  const model = buildMqttSettingsViewModel({
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    errorMessage: "",
    lastConnectionTest: null,
    liveMetricsConnectionState: "connected",
    liveMetricsSnapshot: {
      metrics: {
        realTimePower: {
          quality: "good",
          timestamp: "2026-05-23T09:31:00.000Z",
          unit: "kW",
          value: 588.8
        }
      },
      timestamp: "2026-05-23T09:31:00.000Z"
    },
    message: "Topic mappings 已同步。",
    readiness: createReadinessReport([
      {
        blocking: true,
        metricScope: "cl" as const,
        pageId: "overview",
        reason: "尚未設定 todayGeneration mapping。",
        requirementKey: "todayGeneration",
        sourceId: null,
        sourceType: "mqtt-metric",
        status: "blocking"
      }
    ]),
    settings: {
      clientId: "kuozui-green-display-01",
      dataMode: "mqtt",
      host: "broker.internal",
      messageTimeout: "30",
      password: "****",
      port: "1883",
      reconnectInterval: "5000",
      username: "kuozui_display"
    },
    status: {
      broker: "broker.internal:1883",
      clientId: "kuozui-green-display-01",
      connected: true,
      reason: null,
      updatedAt: "2026-05-23T09:31:00.000Z"
    },
    topics: [
      {
        enabled: true,
        id: 1,
        lastReceivedAt: "2026-05-23T09:29:00.000Z",
        lastValue: 580.1,
        metricKey: "realTimePower",
        metricScope: "cl" as const,
        nameZh: null,
        nameEn: null,
        quality: "good",
        rawPayload: "{\"value\":580.1}",
        topic: "kuozui/plant/solar/power",
        unit: "kW",
        updatedAt: "2026-05-23T09:28:00.000Z",
        valuePath: "$.value"
      }
    ],
    weatherOptions: createWeatherOptions(),
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: createWeatherPreviewContract(),
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings()
  });

  assert.equal(model.topicWorkspaceRows[0]?.metricLabelZh, "即時發電功率");
  assert.equal(model.topicWorkspaceRows[0]?.runtimeLabel, "Live");
  assert.equal(model.topicWorkspaceRows[0]?.valueLabel, "588.8");
  assert.match(model.topicWorkspaceRows[0]?.lastReceivedLabel ?? "", /2026/);
  assert.equal(model.topicWorkspaceSummary.runtimeStatusLabel, "即時串流中");
  assert.equal(model.topicWorkspaceSummary.coverageCount, 1);
});

test("buildMqttSettingsViewModel prefers custom topic names and falls back to defaults when empty", () => {
  const baseArgs = {
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    errorMessage: "",
    lastConnectionTest: null,
    liveMetricsConnectionState: "disconnected" as const,
    liveMetricsSnapshot: null,
    message: "",
    readiness: createReadinessReport([]),
    settings: {
      clientId: "kuozui-green-display-01",
      dataMode: "mqtt" as const,
      host: "broker.internal",
      messageTimeout: "30",
      password: "****",
      port: "1883",
      reconnectInterval: "5000",
      username: "kuozui_display"
    },
    status: {
      broker: "broker.internal:1883",
      clientId: "kuozui-green-display-01",
      connected: false,
      reason: null,
      updatedAt: null
    },
    weatherOptions: createWeatherOptions(),
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: createWeatherPreviewContract(),
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings()
  };

  const namedModel = buildMqttSettingsViewModel({
    ...baseArgs,
    topics: [
      {
        enabled: true,
        id: 1,
        lastReceivedAt: null,
        lastValue: null,
        metricKey: "realTimePower",
        metricScope: "cl" as const,
        nameZh: "一號廠輸出",
        nameEn: "Plant A Output",
        quality: null,
        rawPayload: null,
        topic: "kuozui/plant/solar/power",
        unit: "kW",
        updatedAt: null,
        valuePath: "$.value"
      }
    ]
  });

  assert.equal(namedModel.topicWorkspaceRows[0]?.metricLabelZh, "一號廠輸出");
  assert.equal(namedModel.topicWorkspaceRows[0]?.metricLabelEn, "Plant A Output");
  assert.equal(namedModel.topicWorkspaceRows[0]?.nameZh, "一號廠輸出");

  const fallbackModel = buildMqttSettingsViewModel({
    ...baseArgs,
    topics: [
      {
        enabled: true,
        id: 1,
        lastReceivedAt: null,
        lastValue: null,
        metricKey: "realTimePower",
        metricScope: "cl" as const,
        nameZh: null,
        nameEn: null,
        quality: null,
        rawPayload: null,
        topic: "kuozui/plant/solar/power",
        unit: "kW",
        updatedAt: null,
        valuePath: "$.value"
      }
    ]
  });

  assert.equal(fallbackModel.topicWorkspaceRows[0]?.metricLabelZh, "即時發電功率");
  assert.equal(fallbackModel.topicWorkspaceRows[0]?.metricLabelEn, "Real-time Power");
});

test("buildMqttSettingsViewModel explains the unconfigured CWA weather source instead of failing silently", () => {
  const baseArgs = {
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    errorMessage: "",
    lastConnectionTest: null,
    liveMetricsConnectionState: "connected",
    liveMetricsSnapshot: {
      metrics: {},
      timestamp: null
    },
    message: "Weather settings 已同步。",
    readiness: null,
    settings: {
      clientId: "solar-display-player",
      dataMode: "mqtt",
      host: "localhost",
      messageTimeout: "30",
      password: "",
      port: "1883",
      reconnectInterval: "5000",
      username: ""
    },
    status: {
      broker: "localhost:1883",
      clientId: "solar-display-player",
      connected: true,
      reason: null,
      updatedAt: "2026-05-23T06:20:00.000Z"
    },
    topics: [],
    weatherOptionsErrorMessage: "",
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings({ enabled: true })
  } satisfies Omit<Parameters<typeof buildMqttSettingsViewModel>[0], "weatherOptions" | "weatherPreviewContract">;

  const unconfiguredModel = buildMqttSettingsViewModel({
    ...baseArgs,
    weatherOptions: createWeatherOptions({
      counties: [],
      fetchState: "unconfigured",
      stations: [],
      updatedAt: null
    }),
    weatherPreviewContract: createWeatherPreviewContract({
      current: createWeatherCurrent({ fetchState: "unconfigured" })
    })
  });

  assert.match(unconfiguredModel.weatherCard.configFeedback, /CWA/);
  assert.match(unconfiguredModel.weatherCard.configFeedback, /CWA_AUTHORIZATION/);

  const configuredModel = buildMqttSettingsViewModel({
    ...baseArgs,
    weatherOptions: createWeatherOptions(),
    weatherPreviewContract: createWeatherPreviewContract()
  });

  assert.equal(configuredModel.weatherCard.configFeedback, "");
});

test("buildMqttSettingsViewModel displays bounded weather diagnostics and safe copy context", () => {
  const baseArgs = {
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    errorMessage: "",
    lastConnectionTest: null,
    liveMetricsConnectionState: "connected" as const,
    liveMetricsSnapshot: { metrics: {}, timestamp: null },
    message: "Weather settings 已同步。",
    readiness: null,
    settings: {
      clientId: "solar-display-player",
      dataMode: "mqtt" as const,
      host: "localhost",
      messageTimeout: "30",
      password: "",
      port: "1883",
      reconnectInterval: "5000",
      username: ""
    },
    status: {
      broker: "localhost:1883",
      clientId: "solar-display-player",
      connected: true,
      reason: null,
      updatedAt: "2026-05-23T06:20:00.000Z"
    },
    topics: [],
    weatherOptions: createWeatherOptions(),
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: createWeatherPreviewContract(),
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings()
  };

  const neverAttempted = buildMqttSettingsViewModel({
    ...baseArgs,
    weatherDiagnostic: createWeatherDiagnostic()
  });
  const ok = buildMqttSettingsViewModel({
    ...baseArgs,
    weatherDiagnostic: createWeatherDiagnostic({
      lastSuccessAt: "2026-05-23T06:20:00.000Z",
      occurredAt: "2026-05-23T06:20:00.000Z",
      operation: "options",
      safeSummary: "CWA 天氣資料取得成功",
      source: "upstream",
      state: "ok"
    })
  });
  const unconfigured = buildMqttSettingsViewModel({
    ...baseArgs,
    weatherDiagnostic: createWeatherDiagnostic({
      code: "WEATHER_UNCONFIGURED",
      occurredAt: "2026-05-23T06:21:00.000Z",
      operation: "current",
      safeSummary: "CWA 授權尚未設定",
      state: "unconfigured"
    })
  });
  const error = buildMqttSettingsViewModel({
    ...baseArgs,
    weatherDiagnostic: createWeatherDiagnostic({
      code: "WEATHER_HTTP_ERROR",
      httpStatus: 503,
      lastSuccessAt: "2026-05-23T06:20:00.000Z",
      occurredAt: "2026-05-23T06:22:00.000Z",
      operation: "options",
      retryable: true,
      safeSummary: "CWA 回傳 HTTP 錯誤",
      state: "error"
    })
  });

  assert.equal(neverAttempted.weatherCard.diagnostic.stateLabel, "尚未執行");
  assert.equal(ok.weatherCard.diagnostic.stateLabel, "取得成功");
  assert.equal(unconfigured.weatherCard.diagnostic.stateLabel, "尚未設定");
  assert.deepEqual(error.weatherCard.diagnostic, {
    code: "WEATHER_HTTP_ERROR",
    copyText: [
      "Weather diagnostic",
      "State: error",
      "Source: unavailable",
      "Stage: http",
      "Code: WEATHER_HTTP_ERROR",
      "Operation: options",
      "Occurred at: 2026-05-23T06:22:00.000Z",
      "Last success at: 2026-05-23T06:20:00.000Z",
      "Retryable: true",
      "HTTP status: 503",
      "Summary: CWA 回傳 HTTP 錯誤"
    ].join("\n"),
    httpStatusLabel: "503",
    lastSuccessAtLabel: error.weatherCard.diagnostic.lastSuccessAtLabel,
    occurredAtLabel: error.weatherCard.diagnostic.occurredAtLabel,
    operationLabel: "測站／縣市選項",
    retryableLabel: "可重試",
    safeSummary: "CWA 回傳 HTTP 錯誤",
    source: "unavailable",
    sourceLabel: "無可用資料",
    stage: "http",
    stageLabel: "HTTP",
    state: "error",
    stateLabel: "取得失敗",
    tone: "error"
  });
  assert.equal(error.weatherCard.diagnostic.copyText.includes("Authorization"), false);
  assert.equal(error.weatherCard.diagnostic.copyText.includes("http://"), false);
  assert.ok(error.weatherCard.diagnostic.copyText.length <= 512);
});

test("buildMqttSettingsViewModel models weather presets preview and custom-field fallback", () => {
  const model = buildMqttSettingsViewModel({
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    errorMessage: "",
    lastConnectionTest: null,
    liveMetricsConnectionState: "connected",
    liveMetricsSnapshot: {
      metrics: {},
      timestamp: null
    },
    message: "Weather settings 已同步。",
    readiness: null,
    settings: {
      clientId: "solar-display-player",
      dataMode: "mqtt",
      host: "localhost",
      messageTimeout: "30",
      password: "",
      port: "1883",
      reconnectInterval: "5000",
      username: ""
    },
    status: {
      broker: "localhost:1883",
      clientId: "solar-display-player",
      connected: true,
      reason: null,
      updatedAt: "2026-05-23T06:20:00.000Z"
    },
    topics: [],
    weatherOptions: createWeatherOptions(),
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: createWeatherPreviewContract({
      current: createWeatherCurrent({
        airTemperature: 30.1,
        countyName: "新北市",
        stationId: "C0I090",
        stationName: "板橋",
        townName: "板橋區",
        weather: "多雲"
      }),
      settings: {
        enabled: true,
        fieldKeys: ["weather", "airTemperature"],
        locationMode: "station",
        preset: "compact"
      }
    }),
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings({
      countyName: "新北市",
      fieldKeys: ["weather", "airTemperature"],
      preset: "compact",
      stationId: "C0I090"
    })
  });

  assert.deepEqual(
    model.weatherCard.presetOptions.map((option) => option.value),
    ["compact", "standard", "complete", "custom"]
  );
  assert.equal(model.weatherCard.preview.primaryText, "板橋 多雲 30°C");
  assert.equal(model.weatherCard.preview.secondaryText, "");
  assert.equal(model.weatherCard.stationOptions[0]?.stationName, "板橋");
  assert.equal(model.weatherCard.customFieldOptions.length, 0);
});

test("buildMqttSettingsViewModel surfaces weather preview fallback and custom field controls", () => {
  const model = buildMqttSettingsViewModel({
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    errorMessage: "",
    lastConnectionTest: null,
    liveMetricsConnectionState: "connected",
    liveMetricsSnapshot: {
      metrics: {},
      timestamp: null
    },
    message: "Weather settings 已同步。",
    readiness: null,
    settings: {
      clientId: "solar-display-player",
      dataMode: "mqtt",
      host: "localhost",
      messageTimeout: "30",
      password: "",
      port: "1883",
      reconnectInterval: "5000",
      username: ""
    },
    status: {
      broker: "localhost:1883",
      clientId: "solar-display-player",
      connected: true,
      reason: null,
      updatedAt: "2026-05-23T06:20:00.000Z"
    },
    topics: [],
    weatherOptions: createWeatherOptions({
      stations: []
    }),
    weatherOptionsErrorMessage: "目前無法載入測站選項。",
    weatherPreviewContract: createWeatherPreviewContract({
      current: createWeatherCurrent({
        fetchState: "unavailable",
        stationId: null,
        stationName: null,
        weather: null
      }),
      settings: {
        enabled: true,
        fieldKeys: ["weather", "dailyHigh"],
        locationMode: "station",
        preset: "custom"
      }
    }),
    weatherPreviewErrorMessage: "目前無法取得 weather preview。",
    weatherSettings: createWeatherSettings({
      fieldKeys: ["weather", "dailyHigh"],
      preset: "custom",
      stationId: null
    })
  });

  assert.equal(model.weatherCard.preview.primaryText, "天氣暫不可用");
  assert.equal(model.weatherCard.preview.state, "unavailable");
  assert.equal(model.weatherCard.stationFeedback, "目前無法載入測站選項。");
  assert.equal(model.weatherCard.previewFeedback, "目前無法取得 weather preview。");
  assert.equal(model.weatherCard.customFieldOptions.length > 0, true);
  assert.equal(model.weatherCard.customFieldOptions.find((option) => option.value === "dailyHigh")?.checked, true);
});

test("buildMqttSettingsViewModel exposes section draft guidance topic impact groups and invalid weather drafts", () => {
  const model = buildMqttSettingsViewModel({
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    draftSections: {
      broker: true,
      topic: true,
      weather: true
    },
    errorMessage: "",
    lastConnectionTest: null,
    liveMetricsConnectionState: "connected",
    liveMetricsSnapshot: {
      metrics: {},
      timestamp: null
    },
    message: "Topic mappings 已變更，尚未儲存。",
    readiness: createReadinessReport([
      {
        blocking: true,
        metricScope: "cl" as const,
        pageId: "overview",
        reason: "尚未設定 todayGeneration mapping。",
        requirementKey: "todayGeneration",
        sourceId: null,
        sourceType: "mqtt-metric",
        status: "blocking"
      },
      {
        blocking: false,
        metricScope: "cl" as const,
        pageId: "solar",
        reason: "等待 topic 首次收值。",
        requirementKey: "realTimePower",
        sourceId: "realTimePower",
        sourceType: "mqtt-metric",
        status: "warning"
      }
    ]),
    settings: {
      clientId: "solar-display-player",
      dataMode: "mqtt",
      host: "broker.internal",
      messageTimeout: "30",
      password: "",
      port: "1883",
      reconnectInterval: "5000",
      username: ""
    },
    status: {
      broker: "broker.internal:1883",
      clientId: "solar-display-player",
      connected: true,
      reason: null,
      updatedAt: "2026-05-23T06:20:00.000Z"
    },
    topics: [
      {
        enabled: true,
        id: 1,
        lastReceivedAt: null,
        lastValue: null,
        metricKey: "realTimePower",
        metricScope: "cl" as const,
        nameZh: null,
        nameEn: null,
        quality: null,
        rawPayload: null,
        topic: "kuozui/plant/solar/power",
        unit: "kW",
        updatedAt: "2026-05-23T06:18:00.000Z",
        valuePath: "$.value"
      },
      {
        enabled: true,
        id: 2,
        lastReceivedAt: "2026-05-23T06:19:00.000Z",
        lastValue: 1280,
        metricKey: "factoryProductionPower",
        metricScope: "cl" as const,
        nameZh: null,
        nameEn: null,
        quality: "good",
        rawPayload: "{\"value\":1280}",
        topic: "kuozui/factory/production/power",
        unit: "kW",
        updatedAt: "2026-05-23T06:19:00.000Z",
        valuePath: "$.value"
      }
    ],
    weatherOptions: createWeatherOptions(),
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: createWeatherPreviewContract({
      current: createWeatherCurrent({
        countyName: "臺北市",
        stationId: "C0I080",
        stationName: "內湖",
        townName: "內湖區",
        weather: "晴"
      })
    }),
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings({
      countyName: "臺北市",
      locationMode: "station",
      stationId: null
    })
  });

  assert.equal(model.sectionGuides.broker.title, "Broker 草稿待儲存");
  assert.match(model.sectionGuides.broker.detail, /Broker 已連線/);
  assert.equal(model.sectionGuides.topic.title, "Topic Workspace 有未儲存變更");
  assert.equal(
    model.topicWorkspaceSummary.impactGroups.map((group) => group.title).join(" | "),
    "Mapping Gap Priority | Idle Runtime | Healthy Mapping"
  );
  assert.equal(model.topicWorkspaceSummary.impactGroups[0]?.items[0]?.storyLabel, "Overview");
  assert.equal(model.topicWorkspaceSummary.impactGroups[0]?.items[0]?.metricLabelZh, "今日發電量");
  assert.equal(model.weatherCard.contractStatusTitle, "Header Contract 草稿待儲存");
  assert.match(model.weatherCard.contractStatusDetail, /內湖 晴 31°C/);
  assert.equal(
    model.weatherCard.localValidationFeedback,
    "請先選擇測站，才能確認 header 會顯示哪個站點。"
  );
});

const threePhaseMetricKeys = [
  "phaseRVoltage",
  "phaseRCurrent",
  "phaseRPower",
  "phaseSVoltage",
  "phaseSCurrent",
  "phaseSPower",
  "phaseTVoltage",
  "phaseTCurrent",
  "phaseTPower"
] as const;

test("buildMqttSettingsViewModel resolves non-empty labels for three-phase metric keys", () => {
  const model = buildMqttSettingsViewModel({
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false
    },
    errorMessage: "",
    lastConnectionTest: null,
    liveMetricsConnectionState: "connected",
    liveMetricsSnapshot: {
      metrics: {},
      timestamp: null
    },
    message: "",
    readiness: null,
    settings: {
      clientId: "kuozui-green-display-01",
      dataMode: "mqtt",
      host: "broker.internal",
      messageTimeout: "30",
      password: "****",
      port: "1883",
      reconnectInterval: "5000",
      username: "kuozui_display"
    },
    status: {
      broker: "broker.internal:1883",
      clientId: "kuozui-green-display-01",
      connected: true,
      reason: null,
      updatedAt: "2026-05-13T10:05:00.000Z"
    },
    topics: threePhaseMetricKeys.map((metricKey, index) => ({
      enabled: true,
      id: index + 1,
      lastReceivedAt: null,
      lastValue: null,
      metricKey,
      metricScope: "cl" as const,
      nameZh: null,
      nameEn: null,
      quality: null,
      rawPayload: null,
      topic: `kuozui/plant/phase/${metricKey}`,
      unit: "",
      updatedAt: null,
      valuePath: "$.value"
    })),
    weatherOptions: createWeatherOptions(),
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: createWeatherPreviewContract(),
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings()
  });

  for (const metricKey of threePhaseMetricKeys) {
    const row = model.liveTopicRows.find((topic) => topic.metricKey === metricKey);
    assert.ok(row, `expected a topic row for ${metricKey}`);
    assert.notEqual(row?.metricLabelZh, "", `expected a non-empty zh label for ${metricKey}`);
    assert.notEqual(row?.metricLabelEn, "", `expected a non-empty en label for ${metricKey}`);
    assert.notEqual(
      row?.metricLabelZh,
      metricKey,
      `expected a human-readable zh label for ${metricKey}, not the raw key`
    );
  }
});
