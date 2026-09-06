import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom";
import { JSDOM } from "jsdom";
import { getSocketClient } from "../../services/socket";
import {
  applySourcesLiveSnapshot,
  buildSourceRows,
  buildTopicMappingsSavePayload,
  canRefreshSources,
  DataHubSourcesContent,
  DataHubSources,
  isSolarAdapterManagedMetricIdentity,
  ManagedSourceCard,
  resolveSourcesSaveErrorMessage,
  updateGenericMapping,
  type DataHubSourcesModel
} from "./Sources";
import { rememberDataHubSourcesModel } from "./SourcesModel";

const baseModel: DataHubSourcesModel = {
  solar: {
    errors: [],
    sources: [
      {
        discoveredZoneCount: 1,
        health: "healthy",
        lastAlert: null,
        lastError: null,
        lastGoodSummaryAt: "2026-08-31T01:00:00.000Z",
        lastHeartbeatAt: "2026-08-31T01:01:00.000Z",
        lastStatus: "online",
        metricScope: "cl",
        ownership: "managed",
        sourceId: "solar-collector",
        sourceTimestamp: "2026-08-31T01:00:00.000Z",
        sourceTopic: "solar/CL/summary"
      }
    ],
    zones: [
      {
        displayName: "屋頂區",
        lastObservedFields: ["power_kw", "today_kwh"],
        metricScope: "cl",
        sourceTimestamp: "2026-08-31T01:00:00.000Z",
        sourceTopic: "solar/CL/zone/12",
        zoneId: "12"
      }
    ]
  },
  status: {
    broker: "mqtt://central-broker:1883",
    clientId: "solar-display-player",
    connected: true,
    reason: null,
    updatedAt: "2026-08-31T01:02:00.000Z"
  },
  topics: [
    {
      enabled: true,
      id: 10,
      lastReceivedAt: "2026-08-31T01:02:00.000Z",
      lastValue: 4.2,
      metricKey: "factoryCircuit.stampingPower",
      metricScope: "cl",
      multiplier: 1,
      nameEn: "CL Stamping",
      nameZh: "CL 沖床",
      quality: "good",
      topic: "factory/cl/stamping",
      unit: "kW",
      updatedAt: "2026-08-30T01:00:00.000Z",
      valuePath: "$.value"
    },
    {
      enabled: true,
      id: 11,
      lastReceivedAt: null,
      lastValue: null,
      metricKey: "factoryCircuit.stampingPower",
      metricScope: "kn",
      multiplier: 1,
      nameEn: "KN Stamping",
      nameZh: "KN 沖床",
      quality: null,
      topic: "factory/kn/stamping",
      unit: "kW",
      updatedAt: "2026-08-30T01:00:00.000Z",
      valuePath: "$.value"
    },
    {
      enabled: false,
      id: 12,
      lastReceivedAt: null,
      lastValue: null,
      metricKey: "factoryGeneration.todayMwh",
      metricScope: "cl",
      multiplier: 1,
      nameEn: null,
      nameZh: null,
      quality: null,
      topic: "legacy/factory/today",
      unit: "MWh",
      updatedAt: null,
      valuePath: "$.value"
    }
  ]
};

function renderSourcesContent(props: React.ComponentProps<typeof DataHubSourcesContent>) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/settings/data-hub/sources"]}>
      <DataHubSourcesContent {...props} />
    </MemoryRouter>
  );
}

test("Sources read model keeps managed adapter resources and same-key site mappings separate", () => {
  const rows = buildSourceRows(baseModel);
  const genericRows = rows.filter((row) => row.kind === "generic");

  assert.equal(rows.filter((row) => row.kind === "managed").length, 1);
  assert.deepEqual(
    genericRows.map((row) => `${row.metricScope}:${row.metricKey}`),
    ["cl:factoryCircuit.stampingPower", "kn:factoryCircuit.stampingPower", "cl:factoryGeneration.todayMwh"]
  );

  const managed = rows.find((row) => row.kind === "managed");
  assert.ok(managed);
  assert.match(managed.ownedMetrics.join(","), /factoryGeneration\.todayMwh/);
  assert.match(managed.resources[0]?.label ?? "", /屋頂區/);
  assert.equal(isSolarAdapterManagedMetricIdentity("cl", "factoryGeneration.todayMwh"), true);
  assert.equal(isSolarAdapterManagedMetricIdentity("global", "factoryGeneration.todayMwh"), false);
});

