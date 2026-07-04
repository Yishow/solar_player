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

test("AppHeader emphasizes '綠能' and clock contains drop-shadow glow", () => {
  const headerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/overview"] },
      React.createElement(AppHeader, {
        brandView: {
          logoSrc: "/logo.png",
          brandNameZh: "國瑞汽車",
          brandNameEn: "KUOZUI MOTOR",
          productTitleZh: "綠能展示系統",
          productTitleEn: "Green Energy Display System"
        }
      })
    )
  );

  // Verify '綠能' emphasis rendering
  assert.match(headerHtml, /style="color:var\(--display-emphasis-green\)"/);
  assert.match(headerHtml, /綠能/);
  
  // Verify clock drop-shadow glow
  assert.match(headerHtml, /filter:drop-shadow\(var\(--glow-brand\)\)/);
});

test("AppHeader optimizes weather spin animation, clock meta color, and right cluster text shadow", () => {
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
            secondaryText: "濕度 72%・觀測 14:20",
            state: "ready"
          }
        }
      })
    )
  );

  // 1. Verify weather SVG has the animation class
  assert.match(headerHtml, /class="[^"]*animate-header-weather-spin-pulse[^"]*"/);

  // 2. Verify clock meta uses --shell-kicker-muted instead of --shell-meta-date-ink
  assert.match(headerHtml, /style="color:var\(--shell-kicker-muted\)"/);

  // 3. Verify right weather cluster and status label have Scheme A text-shadow
  assert.match(headerHtml, /data-shell-primitive="header-weather"[^>]*style="[^"]*text-shadow:0 1px 3px rgba\(0,\s*0,\s*0,\s*0\.12\),\s*0 2px 8px rgba\(0,\s*0,\s*0,\s*0\.05\)/);
  assert.match(headerHtml, /data-shell-primitive="status-pill"[^>]*style="[^"]*text-shadow:0 1px 3px rgba\(0,\s*0,\s*0,\s*0\.12\),\s*0 2px 8px rgba\(0,\s*0,\s*0,\s*0\.05\)/);
});


