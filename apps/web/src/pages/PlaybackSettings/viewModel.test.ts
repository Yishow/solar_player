import assert from "node:assert/strict";
import test from "node:test";
import type { PlaybackPage, PlaybackSettings } from "@solar-display/shared";
import { buildPlaybackSettingsViewModel, reorderPlaybackPages } from "./viewModel";

const settings: PlaybackSettings = {
  autoplay: true,
  brightness: 88,
  idleMode: "return-to-start",
  idleTimeout: 90,
  loop: true,
  orientation: "landscape",
  repeatDays: [1, 3, 5],
  scheduleEnabled: true,
  scheduleEnd: "19:00",
  scheduleStart: "07:30",
  startPage: 2,
  transitionSpeed: 1500,
  transitionType: "slide",
  updatedAt: null
};

const pages: PlaybackPage[] = [
  {
    displayOrder: 2,
    durationSeconds: 20,
    enabled: true,
    id: 2,
    labelEn: "Solar",
    labelZh: "太陽能",
    pageKey: "solar",
    route: "/solar"
  },
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
    displayOrder: 3,
    durationSeconds: 12,
    enabled: false,
    id: 3,
    labelEn: "Images",
    labelZh: "圖庫",
    pageKey: "images",
    route: "/images"
  }
];

test("reorderPlaybackPages rewrites display order after moving a page upward", () => {
  const reordered = reorderPlaybackPages(pages, 3, -1);

  assert.deepEqual(
    reordered.map((page) => ({
      displayOrder: page.displayOrder,
      id: page.id
    })),
    [
      { id: 1, displayOrder: 1 },
      { id: 3, displayOrder: 2 },
      { id: 2, displayOrder: 3 }
    ]
  );
});

test("buildPlaybackSettingsViewModel summarizes schedule, start page, and ordered page rows", () => {
  const model = buildPlaybackSettingsViewModel({
    errorMessage: "",
    isSaving: false,
    message: "播放設定已同步。",
    pages,
    settings
  });

  assert.equal(model.summary.enabledCount, 2);
  assert.equal(model.summary.totalPages, 3);
  assert.equal(model.summary.totalDurationSeconds, 47);
  assert.equal(model.summary.startPageLabel, "02. 太陽能");
  assert.equal(model.summary.scheduleLabel, "每週一、三、五 • 07:30 - 19:00");
  assert.equal(model.saveBanner.tone, "ready");
  assert.equal(model.pageRows[0]?.id, 1);
  assert.equal(model.pageRows[0]?.canMoveUp, false);
  assert.equal(model.pageRows[1]?.orderLabel, "02");
  assert.equal(model.pageRows[2]?.statusLabel, "已停用");
  assert.deepEqual(
    model.rotationPreviewRows,
    [
      {
        durationLabel: "15 秒",
        id: 1,
        labelEn: "Overview",
        labelZh: "總覽",
        orderLabel: "01",
        route: "/overview"
      },
      {
        durationLabel: "20 秒",
        id: 2,
        labelEn: "Solar",
        labelZh: "太陽能",
        orderLabel: "02",
        route: "/solar"
      }
    ]
  );
});
