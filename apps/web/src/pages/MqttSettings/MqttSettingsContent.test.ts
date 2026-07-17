import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { WeatherCurrentSnapshot, WeatherDiagnostic, WeatherHeaderContract, WeatherOptionsResponse, WeatherSettings } from "@solar-display/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MqttSettingsContent } from "./MqttSettingsContent";

const mqttSettingsCss = readFileSync(
  new URL("./mqttSettings.css", import.meta.url),
  "utf8"
);
const mqttSettingsIndexSource = readFileSync(
  new URL("./index.tsx", import.meta.url),
  "utf8"
);

function createWeatherSettings(overrides: Partial<WeatherSettings> = {}): WeatherSettings {
  return {
    countyName: "臺北市",
    enabled: true,
    fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
    locationMode: "station",
    preset: "standard",
    stationId: "C0I080",
    updateIntervalMinutes: 30,
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
      preset: "standard",
      updateIntervalMinutes: 30
    },
    ...overrides
  };
}

function renderContent(overrides: Partial<React.ComponentProps<typeof MqttSettingsContent>> = {}) {
  const defaultProps: React.ComponentProps<typeof MqttSettingsContent> = {
    actionState: {
      isLoadingSettings: false,
      isLoadingTopics: false,
      isReloadingTopics: false,
      isSavingSettings: false,
      isSavingTopics: false,
      isTestingConnection: false,
      isRefreshingWeather: false
    },
    addTopicMapping: () => undefined,
    errorMessage: "",
    handleSettingChange: () => undefined,
    handleTopicChange: () => undefined,
    handleWeatherSettingChange: () => undefined,
    lastConnectionTest: null,
    liveMetricsConnectionState: "connected",
    liveMetricsSnapshot: { metrics: {}, timestamp: null },
    message: "",
    readiness: null,
    readinessErrorMessage: "",
    reloadTopics: async () => undefined,
    remoteSyncBanner: null,
    removeTopicMapping: () => undefined,
    saveSettings: async () => undefined,
    saveTopicMappings: async () => undefined,
    settings: {
      clientId: "",
      dataMode: "mqtt",
      host: "",
      messageTimeout: "",
      password: "",
      port: "",
      reconnectInterval: "",
      username: ""
    },
    status: { broker: "", clientId: "", connected: false, reason: null, updatedAt: null },
    testConnection: async () => undefined,
    toggleWeatherField: () => undefined,
    topics: [],
    weatherOptions: null,
    weatherOptionsErrorMessage: "",
    weatherPreviewContract: null,
    weatherPreviewErrorMessage: "",
    weatherSettings: createWeatherSettings(),
    refreshWeather: async () => undefined
  };
  return renderToStaticMarkup(React.createElement(MqttSettingsContent, { ...defaultProps, ...overrides }));
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

test("mqtt settings content renders per-row publish controls for topic mappings", () => {
  const html = renderContent({
    publishTopicValue: async () => undefined,
    topicPublishDrafts: {
      selfConsumptionEnergy: "1200"
    },
    topics: [
      {
        enabled: true,
        id: 1,
        lastReceivedAt: null,
        lastValue: null,
        metricKey: "selfConsumptionEnergy",
        nameEn: null,
        nameZh: "自發自用量",
        quality: null,
        rawPayload: null,
        topic: "kuozui/plant/solar/self_consumption",
        unit: "kWh",
        updatedAt: null,
        valuePath: "$.value"
      },
      {
        enabled: true,
        id: 2,
        lastReceivedAt: null,
        lastValue: null,
        metricKey: "consumptionEnergy",
        nameEn: null,
        nameZh: "用電量",
        quality: null,
        rawPayload: null,
        topic: "",
        unit: "kWh",
        updatedAt: null,
        valuePath: "$.value"
      },
      {
        enabled: false,
        id: 3,
        lastReceivedAt: null,
        lastValue: null,
        metricKey: "todayGeneration",
        nameEn: null,
        nameZh: "今日發電量",
        quality: null,
        rawPayload: null,
        topic: "kuozui/plant/solar/today_energy",
        unit: "kWh",
        updatedAt: null,
        valuePath: "$.value"
      }
    ]
  });

  assert.match(html, /data-mqtt-publish-row="selfConsumptionEnergy"/);
  assert.match(html, /data-mqtt-publish-disabled="false"/);
  assert.match(html, /placeholder="輸入測試數值"/);
  assert.match(html, /發佈測試值/);
  assert.match(html, /data-mqtt-publish-row="consumptionEnergy"[^>]*data-mqtt-publish-disabled="true"/);
  assert.match(html, /data-mqtt-publish-row="todayGeneration"[^>]*data-mqtt-publish-disabled="true"/);
});

test("mqtt settings content combines source mode and topic controls into a three-tab workspace", () => {
  const html = renderContent({
    topics: [
      {
        enabled: true,
        id: 1,
        lastReceivedAt: null,
        lastValue: null,
        metricKey: "realTimePower",
        nameEn: null,
        nameZh: "即時發電功率",
        quality: null,
        rawPayload: null,
        topic: "kuozui/plant/solar/power",
        unit: "kW",
        updatedAt: null,
        valuePath: "$.value"
      }
    ]
  });

  assert.match(html, /data-mqtt-section="topic-workspace"/);
  assert.match(html, /data-mqtt-workspace-tab="source"/);
  assert.match(html, /data-mqtt-workspace-tab="topic"/);
  assert.match(html, /data-mqtt-workspace-tab="card-data"/);
  assert.match(html, /資料來源模式/);
  assert.match(html, /Topic mapping/);
  assert.match(html, /卡片資料管理/);
  assert.match(html, /data-mqtt-row="editable-topic-row"/);
  assert.doesNotMatch(html, /data-mqtt-section="source-mode-card"/);
  assert.doesNotMatch(html, /class="[^"]*mqtt-mode/);
});

