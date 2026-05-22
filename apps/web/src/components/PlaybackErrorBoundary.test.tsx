import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PlaybackErrorBoundary } from "./PlaybackErrorBoundary";

test("PlaybackErrorBoundary renders a fallback and schedules reload when a child render error is caught", () => {
  let scheduledMs: number | null = null;
  let scheduledCount = 0;

  const boundary = new PlaybackErrorBoundary({
    children: React.createElement("div", null, "body"),
    logError: () => {},
    onReloadScheduled() {
      scheduledCount += 1;
    },
    reloadBudget: {
      allowReload() {
        return true;
      }
    },
    scheduleTimeout(_callback, ms) {
      scheduledMs = ms;
      return 1;
    }
  });

  boundary.state = PlaybackErrorBoundary.getDerivedStateFromError(new Error("boom"));
  boundary.componentDidCatch(new Error("boom"), {
    componentStack: "at PlaybackRoute"
  });

  const html = renderToStaticMarkup(boundary.render() as React.ReactElement);

  assert.match(html, /顯示異常/);
  assert.match(html, /請通知管理員/);
  assert.equal(scheduledCount, 1);
  assert.equal(scheduledMs, 5_000);
});

test("PlaybackErrorBoundary keeps the fallback visible without scheduling reload when the budget is exhausted", () => {
  let scheduledMs: number | null = null;
  let scheduledCount = 0;

  const boundary = new PlaybackErrorBoundary({
    children: React.createElement("div", null, "body"),
    logError: () => {},
    onReloadScheduled() {
      scheduledCount += 1;
    },
    reloadBudget: {
      allowReload() {
        return false;
      }
    },
    scheduleTimeout(_callback, ms) {
      scheduledMs = ms;
      return 1;
    }
  });

  boundary.state = PlaybackErrorBoundary.getDerivedStateFromError(new Error("boom"));
  boundary.componentDidCatch(new Error("boom"), {
    componentStack: "at PlaybackRoute"
  });

  const html = renderToStaticMarkup(boundary.render() as React.ReactElement);

  assert.match(html, /顯示異常/);
  assert.doesNotMatch(html, /正在嘗試自動復原/);
  assert.equal(scheduledCount, 0);
  assert.equal(scheduledMs, null);
});
