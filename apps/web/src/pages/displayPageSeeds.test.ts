import assert from "node:assert/strict";
import test from "node:test";
import { resolveDisplayPageMediaEffects } from "@solar-display/shared";
import { createFactoryCircuitDisplayPageSeedConfig } from "./FactoryCircuit/displayPageConfig";
import { createImagesDisplayPageSeedConfig } from "./Images/displayPageConfig";
import { createOverviewDisplayPageSeedConfig } from "./Overview/displayPageConfig";
import { createSolarDisplayPageSeedConfig } from "./Solar/displayPageConfig";
import { createSustainabilityDisplayPageSeedConfig } from "./Sustainability/displayPageConfig";
import {
  imagesMainStageMediaEffectResolverOptions,
  overviewHeroMediaEffectResolverOptions,
  solarHeroMediaEffectResolverOptions,
  sustainabilityHeroMediaEffectResolverOptions
} from "./shared/displayPageMediaEffectConfig";

test("all five display pages expose non-empty seed-backed editor config", () => {
  const overview = createOverviewDisplayPageSeedConfig("/overview-hero.png");
  const solar = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const factoryCircuit = createFactoryCircuitDisplayPageSeedConfig();
  const images = createImagesDisplayPageSeedConfig("/images-main.jpg");
  const sustainability = createSustainabilityDisplayPageSeedConfig("/sustainability-hero.jpg");

  assert.ok(Object.keys(overview.kpiCards).length > 0);
  assert.ok(Object.keys(solar.flowNodes).length > 0);
  assert.ok(Object.keys(factoryCircuit.loadRows).length > 0);
  assert.ok(Object.keys(images.thumbnailSlots).length > 0);
  assert.ok(Object.keys(sustainability.highlightRail).length > 0);

  assert.equal(factoryCircuit.hero.copyZhLines.length, 3);
  assert.equal(overview.iconSources.power.mode, "reference-glyph");
  assert.equal(overview.heroMedia.sourceMode, "seed-default");
  assert.equal(solar.iconSources.kpiCards.generation.mode, "asset-image");
  assert.equal(solar.heroMedia.sourceMode, "seed-default");
  assert.equal(images.hero.copyLines.length, 3);
  assert.equal(images.iconSources.infoPanel.mode, "reference-glyph");
  assert.equal(images.mainStage.sourceMode, "seed-default");
  assert.equal(sustainability.hero.copyEnLines.length, 3);
  assert.equal(factoryCircuit.iconSources.nodes.solar.mode, "page-icon-key");
  assert.equal(sustainability.iconSources.statCards.esg.mode, "page-icon-key");
  assert.equal(sustainability.heroMedia.sourceMode, "seed-default");
  assert.equal(sustainability.highlightRail.cards.length, 2);
  assert.equal(sustainability.highlightRail.cards[0]?.template, "household-equivalent");
  assert.equal(sustainability.highlightRail.cards[0]?.frame.left, 0);
  assert.equal(
    sustainability.highlightRail.cards[1]?.template === "household-equivalent"
      ? sustainability.highlightRail.cards[1].contentSource.payload.householdLabel
      : null,
    "戶4口之家"
  );
});

test("legacy Overview and Images seed effects still resolve into canonical composable layers", () => {
  const overview = createOverviewDisplayPageSeedConfig("/overview-hero.png");
  const images = createImagesDisplayPageSeedConfig("/images-main.jpg");

  const overviewLayers = resolveDisplayPageMediaEffects(
    overview.heroMedia.effects,
    overviewHeroMediaEffectResolverOptions
  ).layers;
  const imagesLayers = resolveDisplayPageMediaEffects(
    images.mainStage.effects,
    imagesMainStageMediaEffectResolverOptions
  ).layers;

  assert.deepEqual(
    overviewLayers.map((layer) => `${layer.kind}:${layer.zone}`),
    ["fade:left", "mist:left", "fade:bottom", "mist:bottom"]
  );
  assert.deepEqual(
    imagesLayers.map((layer) => `${layer.kind}:${layer.zone}`),
    ["fade:left", "mist:left", "fade:bottom", "mist:bottom"]
  );
});

test("Solar and Sustainability seed media treatments stay separate from media sources", () => {
  const solar = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const sustainability = createSustainabilityDisplayPageSeedConfig("/sustainability-hero.jpg");

  assert.equal(solar.heroMedia.src, "/solar-hero.png");
  assert.equal(solar.heroMedia.sourceMode, "seed-default");
  assert.equal(sustainability.heroMedia.src, "/sustainability-hero.jpg");
  assert.equal(sustainability.heroMedia.sourceMode, "seed-default");

  assert.deepEqual(
    resolveDisplayPageMediaEffects(
      solar.heroMedia.effects,
      solarHeroMediaEffectResolverOptions
    ).layers.map((layer) => `${layer.kind}:${layer.zone}`),
    ["fade:bottom", "mist:bottom"]
  );
  assert.deepEqual(
    resolveDisplayPageMediaEffects(
      sustainability.heroMedia.effects,
      sustainabilityHeroMediaEffectResolverOptions
    ).layers.map((layer) => `${layer.kind}:${layer.zone}`),
    ["fade:left", "mist:left", "fade:bottom", "mist:bottom"]
  );
});
