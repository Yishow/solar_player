import assert from "node:assert/strict";
import test from "node:test";
import { buildMqttSettingsViewModel } from "./viewModel";

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
      connected: true
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
    message: "測試連線失敗。",
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
      connected: false
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
    message: "Broker 設定已變更，尚未儲存。",
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
      connected: false
    },
    topics: []
  });

  assert.equal(model.connection.statusLabel, "Broker 未連線");
  assert.equal(model.feedbackBanner.title, "Test connection 成功");
  assert.equal(model.feedbackBanner.detail, "Connected successfully");
  assert.equal(model.feedbackBanner.tone, "ready");
  assert.equal(model.feedbackBanner.visualTone, "success");
});
