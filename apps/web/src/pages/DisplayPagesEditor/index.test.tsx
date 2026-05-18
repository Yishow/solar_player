import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { DisplayPagesEditor } from "./index";

test("display page editor shell exposes the full rollout page switcher and idle inspector guidance", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor"]
      },
      React.createElement(DisplayPagesEditor, {
        renderPreview: false
      })
    )
  );

  assert.match(html, />Overview</);
  assert.match(html, />Solar</);
  assert.match(html, />Factory Circuit</);
  assert.match(html, />Images</);
  assert.match(html, />Sustainability</);
  assert.match(html, /按 E 啟用編輯模式/);
});

test("display page editor shows blocking validation and fallback publishing status for the selected page", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor?page=overview"]
      },
      React.createElement(DisplayPagesEditor, {
        initialPublishingStateByPage: {
          overview: {
            fallback: {
              isFallbackActive: true,
              items: [
                { active: false, key: "staleData", mode: "show-placeholder" },
                { active: true, key: "emptyContent", mode: "hide" },
                { active: false, key: "missingAsset", mode: "show-seed" }
              ],
              pageId: "overview",
              stage: "live"
            },
            validation: {
              canPublish: false,
              findings: [
                {
                  code: "GEOMETRY_OUT_OF_BOUNDS",
                  message: "heroCopyLayout 超出畫布右邊界",
                  regionId: "heroCopyLayout",
                  severity: "blocking"
                }
              ]
            }
          }
        },
        renderPreview: false
      })
    )
  );

  assert.match(html, /draft 有 1 項 blocking 問題/);
  assert.match(html, /heroCopyLayout/);
  assert.match(html, /目前 live 正在 fallback/);
  assert.match(html, /emptyContent/);
  assert.match(html, /發布草稿/);
  assert.match(html, /disabled=""/);
});