test("adapter-owned mappings are read-only while ordinary mappings remain editable", () => {
  const managed = baseModel.topics[2];
  const ordinary = baseModel.topics[0];
  assert.ok(managed);
  assert.ok(ordinary);

  assert.equal(updateGenericMapping([managed], managed.id, { topic: "should/not/change" })[0]?.topic, managed.topic);
  assert.equal(updateGenericMapping([ordinary], ordinary.id, { metricKey: "factoryGeneration.todayMwh" })[0]?.metricKey, ordinary.metricKey);
  assert.equal(updateGenericMapping([ordinary], ordinary.id, { topic: "factory/cl/updated" })[0]?.topic, "factory/cl/updated");
});

test("generic save payload includes metricScope for CL and KN same-key mappings", () => {
  const payload = buildTopicMappingsSavePayload(baseModel.topics);

  assert.deepEqual(
    payload.filter(({ metricKey }) => metricKey === "factoryCircuit.stampingPower").map(({ metricScope, topic }) => ({ metricScope, topic })),
    [
      { metricScope: "cl", topic: "factory/cl/stamping" },
      { metricScope: "kn", topic: "factory/kn/stamping" }
    ]
  );
});

test("a CL live update changes only CL activity and preserves source ownership", () => {
  const updated = applySourcesLiveSnapshot(baseModel, {
    metricScope: "cl",
    metrics: {
      "factoryCircuit.stampingPower": {
        quality: "good",
        timestamp: "2026-08-31T03:02:00.000Z",
        unit: "kW",
        value: 8.4
      },
      "factoryGeneration.todayMwh": {
        quality: "good",
        timestamp: "2026-08-31T03:02:01.000Z",
        unit: "MWh",
        value: 1.2
      }
    },
    timestamp: "2026-08-31T03:02:01.000Z"
  });

  assert.equal(updated.topics[0]?.lastValue, 8.4);
  assert.equal(updated.topics[0]?.lastReceivedAt, "2026-08-31T03:02:00.000Z");
  assert.equal(updated.topics[1]?.lastValue, null);
  assert.equal(updated.solar.sources[0]?.sourceTimestamp, "2026-08-31T03:02:01.000Z");
  assert.deepEqual(buildSourceRows(updated).map(({ id, ownership }) => ({ id, ownership })),
    buildSourceRows(baseModel).map(({ id, ownership }) => ({ id, ownership })));
});

test("stable ownership save conflicts become operator-visible feedback", () => {
  const error = Object.assign(new Error("raw conflict"), {
    body: { code: "MANAGED_SOURCE_METRIC_CONFLICT" }
  });
  assert.match(resolveSourcesSaveErrorMessage(error), /Solar adapter/);

  const html = renderSourcesContent({
    initialErrorMessage: "此 metric identity 已由 Solar adapter 管理，無法儲存 generic mapping。",
    model: baseModel,
    onRefresh: async () => undefined,
    onSave: async () => undefined
  });
  assert.match(html, /data-source-error/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Solar adapter/);
});

