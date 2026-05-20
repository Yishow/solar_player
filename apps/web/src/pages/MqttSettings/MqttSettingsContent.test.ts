import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MqttSettingsContent } from "./MqttSettingsContent";

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
      ]
    })
  );

  assert.match(html, /Mapping Gap/);
  assert.match(html, /Idle Runtime/);
  assert.match(html, /等待 topic 首次收值/);
});
