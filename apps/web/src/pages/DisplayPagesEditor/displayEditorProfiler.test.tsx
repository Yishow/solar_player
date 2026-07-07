import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import {
  DISPLAY_EDITOR_PROFILER_STORAGE_KEY,
  isDisplayEditorProfilingEnabled,
  measureDisplayEditorScope,
  renderProfiledDisplayEditorPreview
} from "./displayEditorProfiler";

function withWindow<T>(windowValue: unknown, callback: () => T): T {
  const originalWindow = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = windowValue;
  try {
    return callback();
  } finally {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
}

test("display editor profiler is disabled by default", () => {
  assert.equal(isDisplayEditorProfilingEnabled(), false);
  assert.equal(
    withWindow({ location: { search: "" }, localStorage: { getItem: () => null } }, () =>
      isDisplayEditorProfilingEnabled()
    ),
    false
  );
});

test("display editor profiler can be enabled from query string or local storage", () => {
  assert.equal(
    withWindow({ location: { search: "?displayEditorProfile=1" }, localStorage: { getItem: () => null } }, () =>
      isDisplayEditorProfilingEnabled()
    ),
    true
  );
  assert.equal(
    withWindow({
      location: { search: "" },
      localStorage: { getItem: (key: string) => (key === DISPLAY_EDITOR_PROFILER_STORAGE_KEY ? "1" : null) }
    }, () => isDisplayEditorProfilingEnabled()),
    true
  );
});

test("display editor profiler only records performance marks when enabled", () => {
  const calls: string[] = [];
  const performanceLike = {
    clearMarks: (name?: string) => {
      calls.push(`clear-mark:${name}`);
    },
    clearMeasures: (name?: string) => {
      calls.push(`clear-measure:${name}`);
    },
    mark: (name: string) => {
      calls.push(`mark:${name}`);
    },
    measure: (name: string) => {
      calls.push(`measure:${name}`);
    }
  };

  assert.equal(measureDisplayEditorScope("region-resolve", () => 42, { enabled: false, performance: performanceLike }), 42);
  assert.deepEqual(calls, []);

  assert.equal(measureDisplayEditorScope("region-resolve", () => 43, { enabled: true, performance: performanceLike }), 43);
  assert.deepEqual(calls, [
    "mark:display-editor:region-resolve:start",
    "mark:display-editor:region-resolve:end",
    "measure:display-editor:region-resolve",
    "clear-mark:display-editor:region-resolve:start",
    "clear-mark:display-editor:region-resolve:end"
  ]);
});

test("display editor preview profiler preserves markup when disabled", () => {
  const preview = React.createElement("article", { "data-preview": "ok" }, "Preview");
  assert.equal(renderToStaticMarkup(renderProfiledDisplayEditorPreview("overview", preview, false)), "<article data-preview=\"ok\">Preview</article>");
});
