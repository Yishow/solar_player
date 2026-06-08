import assert from "node:assert/strict";
import test from "node:test";
import type { PlaybackPage, PlaybackRuntime, PlaybackSettings } from "@solar-display/shared";
import { reconcilePlaybackRuntimeAfterRefresh } from "./playbackRuntimeRefresh";

const settings: PlaybackSettings = {
  autoplay: true,
  brightness: 100,
  idleMode: "disabled",
  idleTimeout: 60,
  loop: true,
  orientation: "landscape",
  repeatDays: [],
  scheduleEnabled: false,
  scheduleEnd: null,
  scheduleStart: null,
  startPage: 1,
  transitionSpeed: 300,
  transitionType: "fade",
  updatedAt: null
};

const previousPages: PlaybackPage[] = [
  {
    id: 1,
    pageKey: "overview",
    route: "/overview",
    labelZh: "總覽",
    labelEn: "Overview",
    enabled: true,
    displayOrder: 1,
    durationSeconds: 15
  },
  {
    id: 2,
    pageKey: "solar",
    route: "/solar",
    labelZh: "太陽能",
    labelEn: "Solar",
    enabled: true,
    displayOrder: 2,
    durationSeconds: 15
  },
  {
    id: 3,
    pageKey: "images",
    route: "/images",
    labelZh: "圖庫",
    labelEn: "Images",
    enabled: true,
    displayOrder: 3,
    durationSeconds: 20
  }
];

test("reconcilePlaybackRuntimeAfterRefresh preserves countdown continuity when the current route stays playable", () => {
  const currentRuntime: PlaybackRuntime = {
    currentIndex: 0,
    countdownMs: 4_000,
    isIdle: false,
    isPlaying: true,
    lastInteractionAt: 100
  };

  const nextRuntime = reconcilePlaybackRuntimeAfterRefresh({
    currentPath: "/overview",
    currentRuntime,
    nextPages: previousPages,
    previousPages,
    settings,
    nowMs: 1_000
  });

  assert.equal(nextRuntime.currentIndex, 0);
  assert.equal(nextRuntime.countdownMs, 4_000);
  assert.equal(nextRuntime.isPlaying, true);
});

test("reconcilePlaybackRuntimeAfterRefresh advances to the next playable page when the current route is removed", () => {
  const currentRuntime: PlaybackRuntime = {
    currentIndex: 1,
    countdownMs: 6_000,
    isIdle: false,
    isPlaying: true,
    lastInteractionAt: 100
  };

  const nextRuntime = reconcilePlaybackRuntimeAfterRefresh({
    currentPath: "/solar",
    currentRuntime,
    nextPages: previousPages.filter((page) => page.route !== "/solar"),
    previousPages,
    settings,
    nowMs: 2_000
  });

  assert.equal(nextRuntime.currentIndex, 1);
  assert.equal(nextRuntime.countdownMs, 20_000);
  assert.equal(nextRuntime.isPlaying, true);
});

test("reconcilePlaybackRuntimeAfterRefresh can resume autoplay when a live runtime refresh requests it", () => {
  const currentRuntime: PlaybackRuntime = {
    currentIndex: 1,
    countdownMs: 6_000,
    isIdle: false,
    isPlaying: false,
    lastInteractionAt: 100
  };

  const nextRuntime = reconcilePlaybackRuntimeAfterRefresh({
    currentPath: "/solar",
    currentRuntime,
    nextPages: previousPages,
    previousPages,
    resumeAutoplay: true,
    settings,
    nowMs: 2_000
  });

  assert.equal(nextRuntime.currentIndex, 1);
  assert.equal(nextRuntime.isPlaying, true);
});

test("reconcilePlaybackRuntimeAfterRefresh preserves a stopped runtime when autoplay resume is not requested", () => {
  const currentRuntime: PlaybackRuntime = {
    currentIndex: 1,
    countdownMs: 6_000,
    isIdle: false,
    isPlaying: false,
    lastInteractionAt: 100
  };

  const nextRuntime = reconcilePlaybackRuntimeAfterRefresh({
    currentPath: "/solar",
    currentRuntime,
    nextPages: previousPages,
    previousPages,
    settings,
    nowMs: 2_000
  });

  assert.equal(nextRuntime.currentIndex, 1);
  assert.equal(nextRuntime.isPlaying, false);
});
