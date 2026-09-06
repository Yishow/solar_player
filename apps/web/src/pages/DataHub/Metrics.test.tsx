import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { DataHubMetricsContent } from "./Metrics";
import { applyMetricsLiveSnapshot } from "./liveActivity";
import { buildDataHubDiagnosticsHref, buildDataHubUsageHref } from "./links";
import {
  buildMetricsInventoryPath,
  normalizeMetricsInventory,
  type DataHubMetricsModel,
  type MetricsInventoryResponse
} from "./MetricsModel";
import { createMetricDetailsStore, type MetricDetailsLoaders } from "./MetricDetailsModel";
import type { DataHubDiagnosticsModel } from "./DiagnosticsModel";
import type { DataHubUsageModel, MetricUsageRow } from "./UsageModel";

const inventory: MetricsInventoryResponse = {
  generatedAt: "2026-08-31T03:00:00.000Z",
  scope: "all",
  metrics: [
    {
      evaluation: null,
      evaluationState: "not-evaluated",
      freshness: { ageMs: 1000, category: "realtime", nextTransitionAt: null, sourceTimestamp: "2026-08-31T02:59:59.000Z", state: "live" },
      freshnessState: "live",
      id: "ignored-server-id-1",
      label: "Shared power",
      metricKey: "inventory.same",
      metricScope: "cl",
      ownership: "operator",
      provenance: { dependencies: [], sourceId: null, sourceTimestamp: "2026-08-31T02:59:59.000Z", sourceTopic: "factory/cl/power" },
      sourceClass: "mqtt-live",
      unit: "kW",
      value: 12
    },
    {
      evaluation: null,
      evaluationState: "not-evaluated",
      freshness: null,
      freshnessState: "unavailable",
      id: "ignored-server-id-2",
      label: "Shared power",
      metricKey: "inventory.same",
      metricScope: "kn",
      ownership: "catalog",
      provenance: { dependencies: [], sourceId: null, sourceTimestamp: null, sourceTopic: null },
      sourceClass: "mqtt-live",
      unit: "kW",
      value: null
    },
    {
      evaluation: { evaluatedAt: "2026-08-31T03:00:00.000Z", failureCode: null, freshnessState: "fresh", retainedLastGood: false, status: "ready" },
      evaluationState: "ready",
      freshness: null,
      freshnessState: "live",
      id: "ignored-server-id-3",
      label: "Shared power",
      metricKey: "inventory.same",
      metricScope: "global",
      ownership: "managed",
      provenance: {
        dependencies: [{ alias: "source", kind: "metric", metricKey: "inventory.input", metricScope: "global", unit: "kW" }],
        sourceId: "derived-metric-registry",
        sourceTimestamp: "2026-08-31T03:00:00.000Z",
        sourceTopic: null
      },
      sourceClass: "derived-metric",
      unit: "kW",
      value: 46
    }
  ]
};

type MetricDetail = {
  diagnostics: DataHubDiagnosticsModel | null;
  errorMessage: string | null;
  status: "loading" | "ready" | "empty" | "error";
  usage: DataHubUsageModel | null;
};

type MetricsModelWithDetails = DataHubMetricsModel & {
  detailsByMetricId: Record<string, MetricDetail>;
};

function buildUsageRow(scope: "cl" | "kn" | "global", pageLabelEn: string): MetricUsageRow {
  const pageKey = pageLabelEn.toLowerCase().replaceAll(" ", "-");
  return {
    configuredBindingScope: scope,
    configuredScope: scope,
    consumerId: `widget:${pageKey}.power`,
    consumerType: "widget",
    inherited: false,
    itemId: `${pageKey}-power`,
    labelEn: pageLabelEn,
    labelZh: null,
    metricKey: "inventory.same",
    pageId: pageKey,
    pageInstanceId: 17,
    pageKey,
    pageLabelEn,
    pageLabelZh: null,
    scopeLabel: scope,
    templateKey: "overview"
  };
}

function buildDiagnostics(scope: "cl" | "kn" | "global"): DataHubDiagnosticsModel {
  const metricId = `semantic-metric:${scope}:inventory.same`;
  const consumerId = `consumer:widget:${scope}-operations.power:17`;
  return {
    edges: [{ from: metricId, kind: "used-by", to: consumerId }],
    generatedAt: "2026-08-31T03:00:00.000Z",
    maxDepth: 4,
    maxNodes: 100,
    metricKey: "inventory.same",
    nodes: [
      {
        category: "semantic-metric",
        id: metricId,
        label: "Shared power",
        metadata: { evaluationState: "not-evaluated", freshnessState: "live", metricKey: "inventory.same" },
        scope,
        status: "live"
      },
      {
        category: "widget",
        id: consumerId,
        label: `${scope.toUpperCase()} operations / power`,
        metadata: { consumerType: "widget", pageKey: `${scope}-operations` },
        scope,
        status: "active"
      }
    ],
    scope,
    truncated: false
  };
}

