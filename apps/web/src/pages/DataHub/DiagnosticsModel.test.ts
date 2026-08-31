import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMonitoringDiagnosticsPath,
  buildMonitoringResetFeedback,
  buildMonitoringResetConfirmationMessage,
  buildMetricProvenancePath,
  canResetMonitoringSummary,
  loadDataHubDiagnosticsRoute,
  normalizeMetricProvenance,
  resetMonitoringTodayTrend,
  resolveMonitoringScope,
  resolveDiagnosticsSelection,
  type MetricProvenanceResponse
} from "./DiagnosticsModel";
import { buildApiUrl } from "../../services/api";

const response: MetricProvenanceResponse = {
  edges: [
    { from: "mqtt-topic:cl:factory/cl/power", kind: "produces", to: "semantic-metric:cl:realTimePower" },
    { from: "semantic-metric:cl:realTimePower", kind: "used-by", to: "consumer:widget:overviewPower:10" }
  ],
  generatedAt: "2026-08-31T03:00:00.000Z",
  maxDepth: 4,
  maxNodes: 100,
  metricKey: "realTimePower",
  nodes: [
    {
      category: "semantic-metric",
      id: "semantic-metric:cl:realTimePower",
      label: "目前功率",
      metadata: { metricKey: "realTimePower", value: 12, unexpected: "must not render" },
      scope: "cl",
      status: "live"
    },
    {
      category: "mqtt-topic",
      id: "mqtt-topic:cl:factory/cl/power",
      label: "factory/cl/power",
      metadata: { sourceClass: "mqtt-live", topic: "factory/cl/power" },
      scope: "cl",
      status: "configured"
    }
  ],
  scope: "cl",
  truncated: true
};

const monitoringResponse = {
  generatedAt: "2026-08-31T03:00:00.000Z",
  requestedScope: "all" as const,
  summaries: [
    {
      anomalyMessages: ["尚無今日 snapshot，最新資料停留在 2026-08-30。"],
      currentDaySnapshotCount: 0,
      hasCurrentDaySnapshots: false,
      latestSnapshotAt: "2026-08-30 10:00:00",
      latestSnapshotDate: "2026-08-30",
      localDate: "2026-08-31",
      metricScope: "cl" as const,
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
      metricScope: "kn" as const,
      snapshotCount: 2,
      snapshotSampleLimit: 2000
    },
    {
      anomalyMessages: [],
      currentDaySnapshotCount: 1,
      hasCurrentDaySnapshots: true,
      latestSnapshotAt: "2026-08-31 12:00:00",
      latestSnapshotDate: "2026-08-31",
      localDate: "2026-08-31",
      metricScope: "global" as const,
      snapshotCount: 1,
      snapshotSampleLimit: 2000
    }
  ]
};

test("Diagnostics selection requires a trimmed metric key and concrete scope", () => {
  assert.deepEqual(
    resolveDiagnosticsSelection("https://display.local/settings/data-hub/diagnostics?metricKey=%20realTimePower%20&scope=cl"),
    { metricKey: "realTimePower", scope: "cl" }
  );
  assert.equal(
    resolveDiagnosticsSelection("https://display.local/settings/data-hub/diagnostics?metricKey=realTimePower&scope=all"),
    null
  );
  assert.equal(
    resolveDiagnosticsSelection("https://display.local/settings/data-hub/diagnostics?metricKey=&scope=kn"),
    null
  );
});

test("Monitoring diagnostics resolves management scope and keeps all as a read-only view", () => {
  assert.equal(resolveMonitoringScope("https://display.local/settings/data-hub/diagnostics?scope=all"), "all");
  assert.equal(resolveMonitoringScope("https://display.local/settings/data-hub/diagnostics?scope=kn"), "kn");
  assert.equal(resolveMonitoringScope("https://display.local/settings/data-hub/diagnostics"), "all");
  assert.equal(
    buildMonitoringDiagnosticsPath("https://display.local/settings/data-hub/diagnostics?scope=all"),
    "/api/data-source/monitoring-diagnostics?metricScope=all"
  );
});

test("Monitoring reset is available only when requested scope and summary scope are the same concrete identity", () => {
  const allModel = {
    generatedAt: monitoringResponse.generatedAt,
    requestedScope: "all" as const,
    summaries: monitoringResponse.summaries
  };
  const concreteSummary = monitoringResponse.summaries[0]!;
  assert.equal(canResetMonitoringSummary(allModel, concreteSummary), false);

  const concreteModel = {
    generatedAt: monitoringResponse.generatedAt,
    requestedScope: "cl" as const,
    summaries: [concreteSummary]
  };
  assert.equal(canResetMonitoringSummary(concreteModel, concreteSummary), true);
  assert.equal(canResetMonitoringSummary(concreteModel, monitoringResponse.summaries[1]!), false);
  assert.match(buildMonitoringResetConfirmationMessage("cl"), /CL/);
  assert.match(buildMonitoringResetConfirmationMessage("cl"), /只會刪除.*今日.*monitoring snapshots/);
});

