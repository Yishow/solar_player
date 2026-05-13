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

  assert.equal(model.metrics[0]?.label, "即時功率");
  assert.equal(model.metrics[0]?.value, "586");
  assert.equal(model.summary.statusLabel, "Socket 未連線，顯示 mock 資料");
});
