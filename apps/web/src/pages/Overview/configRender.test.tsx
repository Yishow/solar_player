import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { resolveDisplayPageCardStatus } from "@solar-display/shared";
import { createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import {
  createOverviewDisplayPageSeedConfig,
  overviewDisplayPageEditorRegions,
  resolveOverviewModernDefaultConfig
} from "./displayPageConfig";

const overviewSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const overviewRuntimeSource = readFileSync(path.join(import.meta.dirname, "runtimeContent.tsx"), "utf8");

function sourceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);

  assert.ok(startIndex >= 0, `missing source start: ${start}`);
  assert.ok(endIndex > startIndex, `missing source end: ${end}`);

  return source.slice(startIndex, endIndex);
}

test("overview runtime reads resolved display config for hero copy and hero media", () => {
  assert.equal(
    overviewSource.includes("resolvedConfig.heroCopy.eyebrow"),
    true,
    "Overview should read the resolved hero eyebrow"
  );
  assert.equal(
    overviewSource.includes("resolvedConfig.heroCopy.titleLines[0]"),
    true,
    "Overview should read the resolved hero title lines"
  );
  assert.equal(
    overviewSource.includes("renderOverviewTitleLine(resolvedConfig.heroCopy.titleLines[0])"),
    true,
    "Overview should render the resolved hero title line"
  );
  assert.equal(
    overviewSource.includes("resolvedConfig.heroCopyLayout"),
    true,
    "Overview should derive hero copy layout from resolved config"
  );
  assert.equal(
    overviewSource.includes("heroTypography.eyebrowFontSize"),
    true,
    "Overview should derive eyebrow typography from resolved config"
  );
  assert.equal(
    overviewSource.includes("heroTypography.titleFontSize"),
    true,
    "Overview should derive title typography from resolved config"
  );
  assert.equal(
    overviewSource.includes("heroTypography.subtitleMarginTop"),
    true,
    "Overview should derive subtitle spacing from resolved config"
  );
  assert.equal(
    overviewSource.includes("resolvedConfig.chrome.ornaments.goldLine.thickness"),
    true,
    "Overview should derive the gold line thickness from resolved config"
  );
  assert.equal(
    overviewSource.includes("resolvedConfig.chrome.ornaments.goldLine.opacity"),
    true,
    "Overview should derive the gold line opacity from resolved config"
  );
  assert.equal(
    overviewSource.includes("resolvedConfig.chrome.ornaments.leaf.opacity"),
    true,
    "Overview should derive the leaf opacity from resolved config"
  );
  assert.equal(
    overviewSource.includes("resolvedConfig.chrome.ornaments.leaf.scale"),
    true,
    "Overview should derive the leaf scale from resolved config"
  );
  assert.equal(
    overviewSource.includes(
      "resolveDisplayPageMediaSource(resolvedConfig.heroMedia, seedConfig.heroMedia.src)"
    ),
    true,
    "Overview should resolve hero media from the resolved config"
  );
  assert.equal(
    overviewRuntimeSource.includes("resolvedConfig.kpiCards[cardItem.key]"),
    true,
    "Overview runtime should resolve KPI cards from config"
  );
  assert.equal(
    overviewRuntimeSource.includes("DisplayCardFrame"),
    true,
    "Overview runtime should render KPI card frames"
  );
  assert.equal(
    overviewRuntimeSource.includes("DisplayCardValueRow"),
    true,
    "Overview runtime should render KPI card values"
  );
  assert.equal(
    overviewRuntimeSource.includes("resolvedConfig.cardStyles[cardItem.key]"),
    true,
    "Overview runtime should resolve KPI card styles from config"
  );
  assert.equal(
    overviewRuntimeSource.includes("<OverviewKpiFooter"),
    true,
    "Overview runtime should render KPI card footers"
  );
  assert.equal(
    overviewRuntimeSource.includes("footer={resolvedConfig.kpiCards[shell.cardItem.key]}"),
    true,
    "Overview runtime should pass the resolved KPI footer config"
  );
  assert.equal(
    overviewRuntimeSource.includes("metric={metric}"),
    true,
    "Overview runtime should pass the live metric to the KPI footer"
  );
  assert.equal(
    overviewSource.includes("import { trendSeries } from \"../../mocks/metrics\""),
    false,
    "Overview must not import mock trend series"
  );
  assert.equal(
    overviewSource.includes("Shared Story Summary"),
    false,
    "Overview must not render the removed shared story summary"
  );
});

