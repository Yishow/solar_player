import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDraftConfigUpdate,
  createDraftSession,
  redoDraftSession,
  undoDraftSession
} from "../../hooks/displayPageDraftSession";
import { defaultFallbackPolicy } from "@solar-display/shared";
import { createOverviewDisplayPageSeedConfig, overviewDisplayPageEditorRegions } from "../Overview/displayPageConfig";
import { resolveDisplayEditorRegions } from "./inspectorFields";
import {
  applyGeometryClipboard,
  applyGeometryClipboardBatch,
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

test("geometry clipboard can paste only the position subset into a compatible target", () => {
  const config = createOverviewDisplayPageSeedConfig("/hero.png");
  const regions = resolveDisplayEditorRegions(config, overviewDisplayPageEditorRegions, config);
  const source = regions.find((region) => region.id === "overview-kpi-power");
  const target = regions.find((region) => region.id === "overview-kpi-total");

  assert.ok(source?.geometry);
  assert.ok(target?.geometry);

  const clipboard = createGeometryClipboard(source!);
  const nextConfig = applyGeometryClipboard(config, target!, clipboard, "position") as typeof config;

  assert.equal(nextConfig.kpiCards.total.left, config.kpiCards.power.left);
  assert.equal(nextConfig.kpiCards.total.top, config.kpiCards.power.top);
  assert.equal(nextConfig.kpiCards.total.width, config.kpiCards.total.width);
  assert.equal(nextConfig.kpiCards.total.height, config.kpiCards.total.height);
});

test("geometry clipboard batch paste updates compatible targets and reports incompatible ones", () => {
  const config = createOverviewDisplayPageSeedConfig("/hero.png");
  const regions = resolveDisplayEditorRegions(config, overviewDisplayPageEditorRegions, config);
  const source = regions.find((region) => region.id === "overview-kpi-power");
  const targets = [
    regions.find((region) => region.id === "overview-kpi-total"),
    regions.find((region) => region.id === "overview-kpi-today"),
    regions.find((region) => region.id === "overview-hero-copy")
  ];

  assert.ok(source?.geometry);
  assert.ok(targets[0]?.geometry);
  assert.ok(targets[1]?.geometry);
  assert.ok(targets[2]?.geometry);

  const clipboard = createGeometryClipboard(source!);
  const result = applyGeometryClipboardBatch(
    config,
    targets.filter(Boolean) as NonNullable<(typeof targets)[number]>[],
    clipboard,
    "full-frame"
  );
  const nextConfig = result.config as typeof config;

  assert.deepEqual(result.failedTargetIds, ["overview-hero-copy"]);
  assert.deepEqual(nextConfig.kpiCards.total, config.kpiCards.power);
  assert.deepEqual(nextConfig.kpiCards.today, config.kpiCards.power);
  assert.deepEqual(nextConfig.heroCopyLayout, config.heroCopyLayout);
});

test("geometry clipboard batch paste stays inside one undoable draft history step", () => {
  const config = createOverviewDisplayPageSeedConfig("/hero.png");
  const regions = resolveDisplayEditorRegions(config, overviewDisplayPageEditorRegions, config);
  const source = regions.find((region) => region.id === "overview-kpi-power");
  const targets = [
    regions.find((region) => region.id === "overview-kpi-total"),
    regions.find((region) => region.id === "overview-kpi-today")
  ];

  assert.ok(source?.geometry);
  assert.ok(targets[0]?.geometry);
  assert.ok(targets[1]?.geometry);

  const clipboard = createGeometryClipboard(source!);
  const initialSession = createDraftSession(config, null, defaultFallbackPolicy);
  const updatedSession = applyDraftConfigUpdate(initialSession, (current) =>
    applyGeometryClipboardBatch(
      current,
      targets.filter(Boolean) as NonNullable<(typeof targets)[number]>[],
      clipboard,
      "full-frame"
    ).config as typeof config
  );
  const undoneSession = undoDraftSession(updatedSession);
  const redoneSession = redoDraftSession(undoneSession);

  assert.deepEqual(undoneSession.config, config);
  assert.deepEqual(redoneSession.config.kpiCards.total, config.kpiCards.power);
  assert.deepEqual(redoneSession.config.kpiCards.today, config.kpiCards.power);
});