test("Sources renders source type, scope, health, ownership, and generic controls", () => {
  const html = renderSourcesContent({ model: baseModel, onRefresh: async () => undefined, onSave: async () => undefined });

  assert.match(html, /data-source-kind="managed"/);
  assert.match(html, /Solar Collector/);
  assert.match(html, /data-source-scope="cl"/);
  assert.match(html, /data-source-ownership="managed"/);
  assert.match(html, /data-source-kind="generic"/);
  assert.match(html, /data-source-scope="kn"/);
  assert.match(html, /KN 沖床/);
  assert.match(html, /data-source-open/);
  assert.doesNotMatch(html, /name="metricKey"/);
  assert.doesNotMatch(html, /rawPayload|\{\"value\":4\.2\}/);
});

test("Managed Solar adapter keeps secondary details out of the collapsed summary row", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { pretendToBeVisual: true, url: "http://127.0.0.1/settings/data-hub/sources" }
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

  const managed = buildSourceRows(baseModel).find((row) => row.kind === "managed");
  assert.ok(managed);
  let root: Root | null = null;

  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(<ManagedSourceCard row={managed} />);
      await Promise.resolve();
    });

    const card = dom.window.document.querySelector<HTMLElement>('[data-source-kind="managed"]');
    assert.ok(card);
    const summary = card.querySelector("header");
    assert.ok(summary);
    assert.match(summary.textContent ?? "", /Healthy/);
    assert.match(summary.textContent ?? "", /solar\/CL\/summary/);
    assert.match(summary.textContent ?? "", /自動探索 1 個分區/);

    assert.equal(card.querySelector("[data-source-meta]") === null, true);
    assert.equal(card.querySelector("[data-source-resources]") === null, true);
    assert.equal(card.querySelector("[data-source-owned-metrics]") === null, true);

    const toggle = card.querySelector<HTMLButtonElement>("button");
    assert.ok(toggle);
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    await act(async () => {
      toggle.click();
      await Promise.resolve();
    });

    assert.equal(toggle.getAttribute("aria-expanded"), "true");
    assert.equal(Boolean(card.querySelector("[data-source-meta]")), true);
    assert.equal(Boolean(card.querySelector("[data-source-resources]")), true);
    assert.equal(Boolean(card.querySelector("[data-source-owned-metrics]")), true);
    assert.match(card.textContent ?? "", /屋頂區/);
    assert.match(card.textContent ?? "", /factoryGeneration\.todayMwh/);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    Object.defineProperty(globalThis, "document", { configurable: true, value: previousGlobals.document, writable: true });
    Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: previousGlobals.HTMLElement, writable: true });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: previousGlobals.navigator, writable: true });
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousGlobals.window, writable: true });
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = previousGlobals.isReactActEnvironment;
    dom.window.close();
  }
});

test("Sources exposes consolidated generic mapping controls including add topic and test publish", () => {
  const html = renderSourcesContent({ model: baseModel, onRefresh: async () => undefined, onSave: async () => undefined });

  assert.match(html, /新增通用 MQTT 主題/);
  assert.match(html, /搜尋名稱、代碼或主題/);
  assert.match(html, /來源篩選/);
});

test("Sources refresh asks before discarding dirty mappings", () => {
  let confirmCalls = 0;
  assert.equal(canRefreshSources(false, () => { confirmCalls += 1; return false; }), true);
  assert.equal(canRefreshSources(true, () => { confirmCalls += 1; return false; }), false);
  assert.equal(canRefreshSources(true, () => { confirmCalls += 1; return true; }), true);
  assert.equal(confirmCalls, 2);
});

test("Sources blocks dirty route navigation and full-document unload", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { pretendToBeVisual: true, url: "http://127.0.0.1/settings/data-hub/sources" }
  );
  for (const [key, value] of Object.entries({
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    navigator: dom.window.navigator,
    window: dom.window
  })) {
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  rememberDataHubSourcesModel(baseModel);
  const router = createMemoryRouter([
    {
      element: <DataHubSources />,
      path: "/settings/data-hub/sources"
    },
    {
      element: <div data-testid="other-section">Other Section</div>,
      path: "/settings/data-hub/connections"
    }
  ], { initialEntries: ["/settings/data-hub/sources"] });
  let root: Root | null = null;
  let confirmResult = false;
  dom.window.confirm = () => confirmResult;

  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(<RouterProvider router={router} />);
      await Promise.resolve();
    });

    const openButton = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-source-id="mqtt:cl:factoryCircuit.stampingPower:10"] [data-source-open]'
    );
    assert.ok(openButton);
    await act(async () => {
      openButton.click();
      await Promise.resolve();
    });
    const enabledInput = dom.window.document.querySelector<HTMLInputElement>("input[name=enabled]");
    assert.ok(enabledInput);
    await act(async () => {
      enabledInput.click();
      await Promise.resolve();
    });

    assert.equal(
      dom.window.document.querySelector<HTMLButtonElement>("button.primary")?.disabled,
      false
    );
    const beforeUnload = new dom.window.Event("beforeunload", { cancelable: true });
    dom.window.dispatchEvent(beforeUnload);
    assert.equal(beforeUnload.defaultPrevented, true);

    await act(async () => {
      void router.navigate("/settings/data-hub/connections");
      await Promise.resolve();
    });
    assert.equal(router.state.location.pathname, "/settings/data-hub/sources");

    confirmResult = true;
    await act(async () => {
      void router.navigate("/settings/data-hub/connections");
      await Promise.resolve();
    });
    assert.equal(router.state.location.pathname, "/settings/data-hub/connections");
  } finally {
    await act(async () => {
      root?.unmount();
    });
    router.dispose();
    getSocketClient().disconnect();
    dom.window.close();
  }
});

