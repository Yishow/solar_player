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
