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
  assert.match(slideshowPreviewSource, /useLiveDisplayPagePreviewCatalog\(\)/);
  assert.match(slideshowPreviewSource, /<LiveSlideshowPreviewCards/);
  assert.match(slideshowPreviewSource, /viewModel\.debugStatus/);
  assert.doesNotMatch(slideshowPreviewSource, /viewModel\.debugRows/);
  assert.doesNotMatch(slideshowPreviewSource, /viewModel\.skippedDebugRows/);
  assert.doesNotMatch(slideshowPreviewSource, /slideshowPreviewAssetRuntimeMap/);
  assert.doesNotMatch(slideshowPreviewSource, /<img alt=\{card\.labelZh\} src=\{asset\}/);
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
      states: {}
    })
  );

  assert.match(html, /自訂展示頁 live preview fallback/);
  assert.match(html, /renderer-unavailable/);
  assert.match(html, /目前無法解析此輪播卡片對應的展示頁。/);
});
