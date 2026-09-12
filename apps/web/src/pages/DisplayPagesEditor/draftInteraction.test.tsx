import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { register } from "node:module";
import { act } from "react";
import { JSDOM } from "jsdom";
import { defaultFallbackPolicy, type DisplayPageConfigEnvelope } from "@solar-display/shared";

register("data:text/javascript," + encodeURIComponent("export async function load(url, context, next) { if (url.endsWith('.css')) return {format:'module', shortCircuit:true, source:''}; return next(url, context); }"));

async function mountEditor(t: TestContext) {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", { pretendToBeVisual: true, url: "http://127.0.0.1/display-pages/editor" });
  const globals = { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, navigator: dom.window.navigator, requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), ResizeObserver: class { observe() {} disconnect() {} }, IS_REACT_ACT_ENVIRONMENT: true };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const { DisplayPagesEditor } = await import("./index");
  const { clearDisplayPageConfigCache, resolveCachedDisplayPageConfigSession } = await import("../../hooks/useDisplayPageConfig");
  const { getSocketClient } = await import("../../services/socket");
  clearDisplayPageConfigCache();
  const reads: Array<{ resolve: (response: Response) => void; reject: (reason: Error) => void }> = [];
  t.mock.method(globalThis, "fetch", () => new Promise<Response>((resolve, reject) => reads.push({ resolve, reject })));
  const root = createRoot(dom.window.document.querySelector("#root")!);
  const errors: unknown[] = [];
  dom.window.addEventListener("error", (event) => errors.push(event.error));
  t.after(async () => {
    await act(async () => root.unmount());
    getSocketClient().disconnect();
    clearDisplayPageConfigCache();
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    assert.deepEqual(errors, []);
  });
  const settle = async (operation: () => void) => act(async () => { operation(); for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); });
  await settle(() => root.render(<MemoryRouter><DisplayPagesEditor initialImages={[]} initialEditorState={{ editMode: true }} renderPreview={false} /></MemoryRouter>));
  const button = (label: string) => {
    const result = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")].find((node) => node.textContent?.trim() === label);
    assert.ok(result, `button ${label} exists`);
    return result;
  };
  const click = (label: string) => settle(() => button(label).click());
  const envelope = (version: number): DisplayPageConfigEnvelope => ({ pageId: "overview", stage: "draft", regions: {}, freeformObjects: [], version, updatedAt: `2026-09-12T00:00:0${version}.000Z`, publishedAt: null, publishedBy: null, fallbackPolicy: defaultFallbackPolicy });
  const respond = (index: number, version = 4) => settle(() => reads[index]!.resolve(new Response(JSON.stringify({ config: envelope(version) }), { headers: { "Content-Type": "application/json" } })));
  const dirty = () => dom.window.document.querySelector("[data-editor-toolbar-dirty]")?.getAttribute("data-editor-toolbar-dirty");
  return { dom, reads, settle, button, click, respond, dirty, cached: () => resolveCachedDisplayPageConfigSession("overview", "draft", {})?.lastLoadedEnvelope.version };
}

test("draft-cold-edit-blocked: editor exposes loading, locked controls, and failure retry", async (t) => {
  const h = await mountEditor(t);
  assert.match(h.dom.window.document.querySelector("[data-editor-toolbar-dirty]")!.textContent!, /載入/);
  assert.ok(h.dom.window.document.querySelector("fieldset[data-editor-draft-controls][disabled]"));
  assert.equal(h.button("儲存草稿").disabled, true);
  await h.settle(() => h.reads[0]!.reject(new Error("草稿讀取失敗")));
  assert.equal(h.button("重新同步").disabled, false);
  await h.click("重新同步");
  await h.respond(1);
  assert.equal(h.dom.window.document.querySelector("fieldset[data-editor-draft-controls][disabled]"), null);
  await h.click("自由物件");
  await h.click("新增線條");
  assert.equal(h.dirty(), "true");
});

for (const outcome of ["cancel", "confirm", "read-failure"] as const) {
  test(`draft-discard-${outcome}: actual editor preserves or replaces the draft as confirmed`, async (t) => {
    const h = await mountEditor(t);
    await h.respond(0);
    await h.click("自由物件");
    await h.click("新增線條");
    assert.equal(h.dirty(), "true");
    assert.equal(h.button("復原").disabled, false);
    let confirmations = 0;
    h.dom.window.confirm = (message) => { confirmations += 1; assert.match(message ?? "", /捨棄.*未儲存/); return outcome !== "cancel"; };
    await h.click("重新同步");
    assert.equal(confirmations, 1);
    if (outcome === "cancel") {
      assert.equal(h.reads.length, 1);
    } else {
      assert.equal(h.reads.length, 2);
      assert.equal(h.button("儲存草稿").disabled, true);
      for (const button of h.dom.window.document.querySelectorAll<HTMLButtonElement>("button")) {
        if (["復原", "重做"].includes(button.textContent?.trim() ?? "")) assert.equal(button.disabled, true, "toolbar and canvas history share the pending gate");
      }
      if (outcome === "confirm") await h.respond(1, 5);
      else await h.settle(() => h.reads[1]!.reject(new Error("重載讀取失敗")));
    }
    assert.equal(h.dirty(), outcome === "confirm" ? "false" : "true");
    assert.equal(h.button("復原").disabled, outcome === "confirm");
    assert.equal(h.cached(), outcome === "confirm" ? 5 : 4);
    if (outcome === "read-failure") assert.match(h.dom.window.document.body.textContent!, /重載讀取失敗/);
    if (outcome !== "confirm") {
      await h.click("復原");
      assert.equal(h.dirty(), "false");
    }
  });
}
