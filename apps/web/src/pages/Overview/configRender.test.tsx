import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import {
  createOverviewDisplayPageSeedConfig,
  resolveOverviewModernDefaultConfig
} from "./displayPageConfig";

const overviewSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("overview runtime reads resolved display config for hero copy and hero media", () => {
  assert.match(overviewSource, /resolvedConfig\.heroCopy\.eyebrow/);
  assert.match(overviewSource, /resolvedConfig\.heroCopy\.titleLines\[0\]/);
  assert.match(overviewSource, /renderOverviewTitleLine\(resolvedConfig\.heroCopy\.titleLines\[0\]\)/);
  assert.match(overviewSource, /resolvedConfig\.heroCopyLayout/);
  assert.match(overviewSource, /resolvedConfig\.chrome\.heroTypography\.eyebrowFontSize/);
  assert.match(overviewSource, /resolvedConfig\.chrome\.heroTypography\.titleFontSize/);
  assert.match(overviewSource, /resolvedConfig\.chrome\.heroTypography\.subtitleMarginTop/);
  assert.match(overviewSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.thickness/);
  assert.match(overviewSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.opacity/);
  assert.match(overviewSource, /resolvedConfig\.chrome\.ornaments\.leaf\.opacity/);
  assert.match(overviewSource, /resolvedConfig\.chrome\.ornaments\.leaf\.scale/);
  assert.match(overviewSource, /resolveDisplayPageMediaSource\(resolvedConfig\.heroMedia, seedConfig\.heroMedia\.src\)/);
  assert.match(overviewSource, /resolvedConfig\.kpiCards\[cardItem\.key\]/);
  assert.match(overviewSource, /DisplayCardFrame/);
  assert.match(overviewSource, /DisplayCardValueRow/);
  assert.match(overviewSource, /resolvedConfig\.cardStyles\[cardItem\.key\]/);
  assert.match(overviewSource, /metric\.trendSeries && metric\.trendSeries\.length > 0/);
  assert.match(overviewSource, /Sparkline className=\"overview-kpi-sparkline\" values=\{metric\.trendSeries\}/);
  assert.doesNotMatch(overviewSource, /import \{ trendSeries \} from \"\.\.\/\.\.\/mocks\/metrics\"/);
  assert.doesNotMatch(overviewSource, /Shared Story Summary/);
});

test("overview display page seed config captures the current default hero contract", () => {
  const config = createOverviewDisplayPageSeedConfig();

  assert.equal(config.heroCopy.eyebrow, "綠能驅動・永續未來");
  assert.deepEqual(config.heroCopy.titleLines, ["以綠色製造", "驅動美好生活"]);
  assert.deepEqual(config.heroCopyLayout, { left: 86, top: 210, width: 600 });
  assert.equal(config.chrome.heroTypography.titleFontSize, 82);
  assert.equal(config.cardStyles.power.valueFontSize, 68);
  assert.equal(config.cardStyles.power.paddingTop, 22);
  assert.equal(config.cardStyles.power.paddingBottom, 18);
  assert.equal(config.cardStyles.power.cornerRadius, 20);
  const heroFadeLayers = config.heroMedia.effects?.layers ?? [];
  const fadeCoverage = (zone: string) => {
    const layer = heroFadeLayers.find((entry) => entry.kind === "fade" && entry.zone === zone);
    return layer && "coverage" in layer ? layer.coverage : undefined;
  };
  assert.equal(fadeCoverage("left"), 0.62);
  assert.equal(fadeCoverage("bottom"), 0.55);
  assert.equal(config.heroMedia.alt, "國瑞汽車中廠綠能展示場域");
  assert.ok((config.heroMedia.src ?? "").length > 0);
});

test("overview runtime upgrades persisted legacy defaults without overriding custom edits", () => {
  const seed = createOverviewDisplayPageSeedConfig("/overview-hero.png");
  const legacy = {
    ...seed,
    cardStyles: {
      ...seed.cardStyles,
      power: createDisplayCardStyleConfig({
        paddingBottom: 18,
        paddingLeft: 22,
        paddingRight: 22,
        paddingTop: 20,
        valueFontSize: 54,
        valueRowAlign: "center"
      })
    },
    chrome: {
      ...seed.chrome,
      heroTypography: {
        ...seed.chrome.heroTypography,
        eyebrowMarginBottom: 20,
        subtitleMarginTop: 30,
        titleFontSize: 84,
        titleLetterSpacing: 4
      }
    },
    heroContainer: {
      height: 700,
      left: 430,
      top: 146,
      width: 1490
    },
    heroCopyLayout: {
      left: 86,
      top: 172,
      width: 642
    },
    kpiCards: {
      ...seed.kpiCards,
      power: {
        height: 220,
        left: 40,
        top: 760,
        width: 352
      }
    }
  };

  const upgraded = resolveOverviewModernDefaultConfig(legacy, seed);
  assert.deepEqual(upgraded.heroCopyLayout, seed.heroCopyLayout);
  assert.deepEqual(upgraded.heroContainer, seed.heroContainer);
  assert.deepEqual(upgraded.kpiCards.power, seed.kpiCards.power);
  assert.deepEqual(upgraded.cardStyles.power, seed.cardStyles.power);
  assert.deepEqual(upgraded.chrome.heroTypography, seed.chrome.heroTypography);

  const custom = {
    ...legacy,
    heroCopyLayout: {
      left: 120,
      top: 172,
      width: 642
    }
  };

  assert.deepEqual(resolveOverviewModernDefaultConfig(custom, seed).heroCopyLayout, custom.heroCopyLayout);
});
