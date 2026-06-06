import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  createOverviewDisplayPageSeedConfig,
  shouldRenderOverviewKpiCard
} from "./displayPageConfig";

const overviewSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("overview runtime helper omits KPI cards with visible false", () => {
  const config = createOverviewDisplayPageSeedConfig();
  config.kpiCards.power.visible = false;

  assert.equal(shouldRenderOverviewKpiCard(config.kpiCards.power), false);
});

test("overview runtime helper treats missing KPI visible as visible", () => {
  const config = createOverviewDisplayPageSeedConfig();
  const { visible: _visible, ...legacyPowerCard } = config.kpiCards.power;

  assert.equal(shouldRenderOverviewKpiCard(legacyPowerCard), true);
});

test("overview runtime filters KPI render order through the visible helper", () => {
  assert.match(overviewSource, /if \(!shouldRenderOverviewKpiCard\(resolvedConfig\.kpiCards\[cardItem\.key\]\)\) \{/);
  assert.match(overviewSource, /return null;/);
});
