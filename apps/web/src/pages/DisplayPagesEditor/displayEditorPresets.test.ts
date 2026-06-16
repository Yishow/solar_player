import assert from "node:assert/strict";
import test from "node:test";
import { createOverviewDisplayPageSeedConfig, overviewDisplayPageEditorRegions } from "../Overview/displayPageConfig";
import { resolveDisplayEditorRegions } from "./inspectorFields";
import {
  applyRegionPreset,
  createRegionPreset,
  resolveRegionPresetCompatibility
} from "./displayEditorPresets";

test("compatible region preset applies field values to a matching region shape", () => {
  const config = createOverviewDisplayPageSeedConfig("/hero.png");
  const sourceConfig = {
    ...config,
    heroCopy: {
      ...config.heroCopy,
      eyebrow: "新的標題引言"
    },
    heroCopyLayout: {
      ...config.heroCopyLayout,
      width: 720
    }
  };
  const sourceRegions = resolveDisplayEditorRegions(
    sourceConfig,
    overviewDisplayPageEditorRegions,
    config
  );
  const targetRegions = resolveDisplayEditorRegions(config, overviewDisplayPageEditorRegions, config);
  const source = sourceRegions.find((region) => region.id === "overview-hero-copy");
  const target = targetRegions.find((region) => region.id === "overview-hero-copy");

  assert.ok(source);
  assert.ok(target);

  const preset = createRegionPreset(source!);
  const nextConfig = applyRegionPreset(config, target!, preset) as typeof config;

  assert.equal(nextConfig.heroCopy.eyebrow, "新的標題引言");
  assert.equal(nextConfig.heroCopyLayout.width, 720);
});

test("incompatible region presets are blocked before overwriting the draft", () => {
  const config = createOverviewDisplayPageSeedConfig("/hero.png");
  const regions = resolveDisplayEditorRegions(config, overviewDisplayPageEditorRegions, config);
  const source = regions.find((region) => region.id === "overview-hero-copy");
  const target = regions.find((region) => region.id === "overview-hero-media");

  assert.ok(source);
  assert.ok(target);

  const preset = createRegionPreset(source!);
  assert.deepEqual(resolveRegionPresetCompatibility(target!, preset), {
    compatible: false,
    reason: "這個 preset 與目前 region 類型不相容。"
  });
  assert.deepEqual(applyRegionPreset(config, target!, preset), config);
});