function buildUsageModel(scope: "cl" | "kn" | "global", usage: MetricUsageRow[]): DataHubUsageModel {
  return {
    generatedAt: "2026-08-31T03:00:00.000Z",
    scope,
    usage
  };
}

function withMetricDetails(
  model: DataHubMetricsModel,
  detailsByMetricId: Record<string, MetricDetail>
): MetricsModelWithDetails {
  return { ...model, detailsByMetricId };
}

function createFixtureDetailsStore(detailsByMetricId: Record<string, MetricDetail>) {
  let clock = 100;
  const resolveDetail = (requestUrl: string) => {
    const request = new URL(requestUrl, "https://display.local");
    const key = `${request.searchParams.get("scope")}:${request.searchParams.get("metricKey")}`;
    const detail = detailsByMetricId[key];
    assert.ok(detail, `missing detail fixture for ${key}`);
    return detail;
  };
  const loaders: MetricDetailsLoaders = {
    diagnostics: async (requestUrl) => {
      const detail = resolveDetail(requestUrl);
      if (detail.status === "loading") return new Promise<never>(() => undefined);
      if (detail.status === "error") throw new Error(detail.errorMessage ?? "Diagnostics failed");
      return detail.diagnostics;
    },
    now: () => {
      const current = clock;
      clock += 37;
      return current;
    },
    usage: async (requestUrl) => {
      const detail = resolveDetail(requestUrl);
      if (detail.status === "loading") return new Promise<never>(() => undefined);
      if (detail.status === "error") throw new Error(detail.errorMessage ?? "Usage failed");
      return detail.usage ?? buildUsageModel("global", []);
    }
  };
  return createMetricDetailsStore(loaders);
}

async function withMountedMetrics<T>(model: MetricsModelWithDetails, callback: (document: Document) => Promise<T>) {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { pretendToBeVisual: true, url: "http://127.0.0.1/settings/data-hub/metrics" }
  );
  const previousGlobals = {
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    navigator: globalThis.navigator,
    window: globalThis.window,
    isReactActEnvironment: (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
  };
  for (const [key, value] of Object.entries({
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    navigator: dom.window.navigator,
    window: dom.window
  })) {
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  let root: Root | null = null;
  const detailsStore = createFixtureDetailsStore(model.detailsByMetricId);
  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(<DataHubMetricsContent detailsStore={detailsStore} model={model} />);
      await Promise.resolve();
    });
    return await callback(dom.window.document);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    detailsStore.dispose();
    Object.defineProperty(globalThis, "document", { configurable: true, value: previousGlobals.document, writable: true });
    Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: previousGlobals.HTMLElement, writable: true });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: previousGlobals.navigator, writable: true });
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousGlobals.window, writable: true });
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = previousGlobals.isReactActEnvironment;
    dom.window.close();
  }
}

test("Metrics request uses only the selected management scope", () => {
  assert.equal(buildMetricsInventoryPath("https://display.local/settings/data-hub/metrics?scope=kn"), "/api/data-hub/metrics?scope=kn");
  assert.equal(buildMetricsInventoryPath("https://display.local/settings/data-hub/metrics"), "/api/data-hub/metrics?scope=all");
  assert.equal(buildMetricsInventoryPath("https://display.local/settings/data-hub/metrics?scope=invalid"), "/api/data-hub/metrics?scope=all");
});

test("Metrics normalizer owns composite identities instead of trusting key-only ids", () => {
  const model = normalizeMetricsInventory(inventory);
  assert.deepEqual(model.metrics.map(({ id }) => id), [
    "cl:inventory.same",
    "kn:inventory.same",
    "global:inventory.same"
  ]);
});

test("a scoped live update changes only the matching metric identity", () => {
  const model = normalizeMetricsInventory(inventory);
  const updated = applyMetricsLiveSnapshot(model, {
    metricScope: "cl",
    metrics: {
      "inventory.same": {
        quality: "good",
        timestamp: "2026-08-31T03:01:00.000Z",
        unit: "kW",
        value: 99
      }
    },
    timestamp: "2026-08-31T03:01:00.000Z"
  });

  assert.deepEqual(updated.metrics.map(({ id, ownership, value }) => ({ id, ownership, value })), [
    { id: "cl:inventory.same", ownership: "operator", value: 99 },
    { id: "kn:inventory.same", ownership: "catalog", value: null },
    { id: "global:inventory.same", ownership: "managed", value: 46 }
  ]);
  assert.equal(updated.metrics[0]?.provenance.sourceTimestamp, "2026-08-31T03:01:00.000Z");
});

test("U1-R4 metrics issue filter keeps only unhealthy identities in the current list", () => {
  const html = renderToStaticMarkup(
    <DataHubMetricsContent
      listQuery={{ filter: "issue", scope: "kn", search: "Shared" }}
      model={normalizeMetricsInventory(inventory)}
    />
  );
  assert.match(html, /data-metric-id="kn:inventory.same"/);
  assert.doesNotMatch(html, /data-metric-id="cl:inventory.same"/);
  assert.match(html, /1 筆可用數據/);
});

