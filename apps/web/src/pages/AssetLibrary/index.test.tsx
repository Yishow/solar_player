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
  assert.match(html, /資產庫已同步。/);
  assert.doesNotMatch(html, /正在同步資產庫/);
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
  assert.match(html, /data-workspace-surface="status-board"/);
  assert.match(html, /data-workspace-surface="metadata-board"/);
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
  assert.match(html, /data-workspace-surface="context-board"/);
  assert.match(html, /data-workspace-surface="asset-actions"/);
});

test("asset library cards have the custom CSS class for glassmorphism hover transitions", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets
      })
    )
  );

  assert.match(html, /class="[^"]*asset-library-card[^"]*"/);
});

test("asset library displays skeleton loader pulsing cards when loading", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets: undefined
      })
    )
  );

  assert.match(html, /class="[^"]*asset-skeleton-pulse[^"]*"/);
});

test("asset library displays search clear button when search query is present", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets,
        initialQuery: "overview"
      })
    )
  );

  assert.match(html, /class="[^"]*search-clear-btn[^"]*"/);
});

test("asset library displays drag overlay when dragging file over panel", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets,
        initialDragging: true
      })
    )
  );

  assert.match(html, /class="[^"]*asset-drag-overlay[^"]*"/);
  assert.match(html, /拖曳檔案至此處上傳/);
});

test("asset library displays lightbox overlay when activeLightboxSrc is present", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets,
        initialLightboxSrc: "http://localhost:3000/uploads/images/overview-hero.png"
      })
    )
  );

  assert.match(html, /class="[^"]*asset-lightbox-backdrop[^"]*"/);
  assert.match(html, /class="[^"]*asset-lightbox-content[^"]*"/);
});

test("asset library displays image dimensions and file size on detailed metadata view", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets
      })
    )
  );

  assert.match(html, /1920\s*x\s*1080/);
  assert.match(html, /234\.4\s*KB/);
});

test("asset library displays color-coded badges for live/draft references and red outlines for blockers", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?workspace=assets"] },
      React.createElement(AssetLibrary, {
        embedded: true,
        initialAssets,
        initialReferences
      })
    )
  );

  assert.match(html, /class="[^"]*reference-badge-live[^"]*"/);
  assert.match(html, /class="[^"]*delete-blocker-alert[^"]*"/);
});

test("asset library displays batch action floating bar when isBatchMode is true", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets,
        initialBatchMode: true
      })
    )
  );

  assert.match(html, /class="[^"]*asset-batch-bar[^"]*active[^"]*"/);
  assert.match(html, /批次刪除/);
});

test("asset library renders hover apply shortcuts in embedded mode", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?workspace=assets"] },
      React.createElement(AssetLibrary, {
        embedded: true,
        initialAssets,
        onApplySelection: () => {}
      })
    )
  );

  assert.match(html, /class="[^"]*hover-apply-btn[^"]*"/);
  assert.match(html, /套用此圖/);
});

test("asset library renders hover delete shortcuts or lock icons on card overlay", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets,
        initialReferences
      })
    )
  );

  assert.match(html, /class="[^"]*hover-delete-btn[^"]*"/);
  assert.match(html, /class="[^"]*hover-lock-icon[^"]*"/);
});

test("asset library displays actionable redirect links for references", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets,
        initialReferences
      })
    )
  );

  assert.match(html, /href="\/display-pages\/editor\?[^"]*"/);
  assert.match(html, /target="_blank"/);
});

test("asset library details view exposes title edit and inline select dropdowns", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets
      })
    )
  );

  assert.match(html, /class="[^"]*inline-edit-title-btn[^"]*"/);
});

test("asset library batch mode disables checkboxes for referenced assets", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets,
        initialReferences,
        initialBatchMode: true
      })
    )
  );

  assert.match(html, /<input[^>]*type="checkbox"[^>]*disabled/);
});

test("asset library empty state displays dashed upload trigger card", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets: []
      })
    )
  );

  assert.match(html, /class="[^"]*empty-upload-trigger[^"]*"/);
  assert.match(html, /點此上傳資產/);
});

test("asset library headers are sticky-safe and buttons use unified premium styling", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/settings/assets"] },
      React.createElement(AssetLibrary, {
        initialAssets
      })
    )
  );

  assert.doesNotMatch(html, /bg-transparent border-none px-0/);
  assert.match(html, /class="[^"]*asset-btn-primary[^"]*"/);
  assert.match(html, /class="[^"]*asset-btn-secondary[^"]*"/);
});

test("asset library route remains as compatibility entry to the editor workspace", () => {
  assert.match(routeMetaSource, /path: "\/settings\/assets"/);
  assert.match(routeMetaSource, /navLabel: "資產庫"/);
  assert.match(routerSource, /path: "settings\/assets"/);
  assert.match(routerSource, /<Navigate to="\/display-pages\/editor\?workspace=assets" replace \/>/);
  assert.match(routerSource, /path: "settings\/images"/);
});
