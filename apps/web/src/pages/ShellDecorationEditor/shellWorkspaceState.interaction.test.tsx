import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { act } from "react";
import React, { useState } from "react";
import { register } from "node:module";
import { JSDOM } from "jsdom";
import { defaultFallbackPolicy, type DisplayPageConfigEnvelope, type ImageAsset, type ShellDecorationEnvelope } from "@solar-display/shared";
import {
  createShellWorkspaceState,
  isShellWorkspaceDirty,
  updateShellWorkspaceDraft
} from "../DisplayPagesEditor/shellWorkspaceState";

register("data:text/javascript," + encodeURIComponent("export async function load(url, context, next) { if (url.endsWith('.css')) return {format:'module', shortCircuit:true, source:''}; return next(url, context); }"));

const initialDraft: ShellDecorationEnvelope = {
  footerObjects: [],
  headerObjects: [{
    frame: { height: 2, left: 86, top: 24, width: 320 },
    id: "header-line",
    locked: false,
    metadata: {},
    mount: "header",
    source: { kind: "line" },
    style: { color: "#d2b46a", thickness: 2 },
    type: "line",
    visible: true,
    zIndex: 1
  }],
  publishedAt: null,
  publishedBy: null,
  stage: "draft",
  updatedAt: "2026-09-12T00:00:00.000Z",
  version: 3
};

const initialImages: ImageAsset[] = [];

const shellImages: ImageAsset[] = [
  {
    aspectRatio: 1,
    description: "first shell asset",
    displayDuration: 15,
    displayOrder: 1,
    fileSize: 1024,
    filename: "first-shell.png",
    height: 400,
    id: 7,
    includedInSlideshow: false,
    isCover: false,
    mimeType: "image/png",
    originalName: "first-shell.png",
    title: "First shell asset",
    usageScope: "shell-only",
    usageSummary: { draftCount: 1, liveCount: 0, referenceCount: 1 },
    width: 400
  },
  {
    aspectRatio: 1,
    description: "second shell asset",
    displayDuration: 15,
    displayOrder: 2,
    fileSize: 1024,
    filename: "second-shell.png",
    height: 400,
    id: 8,
    includedInSlideshow: false,
    isCover: false,
    mimeType: "image/png",
    originalName: "second-shell.png",
    title: "Second shell asset",
    usageScope: "shell-only",
    usageSummary: { draftCount: 1, liveCount: 0, referenceCount: 1 },
    width: 400
  }
];

