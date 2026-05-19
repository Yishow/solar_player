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
  assert.match(solarSource, /resolvedConfig\.flowNodes\[flowItem\.key\]/);
  assert.match(solarSource, /resolvedConfig\.connectors\[connector\.key\]/);
  assert.match(solarSource, /resolvedConfig\.kpiCards\[cardItem\.key\]/);
});

test("solar display page seed config captures the current default hero and layout contract", () => {
  const config = createSolarDisplayPageSeedConfig("/solar-hero.png");

  assert.equal(config.heroCopy.eyebrow, "綠能驅動・永續未來");
  assert.deepEqual(config.heroCopy.titleLines, ["太陽能驅動", "製造新能量"]);
  assert.equal(config.heroMedia.alt, "太陽能車棚與綠能展示場域");
  assert.equal(config.flowNodes.solar.left, 795);
  assert.equal(config.connectors.inverterToFactory.width, 140);
  assert.equal(config.kpiCards.efficiency.width, 360);
});