test("mqtt settings content filters Factory Circuit topic mappings by active factory site", () => {
  const topics = [
    {
      enabled: true,
      id: 1,
      lastReceivedAt: null,
      lastValue: null,
      metricKey: "factoryStampingPower",
      nameEn: null,
      nameZh: "中壢沖壓",
      quality: null,
      rawPayload: null,
      topic: "factory/jungli/stamping",
      unit: "kW",
      updatedAt: null,
      valuePath: "$.value"
    },
    {
      enabled: true,
      id: 2,
      lastReceivedAt: null,
      lastValue: null,
      metricKey: "factoryHeavyVehiclePower",
      nameEn: null,
      nameZh: "舊大車",
      quality: null,
      rawPayload: null,
      topic: "factory/power/heavy_vehicle",
      unit: "kW",
      updatedAt: null,
      valuePath: "$.value"
    },
    {
      enabled: true,
      id: 3,
      lastReceivedAt: null,
      lastValue: null,
      metricKey: "factoryCircuit.guanyin.stampingPower",
      nameEn: null,
      nameZh: "觀音沖壓",
      quality: null,
      rawPayload: null,
      topic: "factory/guanyin/stamping",
      unit: "kW",
      updatedAt: null,
      valuePath: "$.value"
    },
    {
      enabled: true,
      id: 4,
      lastReceivedAt: null,
      lastValue: null,
      metricKey: "realTimePower",
      nameEn: null,
      nameZh: "即時發電功率",
      quality: null,
      rawPayload: null,
      topic: "kuozui/plant/solar/power",
      unit: "kW",
      updatedAt: null,
      valuePath: "$.value"
    }
  ];

  const jungliHtml = renderContent({
    activeTopicWorkspaceTab: "topic",
    topics
  });

  assert.match(jungliHtml, /data-mqtt-topic-site-toggle="jungli"/);
  assert.match(jungliHtml, /data-mqtt-topic-site-toggle="guanyin"/);
  assert.match(jungliHtml, /中壢沖壓/);
  assert.match(jungliHtml, /即時發電功率/);
  assert.doesNotMatch(jungliHtml, /觀音沖壓/);
  assert.doesNotMatch(jungliHtml, /舊大車/);

  const guanyinHtml = renderContent({
    activeTopicWorkspaceTab: "topic",
    activeCardDataSite: "guanyin",
    readiness: {
      findings: [
        {
          blocking: true,
          pageId: "factory-circuit",
          reason: "Missing Jungli topic",
          requirementKey: "factoryStampingPower",
          sourceId: null,
          sourceType: "mqtt-metric",
          status: "blocking"
        },
        {
          blocking: true,
          pageId: "factory-circuit-guanyin",
          reason: "Missing Guanyin topic",
          requirementKey: "factoryCircuit.guanyin.stampingPower",
          sourceId: null,
          sourceType: "mqtt-metric",
          status: "blocking"
        }
      ],
      generatedAt: "2026-07-08T09:00:00.000Z",
      pages: [],
      summary: {
        blockingCount: 2,
        mqttCoverage: { blockingCount: 2, readyCount: 0 },
        readyCount: 0,
        slotCoverage: { blockingCount: 0, readyCount: 0 },
        warningCount: 0
      }
    },
    topics
  });

  assert.match(guanyinHtml, /觀音沖壓/);
  assert.match(guanyinHtml, /即時發電功率/);
  assert.match(guanyinHtml, /factoryCircuit\.guanyin\.stampingPower/);
  assert.doesNotMatch(guanyinHtml, /中壢沖壓/);
  assert.doesNotMatch(guanyinHtml, /舊大車/);
  assert.doesNotMatch(guanyinHtml, /factoryStampingPower/);
});

test("mqtt settings content renders source mode controls inside the merged workspace tab", () => {
  const html = renderContent({
    activeTopicWorkspaceTab: "source",
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
      updatedAt: "2026-05-23T09:31:00.000Z"
    },
    topics: [
      {
        enabled: true,
        id: 1,
        lastReceivedAt: null,
        lastValue: null,
        metricKey: "realTimePower",
        nameEn: null,
        nameZh: "即時發電功率",
        quality: null,
        rawPayload: null,
        topic: "kuozui/plant/solar/power",
        unit: "kW",
        updatedAt: null,
        valuePath: "$.value"
      }
    ]
  });

  assert.match(html, /aria-selected="true"[^>]*data-mqtt-workspace-tab="source"/);
  assert.match(html, /Broker 主機/);
  assert.match(html, /value="localhost"/);
  assert.match(html, /Test connection/);
  assert.match(html, /Save settings/);
  assert.match(html, /Broker 已連線/);
  assert.doesNotMatch(html, /data-mqtt-row="editable-topic-row"/);
});

