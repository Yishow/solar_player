import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import type { DerivedMetricDefinition, DerivedMetricEvaluation } from "@solar-display/shared";
import { DerivedMetricRegistryPanel } from "./DerivedMetricRegistryPanel";

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
    root.render(<DerivedMetricRegistryPanel api={api} />);
    await Promise.resolve();
  });
  return { dom, root };
}

function button(document: Document, label: string) {
  const match = [...document.querySelectorAll("button")].find((entry) => entry.textContent?.includes(label));
  assert.ok(match, `expected button: ${label}`);
  return match as HTMLButtonElement;
}

test("Derived Metric Registry renders constrained custom authoring controls", () => {
  const html = renderToStaticMarkup(React.createElement(DerivedMetricRegistryPanel));

  assert.match(html, /衍生指標 Registry/u);
  assert.match(html, /新增 custom 指標/u);
  assert.match(html, /Metric key/u);
  assert.match(html, /輸入別名與來源/u);
  assert.match(html, /Preview/u);
  assert.match(html, /儲存定義/u);
  assert.doesNotMatch(html, /JavaScript|SQL|shell/u);
});

test("Derived Metric Registry loads managed readonly state and executes preview, save, and disable", async () => {
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
    preview: async (draft, scope) => { calls.push(`preview:${draft.metricKey}:${scope}`); return evaluation; },
    save: async (draft) => { calls.push(`save:${draft.metricKey}`); return draft; },
    setEnabled: async (metricKey, enabled) => { calls.push(`enabled:${metricKey}:${enabled}`); return { ...custom, enabled }; }
  });

  assert.equal((dom.window.document.querySelector('input[value="todayCo2Reduction"]') as HTMLInputElement).disabled, true);
  await act(async () => button(dom.window.document, "Custom Power").click());
  assert.equal((dom.window.document.querySelector('input[value="custom.power"]') as HTMLInputElement).disabled, true);
  assert.equal((dom.window.document.querySelector('input[value="Custom Power"]') as HTMLInputElement).disabled, false);
  await act(async () => { button(dom.window.document, "Preview").click(); await Promise.resolve(); });
  assert.match(dom.window.document.body.textContent ?? "", /Preview：42 kW（fresh）/u);
  await act(async () => { button(dom.window.document, "儲存定義").click(); await Promise.resolve(); await Promise.resolve(); });
  await act(async () => { button(dom.window.document, "停用").click(); await Promise.resolve(); await Promise.resolve(); });
  assert.deepEqual(calls, ["preview:custom.power:cl", "save:custom.power", "enabled:custom.power:false"]);

  await act(async () => root.unmount());
  dom.window.close();
});

test("Derived Metric Registry surfaces preview failures", async () => {
  const custom = definition();
  const { dom, root } = await renderInteractive({
    getDefinitions: async () => [custom],
    preview: async () => { throw new Error("preview failed"); },
    save: async (draft) => draft,
    setEnabled: async (_metricKey, enabled) => ({ ...custom, enabled })
  });

  await act(async () => { button(dom.window.document, "Preview").click(); await Promise.resolve(); });
  assert.match(dom.window.document.body.textContent ?? "", /preview failed/u);

  await act(async () => root.unmount());
  dom.window.close();
});
