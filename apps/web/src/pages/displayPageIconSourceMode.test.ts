import assert from "node:assert/strict";
import test from "node:test";
import { resolveDisplayEditorRegions } from "./DisplayPagesEditor/inspectorFields";
import {
  createFactoryCircuitDisplayPageSeedConfig,
  factoryCircuitDisplayPageEditorRegions
} from "./FactoryCircuit/displayPageConfig";
import { createImagesDisplayPageSeedConfig } from "./Images/displayPageConfig";
import { createOverviewDisplayPageSeedConfig } from "./Overview/displayPageConfig";
import { createSolarDisplayPageSeedConfig } from "./Solar/displayPageConfig";
import { createSustainabilityDisplayPageSeedConfig } from "./Sustainability/displayPageConfig";

test("display page seed configs persist explicit icon source objects across all five pages", () => {
  const overview = createOverviewDisplayPageSeedConfig("/overview-hero.png");
  const solar = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const factoryCircuit = createFactoryCircuitDisplayPageSeedConfig();
  const images = createImagesDisplayPageSeedConfig("/images-main.jpg");
  const sustainability = createSustainabilityDisplayPageSeedConfig("/sustainability-hero.jpg");

  assert.deepEqual(overview.iconSources.power, {
    glyphName: "bolt",
    mode: "reference-glyph"
  });
  assert.equal(solar.iconSources.kpiCards.generation.mode, "asset-image");
  assert.equal(solar.iconSources.kpiCards.generation.alt, "今日發電量");
  assert.match(solar.iconSources.kpiCards.generation.src ?? "", /\S/);
  assert.deepEqual(factoryCircuit.iconSources.nodes.solar, {
    iconKey: "solar",
    mode: "page-icon-key",
    registry: "factory-circuit"
  });
  assert.deepEqual(images.iconSources.infoPanel, {
    glyphName: "image",
    mode: "reference-glyph"
  });
  assert.deepEqual(sustainability.iconSources.statCards.esg, {
    iconKey: "esg-doc",
    mode: "page-icon-key",
    registry: "sustainability"
  });
});

test("display editor regions reveal only the icon payload fields owned by the selected icon mode", () => {
  const config = createFactoryCircuitDisplayPageSeedConfig();
  config.iconSources.nodes.solar = {
    glyphName: "sun",
    mode: "reference-glyph"
  };

  const [region] = resolveDisplayEditorRegions(
    config as unknown as Record<string, unknown>,
    factoryCircuitDisplayPageEditorRegions.filter((candidate) => candidate.id === "factory-node-solar"),
    createFactoryCircuitDisplayPageSeedConfig() as unknown as Record<string, unknown>
  );

  assert.deepEqual(
    region?.fields.map((field) => field.schema.id),
    [
      "solar-icon-source-mode",
      "solar-icon-glyph-name",
      "factory-solar-node-icon-scale",
      "factory-solar-node-icon-label-gap",
      "factory-solar-node-value-align",
      "solar-left",
      "solar-top",
      "solar-width",
      "solar-height"
    ]
  );
});