test("resetMonitoringTodayTrend reloads the same concrete monitoring scope after reset", async () => {
  const originalFetch = globalThis.fetch;
  const requested: Array<{ body: string; method: string; url: string }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requested.push({
      body: typeof init?.body === "string" ? init.body : "",
      method: init?.method ?? "GET",
      url
    });
    if (url.includes("reset-today-trend")) {
      return new Response(JSON.stringify({
        data: {
          deletedSnapshots: 1,
          metricScope: "cl",
          resetAt: "2026-08-31T03:00:00.000Z",
          resetDate: "2026-08-31"
        },
        success: true
      }), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }

    return new Response(JSON.stringify({
      generatedAt: "2026-08-31T03:01:00.000Z",
      requestedScope: "cl",
      summaries: [monitoringResponse.summaries[0]!]
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  try {
    const result = await resetMonitoringTodayTrend("cl");
    assert.equal(result.reset.metricScope, "cl");
    assert.ok(result.monitoring);
    assert.equal(result.monitoring.requestedScope, "cl");
    assert.deepEqual(requested.map(({ method, url }) => ({ method, url })), [
      { method: "POST", url: buildApiUrl("/api/data-source/reset-today-trend") },
      { method: "GET", url: buildApiUrl("/api/data-source/monitoring-diagnostics?metricScope=cl") }
    ]);
    assert.deepEqual(JSON.parse(requested[0]?.body ?? "{}"), { metricScope: "cl" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resetMonitoringTodayTrend preserves the completed reset when diagnostics reload fails", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = (async (_input, init) => {
    requestCount += 1;
    if (init?.method === "POST") {
      return new Response(JSON.stringify({
        data: {
          deletedSnapshots: 3,
          metricScope: "cl",
          resetAt: "2026-08-31T03:00:00.000Z",
          resetDate: "2026-08-31"
        },
        success: true
      }), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }

    return new Response(JSON.stringify({ error: "diagnostics unavailable", success: false }), {
      headers: { "Content-Type": "application/json" },
      status: 503
    });
  }) as typeof fetch;

  try {
    const result = await resetMonitoringTodayTrend("cl");
    assert.equal(requestCount, 2);
    assert.equal(result.reset.metricScope, "cl");
    assert.equal(result.reset.deletedSnapshots, 3);
    assert.equal(result.monitoring, null);
    assert.match(result.reloadErrorMessage, /diagnostics unavailable/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("monitoring reset feedback distinguishes completed reset from failed diagnostics reload", () => {
  const warning = buildMonitoringResetFeedback("cl", 3, "diagnostics unavailable");
  assert.match(warning, /CL 重設已完成/);
  assert.match(warning, /monitoring diagnostics 重新載入失敗/);
  assert.match(warning, /刪除 3 筆/);
  assert.match(warning, /重設前摘要/);
  assert.doesNotMatch(warning, /重設失敗[^，。]/);

  assert.match(buildMonitoringResetFeedback("cl", 0, null), /CL 今日曲線已重設/);
});

test("resetMonitoringTodayTrend keeps a reset POST failure as an error", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = (async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ error: "reset unavailable", success: false }), {
      headers: { "Content-Type": "application/json" },
      status: 503
    });
  }) as typeof fetch;

  try {
    await assert.rejects(() => resetMonitoringTodayTrend("cl"), /reset unavailable/i);
    assert.equal(requestCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Diagnostics path encodes semantic keys and never sends an all-scope request", () => {
  assert.equal(
    buildMetricProvenancePath("https://display.local/settings/data-hub/diagnostics?metricKey=power%2Ftotal%20%26%20ready&scope=kn"),
    "/api/data-hub/provenance?metricKey=power%2Ftotal%20%26%20ready&scope=kn"
  );
  assert.equal(
    buildMetricProvenancePath("https://display.local/settings/data-hub/diagnostics?metricKey=realTimePower&scope=all"),
    null
  );
});

test("missing Diagnostics selection still loads monitoring and returns local provenance guidance", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify(monitoringResponse), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  try {
    const result = await loadDataHubDiagnosticsRoute({
      request: new Request("https://display.local/settings/data-hub/diagnostics?scope=all")
    } as never);

    assert.equal(fetchCalls, 1);
    assert.equal(result.model, null);
    assert.equal(result.monitoring?.summaries.length, 3);
    assert.match(result.selectionMessage, /metricKey.*scope|scope.*metricKey/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("all-scope Diagnostics loader requests monitoring only when no metric key is selected", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  globalThis.fetch = (async (input) => {
    requestedUrls.push(String(input));
    return new Response(JSON.stringify(monitoringResponse), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  try {
    const result = await loadDataHubDiagnosticsRoute({
      request: new Request("https://display.local/settings/data-hub/diagnostics?scope=all")
    } as never);

    assert.equal(result.monitoring?.requestedScope, "all");
    assert.deepEqual(result.monitoring?.summaries.map(({ metricScope }) => metricScope), ["cl", "kn", "global"]);
    assert.deepEqual(requestedUrls, [buildApiUrl("/api/data-source/monitoring-diagnostics?metricScope=all")]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Diagnostics normalizer preserves bounded graph nodes, edges, and truncation state", () => {
  const model = normalizeMetricProvenance(response);

  assert.deepEqual(model.nodes.map(({ id, category, scope, status }) => ({ id, category, scope, status })), [
    {
      category: "semantic-metric",
      id: "semantic-metric:cl:realTimePower",
      scope: "cl",
      status: "live"
    },
    {
      category: "mqtt-topic",
      id: "mqtt-topic:cl:factory/cl/power",
      scope: "cl",
      status: "configured"
    }
  ]);
  assert.deepEqual(model.edges, response.edges);
  assert.equal(model.truncated, true);
  assert.equal(model.maxNodes, 100);
  assert.equal(model.maxDepth, 4);
});
