import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import type { DerivedMetricDefinition, DerivedMetricEvaluation } from "@solar-display/shared";
import type { DerivedMetricRegistryPanel } from "../DataSourceSettings/DerivedMetricRegistryPanel";
import { DataHubDerivedMetrics } from "./DerivedMetrics";

function definition(overrides: Partial<DerivedMetricDefinition> = {}): DerivedMetricDefinition {
  return {
    description: "",
    enabled: true,
    expression: "source",
    fallbackPolicy: "unavailable",
    inputs: [{ alias: "source", kind: "metric", metricKey: "realTimePower", scope: "output-site", unit: "kW" }],
    managed: false,
    metricKey: "custom.power",
    name: "Custom Power",
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 1,
    revision: 2,
    ...overrides
  };
}

async function renderInteractive(api: React.ComponentProps<typeof DerivedMetricRegistryPanel>["api"]) {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/"
  });
  for (const [key, value] of Object.entries({
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    navigator: dom.window.navigator,
    window: dom.window
  })) {
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(dom.window.document.getElementById("root")!);
  await act(async () => {
    root.render(<DataHubDerivedMetrics api={api} />);
    await Promise.resolve();
  });
  return { dom, root };
}

function button(document: Document, label: string) {
  const match = [...document.querySelectorAll("button")].find((entry) => entry.textContent?.includes(label));
  assert.ok(match, `expected button: ${label}`);
  return match as HTMLButtonElement;
}

test("Data Hub Derived Metrics mounts managed readonly and custom authoring registry behavior", async () => {
  const managed = definition({ managed: true, metricKey: "todayCo2Reduction", name: "Managed CO2", revision: 1 });
  const custom = definition();
  const calls: string[] = [];
  const evaluation: DerivedMetricEvaluation = {
    definitionRevision: 2,
    dependencies: [],
    evaluatedAt: "2026-08-30T00:00:00.000Z",
    failureCode: null,
    freshnessState: "fresh",
    metricKey: custom.metricKey,
    metricScope: "cl",
    outputUnit: "kW",
    precision: 1,
    retainedLastGood: false,
    status: "ready",
    timestamp: "2026-08-30T00:00:00.000Z",
    value: 42
  };
  const { dom, root } = await renderInteractive({
    getDefinitions: async () => [managed, custom],
    getDefinition: async () => ({ definition: custom, evaluation }),
    preview: async (draft, scope) => { calls.push(`preview:${draft.metricKey}:${scope}`); return evaluation; },
    save: async (draft) => { calls.push(`save:${draft.metricKey}`); return draft; },
    setEnabled: async (metricKey, enabled) => { calls.push(`enabled:${metricKey}:${enabled}`); return { ...custom, enabled }; }
  });

  assert.equal(dom.window.document.querySelector("[data-data-hub-section=derived]")?.getAttribute("data-data-hub-section"), "derived");
  assert.equal((dom.window.document.querySelector('input[value="todayCo2Reduction"]') as HTMLInputElement).disabled, true);
  await act(async () => button(dom.window.document, "Custom Power").click());
  assert.equal((dom.window.document.querySelector('input[value="custom.power"]') as HTMLInputElement).disabled, true);
  assert.equal((dom.window.document.querySelector('input[value="Custom Power"]') as HTMLInputElement).disabled, false);
  await act(async () => { button(dom.window.document, "Preview").click(); await Promise.resolve(); });
  assert.match(dom.window.document.body.textContent ?? "", /Preview：42 kW（fresh）/u);
  await act(async () => { button(dom.window.document, "儲存定義").click(); await Promise.resolve(); await Promise.resolve(); });
  assert.deepEqual(calls, ["preview:custom.power:cl", "save:custom.power"]);

  await act(async () => root.unmount());
  dom.window.close();
});

test("Data Hub Derived Metrics shows current CL and KN evaluations with revision and status", async () => {
  const managed = definition({
    enabled: true,
    managed: true,
    metricKey: "factoryCircuit.sitePower",
    name: "Managed Site Power",
    revision: 3,
    siteScopes: ["cl", "kn"]
  });
  const evaluation = (metricScope: "cl" | "kn", value: number | null, status: "ready" | "unavailable") => ({
    definitionRevision: 3,
    dependencies: [],
    evaluatedAt: "2026-08-31T00:00:00.000Z",
    failureCode: status === "ready" ? null : "input-unavailable" as const,
    freshnessState: status === "ready" ? "fresh" as const : "unavailable" as const,
    metricKey: managed.metricKey,
    metricScope,
    outputUnit: "kW",
    precision: 1,
    retainedLastGood: false,
    status,
    timestamp: status === "ready" ? "2026-08-31T00:00:00.000Z" : null,
    value
  });
  const { dom, root } = await renderInteractive({
    getDefinitions: async () => [managed],
    getDefinition: async (_metricKey, metricScope) => ({
      definition: managed,
      evaluation: metricScope === "cl" ? evaluation("cl", 18, "ready") : evaluation("kn", null, "unavailable")
    }),
    preview: async () => evaluation("cl", 18, "ready"),
    save: async (draft) => draft,
    setEnabled: async (_metricKey, enabled) => ({ ...managed, enabled })
  });

  assert.match(dom.window.document.body.textContent ?? "", /Revision:\s*r3/u);
  assert.match(dom.window.document.body.textContent ?? "", /Managed.*Enabled/u);
  assert.match(dom.window.document.body.textContent ?? "", /CL/u);
  assert.match(dom.window.document.body.textContent ?? "", /KN/u);
  assert.match(dom.window.document.body.textContent ?? "", /18.*kW/u);
  assert.match(dom.window.document.body.textContent ?? "", /Unavailable/u);
  assert.match(dom.window.document.body.textContent ?? "", /input-unavailable/u);

  await act(async () => root.unmount());
  dom.window.close();
});
