import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import {
  createOverviewDisplayPageSeedConfig,
  overviewDisplayPageEditorRegions,
  resolveOverviewModernDefaultConfig
} from "./displayPageConfig";

const overviewSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("overview runtime reads resolved display config for hero copy and hero media", () => {
  assert.match(overviewSource, /resolvedConfig\.heroCopy\.eyebrow/);
  assert.match(overviewSource, /resolvedConfig\.heroCopy\.titleLines\[0\]/);
  assert.match(overviewSource, /renderOverviewTitleLine\(resolvedConfig\.heroCopy\.titleLines\[0\]\)/);
  assert.match(overviewSource, /resolvedConfig\.heroCopyLayout/);
  assert.match(overviewSource, /heroTypography\.eyebrowFontSize/);
  assert.match(overviewSource, /heroTypography\.titleFontSize/);
  assert.match(overviewSource, /heroTypography\.subtitleMarginTop/);
  assert.match(overviewSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.thickness/);
  assert.match(overviewSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.opacity/);
  assert.match(overviewSource, /resolvedConfig\.chrome\.ornaments\.leaf\.opacity/);
  assert.match(overviewSource, /resolvedConfig\.chrome\.ornaments\.leaf\.scale/);
  assert.match(overviewSource, /resolveDisplayPageMediaSource\(resolvedConfig\.heroMedia, seedConfig\.heroMedia\.src\)/);
  assert.match(overviewSource, /resolvedConfig\.kpiCards\[cardItem\.key\]/);
  assert.match(overviewSource, /DisplayCardFrame/);
  assert.match(overviewSource, /DisplayCardValueRow/);
  assert.match(overviewSource, /resolvedConfig\.cardStyles\[cardItem\.key\]/);
  assert.match(overviewSource, /<OverviewKpiFooter/);
  assert.match(overviewSource, /footer=\{resolvedConfig\.kpiCards\[cardItem\.key\]\}/);
  assert.match(overviewSource, /metric=\{metric\}/);
  assert.doesNotMatch(overviewSource, /import \{ trendSeries \} from \"\.\.\/\.\.\/mocks\/metrics\"/);
  assert.doesNotMatch(overviewSource, /Shared Story Summary/);
});

test("overview display page seed config captures the current default hero contract", () => {
  const config = createOverviewDisplayPageSeedConfig();

  assert.equal(config.heroCopy.eyebrow, "綠能驅動・永續未來");
  assert.deepEqual(config.heroCopy.titleLines, ["以綠色製造", "驅動美好生活"]);
  assert.deepEqual(config.heroCopyLayout, { left: 86, top: 196, width: 620 });
  assert.equal(config.chrome.heroTypography.titleFontSize, 92);
  assert.equal(config.cardStyles.power.valueFontSize, 58);
  assert.equal(config.cardStyles.power.paddingTop, 18);
  assert.equal(config.cardStyles.power.paddingBottom, 16);
  assert.equal(config.cardStyles.power.cornerRadius, 22);
  const heroFadeLayers = config.heroMedia.effects?.layers ?? [];
  const fadeCoverage = (zone: string) => {
    const layer = heroFadeLayers.find((entry) => entry.kind === "fade" && entry.zone === zone);
    return layer && "coverage" in layer ? layer.coverage : undefined;
  };
  assert.equal(fadeCoverage("left"), 0.62);
  assert.equal(fadeCoverage("bottom"), 0.55);
  assert.equal(config.heroMedia.alt, "國瑞汽車中廠綠能展示場域");
  assert.ok((config.heroMedia.src ?? "").length > 0);
  for (const card of Object.values(config.kpiCards)) {
    assert.equal(card.visible, true);
  }
});

test("overview KPI editor regions expose visibility toggles and proportional resizing", () => {
  const kpiRegions = overviewDisplayPageEditorRegions.filter(
    (region) => region.id.startsWith("overview-kpi-") && Boolean(region.geometry)
  );

  assert.equal(kpiRegions.length, 5);
  for (const region of kpiRegions) {
    const key = region.id.replace("overview-kpi-", "");

    assert.equal(region.geometry?.resizeMode, "proportional");
    assert.ok(
      region.fields.some((field) => {
        return (
          field.fieldType === "toggle" &&
          field.id === `${key}-visible` &&
          field.label === "顯示" &&
          field.path.join(".") === `kpiCards.${key}.visible`
        );
      }),
      `${region.id} should expose a visible toggle`
    );
  }
});

test("overview dashboard widget regions default visible and expose visibility toggles", () => {
  const config = createOverviewDisplayPageSeedConfig();
  const widgetRegions = overviewDisplayPageEditorRegions.filter((region) => region.id.startsWith("overview-widget-"));

  assert.equal(config.dashboardWidgets.generationTrend.visible, true);
  assert.equal(config.dashboardWidgets.alertNotifications.visible, true);
  assert.equal(widgetRegions.length, 4);
  for (const region of widgetRegions) {
    const key = region.id.replace("overview-widget-", "");

    assert.equal(region.geometry?.resizeMode, "proportional");
    assert.ok(
      region.fields.some((field) => {
        return (
          field.fieldType === "toggle" &&
          field.id === `${key}-visible` &&
          field.label === "顯示" &&
          field.path.join(".") === `dashboardWidgets.${key}.visible`
        );
      }),
      `${region.id} should expose a visible toggle`
    );
  }
});

test("overview runtime gates dashboard widgets through visibility config", () => {
  assert.match(overviewSource, /shouldRenderOverviewDashboardWidget\(resolvedConfig\.dashboardWidgets\.generationTrend\)/);
  assert.match(overviewSource, /shouldRenderOverviewDashboardWidget\(resolvedConfig\.dashboardWidgets\.alertNotifications\)/);
  assert.match(overviewSource, /<GenerationTrendWidget/);
  assert.match(overviewSource, /series=\{generationTrendSeries\}/);
  assert.match(overviewSource, /<AlertNotificationsWidget/);
  assert.match(overviewSource, /alerts=\{viewModel\.alerts\}/);
  assert.match(
    overviewSource,
    /alwaysShowThresholds=\{resolvedConfig\.dashboardWidgets\.alertNotifications\.alwaysShowThresholds\}/
  );
});

test("overview config treats KPI cards without visible as visible", () => {
  const seed = createOverviewDisplayPageSeedConfig();
  const { visible: _visible, ...legacyPowerCard } = seed.kpiCards.power;
  const persisted = {
    ...seed,
    kpiCards: {
      ...seed.kpiCards,
      power: legacyPowerCard
    }
  } as unknown as typeof seed;

  const resolved = resolveOverviewModernDefaultConfig(persisted, seed);

  assert.equal(resolved.kpiCards.power.visible, true);
});

test("overview config treats dashboard widgets without visible as hidden", () => {
  const seed = createOverviewDisplayPageSeedConfig();
  const { visible: _visible, ...legacyGenerationTrend } = seed.dashboardWidgets.generationTrend;
  const persisted = {
    ...seed,
    dashboardWidgets: {
      ...seed.dashboardWidgets,
      generationTrend: legacyGenerationTrend
    }
  } as unknown as typeof seed;

  const resolved = resolveOverviewModernDefaultConfig(persisted, seed);

  assert.equal(resolved.dashboardWidgets.generationTrend.visible, false);
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
        eyebrowFontSize: 26,
        eyebrowLetterSpacing: 5,
        eyebrowMarginBottom: 20,
        subtitleFontSize: 26,
        subtitleLineHeight: 1.35,
        subtitleMarginTop: 30,
        titleEmphasisWeight: 900,
        titleFontSize: 84,
        titleLetterSpacing: 4,
        titleLineHeight: 1.15
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

  const upgraded = resolveOverviewModernDefaultConfig(legacy as unknown as typeof seed, seed);
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

  assert.deepEqual(resolveOverviewModernDefaultConfig(custom as unknown as typeof seed, seed).heroCopyLayout, custom.heroCopyLayout);
});