test("mqtt settings content renders card data diagnostics in the third workspace tab", () => {
  const html = renderContent({
    activeTopicWorkspaceTab: "card-data",
    publishTopicValue: async () => undefined,
    topicPublishDrafts: {
      realTimePower: "60"
    },
    cardDataRows: [
      {
        actions: [{ metricKey: "realTimePower", type: "publish-test-value" }, { type: "set-display-override" }],
        aggregateSource: null,
        calculationFields: [],
        cardId: "overview.realTimePower",
        dependencies: [
          {
            latestValue: "42 kW",
            metricKey: "realTimePower",
            status: "ready",
            topic: "kuozui/plant/solar/power"
          }
        ],
        displayValue: "42.0",
        formula: null,
        label: "即時發電功率",
        lastUpdatedAt: "2026-07-08T09:00:00.000Z",
        metricKey: "realTimePower",
        originalValue: "42.0",
        override: null,
        pageId: "overview",
        sourceClassification: "mqtt-live",
        sourceTopics: [{ metricKey: "realTimePower", topic: "kuozui/plant/solar/power" }],
        status: "ready",
        unit: "kW"
      },
      {
        actions: [{ metricKey: "todayGeneration", type: "configure-topic" }],
        aggregateSource: null,
        calculationFields: [],
        cardId: "overview.todayGeneration",
        dependencies: [
          {
            latestValue: null,
            metricKey: "todayGeneration",
            status: "missing-topic",
            topic: null
          }
        ],
        displayValue: "--",
        formula: null,
        label: "今日發電量",
        lastUpdatedAt: null,
        metricKey: "todayGeneration",
        originalValue: "--",
        override: null,
        pageId: "overview",
        sourceClassification: "mqtt-live",
        sourceTopics: [],
        status: "missing-topic",
        unit: "kWh"
      },
      {
        actions: [{ fields: ["householdDailyUsageKwh"], type: "edit-calculation-settings" }],
        aggregateSource: "daily-self-consumption",
        calculationFields: ["householdDailyUsageKwh"],
        cardId: "sustainability.household.today",
        dependencies: [],
        displayValue: "4",
        formula: "daily selfConsumption / householdDailyUsageKwh",
        label: "今日綠電效益",
        lastUpdatedAt: "2026-07-08T00:00:00.000Z",
        metricKey: "householdEquivalent.today",
        originalValue: "4",
        override: null,
        pageId: "sustainability",
        sourceClassification: "daily-summary",
        sourceTopics: [],
        status: "ready",
        unit: "戶4口之家"
      }
    ]
  });

  assert.match(html, /data-mqtt-card-data-row="overview\.realTimePower"/);
  assert.match(html, /data-mqtt-card-publish-row="realTimePower"[^>]*data-mqtt-card-publish-disabled="false"/);
  assert.match(html, /Overview/);
  assert.match(html, /即時發電功率/);
  assert.match(html, /42.0/);
  assert.match(html, /kuozui\/plant\/solar\/power/);
  assert.match(html, /realTimePower/);
  assert.match(html, /data-mqtt-card-data-row="sustainability\.household\.today"/);
  assert.match(html, /data-mqtt-card-configure-topic="todayGeneration"/);
  assert.match(html, /daily-self-consumption/);
  assert.match(html, /householdDailyUsageKwh/);
  assert.match(html, /data-mqtt-card-calculation-field="householdDailyUsageKwh"/);
  assert.match(html, /daily selfConsumption \/ householdDailyUsageKwh/);
});

test("mqtt settings content labels Guanyin Factory Circuit card diagnostics distinctly", () => {
  const html = renderContent({
    activeTopicWorkspaceTab: "card-data",
    activeCardDataSite: "guanyin",
    cardDataRows: [
      {
        actions: [{ metricKey: "factoryCircuit.guanyin.stampingPower", type: "publish-test-value" }],
        aggregateSource: null,
        calculationFields: [],
        cardId: "factory-circuit-guanyin.slot.stamping",
        dependencies: [
          {
            latestValue: "20 kW",
            metricKey: "factoryCircuit.guanyin.stampingPower",
            status: "ready",
            topic: "factory/guanyin/stamping"
          }
        ],
        displayValue: "20.0",
        formula: null,
        label: "觀音沖壓",
        lastUpdatedAt: "2026-07-08T09:00:00.000Z",
        metricKey: "factoryCircuit.guanyin.stampingPower",
        originalValue: "20.0",
        override: null,
        pageId: "factory-circuit-guanyin",
        sourceClassification: "mqtt-live",
        sourceTopics: [
          {
            metricKey: "factoryCircuit.guanyin.stampingPower",
            topic: "factory/guanyin/stamping"
          }
        ],
        status: "ready",
        unit: "kW"
      }
    ]
  });

  assert.match(html, /Factory Circuit \(Guanyin\)/);
  assert.match(html, /factoryCircuit\.guanyin\.stampingPower/);
});

