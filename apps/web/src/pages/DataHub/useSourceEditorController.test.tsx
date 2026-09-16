import assert from "node:assert/strict";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";
import type { DataHubSourcesModel, GenericMqttMapping } from "./SourcesModel";

// React DOM feature-detects its event plugins at module load, so the DOM globals
// must exist before the controller and React DOM are imported.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://127.0.0.1/"
});
for (const [key, value] of Object.entries({
  document: dom.window.document,
  Event: dom.window.Event,
  HTMLElement: dom.window.HTMLElement,
  HTMLButtonElement: dom.window.HTMLButtonElement,
  navigator: dom.window.navigator,
  window: dom.window
})) {
  Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
}
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const react = await import("react");
const React = react.default;
const { act, useCallback } = react;
const { createRoot } = await import("react-dom/client");
const { useSourceEditorController } = await import("./useSourceEditorController");

after(() => dom.window.close());

function mapping(overrides: Partial<GenericMqttMapping> = {}): GenericMqttMapping {
  return {
    enabled: true,
    id: -1,
    lastReceivedAt: null,
    lastValue: null,
    metricKey: "customMetric",
    metricScope: "kn",
    multiplier: 1,
    nameEn: "Custom metric",
    nameZh: "自訂來源",
    quality: null,
    topic: "factory/kn/new",
    unit: "kW",
    updatedAt: null,
    valuePath: "value",
    ...overrides
  };
}

function model(topic: GenericMqttMapping): DataHubSourcesModel {
  return {
    capabilities: { legacyReplaceSupported: false, versionedSourceEditing: true },
    collectionRevision: 1,
    solar: { errors: [], sources: [], zones: [] },
    status: {
      broker: "mqtt://central-broker:1883",
      clientId: "web-test",
      connected: true,
      reason: null,
      updatedAt: null
    },
    topics: [topic]
  };
}

function button(container: HTMLElement, testId: string) {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  assert.ok(element, `missing button ${testId}`);
  return element as HTMLButtonElement;
}

function status(container: HTMLElement) {
  const element = container.querySelector("[data-testid=\"status\"]");
  assert.ok(element, "missing controller status");
  return element as HTMLElement;
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

test("saved versioned create response becomes a clean PATCH baseline even without a numeric id", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ body: Record<string, any>; method: string; url: string }> = [];
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);

  function Harness() {
    const noop = useCallback(() => undefined, []);
    const editor = useSourceEditorController({
      initialSelection: null,
      listQueryScope: "kn",
      liveSolar: sourceModel.solar,
      model: sourceModel,
      onDirtyChange: noop,
      onUpdateWorkspace: noop
    });
    const current = editor.draftTopics[0];
    return React.createElement(
      "div",
      null,
      React.createElement("button", {
        "data-testid": "change",
        onClick: () => editor.handleGenericChange(-1, { nameZh: "本地編輯" })
      }, "change"),
      React.createElement("button", {
        "data-testid": "save",
        onClick: () => void editor.handleSaveSingle(-1)
      }, "save"),
      React.createElement("button", {
        "data-testid": "discard",
        onClick: () => editor.handleDiscardSingle(-1)
      }, "discard"),
      React.createElement("output", {
        "data-testid": "status",
        "data-dirty": String(editor.isDirty),
        "data-id": String(current?.id ?? ""),
        "data-name": current?.nameZh ?? "",
        "data-revision": String(current?.configRevision ?? ""),
        "data-source-ref": current?.sourceRef ?? ""
      })
    );
  }

  const sourceModel = model(mapping());
  try {
    globalThis.fetch = async (input, init) => {
      const method = String(init?.method ?? "GET");
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, any> : {};
      calls.push({ body, method, url: String(input) });
      const revision = calls.length;
      return new Response(JSON.stringify({
        configuration: {
          enabled: true,
          metricKey: "customMetric",
          metricScope: "kn",
          multiplier: 1,
          nameEn: "Custom metric",
          nameZh: method === "POST" ? "伺服器建立" : "伺服器更新",
          topic: method === "POST" ? "factory/kn/new" : "factory/kn/new-v2",
          unit: "kW",
          valuePath: "value"
        },
        persistence: "committed",
        revision,
        sourceRef: "src_kn_custom"
      }), { headers: { "content-type": "application/json" }, status: 200 });
    };

    await act(async () => {
      root.render(React.createElement(Harness));
    });
    await act(async () => {
      button(container, "change").click();
    });
    assert.equal(status(container).dataset.dirty, "true");

    await act(async () => {
      button(container, "save").click();
      await flush();
    });
    assert.equal(calls[0]?.method, "POST");
    assert.equal(status(container).dataset.dirty, "false");
    assert.equal(status(container).dataset.id, "-1");
    assert.equal(status(container).dataset.sourceRef, "src_kn_custom");
    assert.equal(status(container).dataset.revision, "1");
    assert.equal(status(container).dataset.name, "伺服器建立");

    await act(async () => {
      button(container, "change").click();
    });
    await act(async () => {
      button(container, "discard").click();
    });
    assert.equal(status(container).dataset.dirty, "false");
    assert.equal(status(container).dataset.name, "伺服器建立");

    await act(async () => {
      button(container, "change").click();
    });
    await act(async () => {
      button(container, "save").click();
      await flush();
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[1]?.method, "PATCH");
    assert.equal(calls[1]?.body.expectedRevision, 1);
    assert.equal(status(container).dataset.dirty, "false");
    assert.equal(status(container).dataset.id, "-1");
    assert.equal(status(container).dataset.revision, "2");
    assert.equal(status(container).dataset.sourceRef, "src_kn_custom");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
  }
});
