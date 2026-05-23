import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AppHeader } from "./AppHeader";

test("AppHeader renders a weather slot with caller-provided copy", () => {
  const headerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/overview"] },
      React.createElement(AppHeader, {
        meta: {
          status: "disconnected",
          statusLabel: "離線",
          weather: "晴 31°C"
        }
      })
    )
  );

  assert.match(headerHtml, /data-shell-primitive="header-weather"/);
  assert.match(headerHtml, /晴 31°C/);
  assert.match(headerHtml, />離線</);
});

test("AppHeader keeps a neutral weather fallback instead of dropping the slot", () => {
  const headerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/overview"] },
      React.createElement(AppHeader)
    )
  );

  assert.match(headerHtml, /data-shell-primitive="header-weather"/);
  assert.match(headerHtml, /天氣資料同步中/);
  assert.doesNotMatch(headerHtml, /晴\s*26°C/);
});