test("Sources refresh cancellation preserves every generic mapping draft field", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { pretendToBeVisual: true, url: "http://127.0.0.1/settings/data-hub/sources" }
  );
  for (const [key, value] of Object.entries({
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    navigator: dom.window.navigator,
    window: dom.window
  })) {
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  let refreshCalls = 0;
  let root: Root | null = null;
  let confirmResult = false;
  dom.window.confirm = () => confirmResult;

  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/settings/data-hub/sources"]}>
          <DataHubSourcesContent
            model={baseModel}
            onRefresh={() => { refreshCalls += 1; }}
            onSave={async () => undefined}
          />
        </MemoryRouter>
      );
      await Promise.resolve();
    });

    const openButton = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-source-id="mqtt:cl:factoryCircuit.stampingPower:10"] [data-source-open]'
    );
    assert.ok(openButton);
    await act(async () => {
      openButton.click();
      await Promise.resolve();
    });
    const row = dom.window.document.querySelector<HTMLElement>("[data-source-drawer] [data-source-kind=generic]");
    assert.ok(row);
    const topic = row.querySelector<HTMLInputElement>('input[name="topic"]');
    const unit = row.querySelector<HTMLInputElement>('input[name="unit"]');
    const valuePath = row.querySelector<HTMLInputElement>('input[name="valuePath"]');
    const multiplier = row.querySelector<HTMLInputElement>('input[name="multiplier"]');
    const nameZh = row.querySelector<HTMLInputElement>('input[name="nameZh"]');
    const nameEn = row.querySelector<HTMLInputElement>('input[name="nameEn"]');
    const scope = row.querySelector<HTMLSelectElement>('select[name="metricScope"]');
    const enabled = row.querySelector<HTMLInputElement>('input[name="enabled"]');
    assert.ok(topic && unit && valuePath && multiplier && nameZh && nameEn && scope && enabled);

    const setInputValue = (input: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, value);
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    };
    await act(async () => {
      setInputValue(topic, "factory/cl/refreshed");
      setInputValue(unit, "MW");
      setInputValue(valuePath, "$.reading");
      setInputValue(multiplier, "2");
      setInputValue(nameZh, "CL 更新");
      setInputValue(nameEn, "CL Updated");
      scope.value = "global";
      scope.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      enabled.click();
      await Promise.resolve();
    });

    assert.equal(topic.value, "factory/cl/refreshed");
    assert.equal(unit.value, "MW");
    assert.equal(valuePath.value, "$.reading");
    assert.equal(multiplier.value, "2");
    assert.equal(nameZh.value, "CL 更新");
    assert.equal(nameEn.value, "CL Updated");
    assert.equal(scope.value, "global");
    assert.equal(enabled.checked, false);

    const refresh = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes("重新整理"));
    assert.ok(refresh);
    await act(async () => {
      refresh.click();
      await Promise.resolve();
    });

    assert.equal(refreshCalls, 0);
    assert.equal(topic.value, "factory/cl/refreshed");
    assert.equal(unit.value, "MW");
    assert.equal(valuePath.value, "$.reading");
    assert.equal(multiplier.value, "2");
    assert.equal(nameZh.value, "CL 更新");
    assert.equal(nameEn.value, "CL Updated");
    assert.equal(scope.value, "global");
    assert.equal(enabled.checked, false);

    confirmResult = true;
    await act(async () => {
      refresh.click();
      await Promise.resolve();
    });
    assert.equal(refreshCalls, 1);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    getSocketClient().disconnect();
    dom.window.close();
  }
});

