import assert from "node:assert/strict";
import test from "node:test";
import { createOverviewDisplayPageSeedConfig, overviewDisplayPageEditorRegions } from "../Overview/displayPageConfig";
import { resolveDisplayEditorRegions } from "./inspectorFields";
import {
  applyGeometryClipboard,
  createGeometryClipboard,
  resolveGeometryClipboardCompatibility
} from "./displayEditorGeometry";

test("geometry clipboard pastes copied KPI geometry into a compatible region", () => {
  const config = createOverviewDisplayPageSeedConfig("/hero.png");
  const regions = resolveDisplayEditorRegions(config, overviewDisplayPageEditorRegions, config);
  const source = regions.find((region) => region.id === "overview-kpi-power");
  const target = regions.find((region) => region.id === "overview-kpi-total");

  assert.ok(source?.geometry);
  assert.ok(target?.geometry);

  const clipboard = createGeometryClipboard(source!);
  const nextConfig = applyGeometryClipboard(config, target!, clipboard) as typeof config;

  assert.deepEqual(nextConfig.kpiCards.total, config.kpiCards.power);
});

test("geometry clipboard blocks incompatible regions without mutating the draft", () => {
  const config = createOverviewDisplayPageSeedConfig("/hero.png");
  const regions = resolveDisplayEditorRegions(config, overviewDisplayPageEditorRegions, config);
  const source = regions.find((region) => region.id === "overview-kpi-power");
  const target = regions.find((region) => region.id === "overview-hero-copy");

  assert.ok(source?.geometry);
  assert.ok(target?.geometry);

  const clipboard = createGeometryClipboard(source!);
  assert.deepEqual(resolveGeometryClipboardCompatibility(target!, clipboard), {
    compatible: false,
    reason: "幾何剪貼簿只可貼到相容的 region。"
  });
  assert.deepEqual(applyGeometryClipboard(config, target!, clipboard), config);
});
