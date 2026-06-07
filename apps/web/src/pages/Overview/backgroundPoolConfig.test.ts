import assert from "node:assert/strict";
import test from "node:test";
import {
  createOverviewDisplayPageSeedConfig,
  overviewDisplayPageEditorRegions,
  resolveOverviewModernDefaultConfig
} from "./displayPageConfig";

const seedBackgroundSrcs = [
  "/overview-bg-1.png",
  "/overview-bg-2.png",
  "/overview-bg-3.png",
  "/overview-bg-4.png"
];

test("seed config exposes the supplied background candidates with cover fit", () => {
  const config = createOverviewDisplayPageSeedConfig("/brand-logo.png", undefined, seedBackgroundSrcs);
  assert.equal(config.backgroundPool.sources.length, 4);
  config.backgroundPool.sources.forEach((source, index) => {
    assert.equal(source.src, seedBackgroundSrcs[index]);
    assert.equal(source.fitMode, "cover");
  });
});

test("resolveOverviewModernDefaultConfig falls back to the seed pool when config omits backgroundPool", () => {
  const seedConfig = createOverviewDisplayPageSeedConfig("/brand-logo.png", undefined, seedBackgroundSrcs);
  const legacyConfig = createOverviewDisplayPageSeedConfig();
  delete (legacyConfig as Partial<typeof legacyConfig>).backgroundPool;

  const resolved = resolveOverviewModernDefaultConfig(
    legacyConfig as typeof seedConfig,
    seedConfig
  );
  assert.deepEqual(resolved.backgroundPool, seedConfig.backgroundPool);
});

test("resolveOverviewModernDefaultConfig keeps an operator-edited background pool", () => {
  const seedConfig = createOverviewDisplayPageSeedConfig("/brand-logo.png", undefined, seedBackgroundSrcs);
  const editedConfig = {
    ...createOverviewDisplayPageSeedConfig(),
    backgroundPool: { sources: [{ sourceMode: "direct-src" as const, src: "/custom-bg.png" }] }
  };

  const resolved = resolveOverviewModernDefaultConfig(editedConfig, seedConfig);
  assert.equal(resolved.backgroundPool.sources.length, 1);
  assert.equal(resolved.backgroundPool.sources[0]!.src, "/custom-bg.png");
});

test("overview editor exposes a background pool array field bound to backgroundPool.sources", () => {
  const region = overviewDisplayPageEditorRegions.find((entry) => entry.id === "overview-background-pool");
  assert.ok(region, "expected an overview-background-pool region");

  const arrayField = region!.fields.find((field) => field.fieldType === "array");
  assert.ok(arrayField, "expected an array field for the background pool");
  assert.deepEqual(arrayField!.path, ["backgroundPool", "sources"]);

  const itemFields = (arrayField as { itemFields: Array<{ fieldType: string; path: Array<number | string> }> }).itemFields;
  const sourceField = itemFields.find((field) => field.fieldType === "asset");
  assert.ok(sourceField, "expected an asset source field on each candidate");
  assert.deepEqual(sourceField!.path, ["src"]);
});
