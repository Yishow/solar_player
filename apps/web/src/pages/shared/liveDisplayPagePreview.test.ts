import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DisplayPageTemplateKey } from "@solar-display/shared";
import {
  LiveDisplayPagePreview,
  type LiveDisplayPagePreviewState
} from "./liveDisplayPagePreview";

type PreviewConfig = {
  headline: string;
  mediaSrc: string;
};

type PreviewDefinition = {
  id: DisplayPageTemplateKey;
  label: string;
  renderPreview: (config: Record<string, unknown>) => React.ReactElement;
};

const previewDefinitions: PreviewDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    renderPreview: (config) => {
      const typedConfig = config as unknown as PreviewConfig;
      return React.createElement(
        "article",
        { "data-testid": "live-preview-content" },
        React.createElement("h3", null, typedConfig.headline),
        React.createElement("img", {
          alt: typedConfig.headline,
          src: typedConfig.mediaSrc
        })
      );
    }
  }
];

function renderPreview(state: LiveDisplayPagePreviewState) {
  return renderToStaticMarkup(
    React.createElement(LiveDisplayPagePreview, {
      definitions: previewDefinitions,
      pageLabel: "總覽頁",
      state,
      templateKey: "overview"
    })
  );
}

test("live display page preview renders the latest published config through the shared renderer", () => {
  const html = renderPreview({
    config: {
      headline: "已發布新英雄圖",
      mediaSrc: "/media/overview-hero-v2.png"
    },
    status: "ready"
  });

  assert.match(html, /已發布新英雄圖/);
  assert.match(html, /\/media\/overview-hero-v2\.png/);
  assert.match(html, /data-live-preview-status="ready"/);
  assert.match(html, /唯讀預覽/);
  assert.match(html, /data-live-preview-scaled-content="true"/);
  assert.match(html, /transform:scale\(/);
});

test("live display page preview exposes explicit fallback state when the published preview cannot resolve", () => {
  const html = renderPreview({
    detail: "缺少正式素材",
    status: "asset-unavailable"
  });

  assert.match(html, /總覽頁/);
  assert.match(html, /預覽暫時無法顯示/);
  assert.match(html, /缺少正式素材/);
  assert.match(html, /data-live-preview-status="asset-unavailable"/);
});
