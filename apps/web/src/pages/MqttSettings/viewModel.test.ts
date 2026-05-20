import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayReadinessReport } from "@solar-display/shared";
import { buildMqttSettingsViewModel } from "./viewModel";

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
        quality: null,
        rawPayload: null,
        topic: "kuozui/plant/solar/today_energy",
        unit: "kWh",
        updatedAt: null,
        valuePath: "$.value"
      }
    ]
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
    topics: []
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
    topics: []
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
        quality: "good",
        rawPayload: "{\"value\":586.2}",
        topic: "kuozui/plant/solar/power",
        unit: "kW",
        updatedAt: "2026-05-20T10:05:00.000Z",
        valuePath: "$.value"
      }
    ]
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
        pageId: "overview",
        reason: "等待 topic 首次收值。",
        requirementKey: "realTimePower",
        sourceId: "realTimePower",
        sourceType: "mqtt-metric",
        status: "warning"
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
        quality: null,
        rawPayload: null,
        topic: "kuozui/plant/solar/power",
        unit: "kW",
        updatedAt: "2026-05-20T10:05:00.000Z",
        valuePath: "$.value"
      }
    ]
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
  assert.equal(disconnectedModel.liveTopicRows[0]?.runtimeLabel, "Disconnected");
  assert.equal(disconnectedModel.runtimePreview.statusLabel, "串流不可用");
});