test("mqtt settings content filters card data diagnostics by factory site", () => {
  const cardDataRows: NonNullable<React.ComponentProps<typeof MqttSettingsContent>["cardDataRows"]> = [
    {
      actions: [{ metricKey: "factoryStampingPower", type: "publish-test-value" }],
      aggregateSource: null,
      calculationFields: [],
      cardId: "factory-circuit.slot.stamping",
      dependencies: [
        {
          latestValue: "10 kW",
          metricKey: "factoryStampingPower",
          status: "ready",
          topic: "factory/jungli/stamping"
        }
      ],
      displayValue: "10.0",
      formula: null,
      label: "中壢沖壓",
      lastUpdatedAt: "2026-07-08T09:00:00.000Z",
      metricKey: "factoryStampingPower",
      originalValue: "10.0",
      override: null,
      pageId: "factory-circuit",
      sourceClassification: "mqtt-live",
      sourceTopics: [{ metricKey: "factoryStampingPower", topic: "factory/jungli/stamping" }],
      status: "ready",
      unit: "kW"
    },
    {
      actions: [{ metricKey: "factoryCircuit.guanyin.stampingPower", type: "publish-test-value" }],
      aggregateSource: null,
      calculationFields: [],
      cardId: "factory-circuit-guanyin.slot.stamping",
      dependencies: [
        {
          latestValue: "20 kW",
          metricKey: "factoryCircuit.guanyin.stampingPower",
          status: "ready",
          topic: "factory/guanyin/stamping"
        }
      ],
      displayValue: "20.0",
      formula: null,
      label: "觀音沖壓",
      lastUpdatedAt: "2026-07-08T09:00:00.000Z",
      metricKey: "factoryCircuit.guanyin.stampingPower",
      originalValue: "20.0",
      override: null,
      pageId: "factory-circuit-guanyin",
      sourceClassification: "mqtt-live",
      sourceTopics: [{ metricKey: "factoryCircuit.guanyin.stampingPower", topic: "factory/guanyin/stamping" }],
      status: "ready",
      unit: "kW"
    },
    {
      actions: [{ metricKey: "realTimePower", type: "publish-test-value" }],
      aggregateSource: null,
      calculationFields: [],
      cardId: "overview.realTimePower",
      dependencies: [],
      displayValue: "42.0",
      formula: null,
      label: "即時發電功率",
      lastUpdatedAt: "2026-07-08T09:00:00.000Z",
      metricKey: "realTimePower",
      originalValue: "42.0",
      override: null,
      pageId: "overview",
      sourceClassification: "mqtt-live",
      sourceTopics: [{ metricKey: "realTimePower", topic: "kuozui/plant/solar/power" }],
      status: "ready",
      unit: "kW"
    }
  ];

  const jungliHtml = renderContent({
    activeTopicWorkspaceTab: "card-data",
    cardDataRows
  });

  assert.match(jungliHtml, /data-mqtt-card-data-site-toggle="jungli"/);
  assert.match(jungliHtml, /data-mqtt-card-data-site-toggle="guanyin"/);
  assert.match(jungliHtml, /中壢沖壓/);
  assert.doesNotMatch(jungliHtml, /觀音沖壓/);
  assert.match(jungliHtml, /即時發電功率/);

  const guanyinHtml = renderContent({
    activeTopicWorkspaceTab: "card-data",
    activeCardDataSite: "guanyin",
    cardDataRows
  });

  assert.doesNotMatch(guanyinHtml, /中壢沖壓/);
  assert.match(guanyinHtml, /觀音沖壓/);
  assert.match(guanyinHtml, /即時發電功率/);

  const jungliOnlyHtml = renderContent({
    activeTopicWorkspaceTab: "card-data",
    cardDataRows,
    enabledCardDataSites: ["jungli"]
  });

  assert.doesNotMatch(jungliOnlyHtml, /data-mqtt-card-data-site-toggle="guanyin"/);
  assert.match(jungliOnlyHtml, /中壢沖壓/);
  assert.doesNotMatch(jungliOnlyHtml, /觀音沖壓/);
});

test("mqtt settings content renders display override controls and invalid numeric state", () => {
  const html = renderContent({
    activeTopicWorkspaceTab: "card-data",
    clearDisplayOverride: async () => undefined,
    handleOverrideDraftChange: () => undefined,
    handleTopicPublishDraftChange: () => undefined,
    overrideDrafts: {
      "overview.realTimePower": "good looking"
    },
    publishTopicValue: async () => undefined,
    saveDisplayOverride: async () => undefined,
    topicPublishDrafts: {
      realTimePower: "60"
    },
    cardDataRows: [
      {
        actions: [{ metricKey: "realTimePower", type: "publish-test-value" }, { type: "set-display-override" }],
        aggregateSource: null,
        calculationFields: [],
        cardId: "overview.realTimePower",
        dependencies: [],
        displayValue: "60.0",
        formula: null,
        label: "即時發電功率",
        lastUpdatedAt: "2026-07-08T09:00:00.000Z",
        metricKey: "realTimePower",
        originalValue: "42.0",
        override: {
          active: true,
          cardId: "overview.realTimePower",
          displayValue: 60,
          enabled: true,
          expiresAt: null,
          metricKey: "realTimePower",
          pageId: "overview",
          reason: null,
          targetId: "overview.realTimePower",
          unit: "kW",
          updatedAt: "2026-07-08T09:10:00.000Z"
        },
        pageId: "overview",
        sourceClassification: "mqtt-live",
        sourceTopics: [],
        status: "overridden",
        unit: "kW"
      }
    ]
  });

  assert.match(html, /data-mqtt-card-override-row="overview\.realTimePower"/);
  assert.match(html, /data-mqtt-card-publish-row="realTimePower"/);
  assert.ok(
    html.indexOf('data-mqtt-card-override-row="overview.realTimePower"') <
      html.indexOf('data-mqtt-card-publish-row="realTimePower"')
  );
  assert.match(html, /data-mqtt-card-override-invalid="true"/);
  assert.match(html, /data-mqtt-card-override-state="active"/);
  assert.match(html, /展示覆寫/);
  assert.match(html, /原始 42\.0 kW/);
  assert.match(html, /只改展示值/);
  assert.match(html, /套用展示值/);
  assert.match(html, /清除覆寫/);
  assert.match(html, /發佈到 MQTT/);
  assert.match(html, /title="只改播放頁顯示值，不寫回 MQTT 或歷史資料"/);
  assert.match(html, /title="發佈數字到此 metric 對應的 MQTT topic，會走真實資料流程"/);
  assert.match(html, /請輸入數字/);
});

test("mqtt card data action input prefixes stay horizontal", () => {
  assert.match(
    mqttSettingsCss,
    /\.mqtt-settings-page \.mqtt-card-data-row__(?:publish|override) \.input-prefix[\s\S]*white-space:\s*nowrap/
  );
  assert.match(
    mqttSettingsCss,
    /\.mqtt-settings-page \.mqtt-card-data-row__(?:publish|override) \.input-prefix[\s\S]*min-width:\s*96px/
  );
});

test("mqtt settings content marks the topic row highlighted by card data actions", () => {
  const html = renderContent({
    highlightedTopicMetricKey: "todayGeneration",
    topics: [
      {
        enabled: true,
        id: 1,
        lastReceivedAt: null,
        lastValue: null,
        metricKey: "todayGeneration",
        nameEn: null,
        nameZh: "今日發電量",
        quality: null,
        rawPayload: null,
        topic: "",
        unit: "kWh",
        updatedAt: null,
        valuePath: "$.value"
      }
    ]
  });

  assert.match(html, /data-mqtt-topic-highlighted="true"/);
});

