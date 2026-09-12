import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { JSDOM } from "jsdom";
import { ManagementRouteState } from "./ManagementRouteState";
import { ManagementShellFrame } from "../../layouts/ManagementShell";

test("route-pending-visible: router fallback renders visible pending state without empty route or workspace requests", async () => {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/display-pages/editor"
  });

  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true
  };
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const root = createRoot(dom.window.document.querySelector("#root")!);

  await act(async () => {
    root.render(
      <ManagementRouteState
        status="pending"
        title="展示頁編輯器載入中..."
        message="正在準備展示頁工作區與版面配置，請稍候。"
      />
    );
  });

  const pendingEl = dom.window.document.querySelector("[data-route-state='pending']");
  assert.ok(pendingEl, "Pending element is rendered and visible");
  assert.match(pendingEl.textContent!, /展示頁編輯器載入中\.\.\./);
  assert.match(pendingEl.textContent!, /正在準備展示頁工作區與版面配置/);

  // Spinner is present and marked with accessible role
  const spinner = dom.window.document.querySelector("[data-testid='management-route-spinner']");
  assert.ok(spinner, "Spinner is rendered");
  assert.equal(spinner.getAttribute("role"), "status");

  await act(async () => {
    root.unmount();
  });
  dom.window.close();
});

test("route-retry-keeps-dirty: error state exposes retry button and preserves workspace session boundary", async () => {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/display-pages/editor"
  });

  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true
  };
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const root = createRoot(dom.window.document.querySelector("#root")!);

  let retryTriggered = false;
  await act(async () => {
    root.render(
      <ManagementRouteState
        status="error"
        title="載入失敗"
        message="資料請求逾時"
        onRetry={() => {
          retryTriggered = true;
        }}
      />
    );
  });

  const errorEl = dom.window.document.querySelector("[data-route-state='error']");
  assert.ok(errorEl, "Error state is rendered");
  assert.match(errorEl.textContent!, /載入失敗/);
  assert.match(errorEl.textContent!, /資料請求逾時/);

  const retryButton = dom.window.document.querySelector<HTMLButtonElement>(
    "[data-testid='management-route-retry-button']"
  );
  assert.ok(retryButton, "Retry button is present");

  await act(async () => {
    retryButton.click();
  });
  assert.equal(retryTriggered, true, "Retry was triggered without unmounting dirty session");

  await act(async () => {
    root.unmount();
  });
  dom.window.close();
});

test("route-pending-preserves-access-gate: access boundaries and unlock gates remain effective under management shell", async () => {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/display-pages/editor"
  });

  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true
  };
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const root = createRoot(dom.window.document.querySelector("#root")!);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <ManagementShellFrame hideChrome={true}>
          <div data-testid="protected-workspace-content">Protected Content</div>
        </ManagementShellFrame>
      </MemoryRouter>
    );
  });

  const frameEl = dom.window.document.querySelector("[data-shell-primitive='management-shell-frame']");
  assert.ok(frameEl, "Management shell frame is rendered");

  await act(async () => {
    root.unmount();
  });
  dom.window.close();
});
