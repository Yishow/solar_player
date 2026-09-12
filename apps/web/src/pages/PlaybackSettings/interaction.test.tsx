import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock, type TestContext } from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import type {
  PlaybackPage,
  PlaybackSettings
} from "@solar-display/shared";
import { getSocketClient } from "../../services/socket";
import { rememberPlaybackEditableModel } from "./loadModel";

register(
  `data:text/javascript,${encodeURIComponent(`export async function resolve(specifier, context, nextResolve) { if (/\\.(css|png|jpg|jpeg|svg)$/.test(specifier)) return { format: "module", shortCircuit: true, url: "data:text/javascript,export default {}" }; return nextResolve(specifier, context); }`)}`,
  import.meta.url
);

const { PlaybackSettings } = await import("./index.tsx");

type Deferred<T> = {
  promise: Promise<T>;
  reject: (error: unknown) => void;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

const baseSettings: PlaybackSettings = {
  autoplay: true,
  brightness: 70,
  enforceFreshRuntimeData: true,
  idleMode: "disabled",
  idleTimeout: 0,
  loop: true,
  orientation: "landscape",
  repeatDays: [],
  scheduleEnabled: false,
  scheduleEnd: null,
  scheduleStart: null,
  startPage: 1,
  transitionSpeed: 800,
  transitionType: "fade",
  updatedAt: "2026-09-12T00:00:00.000Z"
};

const basePages: PlaybackPage[] = [
  {
    displayOrder: 1,
    durationSeconds: 15,
    enabled: true,
    id: 1,
    labelEn: "Overview",
    labelZh: "總覽",
    pageKey: "overview",
    route: "/overview",
    templateKey: "overview"
  },
  {
    displayOrder: 2,
    durationSeconds: 20,
    enabled: true,
    id: 2,
    labelEn: "Solar",
    labelZh: "太陽能",
    pageKey: "solar",
    route: "/solar",
    templateKey: "solar"
  }
];

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
    status
  });
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function mountPlaybackSettings(t: TestContext, element: React.ReactElement = <PlaybackSettings />) {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>");
  const globals = {
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
    Node: dom.window.Node,
    window: dom.window
  };
  const descriptors = new Map(
    Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  );
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const originalFetch = globalThis.fetch;
  const settingsWrites: Array<Deferred<{ settings: PlaybackSettings }>> = [];
  const pageWrites: Array<Deferred<{ pages: PlaybackPage[] }>> = [];
  const writeBodies: { pages: unknown[]; settings: unknown[] } = { pages: [], settings: [] };
  globalThis.fetch = async (input, init) => {
    const method = init?.method ?? "GET";
    const rawUrl = String(input);
    const pathname = rawUrl.slice(rawUrl.indexOf("/api/")).split("?")[0];

    if (method === "PUT" && pathname === "/api/playback/settings") {
      writeBodies.settings.push(JSON.parse(String(init?.body)));
      const request = deferred<{ settings: PlaybackSettings }>();
      settingsWrites.push(request);
      return request.promise.then((value) => jsonResponse(value));
    }
    if (method === "PUT" && pathname === "/api/playback/pages") {
      writeBodies.pages.push(JSON.parse(String(init?.body)));
      const request = deferred<{ pages: PlaybackPage[] }>();
      pageWrites.push(request);
      return request.promise.then((value) => jsonResponse(value));
    }
    if (method === "GET" && pathname === "/api/playback/settings") {
      return jsonResponse({ settings: baseSettings });
    }
    if (method === "GET" && pathname === "/api/playback/pages") {
      return jsonResponse({ pages: basePages });
    }
    if (method === "GET" && pathname === "/api/display-pages/rotation-preview") {
      return jsonResponse({
        preview: {
          evaluatedAt: "2026-09-12T00:00:00.000Z",
          fallbackRoute: null,
          playablePages: basePages,
          skippedPages: []
        }
      });
    }
    if (method === "GET" && pathname === "/api/display-page-registry") {
      return jsonResponse({ pages: [] });
    }
    if (method === "GET" && pathname === "/api/display-ops") {
      return jsonResponse({
        summary: {
          blockingIssues: [],
          draftCount: 0,
          draftPending: false,
          generatedAt: "2026-09-12T00:00:00.000Z",
          lastPublishAt: null,
          liveVersion: null,
          pages: [],
          skipCount: 0
        }
      });
    }
    return jsonResponse({});
  };

  rememberPlaybackEditableModel({ pages: basePages, settings: baseSettings });
  const root = createRoot(dom.window.document.querySelector("#root")!);
  await act(async () => root.render(element));
  await flushReact();

  t.after(async () => {
    for (const request of settingsWrites) request.resolve({ settings: baseSettings });
    for (const request of pageWrites) request.resolve({ pages: basePages });
    await act(async () => root.unmount());
    getSocketClient().disconnect();
    globalThis.fetch = originalFetch;
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
  });

  return {
    container: dom.window.document,
    pageWrites,
    settingsWrites,
    writeBodies
  };
}