test("mqtt settings content renders readiness coverage rows that distinguish mapping gaps from idle runtime topics", () => {
  const html = renderToStaticMarkup(
    React.createElement(MqttSettingsContent, {
      actionState: {
        isLoadingSettings: false,
        isLoadingTopics: false,
        isReloadingTopics: false,
        isSavingSettings: false,
        isSavingTopics: false,
        isTestingConnection: false
      },
      addTopicMapping: () => undefined,
      errorMessage: "",
      handleSettingChange: () => undefined,
      handleTopicChange: () => undefined,
      handleWeatherSettingChange: () => undefined,
      lastConnectionTest: null,
      liveMetricsConnectionState: "connected",
      liveMetricsSnapshot: {
        metrics: {},
        timestamp: null
      },
      message: "Topic mappings 已同步。",
      readiness: {
        findings: [
          {
            blocking: true,
            pageId: "overview",
            reason: "尚未設定 realTimePower mapping。",
            requirementKey: "realTimePower",
            sourceId: null,
            sourceType: "mqtt-metric",
            status: "blocking"
          },
          {
            blocking: false,
            pageId: "overview",
            reason: "等待 topic 首次收值。",
            requirementKey: "todayGeneration",
            sourceId: "todayGeneration",
            sourceType: "mqtt-metric",
            status: "warning"
          }
        ],
        generatedAt: "2026-05-20T10:06:00.000Z",
        pages: [],
        summary: {
          blockingCount: 1,
          mqttCoverage: {
            blockingCount: 1,
            readyCount: 0
          },
          readyCount: 0,
          slotCoverage: {
            blockingCount: 0,
            readyCount: 0
          },
          warningCount: 1
        }
      },
      readinessErrorMessage: "",
      reloadTopics: async () => undefined,
      remoteSyncBanner: null,
      removeTopicMapping: () => undefined,
      saveSettings: async () => undefined,
      saveTopicMappings: async () => undefined,
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
        updatedAt: "2026-05-20T10:06:00.000Z"
      },
      testConnection: async () => undefined,
      toggleWeatherField: () => undefined,
      topics: [
        {
          enabled: false,
          id: 1,
          lastReceivedAt: null,
          lastValue: null,
          metricKey: "realTimePower",
          nameZh: null,
          nameEn: null,
          quality: null,
          rawPayload: null,
          topic: "",
          unit: "kW",
          updatedAt: null,
          valuePath: "$.value"
        },
        {
          enabled: true,
          id: 2,
          lastReceivedAt: null,
          lastValue: null,
          metricKey: "todayGeneration",
          nameZh: null,
          nameEn: null,
          quality: null,
          rawPayload: null,
          topic: "kuozui/plant/solar/today_energy",
          unit: "kWh",
          updatedAt: "2026-05-20T10:05:00.000Z",
          valuePath: "$.value"
        }
      ],
      weatherOptions: createWeatherOptions(),
      weatherOptionsErrorMessage: "",
      weatherPreviewContract: createWeatherPreviewContract(),
      weatherPreviewErrorMessage: "",
      weatherSettings: createWeatherSettings(),
      refreshWeather: async () => undefined
    })
  );

  assert.match(html, /Mapping Gap/);
  assert.match(html, /Idle Runtime/);
  assert.match(html, /等待 topic 首次收值/);
  assert.doesNotMatch(html, /Runtime Readiness/);
  assert.doesNotMatch(html, /Display Readiness/);
});