const assetDraft: ShellDecorationEnvelope = {
  ...initialDraft,
  headerObjects: [{
    frame: { height: 40, left: 120, top: 12, width: 120 },
    id: "header-logo",
    locked: false,
    metadata: {},
    mount: "header",
    source: {
      assetId: 7,
      fallbackSrc: "http://localhost:3000/uploads/images/first-shell.png",
      kind: "asset-image"
    },
    style: {},
    type: "asset-image",
    visible: true,
    zIndex: 1
  }]
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

function pageEnvelope(): DisplayPageConfigEnvelope {
  return {
    fallbackPolicy: defaultFallbackPolicy,
    freeformObjects: [],
    pageId: "overview",
    publishedAt: null,
    publishedBy: null,
    regions: {},
    stage: "draft",
    updatedAt: "2026-09-12T00:00:00.000Z",
    version: 7
  };
}

test("shell-parent-child-dirty-parity: save response metadata clears parent and embedded indicators", async (t: TestContext) => {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/display-pages/editor?workspace=shell"
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const { DisplayPagesEditor } = await import("../DisplayPagesEditor/index");
  const { clearDisplayPageConfigCache, primeDisplayPageConfigCache } = await import("../../hooks/useDisplayPageConfig");
  const { getSocketClient } = await import("../../services/socket");
  primeDisplayPageConfigCache("overview", "draft", pageEnvelope());
  const saveResponse = deferred<Response>();
  let saveInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", (_input: RequestInfo | URL, init?: RequestInit) => {
    saveInit = init;
    return saveResponse.promise;
  });
  const root = createRoot(dom.window.document.querySelector("#root")!);

  t.after(async () => {
    await act(async () => root.unmount());
    getSocketClient().disconnect();
    clearDisplayPageConfigCache();
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
  });

  await act(async () => root.render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?page=overview&workspace=shell"] },
      React.createElement(DisplayPagesEditor, {
        initialImages,
        initialShellDecorationDraft: initialDraft,
        initialShellDecorationImages: initialImages,
        renderPreview: false
      })
    )
  ));
  const button = (label: string) => {
    const result = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
      .find((node) => node.textContent?.trim() === label);
    assert.ok(result, `button ${label} exists`);
    return result;
  };
  await act(async () => button("新增物件").click());
  assert.ok(dom.window.document.querySelector("[data-shared-shell-dirty]"));
  assert.match(dom.window.document.body.textContent ?? "", /殼層尚未儲存/);

  await act(async () => button("儲存殼層草稿").click());
  assert.ok(saveInit?.body);
  const savedChannel = JSON.parse(String(saveInit?.body)) as {
    footerObjects: ShellDecorationEnvelope["footerObjects"];
    headerObjects: ShellDecorationEnvelope["headerObjects"];
  };
  const savedDraft: ShellDecorationEnvelope = {
    ...initialDraft,
    footerObjects: savedChannel.footerObjects,
    headerObjects: savedChannel.headerObjects,
    updatedAt: "2026-09-12T00:01:00.000Z",
    version: 4
  };
  await act(async () => saveResponse.resolve(new Response(JSON.stringify({ config: savedDraft }), { headers: { "Content-Type": "application/json" } })));

  assert.equal(dom.window.document.querySelector("[data-shared-shell-dirty]"), null);
  assert.match(dom.window.document.body.textContent ?? "", /殼層已同步/);
});

