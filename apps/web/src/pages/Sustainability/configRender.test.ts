import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createSustainabilityDisplayPageSeedConfig } from "./displayPageConfig";

const sustainabilitySource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("sustainability runtime reads resolved display config for hero, hero media, highlight rail, and bottom cards", () => {
  assert.match(sustainabilitySource, /resolvedConfig\.hero\.eyebrow/);
  assert.match(sustainabilitySource, /resolvedConfig\.hero\.title\[0\]/);
  assert.match(sustainabilitySource, /resolvedConfig\.hero\.copyZhLines/);
  assert.match(sustainabilitySource, /resolveDisplayPageMediaSource\(resolvedConfig\.heroMedia, seedConfig\.heroMedia\.src\)/);
  assert.match(sustainabilitySource, /resolvedConfig\.highlightRail\.items/);
  assert.match(sustainabilitySource, /resolvedConfig\.highlightRail\.container/);
  assert.match(sustainabilitySource, /resolvedConfig\.kpiCards\[/);
  assert.match(sustainabilitySource, /resolvedConfig\.statCards\[/);
  assert.match(sustainabilitySource, /resolvedConfig\.cardStyles\[/);
  assert.match(sustainabilitySource, /DisplayCardFrame/);
  assert.match(sustainabilitySource, /DisplayCardValueRow/);
});

test("sustainability display page seed config captures the current hero and highlight rail contract", () => {
  const config = createSustainabilityDisplayPageSeedConfig("/sustainability-hero.jpg");

  assert.equal(config.hero.eyebrow, "綠能驅動・永續未來");
  assert.deepEqual(config.hero.title, ["永續成果", "持續累積"]);
  assert.equal(config.heroMedia.src, "/sustainability-hero.jpg");
  assert.equal(config.highlightRail.container.width, 470);
  assert.equal(config.highlightRail.items.length, 4);
  assert.equal(config.kpiCards.totalGeneration.width, 304);
  assert.equal(config.statCards.procure.left, 1008);
});

test("sustainability runtime resolves the shared story adapter and clears back to fallback data on request failure", () => {
  assert.match(sustainabilitySource, /useSustainabilityStoryRuntime\(selectedPeriod/);
  assert.match(sustainabilitySource, /enabled: runtimeHydrationEnabled/);
  assert.match(sustainabilitySource, /story:\s*storyRuntime\.payload \?\? undefined/);
  assert.match(sustainabilitySource, /runtimeErrorMessage: runtimeHydrationEnabled \? storyRuntime\.errorMessage : ""/);
  assert.match(sustainabilitySource, /usesRuntimeFallback: storyRuntime\.usesFallback/);
});