test("mqtt settings content merges topic editing, runtime, and coverage into one workspace card", () => {
  const html = renderToStaticMarkup(
    React.createElement(MqttSettingsContent, {
      actionState: {
        isLoadingSettings: false,
        isLoadingTopics: false,
        isReloadingTopics: false,
        isSavingSettings: false,
        isSavingTopics: false,
        isTestingConnection: false
      },
      addTopicMapping: () => undefined,
      errorMessage: "",
      handleSettingChange: () => undefined,
      handleTopicChange: () => undefined,
      handleWeatherSettingChange: () => undefined,
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
      readiness: {
        findings: [
          {
            blocking: true,
            pageId: "overview",
            reason: "尚未設定 todayGeneration mapping。",
            requirementKey: "todayGeneration",
            sourceId: null,
            sourceType: "mqtt-metric",
            status: "blocking"
          }
        ],
        generatedAt: "2026-05-23T09:31:00.000Z",
        pages: [],
        summary: {
          blockingCount: 1,
          mqttCoverage: {
            blockingCount: 1,
            readyCount: 0
          },
          readyCount: 0,
          slotCoverage: {
            blockingCount: 0,
            readyCount: 0
          },
          warningCount: 0
        }
      },
      readinessErrorMessage: "",
      reloadTopics: async () => undefined,
      remoteSyncBanner: null,
      removeTopicMapping: () => undefined,
      saveSettings: async () => undefined,
      saveTopicMappings: async () => undefined,
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
        updatedAt: "2026-05-23T09:31:00.000Z"
      },
      testConnection: async () => undefined,
      toggleWeatherField: () => undefined,
      topics: [
        {
          enabled: true,
          id: 1,
          lastReceivedAt: "2026-05-23T09:29:00.000Z",
          lastValue: 580.1,
          metricKey: "realTimePower",
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
      weatherSettings: createWeatherSettings(),
      refreshWeather: async () => undefined
    })
  );

  assert.match(html, /data-mqtt-section="topic-workspace"/);
  assert.match(html, /data-mqtt-row="editable-topic-row"/);
  assert.match(html, /588.8/);
  assert.match(html, /尚未設定 todayGeneration mapping/);
  assert.doesNotMatch(html, /即時 Topic 清單/);
  assert.doesNotMatch(html, /即時資料預覽/);
});

test("mqtt settings content keeps editable rows readable when streaming falls back to polling", () => {
  const html = renderToStaticMarkup(
    React.createElement(MqttSettingsContent, {
      actionState: {
        isLoadingSettings: false,
        isLoadingTopics: false,
        isReloadingTopics: false,
        isSavingSettings: false,
        isSavingTopics: false,
        isTestingConnection: false
      },
      addTopicMapping: () => undefined,
      errorMessage: "",
      handleSettingChange: () => undefined,
      handleTopicChange: () => undefined,
      handleWeatherSettingChange: () => undefined,
      lastConnectionTest: null,
      liveMetricsConnectionState: "disconnected",
      liveMetricsSnapshot: {
        metrics: {},
        timestamp: null
      },
      message: "Topic mappings 已同步。",
      readiness: null,
      readinessErrorMessage: "",
      reloadTopics: async () => undefined,
      remoteSyncBanner: null,
      removeTopicMapping: () => undefined,
      saveSettings: async () => undefined,
      saveTopicMappings: async () => undefined,
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
        updatedAt: "2026-05-23T09:31:00.000Z"
      },
      testConnection: async () => undefined,
      toggleWeatherField: () => undefined,
      topics: [
        {
          enabled: true,
          id: 1,
          lastReceivedAt: "2026-05-23T09:29:00.000Z",
          lastValue: 580.1,
          metricKey: "realTimePower",
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
      weatherSettings: createWeatherSettings(),
      refreshWeather: async () => undefined
    })
  );

  assert.match(html, /Polling fallback/);
  assert.match(html, />Fallback</);
  assert.match(html, /value="kuozui\/plant\/solar\/power"/);
  assert.match(html, /value="kW"/);
  assert.match(html, /啟用 \(ON\)/);
  assert.match(html, /最後收值/);
  assert.match(html, /最後更新/);
});

test("mqtt settings content renders weather controls and preview inside the weather card", () => {
  const html = renderToStaticMarkup(
    React.createElement(MqttSettingsContent, {
      actionState: {
        isLoadingSettings: false,
        isLoadingTopics: false,
        isReloadingTopics: false,
        isSavingSettings: false,
        isSavingTopics: false,
        isTestingConnection: false
      },
      addTopicMapping: () => undefined,
      errorMessage: "",
      handleSettingChange: () => undefined,
      handleTopicChange: () => undefined,
      handleWeatherSettingChange: () => undefined,
      lastConnectionTest: null,
      liveMetricsConnectionState: "connected",
      liveMetricsSnapshot: {
        metrics: {},
        timestamp: null
      },
      message: "Weather settings 已同步。",
      readiness: null,
      readinessErrorMessage: "",
      reloadTopics: async () => undefined,
      remoteSyncBanner: null,
      removeTopicMapping: () => undefined,
      saveSettings: async () => undefined,
      saveTopicMappings: async () => undefined,
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
        updatedAt: "2026-05-23T09:31:00.000Z"
      },
      testConnection: async () => undefined,
      toggleWeatherField: () => undefined,
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
      }),
      refreshWeather: async () => undefined
    })
  );

  assert.match(html, /data-mqtt-section="weather-card"/);
  assert.match(html, /啟用天氣顯示/);
  assert.match(html, /板橋 多雲 30°C/);
  assert.match(html, /精簡/);
  assert.doesNotMatch(html, /field selection controls/i);
});

test("mqtt settings content keeps the latest bounded weather diagnostic visible and copyable", () => {
  const html = renderContent({
    weatherDiagnostic: createWeatherDiagnostic({
      code: "WEATHER_DNS_LOOKUP_FAILED",
      lastSuccessAt: "2026-05-23T06:20:00.000Z",
      occurredAt: "2026-05-23T06:22:00.000Z",
      operation: "options",
      retryable: true,
      safeSummary: "無法解析 CWA 主機名稱",
      state: "error"
    })
  });

  assert.match(html, /data-weather-diagnostic-state="error"/);
  assert.match(html, /WEATHER_DNS_LOOKUP_FAILED/);
  assert.match(html, /測站／縣市選項/);
  assert.match(html, /可重試/);
  assert.match(html, /無法解析 CWA 主機名稱/);
  assert.match(html, /data-weather-diagnostic-copy/);
  assert.doesNotMatch(html, /Authorization=/);
  assert.doesNotMatch(html, /internal\.example/);
});

