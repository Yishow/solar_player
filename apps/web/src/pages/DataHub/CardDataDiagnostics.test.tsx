import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataHubCardDataDiagnostics } from "./CardDataDiagnostics";
import {
  buildCardDataRowKey,
  fetchCardDataDiagnosticsModel,
  filterCardDataRows,
  type CardDataDiagnosticsModel
} from "./CardDataDiagnosticsModel";

const sharedRow = {
  actions: [{ type: "set-display-override" as const }],
  aggregateSource: null,
  calculationFields: ["todayGeneration"],
  dependencies: [{
    latestValue: "42",
    metricKey: "todayGeneration",
    metricScope: "cl" as const,
    status: "ready" as const,
    topic: "solar/cl/today"
  }],
  displayValue: "60.0",
  derivedMetric: {
    definitionRevision: 3,
    effectiveOutputScope: "cl" as const,
    evaluation: {
      definitionRevision: 3,
      dependencies: [],
      evaluatedAt: "2026-08-31T03:00:00.000Z",
      failureCode: null,
      freshnessState: "fresh" as const,
      metricKey: "realTimePower",
      metricScope: "cl" as const,
      outputUnit: "kW",
      precision: 1,
      retainedLastGood: false,
      status: "ready" as const,
      timestamp: "2026-08-31T03:00:00.000Z",
      value: 60
    },
    inputs: [],
    metricKey: "realTimePower",
    provenance: []
  },
  formula: "todayGeneration / 2",
  label: "即時發電功率",
  lastUpdatedAt: "2026-08-31T03:00:00.000Z",
  metricKey: "realTimePower",
  originalValue: "42.0",
  override: {
    active: true,
    cardId: "overview.realTimePower",
    displayValue: 60,
    enabled: true,
    expiresAt: null,
    metricKey: "realTimePower",
    metricScope: "cl" as const,
    pageId: "overview" as const,
    reason: null,
    targetId: "overview.realTimePower",
    unit: "kW",
    updatedAt: "2026-08-31T03:00:00.000Z"
  },
  pageId: "overview" as const,
  sourceClassification: "derived-metric",
  sourceTopics: [{ metricKey: "realTimePower", metricScope: "cl" as const, topic: "solar/cl/power" }],
  status: "overridden" as const,
  unit: "kW"
};

const clRow = { ...sharedRow, cardId: "overview.realTimePower", metricScope: "cl" as const };
const knRow = {
  ...sharedRow,
  cardId: "overview.realTimePower",
  metricScope: "kn" as const,
  sourceTopics: [{ metricKey: "realTimePower", metricScope: "kn" as const, topic: "solar/kn/power" }],
  override: null,
  status: "ready" as const
};
const unrelatedRow = { ...clRow, cardId: "overview.todayGeneration", metricKey: "todayGeneration" };

const model: CardDataDiagnosticsModel = {
  generatedAt: "2026-08-31T03:00:00.000Z",
  rows: [clRow, knRow, unrelatedRow]
};

test("Card Data diagnostics filters by both metric key and concrete scope", () => {
  const filtered = filterCardDataRows(model, { metricKey: "realTimePower", scope: "cl" });

  assert.deepEqual(filtered.rows.map((row) => row.metricScope), ["cl"]);
  assert.deepEqual(filtered.rows.map((row) => row.cardId), ["overview.realTimePower"]);
  assert.equal(buildCardDataRowKey(clRow), "cl:overview.realTimePower");
  assert.notEqual(buildCardDataRowKey(clRow), buildCardDataRowKey(knRow));
});

test("Card Data diagnostics does not fetch until a concrete selection exists", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify(model), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  };

  try {
    assert.equal(await fetchCardDataDiagnosticsModel(null), null);
    assert.equal(fetchCalls, 0);

    const selected = await fetchCardDataDiagnosticsModel({ metricKey: "realTimePower", scope: "kn" });
    assert.equal(fetchCalls, 1);
    assert.deepEqual(selected?.rows.map((row) => row.metricScope), ["kn"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Data Hub Card Data diagnostics keeps existing scoped details and override affordance", () => {
  const html = renderToStaticMarkup(
    <DataHubCardDataDiagnostics
      model={filterCardDataRows(model, { metricKey: "realTimePower", scope: "cl" })}
      selection={{ metricKey: "realTimePower", scope: "cl" }}
    />
  );

  assert.equal((html.match(/data-data-hub-card-data-row=/g) ?? []).length, 1);
  assert.match(html, /data-data-hub-card-data-row="cl:overview\.realTimePower"/);
  assert.match(html, /Scope[：:][^<]*CL/);
  assert.match(html, /目前值|Current/);
  assert.match(html, /原始值|Original/);
  assert.match(html, /展示值|Display/);
  assert.match(html, /展示覆寫/);
  assert.match(html, /來源分類|Source classification/);
  assert.match(html, /solar\/cl\/power/);
  assert.match(html, /todayGeneration \/ 2/);
  assert.match(html, /todayGeneration/);
  assert.match(html, /Registry|Provenance/);
  assert.match(html, /更新|Last update/);
  assert.match(html, /套用展示值|Apply display override/);
  assert.doesNotMatch(html, /configure-topic|publish-test-value|change this widget|metric binding/i);
});

test("Card Data diagnostics shows the current display value when an unoverridden row has no original value", () => {
  const liveRow = {
    ...knRow,
    displayValue: "33.0",
    originalValue: null,
    override: null
  };
  const html = renderToStaticMarkup(
    <DataHubCardDataDiagnostics
      model={{ ...model, rows: [liveRow] }}
      selection={{ metricKey: "realTimePower", scope: "kn" }}
    />
  );

  assert.match(html, /Current value \/ 目前值<\/dt><dd>33\.0 kW/);
  assert.match(html, /Original value \/ 原始值<\/dt><dd>-- kW/);
});
