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
          weather: {
            primaryText: "台北 多雲 31°C",
            secondaryText: "濕度 72%・觀測 14:20",
            state: "ready"
          }
        }
      })
    )
  );

  assert.match(headerHtml, /data-shell-primitive="header-weather"/);
  assert.match(headerHtml, /台北 多雲 31°C/);
  assert.match(headerHtml, /濕度 72%・觀測 14:20/);
  assert.match(headerHtml, />離線</);
});

test("AppHeader keeps a neutral weather fallback instead of dropping the slot", () => {
  const headerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/overview"] },
      React.createElement(AppHeader, {
        meta: {
          weather: {
            primaryText: "天氣未啟用",
            secondaryText: "",
            state: "disabled"
          }
        }
      })
    )
  );

  assert.match(headerHtml, /data-shell-primitive="header-weather"/);
  assert.match(headerHtml, /天氣未啟用/);
  assert.doesNotMatch(headerHtml, /晴\s*26°C/);
});

test("AppHeader renders stale weather metadata without hiding the status badge", () => {
  const headerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/overview"] },
      React.createElement(AppHeader, {
        meta: {
          status: "connected",
          statusLabel: "Online",
          weather: {
            primaryText: "台北 多雲 31°C",
            secondaryText: "濕度 72%・觀測 14:20・資料延遲",
            state: "stale"
          }
        }
      })
    )
  );

  assert.match(headerHtml, /data-weather-state="stale"/);
  assert.match(headerHtml, /台北 多雲 31°C/);
  assert.match(headerHtml, /濕度 72%・觀測 14:20・資料延遲/);
  assert.match(headerHtml, />Online</);
});
