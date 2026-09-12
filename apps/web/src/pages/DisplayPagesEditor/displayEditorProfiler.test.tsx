import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import {
  clearDisplayEditorProfileEntries,
  isDisplayEditorProfilingEnabled,
  measureDisplayEditorScope,
  recordDisplayEditorRenderProfile,
  renderProfiledDisplayEditorPreview,
  DISPLAY_EDITOR_PROFILER_STORAGE_KEY
} from "./displayEditorProfiler";

test("profiler is disabled by default when no flags are present", () => {
  assert.equal(isDisplayEditorProfilingEnabled(), false);
});

test("when profiling is disabled, measureDisplayEditorScope executes callback directly without calling performance marks or measures", () => {
  let markCount = 0;
  let measureCount = 0;
  const mockPerformance = {
    mark: () => { markCount++; },
    measure: () => { measureCount++; },
    clearMarks: () => {},
    clearMeasures: () => {}
  };

  const result = measureDisplayEditorScope("region-resolve", () => 42, {
    enabled: false,
    performance: mockPerformance
  });

  assert.equal(result, 42);
  assert.equal(markCount, 0);
  assert.equal(measureCount, 0);
});

test("when profiling is disabled, renderProfiledDisplayEditorPreview returns original element unwrapped", () => {
  const element = <div data-testid="preview-target">original</div>;
  const rendered = renderProfiledDisplayEditorPreview("overview", element, false);
  assert.equal(rendered, element);
});

test("when profiling is disabled, clearDisplayEditorProfileEntries does nothing", () => {
  let clearedMarks = 0;
  const mockPerformance = {
    clearMarks: () => { clearedMarks++; },
    clearMeasures: () => {}
  };
  clearDisplayEditorProfileEntries({ enabled: false, performance: mockPerformance });
  assert.equal(clearedMarks, 0);
});

test("when profiling is enabled, measureDisplayEditorScope records marks, measures, and cleans up marks", () => {
  const marks: string[] = [];
  const measures: Array<{ name: string; start: string; end: string }> = [];
  const clearedMarks: string[] = [];

  const mockPerformance = {
    mark: (name: string) => { marks.push(name); },
    measure: (name: string, start?: string, end?: string) => {
      measures.push({ name, start: start ?? "", end: end ?? "" });
    },
    clearMarks: (name?: string) => { if (name) clearedMarks.push(name); },
    clearMeasures: () => {}
  };

  const result = measureDisplayEditorScope("overlay-resolve", () => "computed", {
    enabled: true,
    performance: mockPerformance
  });

  assert.equal(result, "computed");
  assert.deepEqual(marks, [
    "display-editor:overlay-resolve:start",
    "display-editor:overlay-resolve:end"
  ]);
  assert.deepEqual(measures, [
    {
      name: "display-editor:overlay-resolve",
      start: "display-editor:overlay-resolve:start",
      end: "display-editor:overlay-resolve:end"
    }
  ]);
  assert.deepEqual(clearedMarks, [
    "display-editor:overlay-resolve:start",
    "display-editor:overlay-resolve:end"
  ]);
});

test("when profiling is enabled, clearDisplayEditorProfileEntries invokes performance clear methods", () => {
  let clearedMarks = 0;
  let clearedMeasures = 0;
  const mockPerformance = {
    clearMarks: () => { clearedMarks++; },
    clearMeasures: () => { clearedMeasures++; }
  };
  clearDisplayEditorProfileEntries({ enabled: true, performance: mockPerformance });
  assert.equal(clearedMarks, 1);
  assert.equal(clearedMeasures, 1);
});
