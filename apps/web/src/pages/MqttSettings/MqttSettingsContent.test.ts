import assert from "node:assert/strict";
import test from "node:test";
import type { WeatherCurrentSnapshot, WeatherHeaderContract, WeatherOptionsResponse, WeatherSettings } from "@solar-display/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MqttSettingsContent } from "./MqttSettingsContent";

function createWeatherSettings(overrides: Partial<WeatherSettings> = {}): WeatherSettings {
  return {
    countyName: "臺北市",
    enabled: true,
    fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
    locationMode: "station",
    preset: "standard",
    stationId: "C0I080",
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
      weatherSettings: createWeatherSettings()
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
    })
  );

  assert.match(html, /data-mqtt-section="weather-card"/);
  assert.match(html, /啟用天氣顯示/);
  assert.match(html, /板橋 多雲 30°C/);
  assert.match(html, /精簡/);
  assert.doesNotMatch(html, /field selection controls/i);
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
          preset: "custom"
        }
      }),
      weatherPreviewErrorMessage: "目前無法取得 weather preview。",
      weatherSettings: createWeatherSettings({
        fieldKeys: ["weather", "dailyHigh"],
        preset: "custom",
        stationId: null
      })
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
      weatherSettings: createWeatherSettings({ enabled: true })
    })
  );

  assert.match(html, /mqtt-weather-card__config-notice/);
  assert.match(html, /CWA_AUTHORIZATION/);
});
