import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const overviewSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("overview KPI cards use fixed pixel geometry inside the FHD canvas", () => {
  assert.doesNotMatch(overviewSource, /const toPctX =/);
  assert.doesNotMatch(overviewSource, /const toPctY =/);
  assert.doesNotMatch(overviewSource, /height:\s*toPctY\(layout\.height\)/);
  assert.doesNotMatch(overviewSource, /left:\s*toPctX\(layout\.left\)/);
  assert.doesNotMatch(overviewSource, /top:\s*toPctY\(layout\.top\)/);
  assert.doesNotMatch(overviewSource, /width:\s*toPctX\(layout\.width\)/);
});

test("overview applies density widget internal styles via inline card style vars", () => {
  for (const key of ["weather", "phasePower", "generationTrend", "alertNotifications"]) {
    assert.match(
      overviewSource,
      new RegExp(`buildDisplayCardStyleVars\\(resolvedConfig\\.widgetStyles\\.${key}\\)`),
      `expected ${key} widget to apply its widgetStyles via buildDisplayCardStyleVars`
    );
  }
});

test("overview feeds the rotated background pick into the hero banner", () => {
  // The rotated pick drives the hero image, falling back to the hero asset when the pool is empty.
  assert.match(overviewSource, /src=\{backgroundSource \?\? heroMediaSource \?\? undefined\}/);
  // The background pick is memoised against the pool signature (mount = fresh pick).
  assert.match(overviewSource, /pickOverviewBackground\(backgroundPoolSources\)/);
  assert.match(overviewSource, /\[backgroundPoolSignature\]/);
});
