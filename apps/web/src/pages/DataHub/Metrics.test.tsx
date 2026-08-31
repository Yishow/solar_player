import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataHubMetricsContent } from "./Metrics";
import { applyMetricsLiveSnapshot } from "./liveActivity";
import { buildDataHubDiagnosticsHref, buildDataHubUsageHref } from "./links";
import {
  buildMetricsInventoryPath,
  normalizeMetricsInventory,
  type MetricsInventoryResponse
} from "./MetricsModel";

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

test("Metrics rows expose scope-preserving Usage and Diagnostics links", () => {
  const usageHref = buildDataHubUsageHref("inventory.same", "cl");
  const diagnosticsHref = buildDataHubDiagnosticsHref("inventory.same", "cl");
  const html = renderToStaticMarkup(<DataHubMetricsContent model={normalizeMetricsInventory(inventory)} />);

  assert.match(usageHref, /metricKey=inventory\.same&scope=cl/);
  assert.match(diagnosticsHref, /metricKey=inventory\.same&scope=cl/);
  assert.match(html, /data-metric-action="usage" href="\/settings\/data-hub\/usage\?metricKey=inventory\.same&amp;scope=cl"/);
  assert.match(html, /data-metric-action="diagnostics" href="\/settings\/data-hub\/diagnostics\?metricKey=inventory\.same&amp;scope=cl"/);
});
