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
import { buildDisplayCardStyleVars, createDisplayCardStyleConfig } from "./shared/displayCardStyleConfig";

test("display page seed configs persist card style records separately from geometry", () => {
  const overview = createOverviewDisplayPageSeedConfig("/overview-hero.png");
  const solar = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const images = createImagesDisplayPageSeedConfig("/images-main.jpg");
  const sustainability = createSustainabilityDisplayPageSeedConfig("/sustainability-hero.jpg");

  assert.equal(overview.cardStyles.summary.titleFontSize, 13);
  assert.equal(overview.cardStyles.power.valueFontSize, 58);
  assert.equal(solar.cardStyles.generation.valueRowAlign, "center");
  assert.equal(images.cardStyles.infoPanel.titleFontSize, 28);
  assert.equal(sustainability.cardStyles.totalGeneration.valueFontSize, 66);
  assert.equal(sustainability.cardStyles.esg.iconBoxSize, 58);

  assert.equal(overview.summaryCard.width, 520);
  assert.equal(overview.kpiCards.power.width, 352);
  assert.equal(overview.kpiCards.power.height, 188);
  assert.equal(solar.kpiCards.generation.height, 220);
  assert.equal(images.infoPanel.width, 398);
  assert.equal(sustainability.statCards.esg.height, 232);
});

test("overview seed gives each KPI card a distinct rounded-square icon chip", () => {
  const overview = createOverviewDisplayPageSeedConfig("/overview-hero.png");
  const kpiKeys = ["power", "today", "total", "co2Today", "co2Total"] as const;

  for (const key of kpiKeys) {
    assert.equal(overview.cardStyles[key].iconChipShape, "rounded-square", `${key} should use a rounded-square chip`);
  }

  const backgrounds = kpiKeys.map((key) => overview.cardStyles[key].iconChipBackground);
  assert.equal(new Set(backgrounds).size, kpiKeys.length, "each KPI card should have a distinct chip background");

  const foregrounds = kpiKeys.map((key) => overview.cardStyles[key].iconChipForeground);
  assert.equal(new Set(foregrounds).size, kpiKeys.length, "each KPI card should have a distinct chip glyph colour");
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

test("display editor exposes icon chip background and shape controls for Overview cards", () => {
  const overviewPower = overviewDisplayPageEditorRegions.find((region) => region.id === "overview-kpi-power");
  assert.ok(overviewPower);

  const backgroundField = overviewPower.fields.find(
    (field) => field.path.join(".") === "cardStyles.power.iconChipBackground"
  );
  const shapeField = overviewPower.fields.find(
    (field) => field.path.join(".") === "cardStyles.power.iconChipShape"
  );

  assert.ok(backgroundField);
  assert.equal(backgroundField.fieldType, "text");
  assert.ok(shapeField);
  assert.equal(shapeField.fieldType, "select");
  const shapeOptions = (shapeField as { options?: { value: string }[] }).options ?? [];
  assert.deepEqual(
    shapeOptions.map((option) => option.value),
    ["circle", "rounded-square"]
  );
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

test("card surface tokens default to an opaque non-frosted baseline", () => {
  const resolved = createDisplayCardStyleConfig();

  // Defaults must keep existing pages visually unchanged: fully opaque, no blur.
  assert.equal(resolved.surfaceOpacity, 1);
  assert.equal(resolved.surfaceBlur, 0);
  assert.equal(resolved.shadowStrength, 1);
});

test("card surface tokens accept frosted-glass overrides and clamp invalid values", () => {
  const frosted = createDisplayCardStyleConfig({
    shadowStrength: 1.4,
    surfaceBlur: 16,
    surfaceOpacity: 0.62
  });
  assert.equal(frosted.surfaceOpacity, 0.62);
  assert.equal(frosted.surfaceBlur, 16);
  assert.equal(frosted.shadowStrength, 1.4);

  const invalid = createDisplayCardStyleConfig({
    surfaceBlur: -4 as never,
    surfaceOpacity: 5 as never
  });
  // Opacity clamps into 0..1, blur stays non-negative.
  assert.equal(invalid.surfaceOpacity, 1);
  assert.equal(invalid.surfaceBlur, 0);
});

test("icon chip tokens default to a circular shape with a non-empty background", () => {
  const resolved = createDisplayCardStyleConfig();

  // Default keeps existing pages visually unchanged: circular chip, neutral fill.
  assert.equal(resolved.iconChipShape, "circle");
  assert.equal(typeof resolved.iconChipBackground, "string");
  assert.ok(resolved.iconChipBackground.length > 0);
});

test("icon chip tokens accept per-card overrides", () => {
  const chip = createDisplayCardStyleConfig({
    iconChipBackground: "#ffce54",
    iconChipShape: "rounded-square"
  });

  assert.equal(chip.iconChipBackground, "#ffce54");
  assert.equal(chip.iconChipShape, "rounded-square");
});

test("icon chip tokens fall back to the seed default on invalid input", () => {
  const baseline = createDisplayCardStyleConfig();
  const invalid = createDisplayCardStyleConfig({
    iconChipBackground: "" as never,
    iconChipShape: "triangle" as never
  });

  assert.equal(invalid.iconChipShape, "circle");
  assert.equal(invalid.iconChipBackground, baseline.iconChipBackground);

  const wrongTypes = createDisplayCardStyleConfig({
    iconChipBackground: 123 as never,
    iconChipShape: 5 as never
  });
  assert.equal(wrongTypes.iconChipShape, "circle");
  assert.equal(wrongTypes.iconChipBackground, baseline.iconChipBackground);
});

test("icon chip foreground defaults to the emphasis colour and accepts overrides", () => {
  const baseline = createDisplayCardStyleConfig();
  assert.equal(typeof baseline.iconChipForeground, "string");
  assert.ok(baseline.iconChipForeground.length > 0);

  const custom = createDisplayCardStyleConfig({ iconChipForeground: "#b07d22" });
  assert.equal(custom.iconChipForeground, "#b07d22");

  const invalid = createDisplayCardStyleConfig({ iconChipForeground: "" as never });
  assert.equal(invalid.iconChipForeground, baseline.iconChipForeground);
});

test("icon chip foreground emits a runtime CSS variable", () => {
  const vars = buildDisplayCardStyleVars(
    createDisplayCardStyleConfig({ iconChipForeground: "#3a6f86" })
  ) as Record<string, string>;
  assert.equal(vars["--display-card-icon-chip-fg"], "#3a6f86");
});

test("icon chip tokens emit runtime CSS variables with shape-derived radius", () => {
  const circle = buildDisplayCardStyleVars(
    createDisplayCardStyleConfig({ iconChipBackground: "#ffffff", iconChipShape: "circle" })
  ) as Record<string, string>;
  assert.equal(circle["--display-card-icon-chip-bg"], "#ffffff");
  assert.equal(circle["--display-card-icon-chip-radius"], "50%");

  const rounded = buildDisplayCardStyleVars(
    createDisplayCardStyleConfig({ iconChipBackground: "#ffce54", iconChipShape: "rounded-square" })
  ) as Record<string, string>;
  assert.equal(rounded["--display-card-icon-chip-bg"], "#ffce54");
  assert.equal(rounded["--display-card-icon-chip-radius"], "30%");
});