function installDom(url: string) {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
    url
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
  return dom;
}

test("U1-R4-S01 filtering KN unhealthy sources by name hides other rows", () => {
  const model: DataHubSourcesModel = {
    ...baseModel,
    topics: [
      ...baseModel.topics,
      {
        ...baseModel.topics[1]!,
        id: 21,
        nameZh: "KN 空壓",
        quality: "stale",
        topic: "factory/kn/air"
      }
    ]
  };
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/settings/data-hub/sources?scope=kn&filter=issue&q=%E7%A9%BA%E5%A3%93"]}>
      <DataHubSourcesContent model={model} onRefresh={async () => undefined} onSave={async () => undefined} />
    </MemoryRouter>
  );
  assert.match(html, /KN 空壓/);
  assert.doesNotMatch(html, /CL 沖床/);
  assert.match(html, /品質異常/);
});

test("U1-R2-S01 adding a source under KN selects KN instead of CL", async () => {
  const dom = installDom("http://127.0.0.1/settings/data-hub/sources?scope=kn");
  let root: Root | null = null;
  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/settings/data-hub/sources?scope=kn"]}>
          <DataHubSourcesContent model={baseModel} onRefresh={async () => undefined} onSave={async () => undefined} />
        </MemoryRouter>
      );
      await Promise.resolve();
    });
    const add = [...dom.window.document.querySelectorAll("button")].find((button) => button.textContent?.includes("新增通用 MQTT 主題"));
    assert.ok(add);
    await act(async () => {
      add.click();
      await Promise.resolve();
    });
    const scope = dom.window.document.querySelector<HTMLSelectElement>('select[name="metricScope"]');
    assert.ok(scope);
    assert.equal(scope.value, "kn");
  } finally {
    await act(async () => {
      root?.unmount();
    });
    getSocketClient().disconnect();
    dom.window.close();
  }
});

test("U1-R2-S02 creating a physical meter under all requires a site before save", async () => {
  const dom = installDom("http://127.0.0.1/settings/data-hub/sources?scope=all");
  let root: Root | null = null;
  let saved = false;
  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/settings/data-hub/sources?scope=all"]}>
          <DataHubSourcesContent
            model={baseModel}
            onRefresh={async () => undefined}
            onSave={async () => {
              saved = true;
            }}
          />
        </MemoryRouter>
      );
      await Promise.resolve();
    });
    const add = [...dom.window.document.querySelectorAll("button")].find((button) => button.textContent?.includes("新增通用 MQTT 主題"));
    assert.ok(add);
    await act(async () => {
      add.click();
      await Promise.resolve();
    });
    const scope = dom.window.document.querySelector<HTMLSelectElement>('select[name="metricScope"]');
    assert.ok(scope);
    assert.equal(scope.value, "");
    const save = [...dom.window.document.querySelectorAll("button")].find((button) => button.textContent?.includes("儲存 mappings"));
    assert.ok(save);
    await act(async () => {
      save.click();
      await Promise.resolve();
    });
    assert.equal(saved, false);
    assert.match(dom.window.document.body.textContent ?? "", /CL 或 KN/);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    getSocketClient().disconnect();
    dom.window.close();
  }
});

