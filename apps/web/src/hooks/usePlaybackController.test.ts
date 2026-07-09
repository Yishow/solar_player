import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import type { PlaybackPage, PlaybackRuntime, PlaybackSettings } from "@solar-display/shared";
import { resolvePlaybackRuntimeTick } from "./usePlaybackController";

const hookDir = path.resolve(import.meta.dirname);
const controllerSource = fs.readFileSync(path.join(hookDir, "usePlaybackController.ts"), "utf8");

test("usePlaybackController reuses the server rotation preview for runtime page selection", () => {
  assert.match(controllerSource, /getDisplayRotationPreview\(\)/);
  assert.match(controllerSource, /const runtimePages = rotationPreview\.playablePages;/);
  assert.match(controllerSource, /setFallbackRoute\(rotationPreview\.fallbackRoute\)/);
  assert.match(controllerSource, /setPages\(runtimePages\)/);
});

test("usePlaybackController can defer management diagnostics with injected settings and preview", () => {
  assert.match(controllerSource, /enabled = options\.enabled \?\? true/);
  assert.match(controllerSource, /providedSettings \? Promise\.resolve\(providedSettings\) : getPlaybackSettings\(\)/);
  assert.match(controllerSource, /providedRotationPreview \? Promise\.resolve\(providedRotationPreview\) : getDisplayRotationPreview\(\)/);
  assert.match(controllerSource, /\[enabled, options\.rotationPreview, options\.settings\]/);
});

const playbackSettings: PlaybackSettings = {
  autoplay: true,
  brightness: 80,
  enforceFreshRuntimeData: true,
  idleMode: "disabled",
  idleTimeout: 60,
  loop: true,
  orientation: "landscape",
  repeatDays: [],
  scheduleEnabled: false,
  scheduleEnd: null,
  scheduleStart: null,
  startPage: 1,
  transitionSpeed: 600,
  transitionType: "fade",
  updatedAt: null
};

const playbackPages: PlaybackPage[] = [
  {
    displayOrder: 1,
    durationSeconds: 15,
    enabled: true,
    id: 1,
    labelEn: "Overview",
    labelZh: "總覽",
    pageKey: "overview",
    route: "/overview"
  },
  {
    displayOrder: 2,
    durationSeconds: 20,
    enabled: true,
    id: 2,
    labelEn: "Solar",
    labelZh: "太陽能",
    pageKey: "solar",
    route: "/solar"
  }
];

const runtime: PlaybackRuntime = {
  countdownMs: 15_000,
  currentIndex: 0,
  isIdle: false,
  isPlaying: true,
  lastInteractionAt: 1_000
};

test("boundary playback ticks keep the same runtime until a page boundary is reached", () => {
  const nextRuntime = resolvePlaybackRuntimeTick({
    current: runtime,
    elapsedMs: 14_000,
    pages: playbackPages,
    settings: playbackSettings,
    tickMode: "boundary",
    tickMs: 250,
    nowMs: 15_000
  });

  assert.equal(nextRuntime, runtime);
});

test("boundary playback ticks advance only when the page boundary is reached", () => {
  const nextRuntime = resolvePlaybackRuntimeTick({
    current: runtime,
    elapsedMs: 15_000,
    pages: playbackPages,
    settings: playbackSettings,
    tickMode: "boundary",
    tickMs: 250,
    nowMs: 16_000
  });

  assert.notEqual(nextRuntime, runtime);
  assert.equal(nextRuntime.currentIndex, 1);
  assert.equal(nextRuntime.countdownMs, 20_000);
  assert.equal(nextRuntime.isPlaying, true);
});
