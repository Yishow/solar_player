import assert from "node:assert/strict";
import test from "node:test";
import { buildDeviceStatusViewModel } from "./viewModel";

test("buildDeviceStatusViewModel formats system info, resource gauges, and maintenance feedback", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: {
      detail: "Cache cleared (stub).",
      tone: "ready",
      title: "清除快取完成"
    },
    isLoading: false,
    status: {
      arch: "arm64",
      cpu: { cores: 4, loadAvg: [0.18, 0.32, 0.4] },
      disk: { availableMB: 40000, totalMB: 64000, usePercent: 35, usedMB: 24000 },
      hostname: "KZ-Display-01",
      memory: { freeMB: 4600, totalMB: 8000, usePercent: 42, usedMB: 3400 },
      nodeVersion: "v24.15.0",
      pid: 1234,
      platform: "linux",
      uptimeSeconds: 1315800
    }
  });

  assert.equal(model.systemRows[0]?.label, "裝置名稱");
  assert.equal(model.systemRows[0]?.value, "KZ-Display-01");
  assert.equal(model.systemRows[3]?.value, "15 天 5 時");
  assert.equal(model.runtimeSummary.title, "正常運作");
  assert.equal(model.resourceCards[0]?.label, "CPU 負載");
  assert.equal(model.resourceCards[0]?.valueLabel, "0.18");
  assert.match(model.resourceCards[0]?.helper ?? "", /1m \/ 5m \/ 15m/);
  assert.match(model.feedback.title, /清除快取完成/);
  assert.equal(model.networkRows[0]?.value, "● 裝置狀態已同步");
});

test("buildDeviceStatusViewModel keeps loading and empty fallbacks readable", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: null,
    isLoading: true,
    status: null
  });

  assert.equal(model.feedback.title, "正在同步裝置狀態");
  assert.equal(model.runtimeSummary.title, "同步中");
  assert.equal(model.systemRows[0]?.value, "-");
  assert.equal(model.resourceCards[3]?.valueLabel, "--");
});

test("buildDeviceStatusViewModel shows failed runtime summary when status cannot be loaded", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: {
      detail: "載入裝置狀態失敗。",
      title: "同步失敗",
      tone: "error"
    },
    isLoading: false,
    status: null
  });

  assert.equal(model.runtimeSummary.title, "同步失敗");
  assert.equal(model.networkRows[0]?.value, "未取得狀態");
  assert.equal(model.networkRows[1]?.value, "需待裝置狀態恢復後確認");
});