test("U1-R6-S01 closing the source drawer returns focus to the initiating row", async () => {
  const dom = installDom("http://127.0.0.1/settings/data-hub/sources");
  let root: Root | null = null;
  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/settings/data-hub/sources"]}>
          <DataHubSourcesContent model={baseModel} onRefresh={async () => undefined} onSave={async () => undefined} />
        </MemoryRouter>
      );
      await Promise.resolve();
    });
    const openButton = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-source-id="mqtt:cl:factoryCircuit.stampingPower:10"] [data-source-open]'
    );
    assert.ok(openButton);
    await act(async () => {
      openButton.click();
      await Promise.resolve();
    });
    assert.ok(dom.window.document.querySelector("[data-source-drawer]"));
    assert.match(dom.window.document.body.textContent ?? "", /測試發佈/);
    assert.match(dom.window.document.body.textContent ?? "", /刪除/);
    const close = [...dom.window.document.querySelectorAll("button")].find((button) => button.textContent === "關閉");
    assert.ok(close);
    await act(async () => {
      close.click();
      await Promise.resolve();
    });
    assert.equal(dom.window.document.querySelector("[data-source-drawer]"), null);
    assert.equal(dom.window.document.activeElement, openButton);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    getSocketClient().disconnect();
    dom.window.close();
  }
});

test("U1-R6-S02 drawer actions stay wrapped and reachable at 1366-class layout", () => {
  const html = renderSourcesContent({ model: baseModel, onRefresh: async () => undefined, onSave: async () => undefined });
  assert.match(html, /data-workspace-safe-viewport="1366"/);
  assert.match(html, /min-h-\[40px\]/);
  assert.match(html, /flex-wrap/);
});

test("U1-R5-S01 saving a KN edit from a filtered view keeps the CL mapping byte-equivalent", async () => {
  const dom = installDom("http://127.0.0.1/settings/data-hub/sources?scope=kn");
  let root: Root | null = null;
  const capturedPayloads: Array<ReturnType<typeof buildTopicMappingsSavePayload>> = [];
  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/settings/data-hub/sources?scope=kn"]}>
          <DataHubSourcesContent
            model={baseModel}
            onRefresh={async () => undefined}
            onSave={async (topics) => {
              capturedPayloads.push(topics);
            }}
          />
        </MemoryRouter>
      );
      await Promise.resolve();
    });
    const openButton = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-source-id="mqtt:kn:factoryCircuit.stampingPower:11"] [data-source-open]'
    );
    assert.ok(openButton);
    await act(async () => {
      openButton.click();
      await Promise.resolve();
    });
    const enabled = dom.window.document.querySelector<HTMLInputElement>("input[name=enabled]");
    assert.ok(enabled);
    await act(async () => {
      enabled.click();
      await Promise.resolve();
    });
    const save = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes("儲存 mappings") && !button.disabled);
    assert.ok(save);
    await act(async () => {
      save.click();
      await Promise.resolve();
    });
    const savedPayload = capturedPayloads[0];
    if (!savedPayload) {
      throw new Error("expected a save payload");
    }
    const originalCl = buildTopicMappingsSavePayload(baseModel.topics.filter((topic) => topic.metricScope === "cl"));
    const savedCl = savedPayload.filter((topic) => topic.metricScope === "cl");
    assert.equal(JSON.stringify(savedCl), JSON.stringify(originalCl));
    assert.equal(savedPayload.find((topic) => topic.metricScope === "kn")?.enabled, false);
    assert.equal(savedPayload.find((topic) => topic.metricScope === "kn")?.nameZh, "KN 沖床");
  } finally {
    await act(async () => {
      root?.unmount();
    });
    getSocketClient().disconnect();
    dom.window.close();
  }
});

test("U1-R4-S02 managed adapter drawer states why fields are read-only", async () => {
  const dom = installDom("http://127.0.0.1/settings/data-hub/sources");
  let root: Root | null = null;
  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/settings/data-hub/sources"]}>
          <DataHubSourcesContent model={baseModel} onRefresh={async () => undefined} onSave={async () => undefined} />
        </MemoryRouter>
      );
      await Promise.resolve();
    });
    const openButton = dom.window.document.querySelector<HTMLButtonElement>(
      '[data-source-kind="managed"] [data-source-open]'
    );
    assert.ok(openButton);
    await act(async () => {
      openButton.click();
      await Promise.resolve();
    });
    assert.match(dom.window.document.body.textContent ?? "", /系統託管/);
    assert.match(dom.window.document.body.textContent ?? "", /無法在這裡修改/);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    getSocketClient().disconnect();
    dom.window.close();
  }
});
