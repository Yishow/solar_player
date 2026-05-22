import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DisplayPageLoadingState,
  displayPageLoadingStateStyles
} from "./DisplayPageLoadingState";

test("DisplayPageLoadingState exposes an accessible status region with motion hooks", () => {
  const html = renderToStaticMarkup(React.createElement(DisplayPageLoadingState));

  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /display-page-loading-state/);
  assert.match(html, /display-page-loading-state__pulse/);
  assert.match(html, /載入展示頁/);
});

test("DisplayPageLoadingState styles inherit stage tokens and disable motion when reduced motion is requested", () => {
  assert.match(displayPageLoadingStateStyles, /var\(--stage-bg\)/);
  assert.match(displayPageLoadingStateStyles, /prefers-reduced-motion: reduce/);
  assert.match(displayPageLoadingStateStyles, /animation:\s*none/);
});