test("shell-save-pending-preserves-later-asset-edit: an older save response keeps the newer asset and advances the next base version", async (t: TestContext) => {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/display-pages/editor?workspace=shell"
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    navigator: dom.window.navigator,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    ResizeObserver: class { observe() {} disconnect() {} },
    IS_REACT_ACT_ENVIRONMENT: true
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const { DisplayPagesEditor } = await import("../DisplayPagesEditor/index");
  const { clearDisplayPageConfigCache, primeDisplayPageConfigCache } = await import("../../hooks/useDisplayPageConfig");
  const { getSocketClient } = await import("../../services/socket");
  primeDisplayPageConfigCache("overview", "draft", pageEnvelope());
  const saveResponses = [deferred<Response>(), deferred<Response>()];
  const saveRequests: RequestInit[] = [];
  t.mock.method(globalThis, "fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path.includes("/api/shell-decorations/draft") && init?.method === "PUT") {
      const response = saveResponses[saveRequests.length];
      assert.ok(response, `save response ${saveRequests.length + 1} exists`);
      saveRequests.push(init);
      return response.promise;
    }
    if (path.includes("/api/display-pages/asset-health")) {
      return Promise.resolve(new Response(JSON.stringify({
        health: { assets: [], findings: [], generatedAt: "2026-09-12T00:00:00.000Z", status: "healthy" }
      }), { headers: { "Content-Type": "application/json" } }));
    }
    if (path.includes("/api/display-ops/assets/")) {
      return Promise.resolve(new Response(JSON.stringify({
        references: { assetId: 8, blockingIssues: [], draftCount: 0, liveCount: 0, references: [] }
      }), { headers: { "Content-Type": "application/json" } }));
    }
    return Promise.resolve(new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } }));
  });
  const root = createRoot(dom.window.document.querySelector("#root")!);
  const errors: unknown[] = [];
  dom.window.addEventListener("error", (event) => errors.push(event.error));

  t.after(async () => {
    await act(async () => root.unmount());
    getSocketClient().disconnect();
    clearDisplayPageConfigCache();
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
    assert.deepEqual(errors, [], "save and asset workspace interaction must not throw browser errors");
  });

  const settle = async (operation: () => void) => act(async () => {
    operation();
    for (let index = 0; index < 5; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
  await settle(() => root.render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?page=overview&workspace=shell"] },
      React.createElement(DisplayPagesEditor, {
        initialImages: shellImages,
        initialShellDecorationDraft: assetDraft,
        initialShellDecorationImages: shellImages,
        renderPreview: false
      })
    )
  ));
  const button = (label: string) => {
    const result = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
      .find((node) => node.textContent?.trim() === label);
    assert.ok(result, `button ${label} exists`);
    return result;
  };
  const click = (label: string) => settle(() => button(label).click());

  await click("新增物件");
  await click("儲存殼層草稿");
  assert.equal(saveRequests.length, 1);
  const firstRequest = JSON.parse(String(saveRequests[0]!.body)) as {
    baseVersion: number;
    footerObjects: ShellDecorationEnvelope["footerObjects"];
    headerObjects: ShellDecorationEnvelope["headerObjects"];
  };
  assert.equal(firstRequest.baseVersion, assetDraft.version);

  const assetObjectButton = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
    .find((node) => node.textContent?.includes("圖片素材") && node.textContent?.includes("header-logo"));
  assert.ok(assetObjectButton, "initial asset object remains selectable while save is pending");
  await settle(() => assetObjectButton.click());
  await click("更換目前素材");
  const cards = [...dom.window.document.querySelectorAll<HTMLButtonElement>(".asset-library-card")];
  assert.equal(cards.length, 2);
  await settle(() => cards[1]!.click());
  await click("套用目前素材並返回");
  assert.ok(dom.window.document.querySelector("[data-shared-shell-dirty]"));
  assert.match(dom.window.document.body.textContent ?? "", /second-shell\.png/);

  const firstSavedDraft: ShellDecorationEnvelope = {
    ...assetDraft,
    footerObjects: firstRequest.footerObjects,
    headerObjects: firstRequest.headerObjects,
    updatedAt: "2026-09-12T00:05:00.000Z",
    version: 4
  };
  await settle(() => saveResponses[0]!.resolve(new Response(JSON.stringify({ config: firstSavedDraft }), {
    headers: { "Content-Type": "application/json" }
  })));

  assert.ok(dom.window.document.querySelector("[data-shared-shell-dirty]"), "later asset edit remains dirty in parent");
  assert.match(dom.window.document.body.textContent ?? "", /second-shell\.png/);
  assert.match(dom.window.document.body.textContent ?? "", /殼層尚未儲存/);

  await click("儲存殼層草稿");
  assert.equal(saveRequests.length, 2);
  const secondRequest = JSON.parse(String(saveRequests[1]!.body)) as {
    baseVersion: number;
    footerObjects: ShellDecorationEnvelope["footerObjects"];
    headerObjects: ShellDecorationEnvelope["headerObjects"];
  };
  assert.equal(secondRequest.baseVersion, firstSavedDraft.version);
  assert.ok(secondRequest.headerObjects.some((object) => object.type === "asset-image" && object.source.assetId === 8));
  assert.ok(secondRequest.headerObjects.some((object) => object.type === "line"));

  const secondSavedDraft: ShellDecorationEnvelope = {
    ...firstSavedDraft,
    footerObjects: secondRequest.footerObjects,
    headerObjects: secondRequest.headerObjects,
    updatedAt: "2026-09-12T00:06:00.000Z",
    version: 5
  };
  await settle(() => saveResponses[1]!.resolve(new Response(JSON.stringify({ config: secondSavedDraft }), {
    headers: { "Content-Type": "application/json" }
  })));
  assert.equal(dom.window.document.querySelector("[data-shared-shell-dirty]"), null);
  assert.doesNotMatch(dom.window.document.body.textContent ?? "", /殼層尚未儲存/);
});

