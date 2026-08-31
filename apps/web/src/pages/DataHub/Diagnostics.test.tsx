import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataHubDiagnosticsContent } from "./Diagnostics";
import type { DataHubDiagnosticsModel, DataHubMonitoringDiagnosticsModel } from "./DiagnosticsModel";

const model: DataHubDiagnosticsModel = {
  edges: [
    { from: "source-connection:central-mqtt", kind: "produces", to: "mqtt-topic:cl:factory/cl/power" },
    { from: "mqtt-topic:cl:factory/cl/power", kind: "produces", to: "semantic-metric:cl:realTimePower" },
    { from: "semantic-metric:cl:realTimePower", kind: "used-by", to: "consumer:widget:overviewPower:10" }
  ],
  generatedAt: "2026-08-31T03:00:00.000Z",
  maxDepth: 4,
  maxNodes: 100,
  metricKey: "realTimePower",
  nodes: [
    {
      category: "source-connection",
      id: "source-connection:central-mqtt",
      label: "Central MQTT broker",
      metadata: { connectionType: "mqtt", credentials: "broker-user:super-secret" },
      scope: null,
      status: "configured"
    },
    {
      category: "mqtt-topic",
      id: "mqtt-topic:cl:factory/cl/power",
      label: "factory/cl/power",
      metadata: {
        sourceClass: "mqtt-live",
        topic: { credentials: "broker-user:super-secret" } as unknown as string,
        rawException: "raw exception with password"
      },
      scope: "cl",
      status: "configured"
    },
    {
      category: "semantic-metric",
      id: "semantic-metric:cl:realTimePower",
      label: "目前功率",
      metadata: {
        metricKey: "realTimePower",
        value: { credentials: "value-secret" } as unknown as number,
        unit: "kW"
      },
      scope: "cl",
      status: "live"
    }
  ],
  scope: "cl",
  truncated: true
};

const monitoring: DataHubMonitoringDiagnosticsModel = {
  generatedAt: "2026-08-31T03:00:00.000Z",
  requestedScope: "all",
  summaries: [
    {
      anomalyMessages: ["尚無今日 snapshot，最新資料停留在 2026-08-30。"],
      currentDaySnapshotCount: 0,
      hasCurrentDaySnapshots: false,
      latestSnapshotAt: "2026-08-30 10:00:00",
      latestSnapshotDate: "2026-08-30",
      localDate: "2026-08-31",
      metricScope: "cl",
      snapshotCount: 1,
      snapshotSampleLimit: 2000
    },
    {
      anomalyMessages: [],
      currentDaySnapshotCount: 2,
      hasCurrentDaySnapshots: true,
      latestSnapshotAt: "2026-08-31 11:00:00",
      latestSnapshotDate: "2026-08-31",
      localDate: "2026-08-31",
      metricScope: "kn",
      snapshotCount: 2,
      snapshotSampleLimit: 2000
    },
    {
      anomalyMessages: ["偵測到 22:00 夜間高發電 snapshot。"],
      currentDaySnapshotCount: 1,
      hasCurrentDaySnapshots: true,
      latestSnapshotAt: "2026-08-31 22:00:00",
      latestSnapshotDate: "2026-08-31",
      localDate: "2026-08-31",
      metricScope: "global",
      snapshotCount: 1,
      snapshotSampleLimit: 2000
    }
  ]
};

function renderContent(props: Parameters<typeof DataHubDiagnosticsContent>[0]) {
  return renderToStaticMarkup(<DataHubDiagnosticsContent {...props} />);
}