test("Support manual weather refresh with source, stale state, and transport failure stage", () => {
  const upstreamHtml = renderContent({
    weatherDiagnostic: createWeatherDiagnostic({
      lastSuccessAt: "2026-05-23T06:20:00.000Z",
      occurredAt: "2026-05-23T06:20:00.000Z",
      operation: "current",
      safeSummary: "CWA 天氣資料取得成功",
      source: "upstream",
      state: "ok"
    })
  });
  assert.match(upstreamHtml, /data-weather-diagnostic-source="upstream"/);
  assert.match(upstreamHtml, /即時上游/);

  const cacheHtml = renderContent({
    weatherDiagnostic: createWeatherDiagnostic({
      lastSuccessAt: "2026-05-23T06:20:00.000Z",
      occurredAt: "2026-05-23T06:20:00.000Z",
      operation: "current",
      safeSummary: "CWA 天氣資料取得成功",
      source: "cache",
      state: "ok"
    })
  });
  assert.match(cacheHtml, /data-weather-diagnostic-source="cache"/);
  assert.match(cacheHtml, /快取資料/);

  const staleHtml = renderContent({
    weatherDiagnostic: createWeatherDiagnostic({
      code: "WEATHER_DNS_LOOKUP_FAILED",
      lastSuccessAt: "2026-05-23T06:20:00.000Z",
      occurredAt: "2026-05-23T06:22:00.000Z",
      operation: "current",
      retryable: true,
      safeSummary: "無法解析 CWA 主機名稱",
      source: "stale",
      state: "error"
    }),
    weatherPreviewContract: createWeatherPreviewContract({
      current: createWeatherCurrent({
        fetchState: "stale",
        staleAt: "2026-05-23T06:22:00.000Z"
      })
    })
  });
  assert.match(staleHtml, /data-weather-diagnostic-source="stale"/);
  assert.match(staleHtml, /data-weather-diagnostic-stage="dns"/);
  assert.match(staleHtml, /使用舊資料/);
  assert.match(staleHtml, /WEATHER_DNS_LOOKUP_FAILED/);
  assert.match(staleHtml, />DNS</);

  const unavailableHtml = renderContent({
    weatherDiagnostic: createWeatherDiagnostic({
      code: "WEATHER_CONNECTION_TIMEOUT",
      occurredAt: "2026-05-23T06:23:00.000Z",
      operation: "current",
      retryable: true,
      safeSummary: "CWA 連線逾時",
      source: "unavailable",
      state: "error"
    })
  });
  assert.match(unavailableHtml, /data-weather-diagnostic-source="unavailable"/);
  assert.match(unavailableHtml, /data-weather-diagnostic-stage="connect"/);
  assert.match(unavailableHtml, /無可用資料/);
  assert.match(unavailableHtml, /WEATHER_CONNECTION_TIMEOUT/);
});

test("mqtt settings refreshes weather diagnostics after options and manual current operations without page reload", () => {
  assert.match(mqttSettingsIndexSource, /getWeatherDiagnostics/);
  assert.match(
    mqttSettingsIndexSource,
    /getWeatherOptions[\s\S]{0,1800}finally[\s\S]{0,300}loadWeatherDiagnostic/
  );
  assert.match(
    mqttSettingsIndexSource,
    /const refreshWeather[\s\S]{0,1800}finally[\s\S]{0,300}loadWeatherDiagnostic/
  );
  assert.doesNotMatch(mqttSettingsIndexSource, /location\.reload/);
});

test("mqtt settings content exposes custom field controls and unavailable preview fallback", () => {
  const html = renderToStaticMarkup(
    React.createElement(MqttSettingsContent, {
      actionState: {
        isLoadingSettings: false,
        isLoadingTopics: false,
        isReloadingTopics: false,
        isSavingSettings: false,
        isSavingTopics: false,
        isTestingConnection: false
      },
      addTopicMapping: () => undefined,
      errorMessage: "",
      handleSettingChange: () => undefined,
      handleTopicChange: () => undefined,
      handleWeatherSettingChange: () => undefined,
      lastConnectionTest: null,
      liveMetricsConnectionState: "connected",
      liveMetricsSnapshot: {
        metrics: {},
        timestamp: null
      },
      message: "Weather settings 已同步。",
      readiness: null,
      readinessErrorMessage: "",
      reloadTopics: async () => undefined,
      remoteSyncBanner: null,
      removeTopicMapping: () => undefined,
      saveSettings: async () => undefined,
      saveTopicMappings: async () => undefined,
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
        updatedAt: "2026-05-23T09:31:00.000Z"
      },
      testConnection: async () => undefined,
      toggleWeatherField: () => undefined,
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
      }),
      refreshWeather: async () => undefined
    })
  );

  assert.match(html, /自訂欄位/);
  assert.match(html, /最高溫/);
  assert.match(html, /目前無法載入測站選項。/);
  assert.match(html, /目前無法取得 weather preview。/);
});

test("mqtt settings content surfaces a setup notice when the CWA weather source is unconfigured", () => {
  const html = renderToStaticMarkup(
    React.createElement(MqttSettingsContent, {
      actionState: {
        isLoadingSettings: false,
        isLoadingTopics: false,
        isReloadingTopics: false,
        isSavingSettings: false,
        isSavingTopics: false,
        isTestingConnection: false
      },
      addTopicMapping: () => undefined,
      errorMessage: "",
      handleSettingChange: () => undefined,
      handleTopicChange: () => undefined,
      handleWeatherSettingChange: () => undefined,
      lastConnectionTest: null,
      liveMetricsConnectionState: "connected",
      liveMetricsSnapshot: {
        metrics: {},
        timestamp: null
      },
      message: "Weather settings 已同步。",
      readiness: null,
      readinessErrorMessage: "",
      reloadTopics: async () => undefined,
      remoteSyncBanner: null,
      removeTopicMapping: () => undefined,
      saveSettings: async () => undefined,
      saveTopicMappings: async () => undefined,
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
        updatedAt: "2026-05-23T09:31:00.000Z"
      },
      testConnection: async () => undefined,
      toggleWeatherField: () => undefined,
      topics: [],
      weatherOptions: createWeatherOptions({
        counties: [],
        fetchState: "unconfigured",
        stations: [],
        updatedAt: null
      }),
      weatherOptionsErrorMessage: "",
      weatherPreviewContract: createWeatherPreviewContract({
        current: createWeatherCurrent({ fetchState: "unconfigured" })
      }),
      weatherPreviewErrorMessage: "",
      weatherSettings: createWeatherSettings({ enabled: true }),
      refreshWeather: async () => undefined
    })
  );

  assert.match(html, /mqtt-weather-card__config-notice/);
  assert.match(html, /CWA_AUTHORIZATION/);
});