test("shell-page-draft-isolation: page dirty remains after shell save and returning to page editor", async (t: TestContext) => {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/display-pages/editor?page=overview"
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    navigator: dom.window.navigator,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    ResizeObserver: class { observe() {} disconnect() {} },
    IS_REACT_ACT_ENVIRONMENT: true
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const { DisplayPagesEditor } = await import("../DisplayPagesEditor/index");
  const { clearDisplayPageConfigCache, primeDisplayPageConfigCache } = await import("../../hooks/useDisplayPageConfig");
  const { getSocketClient } = await import("../../services/socket");
  primeDisplayPageConfigCache("overview", "draft", pageEnvelope());
  const saveResponse = deferred<Response>();
  let saveInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", (_input: RequestInfo | URL, init?: RequestInit) => {
    saveInit = init;
    return saveResponse.promise;
  });
  const root = createRoot(dom.window.document.querySelector("#root")!);
  const errors: unknown[] = [];
  dom.window.addEventListener("error", (event) => errors.push(event.error));

  t.after(async () => {
    await act(async () => root.unmount());
    getSocketClient().disconnect();
    clearDisplayPageConfigCache();
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
    assert.deepEqual(errors, [], "page and shell interaction must not throw browser errors");
  });

  const settle = async (operation: () => void) => act(async () => {
    operation();
    for (let index = 0; index < 5; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
  await settle(() => root.render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?page=overview"] },
      React.createElement(DisplayPagesEditor, {
        initialEditorState: { editMode: true },
        initialImages,
        initialShellDecorationDraft: initialDraft,
        initialShellDecorationImages: initialImages,
        renderPreview: false
      })
    )
  ));
  const button = (label: string) => {
    const result = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
      .find((node) => node.textContent?.trim() === label);
    assert.ok(result, `button ${label} exists`);
    return result;
  };
  const click = (label: string) => settle(() => button(label).click());

  await click("自由物件");
  await click("新增線條");
  assert.equal(dom.window.document.querySelector("[data-editor-toolbar-dirty]")?.getAttribute("data-editor-toolbar-dirty"), "true");

  await click("殼層裝飾");
  await click("新增物件");
  assert.ok(dom.window.document.querySelector("[data-shared-shell-dirty]"));
  await click("儲存殼層草稿");
  assert.ok(saveInit?.body);
  const savedChannel = JSON.parse(String(saveInit?.body)) as {
    footerObjects: ShellDecorationEnvelope["footerObjects"];
    headerObjects: ShellDecorationEnvelope["headerObjects"];
  };
  const savedDraft: ShellDecorationEnvelope = {
    ...initialDraft,
    footerObjects: savedChannel.footerObjects,
    headerObjects: savedChannel.headerObjects,
    updatedAt: "2026-09-12T00:03:00.000Z",
    version: 6
  };
  await settle(() => saveResponse.resolve(new Response(JSON.stringify({ config: savedDraft }), { headers: { "Content-Type": "application/json" } })));
  assert.equal(dom.window.document.querySelector("[data-shared-shell-dirty]"), null);
  assert.ok(dom.window.document.querySelector("[data-page-draft-dirty]"));

  await click("頁面編輯");
  assert.equal(dom.window.document.querySelector("[data-editor-toolbar-dirty]")?.getAttribute("data-editor-toolbar-dirty"), "true");
  assert.equal(button("儲存草稿").disabled, false);
});

test("shell-metadata-only-update: shared embedded editor stays clean when only envelope metadata changes", async (t: TestContext) => {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/display-pages/editor?workspace=shell"
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const { ShellDecorationEditor } = await import("./index");
  const root = createRoot(dom.window.document.querySelector("#root")!);
  const errors: unknown[] = [];
  dom.window.addEventListener("error", (event) => errors.push(event.error));

  function Host() {
    const [workspace, setWorkspace] = useState(() => createShellWorkspaceState(initialDraft));
    return React.createElement(
      "div",
      { "data-host-shell-dirty": isShellWorkspaceDirty(workspace) ? "true" : "false" },
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setWorkspace((current) => updateShellWorkspaceDraft(current, {
            ...current.draft!,
            updatedAt: "2026-09-12T00:04:00.000Z",
            version: current.draft!.version + 1
          }))
        },
        "更新殼層 metadata"
      ),
      React.createElement(ShellDecorationEditor, {
        embedded: true,
        initialDraft: workspace.draft,
        initialImages,
        onWorkspaceStateChange: setWorkspace,
        renderPreview: false,
        workspaceState: workspace
      })
    );
  }

  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
    assert.deepEqual(errors, [], "metadata-only rerender must not throw browser errors");
  });

  await act(async () => root.render(React.createElement(Host)));
  assert.equal(dom.window.document.querySelector("[data-host-shell-dirty]")?.getAttribute("data-host-shell-dirty"), "false");
  assert.match(dom.window.document.body.textContent ?? "", /殼層已同步/);

  const metadataButton = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
    .find((node) => node.textContent?.trim() === "更新殼層 metadata");
  assert.ok(metadataButton);
  await act(async () => metadataButton.click());

  assert.equal(dom.window.document.querySelector("[data-host-shell-dirty]")?.getAttribute("data-host-shell-dirty"), "false");
  assert.match(dom.window.document.body.textContent ?? "", /殼層已同步/);
});