test("playback-save-locks-input-and-sort", async (t) => {
  const mounted = await mountPlaybackSettings(t);
  const save = mounted.container.querySelector<HTMLButtonElement>(".ps-save")!;
  assert.equal(save.disabled, false);

  await act(async () => save.click());
  await flushReact();

  assert.equal(mounted.settingsWrites.length, 1);
  assert.equal(mounted.pageWrites.length, 1);
  assert.equal(
    mounted.container.querySelector<HTMLInputElement>(".ps-card-duration .ps-stepper-input")?.disabled,
    true
  );

  const handles = mounted.container.querySelectorAll<HTMLElement>(".ps-drag-handle");
  await act(async () => {
    handles[0]?.dispatchEvent(new mounted.container.defaultView!.MouseEvent("mouseenter", { bubbles: true }));
  });
  const rows = mounted.container.querySelectorAll<HTMLElement>(".ps-card-order .ps-list-item");
  const dragStart = new mounted.container.defaultView!.Event("dragstart", { bubbles: true });
  Object.defineProperty(dragStart, "dataTransfer", { value: { effectAllowed: "" } });
  await act(async () => rows[0]?.dispatchEvent(dragStart));
  await act(async () => rows[1]?.dispatchEvent(new mounted.container.defaultView!.Event("dragover", { bubbles: true, cancelable: true })));
  assert.deepEqual(
    [...mounted.container.querySelectorAll(".ps-card-order .mgmt-select-trigger span")].map((node) => node.textContent),
    ["Overview", "Solar"]
  );

  mounted.settingsWrites[0]!.resolve({ settings: baseSettings });
  mounted.pageWrites[0]!.resolve({ pages: basePages });
});

test("playback-save-stops-held-stepper", async (t) => {
  const mounted = await mountPlaybackSettings(t);
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  t.after(() => mock.timers.reset());
  const plus = mounted.container.querySelectorAll<HTMLButtonElement>(".ps-card-duration .ps-stepper-btn")[1]!;
  const duration = mounted.container.querySelector<HTMLInputElement>(".ps-card-duration .ps-stepper-input")!;

  await act(async () => {
    plus.dispatchEvent(new mounted.container.defaultView!.Event("pointerdown", { bubbles: true }));
  });
  const valueBeforeSave = duration.value;
  await act(async () => mounted.container.querySelector<HTMLButtonElement>(".ps-save")!.click());
  await flushReact();
  mock.timers.tick(350);
  mock.timers.tick(800);
  await flushReact();

  assert.equal(duration.value, valueBeforeSave);
  mounted.settingsWrites[0]!.resolve({ settings: baseSettings });
  mounted.pageWrites[0]!.resolve({ pages: basePages });
});

test("playback page save uses the mounted lock for duplicate submit, resync, controls, and drag", async (t) => {
  const mounted = await mountPlaybackSettings(t, <PlaybackSettings />);
  const save = mounted.container.querySelector<HTMLButtonElement>(".ps-save")!;
  const resync = mounted.container.querySelector<HTMLButtonElement>(".ps-resync")!;
  const autoplay = mounted.container.querySelector<HTMLButtonElement>("[role=switch]")!;
  await act(async () => autoplay.click());

  const handle = mounted.container.querySelector<HTMLElement>(".ps-card-order .ps-drag-handle")!;
  await act(async () => handle.dispatchEvent(new mounted.container.defaultView!.MouseEvent("mouseenter", { bubbles: true })));
  const rows = mounted.container.querySelectorAll<HTMLElement>(".ps-card-order .ps-list-item");
  const dragStart = new mounted.container.defaultView!.Event("dragstart", { bubbles: true });
  Object.defineProperty(dragStart, "dataTransfer", { value: { effectAllowed: "" } });
  await act(async () => rows[0]?.dispatchEvent(dragStart));

  await act(async () => {
    const click = () => save.dispatchEvent(new mounted.container.defaultView!.MouseEvent("click", { bubbles: true }));
    click();
    await rows[1]?.dispatchEvent(new mounted.container.defaultView!.Event("dragover", { bubbles: true, cancelable: true }));
    click();
  });
  await flushReact();

  assert.equal(mounted.settingsWrites.length, 1);
  assert.equal(mounted.pageWrites.length, 1);
  assert.equal(save.disabled, true);
  assert.equal(resync.disabled, true);
  assert.equal(autoplay.disabled, true);
  assert.equal(
    mounted.container.querySelector<HTMLInputElement>(".ps-card-duration .ps-stepper-input")?.disabled,
    true
  );
  assert.equal(
    mounted.container.querySelector<HTMLButtonElement>(".ps-card-order .mgmt-select-trigger")?.disabled,
    true
  );

  await act(async () => rows[1]?.dispatchEvent(new mounted.container.defaultView!.Event("dragover", { bubbles: true, cancelable: true })));
  assert.deepEqual(
    [...mounted.container.querySelectorAll(".ps-card-order .mgmt-select-trigger span")].map((node) => node.textContent),
    ["Overview", "Solar"]
  );

  const savedSettings = {
    ...baseSettings,
    ...(mounted.writeBodies.settings[0] as Partial<PlaybackSettings>),
    updatedAt: "2026-09-12T00:01:00.000Z"
  };
  const savedPagePayload = mounted.writeBodies.pages[0] as {
    pages: Array<Pick<PlaybackPage, "id" | "displayOrder" | "durationSeconds" | "enabled">>;
  };
  const savedPages = basePages.map((page) => ({
    ...page,
    ...savedPagePayload.pages.find((candidate) => candidate.id === page.id)
  }));
  mounted.settingsWrites[0]!.resolve({ settings: savedSettings });
  mounted.pageWrites[0]!.resolve({ pages: savedPages });
  await flushReact();
  assert.equal(save.disabled, false);
});