test("mqtt settings content keeps draft state in status feedback without rendering extra guidance boards", () => {
  const html = renderToStaticMarkup(
    React.createElement(MqttSettingsContent, {
      actionState: {
        isLoadingSettings: false,
        isLoadingTopics: false,
        isReloadingTopics: false,
        isSavingSettings: false,
        isSavingTopics: false,
        isTestingConnection: false
      },
      addTopicMapping: () => undefined,
      draftSections: {
        broker: true,
        topic: true,
        weather: true
      },
      errorMessage: "",
      handleSettingChange: () => undefined,
      handleTopicChange: () => undefined,
      handleWeatherSettingChange: () => undefined,
      lastConnectionTest: null,
      liveMetricsConnectionState: "connected",
      liveMetricsSnapshot: {
        metrics: {},
        timestamp: null
      },
      message: "Topic mappings 已變更，尚未儲存。",
      readiness: {
        findings: [
          {
            blocking: true,
            pageId: "overview",
            reason: "尚未設定 todayGeneration mapping。",
            requirementKey: "todayGeneration",
            sourceId: null,
            sourceType: "mqtt-metric",
            status: "blocking"
          },
          {
            blocking: false,
            pageId: "solar",
            reason: "等待 topic 首次收值。",
            requirementKey: "realTimePower",
            sourceId: "realTimePower",
            sourceType: "mqtt-metric",
            status: "warning"
          }
        ],
        generatedAt: "2026-05-23T09:31:00.000Z",
        pages: [],
        summary: {
          blockingCount: 1,
          mqttCoverage: {
            blockingCount: 1,
            readyCount: 0
          },
          readyCount: 0,
          slotCoverage: {
            blockingCount: 0,
            readyCount: 0
          },
          warningCount: 1
        }
      },
      readinessErrorMessage: "",
      reloadTopics: async () => undefined,
      remoteSyncBanner: null,
      removeTopicMapping: () => undefined,
      saveSettings: async () => undefined,
      saveTopicMappings: async () => undefined,
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
        updatedAt: "2026-05-23T09:31:00.000Z"
      },
      testConnection: async () => undefined,
      toggleWeatherField: () => undefined,
      topics: [
        {
          enabled: true,
          id: 1,
          lastReceivedAt: null,
          lastValue: null,
          metricKey: "realTimePower",
          nameZh: null,
          nameEn: null,
          quality: null,
          rawPayload: null,
          topic: "kuozui/plant/solar/power",
          unit: "kW",
          updatedAt: "2026-05-23T09:28:00.000Z",
          valuePath: "$.value"
        },
        {
          enabled: true,
          id: 2,
          lastReceivedAt: "2026-05-23T09:30:00.000Z",
          lastValue: 1280,
          metricKey: "factoryProductionPower",
          nameZh: null,
          nameEn: null,
          quality: "good",
          rawPayload: "{\"value\":1280}",
          topic: "kuozui/factory/production/power",
          unit: "kW",
          updatedAt: "2026-05-23T09:29:00.000Z",
          valuePath: "$.value"
        }
      ],
      weatherOptions: createWeatherOptions(),
      weatherOptionsErrorMessage: "",
      weatherPreviewContract: createWeatherPreviewContract(),
      weatherPreviewErrorMessage: "",
      weatherSettings: createWeatherSettings({
        stationId: null
      }),
      refreshWeather: async () => undefined
    })
  );

  assert.match(html, /Topic mappings 已變更，尚未儲存/);
  assert.match(html, /請先選擇測站，才能確認 header 會顯示哪個站點。/);
  assert.doesNotMatch(html, /Broker 草稿待儲存/);
  assert.doesNotMatch(html, /Topic Workspace 有未儲存變更/);
  assert.doesNotMatch(html, /Display Impact Summary/);
  assert.doesNotMatch(html, /Overview · 今日發電量/);
  assert.doesNotMatch(html, /Header Contract 草稿待儲存/);
});

test("mqtt settings content renders update interval select and refresh button", () => {
  const html = renderToStaticMarkup(
    React.createElement(MqttSettingsContent, {
      actionState: {
        isLoadingSettings: false,
        isLoadingTopics: false,
        isReloadingTopics: false,
        isSavingSettings: false,
        isSavingTopics: false,
        isTestingConnection: false,
        isRefreshingWeather: false
      },
      addTopicMapping: () => undefined,
      errorMessage: "",
      handleSettingChange: () => undefined,
      handleTopicChange: () => undefined,
      handleWeatherSettingChange: () => undefined,
      lastConnectionTest: null,
      liveMetricsConnectionState: "connected",
      liveMetricsSnapshot: { metrics: {}, timestamp: null },
      message: "",
      readiness: null,
      readinessErrorMessage: "",
      reloadTopics: async () => undefined,
      remoteSyncBanner: null,
      removeTopicMapping: () => undefined,
      saveSettings: async () => undefined,
      saveTopicMappings: async () => undefined,
      settings: {
        clientId: "",
        dataMode: "mqtt",
        host: "",
        messageTimeout: "",
        password: "",
        port: "",
        reconnectInterval: "",
        username: ""
      },
      status: { broker: "", clientId: "", connected: false, reason: null, updatedAt: null },
      testConnection: async () => undefined,
      toggleWeatherField: () => undefined,
      topics: [],
      weatherOptions: createWeatherOptions(),
      weatherOptionsErrorMessage: "",
      weatherPreviewContract: createWeatherPreviewContract(),
      weatherPreviewErrorMessage: "",
      weatherSettings: createWeatherSettings({
        updateIntervalMinutes: 60
      }),
      refreshWeather: async () => undefined
    })
  );

  assert.match(html, /更新頻率/);
  assert.match(html, /立即更新/);
  assert.match(html, /value="60"/);
});
