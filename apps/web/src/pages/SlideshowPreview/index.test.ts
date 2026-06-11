import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveSlideshowPreviewCards } from "./LiveSlideshowPreviewCards";

const pageDir = path.resolve(import.meta.dirname);
const slideshowPreviewSource = fs.readFileSync(path.join(pageDir, "index.tsx"), "utf8");

test("slideshow preview renders cards from the shared live preview catalog instead of prototype asset maps", () => {
  assert.match(slideshowPreviewSource, /requestedPreviewPageKeys/);
  assert.match(slideshowPreviewSource, /previewCards\.map\(\(card\) => card\.pageKey\)/);
  assert.match(slideshowPreviewSource, /useLiveDisplayPagePreviewCatalog\(\{\s*fallbackPageKeys:\s*previewCatalogPageKeys,\s*requestedPageKeys:\s*requestedPreviewPageKeys\s*\}\)/);
  assert.match(slideshowPreviewSource, /<LiveSlideshowPreviewCards/);
  assert.match(slideshowPreviewSource, /resolveSlideshowCardOffsets\(visibleCards\.length\)/);
  assert.match(slideshowPreviewSource, /pages\.length > 1/);
  assert.match(slideshowPreviewSource, /viewModel\.debugStatus/);
  assert.doesNotMatch(slideshowPreviewSource, /viewModel\.debugRows/);
  assert.doesNotMatch(slideshowPreviewSource, /viewModel\.skippedDebugRows/);
  assert.doesNotMatch(slideshowPreviewSource, /slideshowPreviewAssetRuntimeMap/);
  assert.doesNotMatch(slideshowPreviewSource, /<img alt=\{card\.labelZh\} src=\{asset\}/);
});