test("playback-save-failure-retains-draft", async (t) => {
  const mounted = await mountPlaybackSettings(t);
  const save = mounted.container.querySelector<HTMLButtonElement>(".ps-save")!;
  const autoplay = mounted.container.querySelector<HTMLButtonElement>("[role=switch]")!;
  const plus = mounted.container.querySelectorAll<HTMLButtonElement>(".ps-card-duration .ps-stepper-btn")[1]!;
  const duration = mounted.container.querySelector<HTMLInputElement>(".ps-card-duration .ps-stepper-input")!;
  await act(async () => autoplay.click());
  await act(async () => {
    plus.dispatchEvent(new mounted.container.defaultView!.Event("pointerdown", { bubbles: true }));
    plus.dispatchEvent(new mounted.container.defaultView!.Event("pointerup", { bubbles: true }));
  });
  await flushReact();
  const draftDuration = duration.value;

  await act(async () => save.click());
  await flushReact();
  mounted.settingsWrites[0]!.reject(new Error("settings write failed"));
  mounted.pageWrites[0]!.resolve({ pages: basePages });
  await flushReact();

  assert.equal(save.disabled, false);
  assert.equal(autoplay.getAttribute("aria-checked"), "false");
  assert.equal(duration.value, draftDuration);
  assert.match(mounted.container.querySelector(".ps-status")?.textContent ?? "", /settings write failed/);
});

test("playback-partial-failure-keeps-lock-until-settled", async (t) => {
  const mounted = await mountPlaybackSettings(t);
  const save = mounted.container.querySelector<HTMLButtonElement>(".ps-save")!;
  const resync = mounted.container.querySelector<HTMLButtonElement>(".ps-resync")!;
  const autoplay = mounted.container.querySelector<HTMLButtonElement>("[role=switch]")!;
  await act(async () => autoplay.click());
  await act(async () => save.click());
  await flushReact();

  mounted.settingsWrites[0]!.reject(new Error("settings write failed"));
  await flushReact();
  assert.equal(save.disabled, true);
  assert.equal(resync.disabled, true);
  assert.equal(autoplay.disabled, true);
  await act(async () => save.dispatchEvent(new mounted.container.defaultView!.MouseEvent("click", { bubbles: true })));
  assert.equal(mounted.settingsWrites.length, 1);

  const savedSettings = {
    ...baseSettings,
    ...(mounted.writeBodies.settings[0] as Partial<PlaybackSettings>),
    updatedAt: "2026-09-12T00:02:00.000Z"
  };
  mounted.pageWrites[0]!.resolve({ pages: basePages });
  await flushReact();
  assert.equal(save.disabled, false);
  assert.equal(autoplay.getAttribute("aria-checked"), "false");
  assert.match(mounted.container.querySelector(".ps-status")?.textContent ?? "", /settings write failed/);

  await act(async () => save.click());
  await flushReact();
  assert.equal(mounted.settingsWrites.length, 2);
  assert.equal(mounted.pageWrites.length, 2);
  mounted.settingsWrites[1]!.resolve({ settings: savedSettings });
  mounted.pageWrites[1]!.resolve({ pages: basePages });
  await flushReact();
  assert.equal(save.disabled, false);
});
