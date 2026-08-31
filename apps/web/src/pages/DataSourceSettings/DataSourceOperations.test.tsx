import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CalculationSettings, DataSourceOverviewResponse } from "../../services/api";
import {
  buildDataSourceSettingsViewModel,
  createCalculationSettingsForm
} from "./viewModel";
import { DataSourceOperations } from "./DataSourceOperations";
import { DataSourceOperationsView } from "./DataSourceOperationsView";

const operationsSource = readFileSync(path.join(import.meta.dirname, "DataSourceOperations.tsx"), "utf8");
const operationsViewSource = readFileSync(
  path.join(import.meta.dirname, "DataSourceOperationsView.tsx"),
  "utf8"
);

test("Data Source operations export is a lazy, non-scaffolded management surface", () => {
  const html = renderToStaticMarkup(React.createElement(DataSourceOperations));

  assert.match(operationsSource, /export async function loadDataSourceOperationsRoute\(\)/u);
  assert.match(operationsSource, /Promise\.allSettled\(\[/u);
  assert.doesNotMatch(operationsSource, /PageScaffold|DerivedMetricRegistryPanel/u);
  assert.doesNotMatch(html, /Reset Today Trend|重設今日曲線|衍生指標 Registry/u);
  assert.match(html, /進階資料維運/u);
});

test("Data Source operations keeps the legacy calculation and month reset contracts", () => {
  assert.match(operationsSource, /getCalculationSettings\(\)/u);
  assert.match(operationsSource, /updateCalculationSettings\(/u);
  assert.match(operationsSource, /co2AutoConvertSmallToKg/u);
  assert.match(operationsSource, /resetMonthTrend\("global"\)/u);
  assert.match(operationsViewSource, /viewModel\.sections\.map/u);
  assert.match(operationsViewSource, /viewModel\.recommendations\.map/u);
  assert.match(operationsViewSource, /viewModel\.relatedActions\.map/u);
});

function createOverview(): DataSourceOverviewResponse {
  return {
    browserLocalCache: { description: "Browser cache remains local.", status: "browser-managed" },
    generatedAt: "2026-08-31T00:00:00.000Z",
    mqtt: {
      dataMode: "mqtt",
      host: "mqtt.local",
      password: "configured",
      port: 1883,
      status: "ready",
      username: "configured"
    },
    monitoring: {
      anomalyMessages: ["scope anomaly"],
      hasCurrentDaySnapshots: false,
      latestSnapshotAt: "2026-08-30T00:00:00.000Z",
      latestSnapshotDate: "2026-08-30",
      localDate: "2026-08-31",
      metricScope: "global"
    },
    recommendations: [{
      description: "Export runtime state",
      status: "recommended",
      title: "Runtime state export"
    }],
    relatedRoutes: [{ category: "uploads", label: "圖片管理", path: "/settings/images" }],
    retention: {
      dailySummaryRetentionDays: 1825,
      metricSnapshotRetentionDays: 90,
      status: "ready",
      vacuumEnabled: true
    },
    runtimeStorage: {
      brandUploadsDir: "/data/uploads/brand",
      dataDir: "/data",
      databasePath: "/data/solar.sqlite",
      status: "ready",
      uploadsDir: "/data/uploads/images"
    },
    sqlite: {
      databasePath: "/data/solar.sqlite",
      status: "ready",
      tableCounts: { metric_snapshots: 1 }
    },
    uploads: {
      brandUploads: { dir: "/data/uploads/brand", fileCount: 1, status: "ready", totalBytes: 1024 },
      imageUploads: { dir: "/data/uploads/images", fileCount: 2, status: "ready", totalBytes: 2048 },
      status: "ready"
    },
    warnings: [],
    weather: {
      cwaAuthorization: "configured",
      openDataUrl: "https://weather.invalid",
      requestTimeoutMs: 5000,
      status: "ready"
    }
  };
}

test("Data Source operations renders scoped runtime controls without migrated sections", () => {
  const settings: CalculationSettings = {
    carbonEmissionFactor: 0.467,
    co2AutoConvertSmallToKg: false,
    estimatedTariffPerKwh: 4.5,
    householdDailyUsageKwh: 13,
    householdMonthlyUsageKwh: 400,
    treeEquivalentFactor: 0.16
  };
  const viewModel = buildDataSourceSettingsViewModel({
    calculationSettings: settings,
    calculationSettingsDraft: createCalculationSettingsForm(settings),
    calculationSettingsState: "ready",
    overview: createOverview(),
    state: "ready"
  });
  const html = renderToStaticMarkup(
    <DataSourceOperationsView
      onCalculationSettingChange={() => undefined}
      onResetMonthTrend={() => undefined}
      onResetTodayTrend={() => undefined}
      onSaveCalculationSettings={() => undefined}
      showTodayReset={false}
      viewModel={viewModel}
    />
  );

  for (const label of ["Runtime SQLite", "圖片上傳", "歷史保留", "瀏覽器暫存", "Runtime state export", "圖片管理", "scope anomaly", "Reset Month Trend"]) {
    assert.match(html, new RegExp(label, "u"));
  }
  assert.doesNotMatch(html, /Reset Today Trend|衍生指標 Registry/u);
});
