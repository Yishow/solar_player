import assert from "node:assert/strict";
import test from "node:test";
import { buildImagesViewModel } from "./viewModel";

const playlistEntries = [
  {
    area: "首頁 Hero",
    assetId: "asset-1",
    capturedAt: "2026/05/10 14:32",
    description: "首頁封面展示最新太陽能陣列成果。",
    displayOrder: 1,
    durationSeconds: 25,
    enabled: true,
    entryId: "IMG-01",
    fallbackMode: "display-placeholder" as const,
    resolution: "3840x2160",
    tags: ["封面", "太陽能"],
    title: "太陽能板鳥瞰"
  },
  {
    area: "迴路頁",
    assetId: "asset-2",
    capturedAt: "2026/05/10 09:18",
    description: "",
    displayOrder: 2,
    durationSeconds: 10,
    enabled: true,
    entryId: "IMG-02",
    fallbackMode: "skip" as const,
    resolution: "1920x1080",
    tags: [],
    title: "工廠迴路導覽"
  },
  {
    area: null,
    assetId: "asset-3",
    capturedAt: null,
    description: null,
    displayOrder: 3,
    durationSeconds: 12,
    enabled: true,
    entryId: "IMG-03",
    fallbackMode: "display-placeholder" as const,
    resolution: "1920x1080",
    tags: [],
    title: "待同步素材"
  }
];

const assets = [
  {
    assetId: "asset-1",
    height: 2160,
    source: "hero.jpg",
    status: "ready" as const,
    width: 3840
  },
  {
    assetId: "asset-3",
    height: null,
    source: null,
    status: "pending" as const,
    width: null
  }
];

test("buildImagesViewModel uses playlist ordering, per-entry duration, and metadata-driven panel fields", () => {
  const model = buildImagesViewModel({
    activeIndex: 0,
    assets,
    coverAssetSource: "/brand-logo.png",
    entries: playlistEntries
  });

  assert.equal(model.counter.current, "01");
  assert.equal(model.counter.total, "03");
  assert.equal(model.active.durationSeconds, 25);
  assert.equal(model.active.infoPanel.title, "太陽能板鳥瞰");
  assert.equal(model.active.infoPanel.area, "首頁 Hero");
  assert.deepEqual(model.active.infoPanel.tags, ["封面", "太陽能"]);
  assert.equal(model.active.assetSource, "hero.jpg");
});

test("buildImagesViewModel skips degraded entries configured with skip and preserves diagnostics", () => {
  const model = buildImagesViewModel({
    activeIndex: 1,
    assets,
    entries: playlistEntries
  });

  assert.equal(model.active.entryId, "IMG-03");
  assert.equal(model.thumbnails[1]?.fallbackMode, "skip");
  assert.equal(model.thumbnails[1]?.fallbackReason, "asset-missing");
  assert.equal(model.thumbnails[1]?.isPlayable, false);
});

test("buildImagesViewModel keeps placeholder and metadata fallbacks predictable", () => {
  const model = buildImagesViewModel({
    activeIndex: 2,
    assets,
    entries: playlistEntries
  });

  assert.equal(model.active.hasAsset, false);
  assert.equal(model.active.fallbackReason, "asset-pending");
  assert.match(model.active.placeholderLabel, /等待圖片素材/);
  assert.equal(model.active.infoPanel.area, "未標註區域");
  assert.equal(model.active.infoPanel.capturedAt, "未提供拍攝日期");
  assert.equal(model.active.infoPanel.description, "尚未提供圖片說明");
});

