import assert from "node:assert/strict";
import test from "node:test";
import type { LiveMetricsSnapshot } from "../../services/socket";
import { buildOverviewViewModel } from "./viewModel";

const snapshot: LiveMetricsSnapshot = {
  metrics: {
    realTimePower: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "kW",
      value: 612.4
    },
    todayGeneration: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "kWh",
      value: 3842
    }
  },
  timestamp: "2026-05-13T10:00:00.000Z"
};

test("buildOverviewViewModel prefers live metrics when socket data is available", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot
  });

  assert.equal(model.metrics.length, 5);
  assert.equal(model.metrics[0]?.value, "612");
  assert.equal(model.metrics[0]?.unit, "kW");
  assert.equal(model.metrics[0]?.iconKey, "bolt");
  assert.match(model.metrics[0]?.helper ?? "", /最後更新/);
  assert.equal(model.metrics[1]?.value, "3,842");
});

test("buildOverviewViewModel falls back to mock presentation when live metrics are unavailable", () => {
  const model = buildOverviewViewModel({
    connectionState: "disconnected",
    isSocketConnected: false,
    snapshot: {
      metrics: {},
      timestamp: null
    }
  });

  assert.equal(model.metrics[0]?.label, "即時發電功率");
  assert.equal(model.metrics[0]?.value, "586");
  assert.equal(model.metrics[4]?.iconKey, "leaf");
  assert.equal(model.summary.statusLabel, "Socket 未連線，顯示 mock 資料");
});

test("buildOverviewViewModel supports declarative KPI bindings and summary diagnostics", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    now: "2026-05-13T10:30:00.000Z",
    snapshot: {
      metrics: {
        totalGeneration: {
          quality: "good",
          timestamp: "2026-05-13T09:10:00.000Z",
          unit: "kWh",
          value: 18642
        },
        todayGeneration: {
          quality: "good",
          timestamp: "2026-05-13T10:28:00.000Z",
          unit: "kWh",
          value: 3842
        }
      },
      timestamp: "2026-05-13T10:28:00.000Z"
    },
    metricBindings: [
      {
        fallbackIndex: 2,
        iconKey: "bars",
        label: "累積發電量",
        metricKey: "totalGeneration",
        unit: "kWh"
      },
      {
        fallbackIndex: 1,
        iconKey: "sun",
        label: "今日發電量",
        metricKey: "todayGeneration",
        unit: "kWh"
      }
    ],
    summaryMetricKeys: ["totalGeneration", "todayGeneration"]
  });

  assert.equal(model.metrics.length, 2);
  assert.equal(model.metrics[0]?.label, "累積發電量");
  assert.equal(model.metrics[0]?.bindingState, "bound");
  assert.equal(model.metrics[0]?.freshnessState, "stale");
  assert.equal(model.metrics[0]?.fallbackReason, "stale-data");
  assert.equal(model.summary.alertTone, "warning");
  assert.equal(model.summary.fallbackReason, "stale-data");
  assert.equal(model.summary.statusLabel, "資料延遲，摘要使用最近一次有效讀值");
});

test("buildOverviewViewModel prefers display-story overview bindings when story data is fresh enough", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot: {
      metrics: {
        realTimePower: {
          quality: "good",
          timestamp: "2026-05-13T10:00:00.000Z",
          unit: "kW",
          value: 612.4
        },
        todayGeneration: {
          quality: "good",
          timestamp: "2026-05-13T10:00:00.000Z",
          unit: "kWh",
          value: 3842
        },
        totalGeneration: {
          quality: "good",
          timestamp: "2026-05-13T10:00:00.000Z",
          unit: "MWh",
          value: 18.6
        }
      },
      timestamp: "2026-05-13T10:00:00.000Z"
    },
    storyOverview: {
      metrics: [
        { fallbackIndex: 2, label: "故事版累積發電量", metricKey: "totalGeneration", unit: "MWh" },
        { fallbackIndex: 0, label: "故事版即時功率", metricKey: "realTimePower", unit: "kW" },
        { fallbackIndex: 1, label: "故事版今日發電量", metricKey: "todayGeneration", unit: "kWh" }
      ],
      summary: {
        alertTone: "normal",
        bindingState: "bound",
        fallbackReason: null,
        freshnessState: "fresh"
      }
    }
  });

  assert.equal(model.metrics.length, 5);
  assert.equal(model.metrics[0]?.label, "故事版即時功率");
  assert.equal(model.metrics[0]?.iconKey, "bolt");
  assert.equal(model.metrics[1]?.label, "故事版今日發電量");
  assert.equal(model.metrics[2]?.label, "故事版累積發電量");
  assert.equal(model.metrics[2]?.unit, "MWh");
  assert.equal(model.metrics[3]?.label, "今日 CO₂ 減量");
  assert.equal(model.summary.alertTone, "normal");
  assert.equal(model.summary.statusLabel, "Socket 即時更新中");
});

test("buildOverviewViewModel keeps display-story overview bindings when story summary is stale", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot,
    storyOverview: {
      metrics: [
        { fallbackIndex: 0, label: "故事版即時功率", metricKey: "realTimePower", unit: "kW" },
        { fallbackIndex: 1, label: "故事版今日發電量", metricKey: "todayGeneration", unit: "kWh" },
        { fallbackIndex: 2, label: "故事版累積發電量", metricKey: "totalGeneration", unit: "GWh" }
      ],
      summary: {
        alertTone: "warning",
        bindingState: "bound",
        fallbackReason: "stale-data",
        freshnessState: "stale"
      }
    }
  });

  assert.equal(model.metrics[0]?.label, "故事版即時功率");
  assert.equal(model.metrics[2]?.label, "故事版累積發電量");
  assert.equal(model.summary.alertTone, "warning");
  assert.equal(model.summary.fallbackReason, "stale-data");
  assert.equal(model.summary.statusLabel, "資料延遲，摘要使用最近一次有效讀值");
});

test("buildOverviewViewModel keeps socket bindings when display-story request failed", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot
  });

  assert.equal(model.metrics[0]?.label, "即時發電功率");
  assert.equal(model.metrics[1]?.label, "今日發電量");
  assert.equal(model.summary.statusLabel, "部分 KPI 缺資料，使用 fallback 顯示");
});
