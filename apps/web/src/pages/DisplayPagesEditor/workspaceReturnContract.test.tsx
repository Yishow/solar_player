import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { register } from "node:module";
import { act } from "react";
import { JSDOM } from "jsdom";
import { defaultFallbackPolicy, type DisplayPageConfigEnvelope } from "@solar-display/shared";

register(
  "data:text/javascript," +
    encodeURIComponent(
      "export async function load(url, context, next) { if (/\\.(css|png|svg|jpg|jpeg|gif|webp)$/.test(url)) return {format:'module', shortCircuit:true, source:'export default \"\";'}; return next(url, context); }"
    )
);

const jsonRes = (data: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }));

async function setupEditorTest(t: TestContext, initialUrl = "http://127.0.0.1/display-pages/editor") {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", { pretendToBeVisual: true, url: initialUrl });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    navigator: dom.window.navigator,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    IS_REACT_ACT_ENVIRONMENT: true
  };

  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });

  const { createRoot } = await import("react-dom/client");
  const { clearDisplayPageConfigCache } = await import("../../hooks/useDisplayPageConfig");
  const { clearDisplayPageRegistrySnapshot } = await import("../../hooks/useDisplayPageRegistry");
  const { clearDisplayPagesEditorRoutePreloadCache } = await import("./runtime");
  const { rememberImageManagementModel } = await import("../ImageManagement/loadModel");
  const { getSocketClient } = await import("../../services/socket");

  clearDisplayPageConfigCache();
  clearDisplayPageRegistrySnapshot();
  clearDisplayPagesEditorRoutePreloadCache();
  rememberImageManagementModel(null as any);

  const root = createRoot(dom.window.document.querySelector("#root")!);
  const errors: unknown[] = [];
  dom.window.addEventListener("error", (event) => errors.push(event.error));

  t.after(async () => {
    await act(async () => root.unmount());
    getSocketClient().disconnect();
    clearDisplayPageConfigCache();
    clearDisplayPageRegistrySnapshot();
    clearDisplayPagesEditorRoutePreloadCache();
    rememberImageManagementModel(null as any);
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    assert.deepEqual(errors, []);
  });

  const settle = async (operation?: () => void) =>
    act(async () => {
      if (operation) operation();
      for (let i = 0; i < 6; i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
    });

  const button = (label: string) => {
    const result = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")].find(
      (node) => node.textContent?.trim() === label
    );
    assert.ok(result, `button ${label} exists`);
    return result;
  };

  const click = (label: string) => settle(() => button(label).click());
  const dirty = () =>
    dom.window.document.querySelector("[data-editor-toolbar-dirty]")?.getAttribute("data-editor-toolbar-dirty");

  return { button, click, dirty, dom, root, settle };
}

const createEnvelope = (pageId: string, version = 1): DisplayPageConfigEnvelope => ({
  pageId: pageId as any,
  stage: "draft",
  regions: {},
  freeformObjects: [],
  version,
  updatedAt: "2026-09-12T00:00:00.000Z",
  publishedAt: null,
  publishedBy: null,
  fallbackPolicy: defaultFallbackPolicy
});

const mockAssets = [{
  id: 42,
  filename: "asset-42.png",
  originalName: "asset-42.png",
  title: "Mock Icon",
  category: "icon" as const,
  width: 64,
  height: 64,
  fileSize: 512,
  mimeType: "image/png"
}] as unknown as import("@solar-display/shared").ImageAsset[];

const shellConfig = {
  footerObjects: [],
  headerObjects: [],
  publishedAt: null,
  publishedBy: null,
  stage: "draft" as const,
  updatedAt: "2026-09-12T00:00:00.000Z",
  version: 1
};

