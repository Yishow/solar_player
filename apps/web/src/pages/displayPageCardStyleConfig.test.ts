import assert from "node:assert/strict";
import test from "node:test";
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
import { createDisplayCardStyleConfig } from "./shared/displayCardStyleConfig";

test("display page seed configs persist card style records separately from geometry", () => {
  const overview = createOverviewDisplayPageSeedConfig("/overview-hero.png");
  const solar = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const images = createImagesDisplayPageSeedConfig("/images-main.jpg");
  const sustainability = createSustainabilityDisplayPageSeedConfig("/sustainability-hero.jpg");

  assert.equal(overview.cardStyles.summary.titleFontSize, 13);
  assert.equal(overview.cardStyles.power.valueFontSize, 64);
  assert.equal(solar.cardStyles.generation.valueRowAlign, "center");
  assert.equal(images.cardStyles.infoPanel.titleFontSize, 28);
  assert.equal(sustainability.cardStyles.totalGeneration.valueFontSize, 66);
  assert.equal(sustainability.cardStyles.esg.iconBoxSize, 58);

  assert.equal(overview.summaryCard.width, 520);
  assert.equal(overview.kpiCards.power.width, 352);
  assert.equal(overview.kpiCards.power.height, 232);
  assert.equal(solar.kpiCards.generation.height, 220);
  assert.equal(images.infoPanel.width, 374);
  assert.equal(sustainability.statCards.esg.height, 220);
});

test("display editor schemas expose card style paths only for eligible shared-card regions", () => {
  const overviewPower = overviewDisplayPageEditorRegions.find((region) => region.id === "overview-kpi-power");
  const overviewSummary = overviewDisplayPageEditorRegions.find((region) => region.id === "overview-summary");
  const solarGeneration = solarDisplayPageEditorRegions.find((region) => region.id === "solar-kpi-generation");
  const imagesInfo = imagesDisplayPageEditorRegions.find((region) => region.id === "images-info-panel");
  const sustainabilityStat = sustainabilityDisplayPageEditorRegions.find((region) => region.id === "sustainability-stat-esg");

  assert.ok(overviewPower);
  assert.ok(overviewSummary);
  assert.ok(solarGeneration);
  assert.ok(imagesInfo);
  assert.ok(sustainabilityStat);

  assert.ok(overviewSummary.fields.some((field) => field.path.join(".") === "cardStyles.summary.titleFontSize"));
  assert.ok(overviewPower.fields.some((field) => field.path.join(".") === "cardStyles.power.titleFontSize"));
  assert.ok(solarGeneration.fields.some((field) => field.path.join(".") === "cardStyles.generation.valueRowAlign"));
  assert.ok(imagesInfo.fields.some((field) => field.path.join(".") === "cardStyles.infoPanel.footerPaddingTop"));
  assert.ok(sustainabilityStat.fields.some((field) => field.path.join(".") === "cardStyles.esg.iconBoxSize"));

  const imagesThumb = imagesDisplayPageEditorRegions.find((region) => region.id === "images-thumb-thumb1");
  assert.ok(imagesThumb);
  assert.equal(imagesThumb.fields.some((field) => field.path.join(".").startsWith("cardStyles.")), false);
});

test("display card style configs normalize invalid tokens back to the shared baseline", () => {
  const resolved = createDisplayCardStyleConfig({
    paddingTop: -8 as never,
    titleFontSize: Number.NaN as never,
    valueRowAlign: "stretch" as never
  });

  assert.equal(resolved.paddingTop, 26);
  assert.equal(resolved.titleFontSize, 20);
  assert.equal(resolved.valueRowAlign, "start");
});
