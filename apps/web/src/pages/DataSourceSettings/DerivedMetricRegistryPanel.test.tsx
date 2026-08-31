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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
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
    getDefinition: async () => ({ definition: custom, evaluation }),
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
    getDefinition: async () => ({ definition: custom, evaluation: null }),
    preview: async () => { throw new Error("preview failed"); },
    save: async (draft) => draft,
    setEnabled: async (_metricKey, enabled) => ({ ...custom, enabled })
  });

  await act(async () => { button(dom.window.document, "Preview").click(); await Promise.resolve(); });
  assert.match(dom.window.document.body.textContent ?? "", /preview failed/u);

  await act(async () => root.unmount());
  dom.window.close();
});

test("Derived Metric Registry ignores stale evaluation responses after rapid selection", async () => {
  const initial = definition({
    metricKey: "custom.initial",
    name: "Initial",
    outputScopePolicy: "global",
    revision: 1
  });
  const first = definition({
    metricKey: "custom.first",
    name: "First",
    outputScopePolicy: "global",
    revision: 1
  });
  const second = definition({
    metricKey: "custom.second",
    name: "Second",
    outputScopePolicy: "global",
    revision: 1
  });
  const firstEvaluation: DerivedMetricEvaluation = {
    definitionRevision: 1,
    dependencies: [],
    evaluatedAt: "2026-08-31T00:00:00.000Z",
    failureCode: null,
    freshnessState: "fresh",
    metricKey: first.metricKey,
    metricScope: "global",
    outputUnit: "kW",
    precision: 1,
    retainedLastGood: false,
    status: "ready",
    timestamp: "2026-08-31T00:00:00.000Z",
    value: 11
  };
  const secondEvaluation: DerivedMetricEvaluation = { ...firstEvaluation, metricKey: second.metricKey, value: 22 };
  const firstDetail = deferred<{ definition: DerivedMetricDefinition; evaluation: DerivedMetricEvaluation }>();
  const secondDetail = deferred<{ definition: DerivedMetricDefinition; evaluation: DerivedMetricEvaluation }>();
  const { dom, root } = await renderInteractive({
    getDefinitions: async () => [initial, first, second],
    getDefinition: async (metricKey) => {
      if (metricKey === first.metricKey) return firstDetail.promise;
      if (metricKey === second.metricKey) return secondDetail.promise;
      return { definition: initial, evaluation: { ...firstEvaluation, metricKey: initial.metricKey, value: 1 } };
    },
    preview: async () => firstEvaluation,
    save: async (draft) => draft,
    setEnabled: async (_metricKey, enabled) => ({ ...initial, enabled })
  });

  await act(async () => button(dom.window.document, "First").click());
  await act(async () => button(dom.window.document, "Second").click());
  await act(async () => {
    secondDetail.resolve({ definition: second, evaluation: secondEvaluation });
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(dom.window.document.querySelector('[data-derived-evaluation-scope="global"]')?.textContent?.includes("22"), true);

  await act(async () => {
    firstDetail.resolve({ definition: first, evaluation: firstEvaluation });
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(dom.window.document.querySelector('[data-derived-evaluation-scope="global"]')?.textContent?.includes("22"), true);
  assert.equal(dom.window.document.querySelector('[data-derived-evaluation-scope="global"]')?.textContent?.includes("11"), false);

  await act(async () => root.unmount());
  dom.window.close();
});

test("Derived Metric Registry invalidates pending evaluations when starting a custom draft", async () => {
  const initial = definition({
    metricKey: "custom.initial",
    name: "Initial",
    outputScopePolicy: "global",
    revision: 1
  });
  const existing = definition({
    metricKey: "custom.existing",
    name: "Existing",
    outputScopePolicy: "global",
    revision: 1
  });
  const existingEvaluation: DerivedMetricEvaluation = {
    definitionRevision: 1,
    dependencies: [],
    evaluatedAt: "2026-08-31T00:00:00.000Z",
    failureCode: null,
    freshnessState: "fresh",
    metricKey: existing.metricKey,
    metricScope: "global",
    outputUnit: "kW",
    precision: 1,
    retainedLastGood: false,
    status: "ready",
    timestamp: "2026-08-31T00:00:00.000Z",
    value: 77
  };
  const existingDetail = deferred<{ definition: DerivedMetricDefinition; evaluation: DerivedMetricEvaluation }>();
  const { dom, root } = await renderInteractive({
    getDefinitions: async () => [initial, existing],
    getDefinition: async (metricKey) => metricKey === existing.metricKey
      ? existingDetail.promise
      : { definition: initial, evaluation: null },
    preview: async () => existingEvaluation,
    save: async (draft) => draft,
    setEnabled: async (_metricKey, enabled) => ({ ...existing, enabled })
  });

  let bodyText = "";
  try {
    await act(async () => button(dom.window.document, "Existing").click());
    await act(async () => button(dom.window.document, "新增 custom 指標").click());
    assert.ok(dom.window.document.querySelector('input[value="custom."]'));
    assert.equal(dom.window.document.querySelector('[role="status"]'), null);
    await act(async () => {
      existingDetail.resolve({ definition: existing, evaluation: existingEvaluation });
      await Promise.resolve();
      await Promise.resolve();
    });
    bodyText = dom.window.document.body.textContent ?? "";
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
  assert.doesNotMatch(bodyText, /Value:\s*77/u);
});
