import assert from "node:assert/strict";
import test from "node:test";
import {
  createOverviewDisplayPageSeedConfig,
  overviewDisplayPageEditorRegions
} from "./displayPageConfig";

// The Overview background photo placement (band height, object position, bottom fade) is
// authorable through the existing hero media capability rather than a separate
// `backgroundPlacement` config. These guards confirm that coverage so the
// overview-background-placement-authoring spec stays satisfied without duplicating config.

test("hero media region exposes band height geometry for the background photo", () => {
  const region = overviewDisplayPageEditorRegions.find((entry) => entry.id === "overview-hero-media");
  assert.ok(region, "expected an overview-hero-media region");
  assert.deepEqual(region.geometry?.heightPath, ["heroContainer", "height"]);
});

test("hero media region exposes object-position controls via align X/Y", () => {
  const region = overviewDisplayPageEditorRegions.find((entry) => entry.id === "overview-hero-media");
  assert.ok(region);

  const alignX = region.fields.find((field) => field.path.join(".") === "heroMedia.alignX");
  const alignY = region.fields.find((field) => field.path.join(".") === "heroMedia.alignY");
  assert.ok(alignX, "expected a heroMedia.alignX field for horizontal object position");
  assert.ok(alignY, "expected a heroMedia.alignY field for vertical object position");
});

test("hero media supports a bottom fade effect through the seed effect surface", () => {
  const region = overviewDisplayPageEditorRegions.find((entry) => entry.id === "overview-hero-media");
  assert.ok(region, "expected an overview-hero-media region");
  assert.ok(region.mediaEffectSurface, "expected a media effect surface for the hero media");

  const seed = createOverviewDisplayPageSeedConfig();
  const fadeLayers = (seed.heroMedia.effects?.layers ?? []).filter((layer) => layer.kind === "fade");
  assert.ok(fadeLayers.length > 0, "expected the seed hero media to carry fade layers");
  assert.ok(
    fadeLayers.some((layer) => layer.zone === "bottom"),
    "expected a bottom fade layer for the background photo"
  );
});