test("shell-asset-return-keeps-baseline: applying an asset preserves the original saved baseline", async (t: TestContext) => {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/display-pages/editor?workspace=shell"
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const { DisplayPagesEditor } = await import("../DisplayPagesEditor/index");
  const { clearDisplayPageConfigCache, primeDisplayPageConfigCache } = await import("../../hooks/useDisplayPageConfig");
  const { getSocketClient } = await import("../../services/socket");
  primeDisplayPageConfigCache("overview", "draft", pageEnvelope());
  t.mock.method(globalThis, "fetch", (input: RequestInfo | URL) => {
    const path = String(input);
    if (path.includes("/api/display-pages/asset-health")) {
      return Promise.resolve(new Response(JSON.stringify({
        health: { assets: [], findings: [], generatedAt: "2026-09-12T00:00:00.000Z", status: "healthy" }
      }), { headers: { "Content-Type": "application/json" } }));
    }
    if (path.includes("/api/display-ops/assets/")) {
      return Promise.resolve(new Response(JSON.stringify({
        references: { assetId: 8, blockingIssues: [], draftCount: 0, liveCount: 0, references: [] }
      }), { headers: { "Content-Type": "application/json" } }));
    }
    return Promise.resolve(new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } }));
  });
  const root = createRoot(dom.window.document.querySelector("#root")!);

  t.after(async () => {
    await act(async () => root.unmount());
    getSocketClient().disconnect();
    clearDisplayPageConfigCache();
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
  });

  await act(async () => root.render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?page=overview&workspace=shell"] },
      React.createElement(DisplayPagesEditor, {
        initialImages: shellImages,
        initialShellDecorationDraft: assetDraft,
        initialShellDecorationImages: shellImages,
        renderPreview: false
      })
    )
  ));
  const button = (label: string) => {
    const result = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
      .find((node) => node.textContent?.trim() === label);
    assert.ok(result, `button ${label} exists`);
    return result;
  };

  await act(async () => button("更換目前素材").click());
  const cards = [...dom.window.document.querySelectorAll<HTMLButtonElement>(".asset-library-card")];
  assert.equal(cards.length, 2);
  await act(async () => cards[1]!.click());
  await act(async () => button("套用目前素材並返回").click());

  assert.ok(dom.window.document.querySelector("[data-shared-shell-dirty]"));
  assert.match(dom.window.document.body.textContent ?? "", /殼層尚未儲存/);
});

test("shell-save-failure-preserves-draft-and-baseline: failed save keeps both indicators dirty", async (t: TestContext) => {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/display-pages/editor?workspace=shell"
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const { DisplayPagesEditor } = await import("../DisplayPagesEditor/index");
  const { clearDisplayPageConfigCache, primeDisplayPageConfigCache } = await import("../../hooks/useDisplayPageConfig");
  const { getSocketClient } = await import("../../services/socket");
  primeDisplayPageConfigCache("overview", "draft", pageEnvelope());
  const saveResponse = deferred<Response>();
  t.mock.method(globalThis, "fetch", (_input: RequestInfo | URL, _init?: RequestInit) => saveResponse.promise);
  const root = createRoot(dom.window.document.querySelector("#root")!);

  t.after(async () => {
    await act(async () => root.unmount());
    getSocketClient().disconnect();
    clearDisplayPageConfigCache();
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
  });

  await act(async () => root.render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?page=overview&workspace=shell"] },
      React.createElement(DisplayPagesEditor, {
        initialImages,
        initialShellDecorationDraft: initialDraft,
        initialShellDecorationImages: initialImages,
        renderPreview: false
      })
    )
  ));
  const button = (label: string) => {
    const result = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
      .find((node) => node.textContent?.trim() === label);
    assert.ok(result, `button ${label} exists`);
    return result;
  };

  await act(async () => button("新增物件").click());
  await act(async () => button("儲存殼層草稿").click());
  await act(async () => saveResponse.reject(new Error("儲存殼層草稿失敗")));

  assert.ok(dom.window.document.querySelector("[data-shared-shell-dirty]"));
  assert.match(dom.window.document.body.textContent ?? "", /儲存殼層草稿失敗/);
});

