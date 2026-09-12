import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { register } from "node:module";
import React, { act, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { MemoryRouter } from "react-router-dom";
import type { ImageAsset } from "@solar-display/shared";
import { createPerformanceAssets } from "../DisplayPagesEditor/uiPerformanceFixtures";
import { AssetLibrary } from "./index";
import { AssetLibraryCard, setAssetCardRenderListenerForTest } from "./AssetLibraryCard";

register(
  "data:text/javascript," +
    encodeURIComponent(
      "export async function load(url, context, next) { if (/\\.(css|png|svg|jpg|jpeg|gif|webp)$/.test(url)) return {format:'module', shortCircuit:true, source:'export default \"\";'}; return next(url, context); }"
    )
);

async function setupAssetLibraryTest(t: TestContext) {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/settings/assets"
  });

  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLButtonElement: dom.window.HTMLButtonElement,
    navigator: dom.window.navigator,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    IS_REACT_ACT_ENVIRONMENT: true
  };

  const descriptors = new Map(
    Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  );
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/references")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            references: {
              assetId: 1,
              blockingIssues: [],
              draftCount: 0,
              liveCount: 0,
              references: []
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } })
    );
  };

  const { createRoot } = await import("react-dom/client");
  const { getSocketClient } = await import("../../services/socket");
  const container = dom.window.document.querySelector("#root")!;
  const root = createRoot(container);

  t.after(async () => {
    await act(async () => root.unmount());
    getSocketClient().disconnect();
    globalThis.fetch = originalFetch;
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });

  return { dom, root, container };
}

test("asset-selection-renders-two: single selection updates only old and new cards in 1000 assets library", async (t) => {
  const { dom, root, container } = await setupAssetLibraryTest(t);
  const assets1000 = createPerformanceAssets(1000);
  const renderCounts = new Map<number, number>();

  setAssetCardRenderListenerForTest((id) => {
    renderCounts.set(id, (renderCounts.get(id) ?? 0) + 1);
  });
  t.after(() => {
    setAssetCardRenderListenerForTest(null);
  });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/settings/assets"]}>
        <AssetLibrary
          initialAssets={assets1000}
          initialAssetHealthReport={null}
        />
      </MemoryRouter>
    );
  });

  assert.equal(renderCounts.size, 1000, "Initial mount renders all 1000 cards");
  renderCounts.clear();

  const cardButtons = container.querySelectorAll<HTMLElement>(".asset-library-card");
  assert.equal(cardButtons.length, 1000);

  // Card 1 is initially selected
  assert.match(cardButtons[0]!.className, /border-\[var\(--shell-title-ink\)\]/);
  assert.doesNotMatch(cardButtons[1]!.className, /border-\[var\(--shell-title-ink\)\]/);

  // Select card 2 (id: 2)
  await act(async () => {
    cardButtons[1]!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });

  // Exactly card 1 (unselected) and card 2 (selected) must rerender
  assert.equal(renderCounts.size, 2, "At most two cards rerender on single selection change");
  assert.equal(renderCounts.get(1), 1, "Previous selected card rerendered exactly once");
  assert.equal(renderCounts.get(2), 1, "Next selected card rerendered exactly once");

  // Verify DOM reflects the new selection state
  assert.doesNotMatch(cardButtons[0]!.className, /border-\[var\(--shell-title-ink\)\]/);
  assert.match(cardButtons[1]!.className, /border-\[var\(--shell-title-ink\)\]/);
  assert.match(container.textContent ?? "", /Performance asset 0002/);
});

test("asset-batch-toggle-renders-one: toggling one batch checkbox rerenders only that card", async (t) => {
  const { dom, root, container } = await setupAssetLibraryTest(t);
  const assets1000 = createPerformanceAssets(1000);
  const renderCounts = new Map<number, number>();

  setAssetCardRenderListenerForTest((id) => {
    renderCounts.set(id, (renderCounts.get(id) ?? 0) + 1);
  });
  t.after(() => {
    setAssetCardRenderListenerForTest(null);
  });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/settings/assets"]}>
        <AssetLibrary
          initialAssets={assets1000}
          initialBatchMode={true}
          initialAssetHealthReport={null}
        />
      </MemoryRouter>
    );
  });

  assert.equal(renderCounts.size, 1000, "Initial mount renders 1000 cards in batch mode");
  renderCounts.clear();

  const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:not([disabled])');
  assert.ok(checkboxes.length >= 10);

  // Toggle card 5 (index 4, id: 5)
  await act(async () => {
    checkboxes[4]!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });

  // Exactly card 5 must rerender
  assert.equal(renderCounts.size, 1, "Only toggled card rerenders");
  assert.equal(renderCounts.get(5), 1, "Card 5 rerendered exactly once");

  // Verify batch selection count in floating batch bar
  const batchBar = container.querySelector(".asset-batch-bar");
  assert.ok(batchBar);
  assert.match(batchBar.textContent ?? "", /已選擇\s*1\s*筆資產/);
});