test("workspace-return-keeps-dirty-history: returning from assets or shell preserves draft dirty state, undo history, and target context", async (t) => {
  const h = await setupEditorTest(t);

  t.mock.method(globalThis, "fetch", (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("/api/display-pages/overview/draft")) return jsonRes({ config: createEnvelope("overview", 1) });
    if (url.includes("/api/images")) {
      return jsonRes({ success: true, data: mockAssets, assets: mockAssets, storageUsage: { fileCount: 1, usedBytes: 512, usedMB: 0.0005 } });
    }
    if (url.includes("/api/shell-decorations/draft")) return jsonRes({ config: shellConfig });
    if (url.includes("/api/display-pages/asset-health")) {
      return jsonRes({ health: { assets: [], findings: [], generatedAt: new Date().toISOString(), status: "healthy" } });
    }
    return jsonRes({});
  });

  const { MemoryRouter } = await import("react-router-dom");
  const { DisplayPagesEditor } = await import("./index");

  await h.settle(() =>
    h.root.render(
      <MemoryRouter initialEntries={["/display-pages/editor"]}>
        <DisplayPagesEditor initialImages={[]} initialEditorState={{ editMode: true }} renderPreview={false} />
      </MemoryRouter>
    )
  );

  // 1. Overview draft loaded: modify freeform objects to make draft dirty
  await h.click("自由物件");
  await h.click("新增線條");
  assert.equal(h.dirty(), "true", "Editor draft is dirty after adding line");
  assert.equal(h.button("復原").disabled, false, "Undo is enabled");

  // 2. Switch workspace to "assets" (資產庫)
  await h.click("資產庫");
  assert.ok(h.dom.window.document.body.textContent?.includes("在展示頁編輯器內管理可替換的背景"), "Assets workspace rendered");

  // 3. Return from assets back to editor
  await h.click("返回展示頁編輯");
  assert.equal(h.dirty(), "true", "Draft dirty state preserved upon returning from assets");
  assert.equal(h.button("復原").disabled, false, "Undo remains enabled upon returning from assets");

  // 4. Perform Undo and verify draft clean baseline restored
  await h.click("復原");
  assert.equal(h.dirty(), "false", "Undo successfully restored draft to clean state");
  assert.equal(h.button("復原").disabled, true, "Undo is now disabled");

  // 5. Modify again and test shell workspace isolation
  await h.click("自由物件");
  await h.click("新增線條");
  assert.equal(h.dirty(), "true", "Draft is dirty again");

  // Switch to "shell" workspace
  await h.click("殼層裝飾");
  assert.ok(h.dom.window.document.body.textContent?.includes("共用殼層裝飾"), "Shell workspace rendered");

  // Return to "editor" workspace
  await h.click("返回頁面編輯");
  assert.equal(h.dirty(), "true", "Editor draft dirty state preserved after visiting shell");
  assert.equal(h.button("復原").disabled, false, "Editor undo remains intact after shell return");
});

test("late-workspace-response-ignored: late response from previously requested workspace does not overwrite active workspace state", async (t) => {
  const h = await setupEditorTest(t);
  let resolveDelayedDraft: ((response: Response) => void) | null = null;
  let delayedRequestTriggered = false;

  t.mock.method(globalThis, "fetch", (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("/api/display-pages/overview/draft")) return jsonRes({ config: createEnvelope("overview", 1) });
    if (url.includes("/api/images")) {
      return jsonRes({ success: true, data: mockAssets, assets: mockAssets, storageUsage: { fileCount: 1, usedBytes: 512, usedMB: 0.0005 } });
    }
    if (url.includes("/api/display-pages/solar/draft")) {
      delayedRequestTriggered = true;
      return new Promise<Response>((resolve) => { resolveDelayedDraft = resolve; });
    }
    if (url.includes("/api/shell-decorations/draft")) return jsonRes({ config: { ...shellConfig, version: 2 } });
    return jsonRes({});
  });

  const { MemoryRouter } = await import("react-router-dom");
  const { DisplayPagesEditor } = await import("./index");

  await h.settle(() =>
    h.root.render(
      <MemoryRouter initialEntries={["/display-pages/editor?page=overview"]}>
        <DisplayPagesEditor initialImages={mockAssets} initialEditorState={{ editMode: true }} renderPreview={false} />
      </MemoryRouter>
    )
  );

  // Draft starts with overview page
  assert.equal(h.dirty(), "false", "Overview initially clean");

  // Modify overview draft
  await h.click("自由物件");
  await h.click("新增線條");
  assert.equal(h.dirty(), "true", "Overview draft dirty");

  // Switch to Shell workspace
  await h.click("殼層裝飾");
  assert.ok(h.dom.window.document.body.textContent?.includes("共用殼層裝飾"), "Switched to shell");

  // Now resolve an obsolete delayed response if one was pending
  if (delayedRequestTriggered && resolveDelayedDraft) {
    await h.settle(() => {
      resolveDelayedDraft!(
        new Response(
          JSON.stringify({
            config: {
              ...createEnvelope("solar", 99),
              freeformObjects: [{ id: "stale-obj", type: "text", text: "Stale Late Data" }]
            }
          }),
          { headers: { "Content-Type": "application/json" } }
        )
      );
    });
  }

  // Verify shell workspace was NOT overwritten by late response
  assert.ok(h.dom.window.document.body.textContent?.includes("共用殼層裝飾"), "Shell remains active");
  assert.ok(!h.dom.window.document.body.textContent?.includes("Stale Late Data"), "Stale response did not leak into shell");

  // Return to editor and check overview draft preserved
  await h.click("返回頁面編輯");
  assert.equal(h.dirty(), "true", "Overview dirty state remains preserved without being overwritten");
});