test("shell-publish-commit: successful publish reload updates the shared baseline", async (t: TestContext) => {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/display-pages/editor?workspace=shell"
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const { DisplayPagesEditor } = await import("../DisplayPagesEditor/index");
  const { clearDisplayPageConfigCache, primeDisplayPageConfigCache } = await import("../../hooks/useDisplayPageConfig");
  const { getSocketClient } = await import("../../services/socket");
  primeDisplayPageConfigCache("overview", "draft", pageEnvelope());
  const publishResponse = deferred<Response>();
  const reloadResponse = deferred<Response>();
  let requestCount = 0;
  t.mock.method(globalThis, "fetch", () => {
    requestCount += 1;
    return requestCount === 1 ? publishResponse.promise : reloadResponse.promise;
  });
  const root = createRoot(dom.window.document.querySelector("#root")!);

  t.after(async () => {
    await act(async () => root.unmount());
    getSocketClient().disconnect();
    clearDisplayPageConfigCache();
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
  });

  await act(async () => root.render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?page=overview&workspace=shell"] },
      React.createElement(DisplayPagesEditor, {
        initialImages,
        initialShellDecorationDraft: initialDraft,
        initialShellDecorationImages: initialImages,
        renderPreview: false
      })
    )
  ));
  const button = (label: string) => {
    const result = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
      .find((node) => node.textContent?.trim() === label);
    assert.ok(result, `button ${label} exists`);
    return result;
  };

  await act(async () => button("新增物件").click());
  await act(async () => button("發布殼層正式版").click());
  await act(async () => publishResponse.resolve(new Response(JSON.stringify({ config: initialDraft, validation: { canPublish: true, findings: [] } }), { headers: { "Content-Type": "application/json" } })));
  const publishedDraft: ShellDecorationEnvelope = {
    ...initialDraft,
    updatedAt: "2026-09-12T00:02:00.000Z",
    version: 5
  };
  await act(async () => reloadResponse.resolve(new Response(JSON.stringify({ config: publishedDraft }), { headers: { "Content-Type": "application/json" } })));

  assert.equal(requestCount, 2);
  assert.equal(dom.window.document.querySelector("[data-shared-shell-dirty]"), null);
  assert.match(dom.window.document.body.textContent ?? "", /殼層已同步/);
});

