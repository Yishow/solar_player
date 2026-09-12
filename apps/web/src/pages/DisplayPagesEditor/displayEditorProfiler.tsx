import React from "react";

export const DISPLAY_EDITOR_PROFILER_STORAGE_KEY = "solar-display:display-editor-profiler";

export type DisplayEditorProfileScope =
  | "overlay-resolve"
  | "preview-render"
  | "region-resolve";

type PerformanceLike = {
  clearMarks?: (markName?: string) => void;
  clearMeasures?: (measureName?: string) => void;
  mark?: (markName: string) => void;
  measure?: (measureName: string, startMark?: string, endMark?: string) => void;
};

export type DisplayEditorProfilerOptions = {
  enabled?: boolean;
  performance?: PerformanceLike;
};

function readProfilerStorageFlag() {
  try {
    return window.localStorage?.getItem(DISPLAY_EDITOR_PROFILER_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isDisplayEditorProfilingEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const params = new URLSearchParams(window.location?.search ?? "");
    const queryFlag = params.get("displayEditorProfile");
    if (queryFlag === "1" || queryFlag === "true") {
      return true;
    }
  } catch {
    return false;
  }

  return readProfilerStorageFlag();
}

export function measureDisplayEditorScope<T>(
  scope: DisplayEditorProfileScope,
  callback: () => T,
  options: DisplayEditorProfilerOptions = {}
): T {
  const enabled = options.enabled ?? isDisplayEditorProfilingEnabled();
  const performanceApi = options.performance ?? globalThis.performance;
  if (!enabled || !performanceApi?.mark || !performanceApi.measure) {
    return callback();
  }

  const measureName = `display-editor:${scope}`;
  const startMark = `${measureName}:start`;
  const endMark = `${measureName}:end`;

  performanceApi.mark(startMark);
  try {
    return callback();
  } finally {
    performanceApi.mark(endMark);
    performanceApi.measure(measureName, startMark, endMark);
    performanceApi.clearMarks?.(startMark);
    performanceApi.clearMarks?.(endMark);
  }
}

export function clearDisplayEditorProfileEntries(
  options: DisplayEditorProfilerOptions = {}
) {
  const enabled = options.enabled ?? isDisplayEditorProfilingEnabled();
  if (!enabled) {
    return;
  }
  const performanceApi = options.performance ?? globalThis.performance;
  performanceApi?.clearMarks?.();
  performanceApi?.clearMeasures?.();
}

export function recordDisplayEditorRenderProfile(
  scope: DisplayEditorProfileScope,
  id: string,
  phase: "mount" | "nested-update" | "update",
  actualDuration: number,
  baseDuration: number
) {
  if (!isDisplayEditorProfilingEnabled()) {
    return;
  }

  console.debug("[display-editor:profile]", {
    actualDuration,
    baseDuration,
    id,
    phase,
    scope
  });
}

export function renderProfiledDisplayEditorPreview(
  pageId: string,
  preview: React.ReactElement,
  enabled = isDisplayEditorProfilingEnabled()
) {
  if (!enabled) {
    return preview;
  }

  return (
    <React.Profiler
      id={`display-editor-preview:${pageId}`}
      onRender={(id, phase, actualDuration, baseDuration) =>
        recordDisplayEditorRenderProfile("preview-render", id, phase, actualDuration, baseDuration)
      }
    >
      {preview}
    </React.Profiler>
  );
}
