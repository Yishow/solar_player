import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const overviewPageSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const overviewRuntimeSource = readFileSync(path.join(import.meta.dirname, "runtimeContent.tsx"), "utf8");

test("overview KPI cards use fixed pixel geometry inside the FHD canvas", () => {
  assert.doesNotMatch(overviewRuntimeSource, /const toPctX =/);
  assert.doesNotMatch(overviewRuntimeSource, /const toPctY =/);
  assert.doesNotMatch(overviewRuntimeSource, /height:\s*toPctY\(layout\.height\)/);
  assert.doesNotMatch(overviewRuntimeSource, /left:\s*toPctX\(layout\.left\)/);
  assert.doesNotMatch(overviewRuntimeSource, /top:\s*toPctY\(layout\.top\)/);
  assert.doesNotMatch(overviewRuntimeSource, /width:\s*toPctX\(layout\.width\)/);
});

test("overview consumes the freshness-aware live metrics hook", () => {
  assert.match(overviewRuntimeSource, /useLiveMetricsSelector\(/);
  assert.match(overviewRuntimeSource, /buildOverviewRuntimeSnapshot\(overviewRuntimeSelection\.readings\)/);
});

test("overview applies density widget internal styles via inline card style vars", () => {
  for (const key of ["weather", "phasePower", "generationTrend", "alertNotifications"]) {
    assert.match(
      overviewRuntimeSource,
      new RegExp(`buildDisplayCardStyleVars\\(resolvedConfig\\.widgetStyles\\.${key}\\)`),
      `expected ${key} widget to apply its widgetStyles via buildDisplayCardStyleVars`
    );
  }
});

test("overview feeds the rotated background pick into the hero banner", () => {
  // The rotated pick drives the hero image, falling back to the hero asset when the pool is empty.
  assert.match(overviewPageSource, /src=\{bgTransition\.current\}/);
  // The background pick is memoised against the pool signature (mount = fresh pick).
  assert.match(overviewPageSource, /pickOverviewBackground\(backgroundPoolSources\)/);
  assert.match(overviewPageSource, /\[backgroundPoolSignature\]/);
});
