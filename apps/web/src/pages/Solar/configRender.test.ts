import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createSolarDisplayPageSeedConfig } from "./displayPageConfig";

const solarSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("solar runtime reads resolved display config for hero, flow nodes, connectors, and KPI cards", () => {
  assert.match(solarSource, /resolvedConfig\.heroCopy\.eyebrow/);
  assert.match(solarSource, /resolvedConfig\.chrome\.heroTypography\.eyebrowFontSize/);
  assert.match(solarSource, /resolvedConfig\.chrome\.heroTypography\.titleFontSize/);
  assert.match(solarSource, /resolvedConfig\.chrome\.heroTypography\.subtitleMarginTop/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.thickness/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.opacity/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.leaf\.opacity/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.leaf\.offsetX/);
  assert.match(solarSource, /resolveDisplayPageMediaSource\(resolvedConfig\.heroMedia, seedConfig\.heroMedia\.src\)/);
  assert.match(
    solarSource,
    /buildDisplayPageMediaPresentation\(\s*resolvedConfig\.heroMedia,\s*solarHeroMediaEffectResolverOptions\s*\)/
  );
  assert.match(solarSource, /resolvedConfig\.flowNodes\[flowItem\.key\]/);
  assert.match(solarSource, /resolvedConfig\.flowNodeTreatments\[flowItem\.key\]/);
  assert.match(solarSource, /resolvedConfig\.connectors\[connector\.key\]/);
  assert.match(solarSource, /resolvedConfig\.connectorTreatments\[connector\.key\]/);
  assert.match(solarSource, /resolvedConfig\.kpiCards\[cardItem\.key\]/);
});

test("solar display page seed config captures the current default hero and layout contract", () => {
  const config = createSolarDisplayPageSeedConfig("/solar-hero.png");

  assert.equal(config.heroCopy.eyebrow, "綠能驅動・永續未來");
  assert.deepEqual(config.heroCopy.titleLines, ["太陽能驅動", "製造新能量"]);
  assert.equal(config.heroMedia.alt, "太陽能車棚與綠能展示場域");
  assert.equal(config.heroMedia.sourceMode, "seed-default");
  assert.ok(config.heroMedia.effects);
  assert.equal(config.flowNodes.solar.left, 795);
  assert.equal(config.connectors.inverterToFactory.width, 108);
  assert.equal(config.connectorTreatments.solarToInverter.strokeWidth, 6);
  assert.equal(config.connectorTreatments.inverterToFactory.strokeWidth, 6);
  assert.equal(config.connectorTreatments.inverterToCo2.strokeWidth, 4);
  assert.ok(
    config.connectorTreatments.solarToInverter.strokeWidth >
      config.connectorTreatments.inverterToCo2.strokeWidth,
    "main connectors stay thicker than the CO2 connector"
  );
  assert.equal(config.flowNodeTreatments.solar.iconScale, 1);
  assert.equal(config.flowNodeTreatments.solar.valueAlign, "center");
  const kpiWidths = Object.values(config.kpiCards).map((card) => card.width);
  assert.ok(
    kpiWidths.every((width) => width === kpiWidths[0]),
    "all five KPI cards share an equal width"
  );
  assert.equal(config.kpiCards.efficiency.width, 350);
});