test("Diagnostics renders distinct allowlisted node and edge data with bounded warning", () => {
  const html = renderContent({ model });

  assert.equal((html.match(/data-provenance-node-id=/g) ?? []).length, 3);
  assert.equal((html.match(/data-provenance-edge=/g) ?? []).length, 3);
  assert.match(html, /data-provenance-node-category="source-connection"/);
  assert.match(html, /data-provenance-node-scope="cl"/);
  assert.match(html, /data-provenance-node-status="live"/);
  assert.match(html, /Central MQTT broker/);
  assert.match(html, /目前功率/);
  assert.match(html, /produces/);
  assert.match(html, /used-by/);
  assert.match(html, /data-provenance-truncated/);
  assert.match(html, /4.*100|100.*4/);
  assert.doesNotMatch(html, /broker-user|super-secret|value-secret|rawException|raw exception|credentials|\[object Object\]/);
  assert.doesNotMatch(html, /\{"connectionType"|\[object Object\]/);
});

test("Diagnostics keeps selection, loading, empty, and error feedback local", () => {
  const selection = renderContent({
    selectionMessage: "請輸入 metricKey 並選擇 CL、KN 或 Global scope。",
    model: null
  });
  const loading = renderContent({ model: null });
  const empty = renderContent({ model: { ...model, edges: [], nodes: [], truncated: false } });
  const error = renderContent({ errorMessage: "Diagnostics failed", model: null });

  assert.match(selection, /role="status"/);
  assert.match(selection, /metricKey/);
  assert.match(loading, /role="status"/);
  assert.match(loading, /載入/);
  assert.match(empty, /role="status"/);
  assert.match(empty, /沒有 provenance/);
  assert.match(error, /role="alert"/);
  assert.match(error, /Diagnostics failed/);
});

test("Diagnostics renders separate CL KN and Global monitoring day summaries", () => {
  const html = renderContent({ model: null, monitoring });

  assert.equal((html.match(/data-monitoring-summary-scope=/g) ?? []).length, 3);
  assert.match(html, /data-monitoring-summary-scope="cl"/);
  assert.match(html, /data-monitoring-summary-scope="kn"/);
  assert.match(html, /data-monitoring-summary-scope="global"/);
  assert.match(html, /CL/);
  assert.match(html, /KN/);
  assert.match(html, /Global/);
  assert.match(html, /今日尚無 snapshots/);
  assert.match(html, /今日 snapshots[：:]? 2/);
  assert.match(html, /尚無今日 snapshot/);
  assert.match(html, /22:00/);
  assert.match(html, /examined|檢查最近最多 2000 筆/i);
  assert.doesNotMatch(html, /Scope snapshot count/);
  assert.match(html, /scope=all|全部/);
  assert.doesNotMatch(html, /重設今日曲線/);
});

test("Diagnostics shows a concrete-scope reset action with explicit scope confirmation", () => {
  const html = renderContent({
    model: null,
    monitoring: {
      ...monitoring,
      requestedScope: "cl",
      summaries: [monitoring.summaries[0]!]
    },
    requestedScope: "cl"
  });

  assert.match(html, /重設今日曲線/);
  assert.match(html, /data-monitoring-reset-scope="cl"/);
  assert.match(html, /只會刪除 CL 今日 monitoring snapshots/);
});

test("Monitoring diagnostics errors stay local while provenance remains visible", () => {
  const html = renderContent({
    model,
    monitoring: null,
    monitoringErrorMessage: "Monitoring diagnostics failed"
  });

  assert.match(html, /Monitoring diagnostics failed/);
  assert.match(html, /Provenance nodes/);
});

test("Diagnostics exposes a GET metric and concrete scope selection form", () => {
  const html = renderContent({ model, selection: { metricKey: "realTimePower", scope: "cl" } });

  assert.match(html, /<form [^>]*method="get"/);
  assert.match(html, /name="metricKey"/);
  assert.match(html, /value="realTimePower"/);
  assert.match(html, /name="scope"/);
  assert.match(html, /value="cl"/);
  assert.match(html, /value="kn"/);
  assert.match(html, /value="global"/);
  assert.doesNotMatch(html, /<option value="all"/);
});

test("Diagnostics exposes the retained Data Source operations entry point", () => {
  const html = renderContent({ model });

  assert.match(html, /href="\/settings\/data-hub\/diagnostics\/operations"/);
  assert.match(html, /進階資料維運/);
});
