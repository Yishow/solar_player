import assert from "node:assert/strict";
import React, { act, createElement, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import path from "node:path";
import test from "node:test";
import type { DisplayPageInstance, DisplayPageTemplateKey } from "@solar-display/shared";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { DisplayPageRouteHostFrame } from "./displayPageRouteHostFrame";
import {
  resetDisplayPageTemplateLoadCacheForTests,
  setDisplayPageTemplateImportersForTests
} from "./displayPageTemplateLoaders";

const routeHostSource = readFileSync(path.join(import.meta.dirname, "displayPageRouteHost.tsx"), "utf8");
const routeHostFrameSource = readFileSync(
  path.join(import.meta.dirname, "displayPageRouteHostFrame.tsx"),
  "utf8"
);
const registryHookSource = readFileSync(
  path.join(import.meta.dirname, "../../hooks/useDisplayPageRegistry.ts"),
  "utf8"
);
const layoutShellSource = readFileSync(path.join(import.meta.dirname, "../../layouts/LayoutShell.tsx"), "utf8");

function createPage(
  overrides: Partial<DisplayPageInstance> &
    Pick<DisplayPageInstance, "id" | "pageKey" | "route" | "routeSlug" | "templateKey">
): DisplayPageInstance {
  return {
    archivedAt: null,
    createdAt: "2026-05-20T00:00:00.000Z",
    displayNameEn: "Overview",
    displayNameZh: "總覽",
    displayOrder: 1,
    draftVersion: 1,
    durationSeconds: 15,
    enabled: true,
    hasDraftChanges: false,
    lastPublishedAt: "2026-05-20T00:00:00.000Z",
    liveVersion: 1,
    updatedAt: "2026-05-20T00:00:00.000Z",
    ...overrides
  };
}

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "http://127.0.0.1/",
    pretendToBeVisual: true
  });
  const { window } = dom;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: window
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: window.document
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: window.navigator
  });
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    writable: true,
    value: window.HTMLElement
  });
  Object.defineProperty(globalThis, "MutationObserver", {
    configurable: true,
    writable: true,
    value: window.MutationObserver
  });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  return { rootEl: window.document.getElementById("root")! };
}

function LocationProbe() {
  const location = useLocation();
  return createElement("div", { "data-testid": "location", "data-pathname": location.pathname });
}

function stubRuntime(templateKey: DisplayPageTemplateKey, label: string) {
  return {
    renderPage: (pageId: string): ReactElement =>
      createElement("div", {
        "data-testid": "template",
        "data-template": templateKey,
        "data-page-id": pageId,
        "data-label": label
      }),
    templateKey
  };
}

async function flushMicrotasks(times = 8) {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function waitFor(
  predicate: () => boolean,
  options: { timeoutMs?: number; label?: string } = {}
) {
  const timeoutMs = options.timeoutMs ?? 2000;
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`waitFor timed out: ${options.label ?? "condition"}`);
    }
    await flushMicrotasks(2);
  }
}

type FrameState = {
  page: DisplayPageInstance | null;
  isRegistryLoading: boolean;
};