test("slideshow preview requests only the visible card window before deferred cards", () => {
  assert.match(slideshowPreviewSource, /const visibleCards = useMemo\(\(\) => \{/);
  assert.match(slideshowPreviewSource, /const previewCards = useMemo\(/);
  assert.match(slideshowPreviewSource, /visibleCards\.map\(\(card\) => \(\{/);
  assert.match(slideshowPreviewSource, /const requestedPreviewPageKeys = useMemo\(/);
  assert.match(slideshowPreviewSource, /previewCards\.map\(\(card\) => card\.pageKey\)/);
  assert.match(slideshowPreviewSource, /fallbackPageKeys:\s*previewCatalogPageKeys/);
  assert.doesNotMatch(slideshowPreviewSource, /requestedPageKeys:\s*previewCatalogPageKeys/);
});

test("slideshow preview derives rotation shell before heavy live preview catalog state", () => {
  const rotationIndex = slideshowPreviewSource.indexOf("usePageRotation()");
  const catalogIndex = slideshowPreviewSource.indexOf("const livePreviewCatalog");
  const controlsIndex = slideshowPreviewSource.indexOf('className="sp-arrow prev"');
  const summaryIndex = slideshowPreviewSource.indexOf('className="sp-summary"');

  assert.ok(rotationIndex > -1);
  assert.ok(catalogIndex > -1);
  assert.ok(controlsIndex > -1);
  assert.ok(summaryIndex > -1);
  assert.ok(rotationIndex < catalogIndex);
  assert.match(slideshowPreviewSource, /previewCatalogPageKeys/);
  assert.match(slideshowPreviewSource, /onClick=\{prevPage\}/);
  assert.match(slideshowPreviewSource, /onClick=\{nextPage\}/);
  assert.doesNotMatch(slideshowPreviewSource, /disabled=\{[^}]*livePreviewCatalog/);
});

test("slideshow preview cards keep duplicate template instances bound to their own live preview state", () => {
  const html = renderToStaticMarkup(
    React.createElement(LiveSlideshowPreviewCards, {
      cards: [
        {
          displayOrder: 1,
          id: 1,
          isCurrent: true,
          labelEn: "Overview",
          labelZh: "總覽頁",
          pageKey: "overview",
          routeLabel: "/overview",
          statusLabel: "輪播已啟用",
          templateKey: "overview"
        },
        {
          displayOrder: 2,
          id: 2,
          isCurrent: false,
          labelEn: "Overview Campus",
          labelZh: "校園總覽",
          pageKey: "overview-2",
          routeLabel: "/overview-campus",
          statusLabel: "輪播已啟用",
          templateKey: "overview"
        }
      ],
      definitions: [
        {
          id: "overview",
          label: "Overview",
          renderPreview: (config) =>
            React.createElement(
              "article",
              null,
              React.createElement("h3", null, String(config.headline ?? "")),
              React.createElement("img", {
                alt: String(config.headline ?? ""),
                src: String(config.mediaSrc ?? "")
              })
            )
        }
      ],
      offsets: [308, 616],
      states: {
        overview: {
          config: {
            headline: "Overview live hero v2",
            mediaSrc: "/media/overview-live-v2.png"
          },
          status: "ready"
        },
        "overview-2": {
          config: {
            headline: "Campus overview hero v5",
            mediaSrc: "/media/overview-campus-v5.png"
          },
          status: "ready"
        }
      }
    })
  );

  assert.match(html, /Overview live hero v2/);
  assert.match(html, /Campus overview hero v5/);
  assert.match(html, /\/media\/overview-live-v2\.png/);
  assert.match(html, /\/media\/overview-campus-v5\.png/);
  assert.match(html, /data-live-preview-mode="showcase"/);
});

test("slideshow preview keeps renderer-unavailable fallback when a card has no template renderer", () => {
  const html = renderToStaticMarkup(
    React.createElement(LiveSlideshowPreviewCards, {
      cards: [
        {
          displayOrder: 9,
          id: 9,
          isCurrent: false,
          labelEn: "Custom Runtime",
          labelZh: "自訂展示頁",
          pageKey: "custom-runtime",
          routeLabel: "/custom-runtime",
          statusLabel: "輪播已啟用",
          templateKey: undefined
        }
      ],
      definitions: [
        {
          id: "overview",
          label: "Overview",
          renderPreview: (config) => React.createElement("article", null, String(config.headline ?? ""))
        }
      ],
      offsets: [616],
      states: {}
    })
  );

  assert.match(html, /自訂展示頁 live preview fallback/);
  assert.match(html, /data-live-preview-mode="showcase"/);
  assert.match(html, /renderer-unavailable/);
  assert.match(html, /展示頁暫不可用/);
  assert.doesNotMatch(html, /目前無法解析此輪播卡片對應的展示頁。/);
});

test("slideshow preview keeps ready cards visible when another preview card fails", () => {
  const html = renderToStaticMarkup(
    React.createElement(LiveSlideshowPreviewCards, {
      cards: [
        {
          displayOrder: 1,
          id: 1,
          isCurrent: true,
          labelEn: "Overview",
          labelZh: "總覽頁",
          pageKey: "overview",
          routeLabel: "/overview",
          statusLabel: "輪播已啟用",
          templateKey: "overview"
        },
        {
          displayOrder: 2,
          id: 2,
          isCurrent: false,
          labelEn: "Solar",
          labelZh: "太陽能頁",
          pageKey: "solar",
          routeLabel: "/solar",
          statusLabel: "輪播已啟用",
          templateKey: "solar"
        }
      ],
      definitions: [
        {
          id: "overview",
          label: "Overview",
          renderPreview: (config) => React.createElement("article", null, String(config.headline ?? ""))
        },
        {
          id: "solar",
          label: "Solar",
          renderPreview: (config) => React.createElement("article", null, String(config.headline ?? ""))
        }
      ],
      offsets: [308, 616],
      states: {
        overview: {
          config: {
            headline: "Overview stays ready"
          },
          status: "ready"
        },
        solar: {
          detail: "Solar preview failed",
          status: "config-unavailable"
        }
      }
    })
  );

  assert.match(html, /Overview stays ready/);
  assert.match(html, /config-unavailable/);
  assert.match(html, /太陽能頁 live preview fallback/);
});