test("Metrics renders scope, current value, states, source, ownership, and provenance", () => {
  const html = renderToStaticMarkup(<DataHubMetricsContent model={normalizeMetricsInventory(inventory)} />);

  assert.equal((html.match(/data-metric-key="inventory\.same"/g) ?? []).length, 3);
  assert.match(html, /data-metric-id="cl:inventory\.same"/);
  assert.match(html, /data-metric-id="kn:inventory\.same"/);
  assert.match(html, /data-metric-id="global:inventory\.same"/);
  assert.match(html, />12<\/strong> kW/);
  assert.match(html, /Unavailable/);
  assert.match(html, /Ready/);
  assert.match(html, /Generic MQTT/);
  assert.match(html, /Derived metric/);
  assert.match(html, /factory\/cl\/power/);
  assert.match(html, /global:inventory\.input/);
  assert.doesNotMatch(html, /rawPayload|password|credential/);
});

test("Metrics rows expose inline toggle details action", () => {
  const html = renderToStaticMarkup(<DataHubMetricsContent model={normalizeMetricsInventory(inventory)} />);

  assert.match(html, /data-metric-action="toggle-details"/);
  assert.match(html, /展開使用情形與診斷/);
});

test("expanded metric details use composite identity and show live usage and diagnostics", async () => {
  const model = withMetricDetails(normalizeMetricsInventory(inventory), {
    "cl:inventory.same": {
      diagnostics: buildDiagnostics("cl"),
      errorMessage: null,
      status: "ready",
      usage: buildUsageModel("cl", [buildUsageRow("cl", "CL operations")])
    },
    "kn:inventory.same": {
      diagnostics: buildDiagnostics("kn"),
      errorMessage: null,
      status: "ready",
      usage: buildUsageModel("kn", [buildUsageRow("kn", "KN operations")])
    },
    "global:inventory.same": {
      diagnostics: buildDiagnostics("global"),
      errorMessage: null,
      status: "ready",
      usage: buildUsageModel("global", [])
    }
  });

  await withMountedMetrics(model, async (document) => {
    const card = document.querySelector<HTMLElement>('[data-metric-id="cl:inventory.same"]');
    assert.ok(card);
    assert.doesNotMatch(card.textContent ?? "", /CL operations/);

    const toggle = card.querySelector<HTMLButtonElement>('[data-metric-action="toggle-details"]');
    assert.ok(toggle);
    await act(async () => {
      toggle.click();
      await Promise.resolve();
    });

    const text = card.textContent ?? "";
    assert.match(text, /CL operations/);
    assert.doesNotMatch(text, /KN operations/);
    assert.match(text, /1000/);
    assert.match(text, /realtime/);
    assert.match(text, /37\s*ms/);
    assert.match(text, /Not evaluated|未評估/);
  });
});

test("expanded metric details distinguish loading, empty, and error without claiming Healthy", async () => {
  const failedInventory: MetricsInventoryResponse = {
    ...inventory,
    metrics: inventory.metrics.map((row) => row.metricScope === "global"
      ? {
          ...row,
          evaluation: {
            evaluatedAt: "2026-08-31T03:00:00.000Z",
            failureCode: "source-timeout",
            freshnessState: "unavailable",
            retainedLastGood: false,
            status: "unavailable"
          },
          evaluationState: "unavailable",
          freshness: {
            ageMs: null,
            category: "unavailable",
            nextTransitionAt: null,
            sourceTimestamp: null,
            state: "unavailable"
          },
          freshnessState: "unavailable"
        }
      : row)
  };
  const model = withMetricDetails(normalizeMetricsInventory(failedInventory), {
    "cl:inventory.same": {
      diagnostics: null,
      errorMessage: null,
      status: "loading",
      usage: null
    },
    "kn:inventory.same": {
      diagnostics: { ...buildDiagnostics("kn"), edges: [], nodes: [] },
      errorMessage: null,
      status: "empty",
      usage: buildUsageModel("kn", [])
    },
    "global:inventory.same": {
      diagnostics: null,
      errorMessage: "provenance request failed",
      status: "error",
      usage: null
    }
  });

  await withMountedMetrics(model, async (document) => {
    const expand = async (metricId: string) => {
      const card = document.querySelector<HTMLElement>(`[data-metric-id="${metricId}"]`);
      assert.ok(card);
      const toggle = card.querySelector<HTMLButtonElement>('[data-metric-action="toggle-details"]');
      assert.ok(toggle);
      await act(async () => {
        toggle.click();
        await Promise.resolve();
      });
      return card.textContent ?? "";
    };

    assert.match(await expand("cl:inventory.same"), /Loading|載入/);
    assert.match(await expand("kn:inventory.same"), /No consumers|沒有 metric consumers/);

    const errorText = await expand("global:inventory.same");
    assert.match(errorText, /provenance request failed/);
    assert.match(errorText, /source-timeout/);
    assert.doesNotMatch(errorText, /Healthy/);
  });
});
