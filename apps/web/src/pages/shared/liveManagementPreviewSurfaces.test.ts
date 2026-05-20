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

const previewStates: Partial<Record<DisplayPageTemplateKey, LiveDisplayPagePreviewState>> = {
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
  assert.match(slideshowHtml, /Overview live hero v2/);
  assert.match(slideshowHtml, /\/media\/overview-live-v2\.png/);
});