test("asset-delete-uses-latest-reference: stable callback respects latest reference state and guards deletion", async (t) => {
  const { dom, root, container } = await setupAssetLibraryTest(t);
  const initialList: ImageAsset[] = [
    {
      id: 101,
      filename: "test-101.png",
      originalName: "test-101.png",
      title: "Initial Unreferenced Asset",
      description: "Test description",
      mimeType: "image/png",
      fileSize: 100,
      width: 100,
      height: 100,
      aspectRatio: 1,
      includedInSlideshow: false,
      isCover: false,
      displayDuration: 15,
      displayOrder: 1,
      category: "background",
      usageScope: "both",
      usageSummary: { draftCount: 0, liveCount: 0, referenceCount: 0 },
      seedKey: null
    },
    {
      id: 102,
      filename: "test-102.png",
      originalName: "test-102.png",
      title: "Second Asset",
      description: "Test description 2",
      mimeType: "image/png",
      fileSize: 100,
      width: 100,
      height: 100,
      aspectRatio: 1,
      includedInSlideshow: false,
      isCover: false,
      displayDuration: 15,
      displayOrder: 2,
      category: "icon",
      usageScope: "both",
      usageSummary: { draftCount: 0, liveCount: 0, referenceCount: 0 },
      seedKey: null
    }
  ];

  let setExternalAssets!: (assets: ImageAsset[]) => void;
  function DynamicLibraryHarness() {
    const [assets, setAssets] = useState(initialList);
    setExternalAssets = setAssets;
    return (
      <MemoryRouter initialEntries={["/settings/assets"]}>
        <AssetLibrary initialAssets={assets} initialAssetHealthReport={null} />
      </MemoryRouter>
    );
  }

  await act(async () => {
    root.render(<DynamicLibraryHarness />);
  });

  // Verify delete button is initially present on card 101 (referenceCount is 0)
  const initialCards = container.querySelectorAll<HTMLElement>(".asset-library-card");
  const initialAsset101DeleteBtn = initialCards[0]!.querySelector<HTMLButtonElement>(".hover-delete-btn");
  assert.ok(initialAsset101DeleteBtn, "Delete button is present when asset is unreferenced");

  // Simulate external update: Asset 101 is now referenced by a draft/live page
  await act(async () => {
    setExternalAssets([
      {
        ...initialList[0]!,
        title: "Now Referenced Asset",
        usageSummary: { draftCount: 1, liveCount: 0, referenceCount: 1 }
      },
      initialList[1]!
    ]);
  });

  // Card 101 now renders lock icon instead of delete button
  const updatedCards = container.querySelectorAll<HTMLElement>(".asset-library-card");
  assert.ok(
    updatedCards[0]!.querySelector(".hover-lock-icon"),
    "Lock icon is rendered when asset becomes referenced"
  );
  assert.equal(
    updatedCards[0]!.querySelector(".hover-delete-btn"),
    null,
    "Delete button is removed when asset becomes referenced"
  );
  assert.equal(container.querySelector(".glass-confirm-dialog"), null, "Confirm dialog is not open");

  // Now test unreferenced asset 102 with updated title:
  await act(async () => {
    setExternalAssets([
      {
        ...initialList[0]!,
        usageSummary: { draftCount: 1, liveCount: 0, referenceCount: 1 }
      },
      {
        ...initialList[1]!,
        title: "Latest Title For Asset 102"
      }
    ]);
  });

  const finalCards = container.querySelectorAll<HTMLElement>(".asset-library-card");
  const card102DeleteBtn = finalCards[1]!.querySelector<HTMLButtonElement>(".hover-delete-btn");
  assert.ok(card102DeleteBtn, "Card 102 has delete button");

  await act(async () => {
    card102DeleteBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });

  // Dialog must be opened and display the LATEST asset title
  const confirmDialog = container.querySelector(".glass-confirm-dialog");
  assert.ok(confirmDialog, "Confirm dialog is opened for unreferenced asset");
  assert.match(confirmDialog.textContent ?? "", /Latest Title For Asset 102/, "Deletion uses latest asset state");
});

test("AssetLibraryCard rendered output matches baseline structure and lazy image attributes", () => {
  const dummyAsset = createPerformanceAssets(100)[0]!;
  const html = renderToStaticMarkup(
    React.createElement(AssetLibraryCard, {
      asset: dummyAsset,
      isSelected: false,
      thumbnailDensity: "comfortable",
      onSelect: () => {},
      isBatchMode: false
    })
  );

  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /Performance asset 0001/);
  assert.match(html, /class="[^"]*asset-library-card[^"]*"/);
});