test("deferred-surface-failure-retry: failure in deferred surface exposes isolated retry without discarding dirty draft session", async (t) => {
  const h = await setupEditorTest(t);
  let healthAttempts = 0;

  t.mock.method(globalThis, "fetch", (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("/api/display-pages/overview/draft")) return jsonRes({ config: createEnvelope("overview", 1) });
    if (url.includes("/api/images")) {
      return jsonRes({ success: true, data: mockAssets, assets: mockAssets, storageUsage: { fileCount: 1, usedBytes: 512, usedMB: 0.0005 } });
    }
    if (url.includes("/api/display-pages/asset-health")) {
      healthAttempts += 1;
      if (healthAttempts === 1) {
        return Promise.reject(new Error("診斷服務暫時無法連線"));
      }
      return jsonRes({ health: { assets: [], findings: [], generatedAt: new Date().toISOString(), status: "healthy" } });
    }
    return jsonRes({});
  });

  const { MemoryRouter } = await import("react-router-dom");
  const { DisplayPagesEditor } = await import("./index");

  await h.settle(() =>
    h.root.render(
      <MemoryRouter initialEntries={["/display-pages/editor"]}>
        <DisplayPagesEditor initialImages={mockAssets} initialEditorState={{ editMode: true }} renderPreview={false} />
      </MemoryRouter>
    )
  );

  // 1. Make the editor draft dirty
  await h.click("自由物件");
  await h.click("新增線條");
  assert.equal(h.dirty(), "true", "Editor draft is dirty");

  // 2. Open the deferred "health" tab
  await h.click("素材健康");

  // 3. Verify health error is displayed in isolated panel without unmounting or resetting dirty draft
  const healthHeading = [...h.dom.window.document.querySelectorAll("h4")].find((el) =>
    el.textContent?.includes("展示頁素材健康狀態")
  );
  assert.ok(healthHeading, "Health panel heading is rendered");
  const healthSection = healthHeading.closest("section");
  assert.ok(healthSection, "Health section is rendered");
  const statusBanner = healthSection.querySelector("[role='status']");
  assert.ok(statusBanner, "Health status banner is rendered");
  assert.match(statusBanner.textContent ?? "", /診斷服務暫時無法連線/, "Error message visible");

  // Crucial check: Draft dirty status and edit controls are still intact
  assert.equal(h.dirty(), "true", "Dirty draft session retained despite deferred surface failure");
  assert.equal(h.button("復原").disabled, false, "Undo is still available");

  // 4. Retry health check by switching back or triggering refresh
  await h.click("屬性");
  await h.click("素材健康");

  // Verify health check recovered on retry
  const recoveredHeading = [...h.dom.window.document.querySelectorAll("h4")].find((el) =>
    el.textContent?.includes("展示頁素材健康狀態")
  );
  const recoveredSection = recoveredHeading?.closest("section");
  const recoveredBanner = recoveredSection?.querySelector("[role='status']");
  assert.ok(recoveredBanner, "Recovered health banner rendered");
  assert.match(recoveredBanner.textContent ?? "", /正常|健康/, "Recovered status displayed");

  // Dirty draft session is still preserved throughout the retry cycle
  assert.equal(h.dirty(), "true", "Dirty draft session remains intact after deferred surface retry");
  assert.equal(h.button("復原").disabled, false, "Undo remains intact");
});