test("buildImagesViewModel honors the server-resolved active entry and keeps use-cover playback visible", () => {
  const resolvedEntries = [
    {
      assetId: "asset-2",
      assetSource: null,
      capturedAt: "2026/05/10 09:18",
      description: "",
      displayOrder: 2,
      durationSeconds: 10,
      enabled: true,
      entryId: "IMG-02",
      fallbackActive: true,
      fallbackMode: "skip" as const,
      fallbackReason: "asset-missing" as const,
      hasAsset: false,
      infoPanel: {
        area: "迴路頁",
        capturedAt: "2026/05/10 09:18",
        description: "尚未提供圖片說明",
        tags: [],
        title: "工廠迴路導覽"
      },
      isPlayable: false,
      resolution: "1920x1080",
      tags: [],
      title: "工廠迴路導覽"
    },
    {
      assetId: "asset-3",
      assetSource: "cover.jpg",
      capturedAt: "2026/05/10 14:32",
      description: "首頁封面展示最新太陽能陣列成果。",
      displayOrder: 3,
      durationSeconds: 25,
      enabled: true,
      entryId: "IMG-03",
      fallbackActive: true,
      fallbackMode: "use-cover" as const,
      fallbackReason: "asset-missing" as const,
      hasAsset: false,
      infoPanel: {
        area: "首頁 Hero",
        capturedAt: "2026/05/10 14:32",
        description: "首頁封面展示最新太陽能陣列成果。",
        tags: ["封面", "太陽能"],
        title: "太陽能板鳥瞰"
      },
      isPlayable: true,
      resolution: "3840x2160",
      tags: ["封面", "太陽能"],
      title: "太陽能板鳥瞰"
    }
  ];
  const model = buildImagesViewModel({
    activeEntry: resolvedEntries[1],
    activeIndex: 0,
    assets: [],
    entries: resolvedEntries
  });

  assert.equal(model.activeIndex, 1);
  assert.equal(model.counter.current, "02");
  assert.equal(model.active.entryId, "IMG-03");
  assert.equal(model.active.assetSource, "cover.jpg");
  assert.equal(model.active.fallbackMode, "use-cover");
  assert.equal(model.thumbnails[1]?.isActive, true);
});

test("buildImagesViewModel keeps fallback-active thumbnails inside the same ordered slideshow loop", () => {
  const resolvedEntries = [
    {
      assetId: "asset-1",
      assetSource: "hero.jpg",
      capturedAt: "2026/05/10 14:32",
      description: "首頁封面展示最新太陽能陣列成果。",
      displayOrder: 1,
      durationSeconds: 25,
      enabled: true,
      entryId: "IMG-01",
      fallbackActive: false,
      fallbackMode: "display-placeholder" as const,
      fallbackReason: null,
      hasAsset: true,
      infoPanel: {
        area: "首頁 Hero",
        capturedAt: "2026/05/10 14:32",
        description: "首頁封面展示最新太陽能陣列成果。",
        tags: ["封面", "太陽能"],
        title: "太陽能板鳥瞰"
      },
      isPlayable: true,
      resolution: "3840x2160",
      tags: ["封面", "太陽能"],
      title: "太陽能板鳥瞰"
    },
    {
      assetId: "asset-2",
      assetSource: "cover.jpg",
      capturedAt: "2026/05/10 09:18",
      description: "",
      displayOrder: 2,
      durationSeconds: 10,
      enabled: true,
      entryId: "IMG-02",
      fallbackActive: true,
      fallbackMode: "use-cover" as const,
      fallbackReason: "asset-missing" as const,
      hasAsset: false,
      infoPanel: {
        area: "迴路頁",
        capturedAt: "2026/05/10 09:18",
        description: "尚未提供圖片說明",
        tags: [],
        title: "工廠迴路導覽"
      },
      isPlayable: true,
      resolution: "1920x1080",
      tags: [],
      title: "工廠迴路導覽"
    }
  ];
  const model = buildImagesViewModel({
    activeEntry: resolvedEntries[1],
    activeIndex: 1,
    assets: [],
    entries: resolvedEntries
  });

  assert.equal(model.active.entryId, "IMG-02");
  assert.equal(model.active.fallbackMode, "use-cover");
  assert.equal(model.counter.current, "02");
  assert.equal(model.counter.total, "02");
  assert.equal(model.thumbnails[1]?.isActive, true);
});
