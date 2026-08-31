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

test("Sources renders source type, scope, health, ownership, resources, and generic controls", () => {
  const html = renderSourcesContent({ model: baseModel, onRefresh: async () => undefined, onSave: async () => undefined });

  assert.match(html, /data-source-kind="managed"/);
  assert.match(html, /Solar Collector/);
  assert.match(html, /data-source-scope="cl"/);
  assert.match(html, /data-source-ownership="managed"/);
  assert.match(html, /factoryGeneration\.todayMwh/);
  assert.match(html, /屋頂區/);
  assert.match(html, /data-source-kind="generic"/);
  assert.match(html, /data-source-scope="kn"/);
  assert.match(html, /factory\/kn\/stamping/);
  assert.match(html, /name="metricKey"/);
  assert.match(html, /name="metricScope"/);
  assert.match(html, /name="topic"/);
  assert.match(html, /disabled=""[^>]*name="metricKey"/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /rawPayload|\{\"value\":4\.2\}/);
});

test("Sources exposes the retained MQTT operations entry point", () => {
  const html = renderSourcesContent({ model: baseModel, onRefresh: async () => undefined, onSave: async () => undefined });

  assert.match(html, /href="\/settings\/data-hub\/sources\/operations"/);
  assert.match(html, /進階 MQTT 維運/);
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
      element: <div data-testid="sources-operations">Operations</div>,
      path: "/settings/data-hub/sources/operations"
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

    const operationsLink = dom.window.document.querySelector<HTMLAnchorElement>(
      "a[href=\"/settings/data-hub/sources/operations\"]"
    );
    assert.ok(operationsLink);
    await act(async () => {
      operationsLink.click();
      await Promise.resolve();
    });
    assert.equal(router.state.location.pathname, "/settings/data-hub/sources");

    confirmResult = true;
    await act(async () => {
      operationsLink.click();
      await Promise.resolve();
    });
    assert.equal(router.state.location.pathname, "/settings/data-hub/sources/operations");
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

    const row = dom.window.document.querySelector<HTMLElement>('[data-source-kind="generic"]');
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
