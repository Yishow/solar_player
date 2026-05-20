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
    displayOpsSummary: {
      alerts: [
        {
          code: "asset-unhealthy",
          message: "overview live asset missing",
          pageId: "overview",
          severity: "blocking"
        }
      ],
      assetHealthSummary: {
        affectedPages: ["overview"],
        unhealthyCount: 1
      },
      degraded: true,
      diagnosticActions: [
        { action: "refresh-readiness", label: "Refresh readiness" },
        { action: "export-summary", label: "Export summary" }
      ],
      draftCount: 2,
      generatedAt: "2026-05-18T09:30:00.000Z",
      lastPublishAt: "2026-05-18T08:45:00.000Z",
      liveVersion: 14,
      readinessSummary: {
        blockingCount: 3,
        warningCount: 0
      },
      skipSummary: {
        count: 1,
        pages: ["overview"]
      }
    },
    isLoading: false,
    logExport: {
      directory: "/var/log/solar-display",
      files: ["server.log", "worker.log"]
    },
    logExportError: "",
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
  assert.equal(model.resourceCards[0]?.gaugePercent, 18);
  assert.match(model.resourceCards[0]?.helper ?? "", /1m \/ 5m \/ 15m/);
  assert.equal(model.resourceCards[3]?.valueLabel, "Unavailable");
  assert.equal(model.resourceCards[3]?.helper, "目前無可信溫度量測來源");
  assert.match(model.feedback.title, /清除快取完成/);
  assert.equal(model.networkRows[0]?.value, "● 管理通道可達");
  assert.equal(model.networkRows[1]?.value, "目前無可信訊號強度量測");
  assert.equal(model.displayOpsSummary.statusTitle, "展示退化");
  assert.equal(model.displayOpsSummary.liveVersion, "v14");
  assert.equal(model.displayOpsSummary.lastPublishLabel, "2026-05-18 08:45");
  assert.equal(model.displayOpsSummary.assetHealthLabel, "1 unhealthy");
  assert.equal(model.displayOpsSummary.alerts[0]?.message, "overview live asset missing");
  assert.equal(model.displayOpsSummary.diagnostics[0]?.action, "refresh-readiness");
  assert.equal(model.logsSummary.statusTitle, "最近日誌");
  assert.equal(model.logsSummary.fileCountLabel, "2 files");
  assert.match(model.logsSummary.detail, /server\.log/);
});

test("buildDeviceStatusViewModel keeps loading and empty fallbacks readable", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: null,
    isLoading: true,
    logExport: null,
    logExportError: "",
    status: null
  });

  assert.equal(model.feedback.title, "正在同步裝置狀態");
  assert.equal(model.runtimeSummary.title, "同步中");
  assert.equal(model.systemRows[0]?.value, "-");
  assert.equal(model.resourceCards[3]?.valueLabel, "--");
  assert.equal(model.resourceCards[3]?.gaugePercent, 0);
});

test("buildDeviceStatusViewModel shows failed runtime summary when status cannot be loaded", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: {
      detail: "載入裝置狀態失敗。",
      title: "同步失敗",
      tone: "error"
    },
    isLoading: false,
    logExport: null,
    logExportError: "No logs directory",
    status: null
  });

  assert.equal(model.runtimeSummary.title, "同步失敗");
  assert.equal(model.networkRows[0]?.value, "● 未連線");
  assert.equal(model.networkRows[1]?.value, "需待裝置狀態恢復後確認");
  assert.equal(model.logsSummary.statusTitle, "日誌不可用");
  assert.equal(model.logsSummary.fileCountLabel, "Unavailable");
});
