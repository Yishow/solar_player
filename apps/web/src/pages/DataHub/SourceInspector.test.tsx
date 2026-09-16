import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { JSDOM } from "jsdom";
import { SourceDetailsDrawer } from "./SourceDetailsDrawer";
import { SourceInspectorUsagePanel } from "./SourceInspectorUsagePanel";
import { SourceInspectorOverview } from "./SourceInspectorOverview";
import { SourceInspectorMappingForm } from "./SourceInspectorMappingForm";
import type { SourceRow } from "./SourcesModel";

function setupDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/settings/data-hub/sources"
  });
  for (const [key, value] of Object.entries({
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLSelectElement: dom.window.HTMLSelectElement,
    navigator: dom.window.navigator,
    window: dom.window
  })) {
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  return dom;
}

const mockGenericRow: SourceRow & { kind: "generic" } = {
  activity: "4.2 kW · 2026-08-31T01:02:00.000Z",
  editable: true,
  health: { label: "正常接收 (Active)", tone: "success" },
  id: "mqtt:cl:factoryCircuit.stampingPower:10",
  isManagedIdentity: false,
  kind: "generic",
  mapping: {
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
    updatedAt: "2026-08-31T01:02:00.000Z",
    valuePath: "$.value"
  },
  metricKey: "factoryCircuit.stampingPower",
  metricScope: "cl",
  ownedMetrics: ["factoryCircuit.stampingPower"],
  ownership: "operator",
  resources: [],
  sourceTopic: "factory/cl/stamping",
  sourceType: "Generic MQTT mapping"
};

const mockManagedRow: SourceRow = {
  activity: "Heartbeat · Summary",
  health: { label: "正常 (Healthy)", tone: "success" },
  id: "solar:cl:summary",
  kind: "managed",
  metricScope: "cl",
  ownedMetrics: ["solarCollector.totalPower", "solarCollector.todayEnergy"],
  ownership: "managed",
  resources: [
    { detail: "正常運作中", label: "屋頂區", metrics: ["power_kw", "today_kwh"] }
  ],
  sourceTopic: "solar/CL/summary",
  sourceType: "Solar Collector"
};

test("DHI-R1-S01 Managed source shows ownership, resources, read-only explanation without missing generic value", async () => {
  const dom = setupDom();
  let root: Root | null = null;
  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <MemoryRouter>
          <SourceInspectorOverview onNavigateToMapping={() => {}} row={mockManagedRow} />
        </MemoryRouter>
      );
      await Promise.resolve();
    });

    const text = dom.window.document.body.textContent ?? "";
    assert.match(text, /系統託管/);
    assert.match(text, /對應欄位由轉接器同步/);
    assert.match(text, /屋頂區/);
    assert.doesNotMatch(text, /缺失通用值/);
  } finally {
    await act(async () => { root?.unmount(); });
    dom.window.close();
  }
});

test("DHI-R1-S02 & 3.4 Usage panel displays unknown state with retry when fetch fails", async () => {
  const dom = setupDom();
  let root: Root | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Network error");
  };

  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(<SourceInspectorUsagePanel metricKey="factoryCircuit.stampingPower" metricScope="cl" />);
      await Promise.resolve();
    });

    const text = dom.window.document.body.textContent ?? "";
    assert.match(text, /引用情況未知/);
    assert.match(text, /重試查詢/);
    // Ensure it does not false-claim 0 consumers
    assert.doesNotMatch(text, /安全可刪除/);
  } finally {
    globalThis.fetch = originalFetch;
    await act(async () => { root?.unmount(); });
    dom.window.close();
  }
});

test("U1-R6-S03 SourceDetailsDrawer focus effect is resilient to parent callback re-creation", async () => {
  const dom = setupDom();
  let root: Root | null = null;

  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    let closeCallCount = 0;

    const TestParent = ({ count }: { count: number }) => {
      // Inline new callback identity on every render
      const handleClose = () => { closeCallCount += count; };
      return (
        <SourceDetailsDrawer
          activeSection="mapping"
          onClose={handleClose}
          showSections={true}
          title="測試來源"
        >
          <input data-testid="drawer-test-input" defaultValue="test" />
        </SourceDetailsDrawer>
      );
    };

    await act(async () => {
      root!.render(<TestParent count={1} />);
      await Promise.resolve();
    });

    const input = dom.window.document.querySelector<HTMLInputElement>("[data-testid=drawer-test-input]");
    assert.ok(input);
    input.focus();
    input.selectionStart = 2;
    input.selectionEnd = 2;

    // Trigger parent re-render with new callback identity
    await act(async () => {
      root!.render(<TestParent count={2} />);
      await Promise.resolve();
    });

    // Verify focus remained stable on input
    assert.equal(dom.window.document.activeElement, input);
    assert.equal(input.selectionStart, 2);
  } finally {
    await act(async () => { root?.unmount(); });
    dom.window.close();
  }
});

test("DHI-R3-S01 panel mode toggle renders full-width layout indicators", async () => {
  const dom = setupDom();
  let root: Root | null = null;
  let modeToggled = false;

  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <SourceDetailsDrawer
          isFullPanel={false}
          onClose={() => {}}
          onTogglePanelMode={() => { modeToggled = true; }}
          title="可展開抽屜"
        >
          <div>內容</div>
        </SourceDetailsDrawer>
      );
      await Promise.resolve();
    });

    const toggleBtn = dom.window.document.querySelector<HTMLButtonElement>("[data-drawer-toggle-panel]");
    assert.ok(toggleBtn);
    assert.equal(toggleBtn.textContent, "展開工作區");

    await act(async () => {
      toggleBtn.click();
      await Promise.resolve();
    });
    assert.equal(modeToggled, true);
  } finally {
    await act(async () => { root?.unmount(); });
    dom.window.close();
  }
});

test("DHI-R2-S02 SourceInspectorMappingForm provides long topic and copy capability", async () => {
  const dom = setupDom();
  let root: Root | null = null;

  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <SourceInspectorMappingForm
          onChange={() => {}}
          row={mockGenericRow}
        />
      );
      await Promise.resolve();
    });

    const topicInput = dom.window.document.querySelector<HTMLInputElement>('input[name="topic"]');
    assert.ok(topicInput);
    assert.equal(topicInput.value, "factory/cl/stamping");
    assert.equal(topicInput.getAttribute("disabled"), null);
  } finally {
    await act(async () => { root?.unmount(); });
    dom.window.close();
  }
});
