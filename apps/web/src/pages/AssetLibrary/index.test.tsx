import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { DisplayOpsAssetReferenceSummary, ImageAsset } from "@solar-display/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AssetLibrary } from "./index";

const routeMetaSource = readFileSync(path.join(import.meta.dirname, "../../app/routeMeta.ts"), "utf8");
const routerSource = readFileSync(path.join(import.meta.dirname, "../../app/router.tsx"), "utf8");

const initialAssets: Array<ImageAsset & {
  category: "background" | "icon" | "object";
  usageScope: "both" | "page-only" | "shell-only";
  usageSummary: {
    draftCount: number;
    liveCount: number;
    referenceCount: number;
  };
}> = [
  {
    aspectRatio: 1.777,
    category: "background",
    description: "overview hero",
    displayDuration: 15,
    displayOrder: 1,
    fileSize: 240000,
    filename: "overview-hero.png",
    height: 1080,
    id: 7,
    includedInSlideshow: false,
    isCover: false,
    mimeType: "image/png",
    originalName: "overview-hero.png",
    seedKey: "overview.hero",
    title: "總覽背景",
    usageScope: "both",
    usageSummary: {
      draftCount: 1,
      liveCount: 2,
      referenceCount: 3
    },
    width: 1920
  },
  {
    aspectRatio: 1,
    category: "icon",
    description: "leaf ornament",
    displayDuration: 15,
    displayOrder: 2,
    fileSize: 4096,
    filename: "leaf-icon.svg",
    height: 128,
    id: 9,
    includedInSlideshow: false,
    isCover: false,
    mimeType: "image/svg+xml",
    originalName: "leaf-icon.svg",
    title: "葉片圖示",
    usageScope: "page-only",
    usageSummary: {
      draftCount: 0,
      liveCount: 0,
      referenceCount: 0
    },
    width: 128
  }
];

const initialReferences: DisplayOpsAssetReferenceSummary = {
  assetId: 7,
  blockingIssues: [
    {
      assetId: 7,
      code: "live-reference",
      message: "Shared Shell Decorations 正在使用此素材",
      severity: "blocking"
    }
  ],
  draftCount: 1,
  liveCount: 1,
  references: [
    {
      bindingId: "ornament.logo",
      kind: "shell-decoration",
      message: "Shared Shell Decorations header ornament",
      pageId: null,
      stage: "live",
      targetLabel: "Header Ornament"
    }
  ]
};

test("asset library exposes a dedicated management surface with category tabs and usage summaries", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets
      })
    )
  );

  assert.match(html, /資產庫管理/);
  assert.match(html, /Asset Library/);
  assert.match(html, /背景/);
  assert.match(html, /物件/);
  assert.match(html, /圖示/);
  assert.match(html, /搜尋素材/);
  assert.match(html, /舒適縮圖/);
  assert.match(html, /緊密縮圖/);
  assert.match(html, /src="http:\/\/localhost:3000\/uploads\/images\/overview-hero\.png"/);
  assert.match(html, /使用範圍/);
  assert.match(html, /Live 2/);
  assert.match(html, /Draft 1/);
  assert.match(html, /內建素材/);
  assert.match(html, /overview\.hero/);
  assert.doesNotMatch(html, /輪播治理/);
});

test("embedded asset library shows return context and blocks deletion for referenced assets", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?workspace=assets"] },
      React.createElement(AssetLibrary, {
        embedded: true,
        initialAssets,
        initialReferences,
        onReturnToEditor: () => {}
      })
    )
  );

  assert.doesNotMatch(html, /data-shell-primitive="management-scaffold"/);
  assert.match(html, /返回展示頁編輯/);
  assert.match(html, /殼層裝飾/);
  assert.match(html, /Shared Shell Decorations 正在使用此素材/);
  assert.match(html, /解除引用後可刪除/);
  assert.match(html, /disabled=""/);
});

test("embedded asset library exposes apply-and-return actions when opened from editor context", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?workspace=assets&assetContext=overview-hero-media"] },
      React.createElement(AssetLibrary, {
        embedded: true,
        contextLabel: "總覽 主視覺圖片",
        initialAssets,
        initialReferences,
        onApplySelection: () => {},
        onReturnToEditor: () => {},
        returnLabel: "返回展示頁編輯"
      })
    )
  );

  assert.match(html, /返回目標/);
  assert.match(html, /總覽 主視覺圖片/);
  assert.match(html, /套用目前素材並返回/);
  assert.match(html, /返回展示頁編輯/);
});

test("asset library route remains as compatibility entry to the editor workspace", () => {
  assert.match(routeMetaSource, /path: "\/settings\/assets"/);
  assert.match(routeMetaSource, /navLabel: "資產庫"/);
  assert.match(routerSource, /path: "settings\/assets"/);
  assert.match(routerSource, /<Navigate to="\/display-pages\/editor\?workspace=assets" replace \/>/);
  assert.match(routerSource, /path: "settings\/images"/);
});