test("shell-publish-pending-preserves-new-draft: publish and reload responses keep edits made during the request", async (t: TestContext) => {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/display-pages/editor?workspace=shell"
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    navigator: dom.window.navigator,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    ResizeObserver: class { observe() {} disconnect() {} },
    IS_REACT_ACT_ENVIRONMENT: true
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const { DisplayPagesEditor } = await import("../DisplayPagesEditor/index");
  const { clearDisplayPageConfigCache, primeDisplayPageConfigCache } = await import("../../hooks/useDisplayPageConfig");
  const { getSocketClient } = await import("../../services/socket");
  primeDisplayPageConfigCache("overview", "draft", pageEnvelope());
  const publishResponse = deferred<Response>();
  const reloadResponse = deferred<Response>();
  const requestKinds: string[] = [];
  t.mock.method(globalThis, "fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path.includes("/api/shell-decorations/publish") && init?.method === "POST") {
      requestKinds.push("publish");
      return publishResponse.promise;
    }
    if (path.includes("/api/shell-decorations/draft") && init?.method === undefined) {
      requestKinds.push("reload");
      return reloadResponse.promise;
    }
    return Promise.resolve(new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } }));
  });
  const root = createRoot(dom.window.document.querySelector("#root")!);
  const errors: unknown[] = [];
  dom.window.addEventListener("error", (event) => errors.push(event.error));

  t.after(async () => {
    await act(async () => root.unmount());
    getSocketClient().disconnect();
    clearDisplayPageConfigCache();
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
    assert.deepEqual(errors, [], "publish and reload interaction must not throw browser errors");
  });

  const settle = async (operation: () => void) => act(async () => {
    operation();
    for (let index = 0; index < 5; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
  await settle(() => root.render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?page=overview&workspace=shell"] },
      React.createElement(DisplayPagesEditor, {
        initialImages,
        initialShellDecorationDraft: initialDraft,
        initialShellDecorationImages: initialImages,
        renderPreview: false
      })
    )
  ));
  const button = (label: string) => {
    const result = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
      .find((node) => node.textContent?.trim() === label);
    assert.ok(result, `button ${label} exists`);
    return result;
  };
  const click = (label: string) => settle(() => button(label).click());

  await click("新增物件");
  await click("發布殼層正式版");
  assert.deepEqual(requestKinds, ["publish"]);
  await click("新增物件");
  assert.ok(dom.window.document.querySelector("[data-shared-shell-dirty]"));
  assert.match(dom.window.document.body.textContent ?? "", /殼層尚未儲存/);

  const publishedDraft: ShellDecorationEnvelope = {
    ...initialDraft,
    publishedAt: "2026-09-12T00:07:00.000Z",
    publishedBy: "test-user",
    updatedAt: "2026-09-12T00:07:00.000Z",
    version: 4
  };
  await settle(() => publishResponse.resolve(new Response(JSON.stringify({
    config: publishedDraft,
    validation: { canPublish: true, findings: [] }
  }), { headers: { "Content-Type": "application/json" } })));
  assert.deepEqual(requestKinds, ["publish", "reload"]);

  const reloadedDraft: ShellDecorationEnvelope = {
    ...publishedDraft,
    updatedAt: "2026-09-12T00:08:00.000Z",
    version: 5
  };
  await settle(() => reloadResponse.resolve(new Response(JSON.stringify({ config: reloadedDraft }), {
    headers: { "Content-Type": "application/json" }
  })));

  const lineButtons = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
    .filter((node) => node.textContent?.trim().startsWith("線條"));
  assert.equal(lineButtons.length, 3, "initial and both edits remain after publish reload");
  assert.ok(dom.window.document.querySelector("[data-shared-shell-dirty]"), "parent keeps the post-publish draft dirty");
  assert.match(dom.window.document.body.textContent ?? "", /殼層尚未儲存/);
});

test("shell-standalone-load: standalone editor hydrates draft and images into a clean baseline", async (t: TestContext) => {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/shell-decorations/editor"
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const { ShellDecorationEditor } = await import("./index");
  const reads = [deferred<Response>(), deferred<Response>()];
  t.mock.method(globalThis, "fetch", (input: RequestInfo | URL) => {
    const path = String(input);
    const pending = (path.includes("/api/shell-decorations/draft") ? reads[0] : reads[1])!;
    return pending.promise;
  });
  const root = createRoot(dom.window.document.querySelector("#root")!);

  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
  });

  await act(async () => root.render(React.createElement(ShellDecorationEditor, { renderPreview: false })));
  assert.match(dom.window.document.body.textContent ?? "", /正在同步共用殼層草稿/);
  const addButton = [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
    .find((node) => node.textContent?.trim() === "新增物件");
  assert.ok(addButton);
  await act(async () => addButton.click());
  assert.doesNotMatch(dom.window.document.body.textContent ?? "", /殼層尚未儲存/);
  await act(async () => {
    reads[0]!.resolve(new Response(JSON.stringify({ config: initialDraft }), { headers: { "Content-Type": "application/json" } }));
    reads[1]!.resolve(new Response(JSON.stringify({ data: initialImages, success: true }), { headers: { "Content-Type": "application/json" } }));
  });

  assert.match(dom.window.document.body.textContent ?? "", /header-line/);
  assert.match(dom.window.document.body.textContent ?? "", /殼層已同步/);
});
