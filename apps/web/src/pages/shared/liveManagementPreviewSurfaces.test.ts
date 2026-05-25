import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DisplayPageTemplateKey } from "@solar-display/shared";
import { LiveRotationPreviewList } from "../PlaybackSettings/LiveRotationPreviewList";
import { LiveSlideshowPreviewCards } from "../SlideshowPreview/LiveSlideshowPreviewCards";
import type { LiveDisplayPagePreviewDefinition, LiveDisplayPagePreviewState } from "./liveDisplayPagePreview";

const definitions: LiveDisplayPagePreviewDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    renderPreview: (config) =>
      React.createElement(
        "article",
        { "data-testid": "live-preview-card" },
        React.createElement("h3", null, String(config.headline ?? "")),
        React.createElement("img", {
          alt: String(config.headline ?? ""),
          src: String(config.mediaSrc ?? "")
        })
      )
  }
];

const previewStates: Record<string, LiveDisplayPagePreviewState> = {
  overview: {
    config: {
      headline: "Overview live hero v2",
      mediaSrc: "/media/overview-live-v2.png"
    },
    status: "ready"
  }
};

test("playback settings and slideshow preview surfaces render the same live preview contract", () => {
  const playbackHtml = renderToStaticMarkup(
    React.createElement(LiveRotationPreviewList, {
      definitions,
      rows: [
        {
          durationLabel: "15 秒",
          id: 1,
          labelEn: "Overview",
          labelZh: "總覽頁",
          orderLabel: "01",
          pageId: "overview",
          route: "/overview",
          templateKey: "overview"
        }
      ],
      states: previewStates
    })
  );

  const slideshowHtml = renderToStaticMarkup(
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
        }
      ],
      definitions,
      states: previewStates
    })
  );

  assert.match(playbackHtml, /Overview live hero v2/);
  assert.match(playbackHtml, /\/media\/overview-live-v2\.png/);
  assert.match(playbackHtml, /data-live-preview-mode="editor"/);
  assert.match(slideshowHtml, /Overview live hero v2/);
  assert.match(slideshowHtml, /\/media\/overview-live-v2\.png/);
  assert.match(slideshowHtml, /data-live-preview-mode="showcase"/);
  assert.doesNotMatch(slideshowHtml, /唯讀預覽/);
});

test("playback settings preview list keeps duplicate template instances on their own page-instance state", () => {
  const playbackHtml = renderToStaticMarkup(
    React.createElement(LiveRotationPreviewList, {
      definitions,
      rows: [
        {
          durationLabel: "15 秒",
          id: 1,
          labelEn: "Overview",
          labelZh: "總覽頁",
          orderLabel: "01",
          pageId: "overview",
          route: "/overview",
          templateKey: "overview"
        },
        {
          durationLabel: "18 秒",
          id: 2,
          labelEn: "Overview Campus",
          labelZh: "校園總覽",
          orderLabel: "02",
          pageId: "overview-2",
          route: "/overview-campus",
          templateKey: "overview"
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

  assert.match(playbackHtml, /Overview live hero v2/);
  assert.match(playbackHtml, /Campus overview hero v5/);
  assert.match(playbackHtml, /\/media\/overview-live-v2\.png/);
  assert.match(playbackHtml, /\/media\/overview-campus-v5\.png/);
});

test("missing preview state falls back per instance instead of borrowing another ready duplicate", () => {
  const playbackHtml = renderToStaticMarkup(
    React.createElement(LiveRotationPreviewList, {
      definitions,
      rows: [
        {
          durationLabel: "15 秒",
          id: 1,
          labelEn: "Overview",
          labelZh: "總覽頁",
          orderLabel: "01",
          pageId: "overview",
          route: "/overview",
          templateKey: "overview"
        },
        {
          durationLabel: "18 秒",
          id: 2,
          labelEn: "Overview Campus",
          labelZh: "校園總覽",
          orderLabel: "02",
          pageId: "overview-2",
          route: "/overview-campus",
          templateKey: "overview"
        }
      ],
      states: {
        overview: {
          config: {
            headline: "Overview live hero v2",
            mediaSrc: "/media/overview-live-v2.png"
          },
          status: "ready"
        }
      }
    })
  );

  assert.match(playbackHtml, /Overview live hero v2/);
  assert.match(playbackHtml, /校園總覽 live preview fallback/);
  assert.match(playbackHtml, /正在同步正式預覽/);
  assert.doesNotMatch(playbackHtml, /Campus overview hero v5/);
});

test("playback settings preview keeps renderer-unavailable fallback when a row has no template renderer", () => {
  const playbackHtml = renderToStaticMarkup(
    React.createElement(LiveRotationPreviewList, {
      definitions,
      rows: [
        {
          durationLabel: "15 秒",
          id: 9,
          labelEn: "Custom Runtime",
          labelZh: "自訂展示頁",
          orderLabel: "09",
          pageId: "custom-runtime",
          route: "/custom-runtime",
          templateKey: null
        }
      ],
      states: {}
    })
  );

  assert.match(playbackHtml, /自訂展示頁 live preview fallback/);
  assert.match(playbackHtml, /renderer-unavailable/);
  assert.match(playbackHtml, /目前無法從輪播頁面資料解析對應的展示頁 template。/);
});