test("overview value-only refresh keeps KPI card shell output on the config-only path", () => {
  const shellSource = sourceBetween(
    overviewRuntimeSource,
    "const kpiCardShells = useMemo(",
    "{kpiCardShells.map((shell) => {"
  );

  assert.match(shellSource, /const kpiCardShells = useMemo\(/);
  assert.match(shellSource, /\[resolvedConfig\]/);
  assert.match(shellSource, /style: \{/);
  assert.match(shellSource, /createDisplayCardStyleConfig\(resolvedConfig\.cardStyles\[cardItem\.key\]\)/);
  assert.equal(
    overviewRuntimeSource.includes("{kpiCardShells.map((shell) => {"),
    true,
    "Overview runtime should render the resolved KPI card shells"
  );
  assert.equal(
    overviewRuntimeSource.includes("candidate) => candidate.itemId === shell.cardItem.key"),
    true,
    "Overview runtime should resolve each metric by KPI card key"
  );
  assert.doesNotMatch(shellSource, /viewModel/);
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
    assert.equal(resolveDisplayPageCardStatus(card), "normal");
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

test("overview KPI editor regions expose a configuring status select", () => {
  const kpiRegions = overviewDisplayPageEditorRegions.filter(
    (region) => region.id.startsWith("overview-kpi-") && Boolean(region.geometry)
  );

  assert.equal(kpiRegions.length, 5);
  for (const region of kpiRegions) {
    const key = region.id.replace("overview-kpi-", "");
    const statusField = region.fields.find((field) => field.id === `${key}-status`);

    assert.ok(statusField, `${region.id} should expose a status select`);
    assert.equal(statusField?.fieldType, "select");
    assert.equal(statusField?.path.join("."), `kpiCards.${key}.status`);
    assert.deepEqual(
      statusField && "options" in statusField ? statusField.options.map((option) => option.value) : [],
      ["normal", "configuring"]
    );
  }
});

test("overview config preserves a configuring KPI status through resolution", () => {
  const seed = createOverviewDisplayPageSeedConfig();
  const persisted = {
    ...seed,
    kpiCards: {
      ...seed.kpiCards,
      power: { ...seed.kpiCards.power, status: "configuring" }
    }
  } as unknown as typeof seed;

  const resolved = resolveOverviewModernDefaultConfig(persisted, seed);

  assert.equal(resolveDisplayPageCardStatus(resolved.kpiCards.power), "configuring");
  assert.equal(resolveDisplayPageCardStatus(resolved.kpiCards.total), "normal");
});

test("overview runtime replaces the value with the configuring placeholder", () => {
  assert.equal(
    overviewRuntimeSource.includes("resolveDisplayPageCardStatus(resolvedConfig.kpiCards[cardItem.key])"),
    true,
    "Overview runtime should resolve each KPI card status"
  );
  assert.equal(
    overviewRuntimeSource.includes("displayPageCardConfiguringLabel"),
    true,
    "Overview runtime should use the configuring placeholder label"
  );
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
  assert.equal(
    overviewRuntimeSource.includes(
      "shouldRenderOverviewDashboardWidget(resolvedConfig.dashboardWidgets.generationTrend)"
    ),
    true,
    "Overview runtime should gate the generation trend widget by config"
  );
  assert.equal(
    overviewRuntimeSource.includes(
      "shouldRenderOverviewDashboardWidget(resolvedConfig.dashboardWidgets.alertNotifications)"
    ),
    true,
    "Overview runtime should gate the alert widget by config"
  );
  assert.equal(
    overviewRuntimeSource.includes("<GenerationTrendWidget"),
    true,
    "Overview runtime should render the generation trend widget"
  );
  assert.equal(
    overviewRuntimeSource.includes("series={generationTrendSeries}"),
    true,
    "Overview runtime should pass the generation trend series"
  );
  assert.equal(
    overviewRuntimeSource.includes("<AlertNotificationsWidget"),
    true,
    "Overview runtime should render the alert widget"
  );
  assert.equal(
    overviewRuntimeSource.includes("alerts={viewModel.alerts}"),
    true,
    "Overview runtime should pass view-model alerts"
  );
  assert.equal(
    overviewRuntimeSource.includes(
      "alwaysShowThresholds={resolvedConfig.dashboardWidgets.alertNotifications.alwaysShowThresholds}"
    ),
    true,
    "Overview runtime should pass the alert threshold visibility setting"
  );
});

test("overview runtime keeps story hydration staged behind visible config and live metrics", () => {
  assert.equal(
    overviewRuntimeSource.includes("useLiveMetricsSelector("),
    true,
    "Overview runtime should select live metrics"
  );
  assert.equal(
    overviewSource.includes(
      "useDisplayStoryRuntime(\"overview\", {\n    enabled: runtimeHydrationEnabled\n  });"
    ),
    true,
    "Overview should enable story hydration only for runtime rendering"
  );
  assert.equal(
    overviewSource.includes("storyRuntime.payload ?? undefined"),
    true,
    "Overview should expose the story payload to runtime content"
  );
  assert.equal(
    overviewRuntimeSource.includes("storyOverview: storyOverviewPayload"),
    true,
    "Overview runtime should build its view model from the story payload"
  );
  assert.equal(
    overviewRuntimeSource.includes("connectionState: overviewRuntimeSelection.connectionState"),
    true,
    "Overview runtime should pass the live connection state"
  );
  assert.equal(
    overviewRuntimeSource.includes("isSocketConnected: overviewRuntimeSelection.isSocketConnected"),
    true,
    "Overview runtime should pass socket connectivity"
  );
  assert.equal(
    overviewSource.includes("allowUnscopedMetrics={!runtimeHydrationEnabled}"),
    true,
    "Overview should allow unscoped metrics only outside runtime hydration"
  );
  assert.equal(
    overviewRuntimeSource.includes(
      "<PhasePowerTableWidget\n          enabled={allowUnscopedMetrics}"
    ),
    true,
    "Overview runtime should gate phase power metrics during hydration"
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

test("overview config treats dashboard widgets without visible as visible", () => {
  const seed = createOverviewDisplayPageSeedConfig();
  const { visible: _visible, ...legacyWeather } = seed.dashboardWidgets.weather;
  const persisted = {
    ...seed,
    dashboardWidgets: {
      ...seed.dashboardWidgets,
      weather: legacyWeather
    }
  } as unknown as typeof seed;

  const resolved = resolveOverviewModernDefaultConfig(persisted, seed);

  assert.equal(resolved.dashboardWidgets.weather.visible, true);
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
