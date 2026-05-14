import assert from "node:assert/strict";
import test from "node:test";
import type { PlaybackPage, PlaybackSettings } from "@solar-display/shared";
import { buildSlideshowPreviewViewModel } from "./viewModel";

const pages: PlaybackPage[] = [
  {
    id: 1,
    pageKey: "overview",
    route: "/overview",
    labelZh: "總覽頁",
    labelEn: "Overview",
    enabled: true,
    displayOrder: 1,
    durationSeconds: 20
  },
  {
    id: 2,
    pageKey: "solar",
    route: "/solar",
    labelZh: "太陽能頁",
    labelEn: "Solar",
    enabled: true,
    displayOrder: 2,
    durationSeconds: 20
  },
  {
    id: 3,
    pageKey: "factory-circuit",
    route: "/factory-circuit",
    labelZh: "廠區用電迴路頁",
    labelEn: "Factory Energy Circuit",
    enabled: true,
    displayOrder: 3,
    durationSeconds: 20
  }
];

const settings: PlaybackSettings = {
  autoplay: true,
  brightness: 90,
  idleMode: "return-to-start",
  idleTimeout: 180,
  loop: true,
  orientation: "landscape",
  repeatDays: [1, 2, 3, 4, 5],
  scheduleEnabled: true,
  scheduleEnd: "18:00",
  scheduleStart: "08:00",
  startPage: 1,
  transitionSpeed: 1000,
  transitionType: "fade",
  updatedAt: "2026-05-13T10:00:00.000Z"
};

test("buildSlideshowPreviewViewModel centralizes current slide, queue, and playback summary", () => {
  const model = buildSlideshowPreviewViewModel({
    countdown: 12,
    currentPage: pages[2] ?? null,
    errorMessage: "",
    isIdle: false,
    isLoading: false,
    isPlaying: true,
    pages,
    progress: 62,
    settings
  });

  assert.equal(model.statusLabel, "自動播放中");
  assert.equal(model.currentIndexLabel, "3 / 3");
  assert.equal(model.currentPageLabel, "廠區用電迴路頁");
  assert.equal(model.queueCards[2]?.isCurrent, true);
  assert.equal(model.queueCards[2]?.previewAssetKey, "factory-circuit");
  assert.equal(model.queueCards[2]?.routeLabel, "/factory-circuit");
  assert.equal(model.summaryRows[0]?.label, "播放順序");
  assert.match(model.summaryRows[0]?.value ?? "", /Overview/);
  assert.equal(model.summaryRows[1]?.value, "20 秒");
  assert.equal(model.progressLabel, "62%");
});

test("buildSlideshowPreviewViewModel keeps fallback state when no pages are enabled", () => {
  const model = buildSlideshowPreviewViewModel({
    countdown: 0,
    currentPage: null,
    errorMessage: "載入播放設定失敗。",
    isIdle: false,
    isLoading: true,
    isPlaying: false,
    pages: [],
    progress: 0,
    settings: null
  });

  assert.equal(model.currentPageLabel, "尚無播放頁面");
  assert.equal(model.statusDetail, "載入播放設定失敗。");
  assert.equal(model.queueCards.length, 0);
  assert.equal(model.summaryRows[0]?.value, "尚未設定");
});
