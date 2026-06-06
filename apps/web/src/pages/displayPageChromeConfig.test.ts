import assert from "node:assert/strict";
import test from "node:test";
import {
  createFactoryCircuitDisplayPageSeedConfig,
  factoryCircuitDisplayPageEditorRegions
} from "./FactoryCircuit/displayPageConfig";
import {
  createImagesDisplayPageSeedConfig,
  imagesDisplayPageEditorRegions
} from "./Images/displayPageConfig";
import {
  createOverviewDisplayPageSeedConfig,
  overviewDisplayPageEditorRegions
} from "./Overview/displayPageConfig";
import {
  createSolarDisplayPageSeedConfig,
  solarDisplayPageEditorRegions
} from "./Solar/displayPageConfig";
import {
  createSustainabilityDisplayPageSeedConfig,
  sustainabilityDisplayPageEditorRegions
} from "./Sustainability/displayPageConfig";
import { createRingOrnamentChromeConfig } from "./shared/displayPageChromeConfig";

test("display page seed configs persist page chrome groups separately from card and media records", () => {
  const overview = createOverviewDisplayPageSeedConfig("/overview-hero.png");
  const solar = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const factory = createFactoryCircuitDisplayPageSeedConfig();
  const images = createImagesDisplayPageSeedConfig("/images-main.jpg");
  const sustainability = createSustainabilityDisplayPageSeedConfig("/sustainability-hero.jpg");

  assert.equal(overview.chrome.heroTypography.titleFontSize, 82);
  assert.equal(overview.chrome.ornaments.goldLine.thickness, 1);
  assert.equal(solar.chrome.ornaments.leaf.scale, 1);
  assert.equal(factory.chrome.modules.statusBlock.titleFontSize, 18);
  assert.equal(images.chrome.modules.counter.currentFontSize, 76);
  assert.equal(images.chrome.modules.arrows.buttonSize, 68);
  assert.equal(sustainability.chrome.ornaments.ring.overlap, 118);
  assert.equal(sustainability.chrome.ornaments.ring.zIndex, 7);
  assert.equal(sustainability.chrome.ornaments.ring.glowOpacity, 0.16);
  assert.equal(sustainability.chrome.modules.periodChips.fontSize, 17);
  assert.equal(sustainability.chrome.modules.provenance.fontSize, 15);

  assert.equal(overview.cardStyles.power.valueFontSize, 68);
  assert.equal(images.mainStage.src, "/images-main.jpg");
  assert.equal(factory.statusBlock.width, 430);
});

test("display editor schemas expose chrome paths only for the page groups they support", () => {
  const overviewHero = overviewDisplayPageEditorRegions.find((region) => region.id === "overview-hero-copy");
  const overviewLeaf = overviewDisplayPageEditorRegions.find((region) => region.id === "overview-ornament-leaf");
  const solarGold = solarDisplayPageEditorRegions.find((region) => region.id === "solar-ornament-gold-line");
  const factoryStatus = factoryCircuitDisplayPageEditorRegions.find((region) => region.id === "factory-status-block");
  const imagesCounter = imagesDisplayPageEditorRegions.find((region) => region.id === "images-counter");
  const imagesArrows = imagesDisplayPageEditorRegions.find((region) => region.id === "images-arrows-style");
  const sustainabilityRing = sustainabilityDisplayPageEditorRegions.find((region) => region.id === "sustainability-ornament-ring");
  const sustainabilityChips = sustainabilityDisplayPageEditorRegions.find((region) => region.id === "sustainability-period-chips");
  const sustainabilityProvenance = sustainabilityDisplayPageEditorRegions.find((region) => region.id === "sustainability-provenance");

  assert.ok(overviewHero);
  assert.ok(overviewLeaf);
  assert.ok(solarGold);
  assert.ok(factoryStatus);
  assert.ok(imagesCounter);
  assert.ok(imagesArrows);
  assert.ok(sustainabilityRing);
  assert.ok(sustainabilityChips);
  assert.ok(sustainabilityProvenance);

  assert.equal(
    overviewHero.fields.some((field) => field.path.join(".") === "chrome.heroTypography.titleFontSize"),
    true
  );
  assert.equal(
    overviewLeaf.fields.some((field) => field.path.join(".") === "chrome.ornaments.leaf.opacity"),
    true
  );
  assert.equal(
    solarGold.fields.some((field) => field.path.join(".") === "chrome.ornaments.goldLine.offsetY"),
    true
  );
  assert.equal(
    factoryStatus.fields.some((field) => field.path.join(".") === "chrome.modules.statusBlock.bodyFontSize"),
    true
  );
  assert.equal(
    imagesCounter.fields.some((field) => field.path.join(".") === "chrome.modules.counter.progressThickness"),
    true
  );
  assert.equal(
    imagesArrows.fields.some((field) => field.path.join(".") === "chrome.modules.arrows.fontSize"),
    true
  );
  assert.equal(
    sustainabilityRing.fields.some((field) => field.path.join(".") === "chrome.ornaments.ring.overlap"),
    true
  );
  assert.equal(
    sustainabilityRing.fields.some((field) => field.path.join(".") === "chrome.ornaments.ring.glowOpacity"),
    true
  );
  assert.equal(
    sustainabilityChips.fields.some((field) => field.path.join(".") === "chrome.modules.periodChips.fontSize"),
    true
  );
  assert.equal(
    sustainabilityProvenance.fields.some((field) => field.path.join(".") === "chrome.modules.provenance.lineHeight"),
    true
  );

  assert.equal(
    overviewDisplayPageEditorRegions.some((region) =>
      region.fields.some((field) => field.path.join(".").startsWith("chrome.modules.periodChips"))
    ),
    false
  );
  assert.equal(
    imagesDisplayPageEditorRegions.some((region) =>
      region.fields.some((field) => field.path.join(".").startsWith("chrome.modules.statusBlock"))
    ),
    false
  );
});

test("ring ornament config falls back when persisted treatment values exceed readability bounds", () => {
  assert.deepEqual(
    createRingOrnamentChromeConfig({
      glowOpacity: 1,
      offsetX: 999,
      offsetY: -999,
      opacity: 0.92,
      overlap: 999,
      scale: 0.1,
      thickness: 0,
      zIndex: 99
    }),
    createRingOrnamentChromeConfig()
  );
});