test("display page route loader primes the shared registry snapshot for shell and route host consumers", () => {
  assert.match(routeHostSource, /loadDisplayPageRegistrySnapshot\(\)/);
  assert.doesNotMatch(routeHostSource, /getDisplayPageRegistry\(\)/);
  assert.match(registryHookSource, /getActiveDisplayPageRegistrySnapshot\(\)/);
  assert.match(registryHookSource, /loadDisplayPageRegistrySnapshot\(/);
  assert.match(layoutShellSource, /useDisplayPageRegistry\(\)/);
  assert.match(routeHostFrameSource, /if \(!page\)/);
  assert.match(routeHostFrameSource, /setLoadedTemplate\(null\)/);
});

test("display page route host navigates to /overview when page becomes missing after a loaded template", async () => {
  const { rootEl } = installDom();
  let root: Root | null = null;
  let setFrameState: ((next: FrameState) => void) | null = null;

  const overviewPage = createPage({
    id: 1,
    pageKey: "overview",
    route: "/overview",
    routeSlug: "overview",
    templateKey: "overview"
  });

  setDisplayPageTemplateImportersForTests({
    overview: async () => stubRuntime("overview", "overview-ready")
  });

  function Harness() {
    const [state, setState] = useState<FrameState>({
      page: overviewPage,
      isRegistryLoading: false
    });
    setFrameState = setState;
    return createElement(
      MemoryRouter,
      { initialEntries: ["/overview"] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "*",
          element: createElement(
            "div",
            null,
            createElement(LocationProbe),
            createElement(DisplayPageRouteHostFrame, {
              page: state.page,
              isRegistryLoading: state.isRegistryLoading
            })
          )
        })
      )
    );
  }

  try {
    root = createRoot(rootEl);
    await act(async () => {
      root!.render(createElement(Harness));
    });

    await waitFor(
      () => rootEl.querySelector('[data-testid="template"][data-label="overview-ready"]') !== null,
      { label: "initial overview template" }
    );

    assert.equal(
      rootEl.querySelector('[data-testid="location"]')?.getAttribute("data-pathname"),
      "/overview"
    );

    // Simulate registry refresh that archives / removes the route (page resolves null).
    await act(async () => {
      setFrameState?.({ page: null, isRegistryLoading: false });
    });
    await flushMicrotasks(10);

    await waitFor(
      () => rootEl.querySelector('[data-testid="template"]') === null,
      { label: "prior template unmounted after page null" }
    );

    // Navigate should rewrite the memory history to /overview.
    await waitFor(
      () =>
        rootEl.querySelector('[data-testid="location"]')?.getAttribute("data-pathname") ===
        "/overview",
      { label: "Navigate to /overview" }
    );

    assert.equal(rootEl.querySelector('[data-testid="template"]'), null);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    setDisplayPageTemplateImportersForTests(null);
    resetDisplayPageTemplateLoadCacheForTests();
  }
});

test("display page route host retains last successful template only while the next page is still resolved", async () => {
  const { rootEl } = installDom();
  let root: Root | null = null;
  let resolveSolar: ((value: ReturnType<typeof stubRuntime>) => void) | null = null;
  const solarGate = new Promise<ReturnType<typeof stubRuntime>>((resolve) => {
    resolveSolar = resolve;
  });

  const overviewPage = createPage({
    id: 1,
    pageKey: "overview",
    route: "/overview",
    routeSlug: "overview",
    templateKey: "overview"
  });
  const solarPage = createPage({
    id: 2,
    pageKey: "solar",
    route: "/solar",
    routeSlug: "solar",
    templateKey: "solar",
    displayNameEn: "Solar",
    displayNameZh: "太陽能"
  });

  let setFrameState: ((next: FrameState) => void) | null = null;

  setDisplayPageTemplateImportersForTests({
    overview: async () => stubRuntime("overview", "overview-ready"),
    solar: async () => solarGate
  });

  function Harness() {
    const [state, setState] = useState<FrameState>({
      page: overviewPage,
      isRegistryLoading: false
    });
    setFrameState = setState;
    return createElement(
      MemoryRouter,
      { initialEntries: ["/overview"] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "*",
          element: createElement(DisplayPageRouteHostFrame, {
            page: state.page,
            isRegistryLoading: state.isRegistryLoading
          })
        })
      )
    );
  }

  try {
    root = createRoot(rootEl);
    await act(async () => {
      root!.render(createElement(Harness));
    });

    await waitFor(
      () => rootEl.querySelector('[data-testid="template"][data-label="overview-ready"]') !== null,
      { label: "overview loaded" }
    );

    // Move to a still-resolved page whose template is pending — retain overview.
    await act(async () => {
      setFrameState?.({ page: solarPage, isRegistryLoading: false });
    });
    await flushMicrotasks(6);

    assert.equal(
      rootEl.querySelector('[data-testid="template"]')?.getAttribute("data-label"),
      "overview-ready",
      "must retain last successful template while next resolved page is pending"
    );

    await act(async () => {
      resolveSolar?.(stubRuntime("solar", "solar-ready"));
    });
    await flushMicrotasks(10);

    await waitFor(
      () => rootEl.querySelector('[data-testid="template"][data-label="solar-ready"]') !== null,
      { label: "solar loaded" }
    );

    // When the page becomes unresolved, retention must end immediately (no sticky solar).
    await act(async () => {
      setFrameState?.({ page: null, isRegistryLoading: false });
    });
    await flushMicrotasks(10);

    await waitFor(
      () => rootEl.querySelector('[data-testid="template"]') === null,
      { label: "template cleared when page unresolved" }
    );
  } finally {
    await act(async () => {
      root?.unmount();
    });
    setDisplayPageTemplateImportersForTests(null);
    resetDisplayPageTemplateLoadCacheForTests();
  }
});

// Keep React import live for createElement path that may tree-shake in some runners.
void React;
