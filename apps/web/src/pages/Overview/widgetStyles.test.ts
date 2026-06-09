import assert from "node:assert/strict";
import test from "node:test";
import {
  applyOverviewGroupStyleFieldUpdate,
  createOverviewDisplayPageSeedConfig,
  overviewDisplayPageEditorRegions,
  resolveOverviewModernDefaultConfig
} from "./displayPageConfig";

const widgetKeys = ["weather", "phasePower", "generationTrend", "alertNotifications"] as const;
const kpiKeys = ["power", "today", "total", "co2Today", "co2Total"] as const;

test("seed config exposes density widget styles equivalent to the current appearance", () => {
  const config = createOverviewDisplayPageSeedConfig();

  for (const key of widgetKeys) {
    const widgetStyle = config.widgetStyles[key];
    assert.ok(widgetStyle, `expected a widgetStyle for ${key}`);
    // Header font sizes default to the current displayPageCards fallbacks.
    assert.equal(widgetStyle.titleFontSize, 20);
    assert.equal(widgetStyle.subtitleFontSize, 14);
    // Padding/radius match the current `.overview-dashboard-widget` (20px 24px, radius 22).
    assert.equal(widgetStyle.paddingTop, 20);
    assert.equal(widgetStyle.paddingBottom, 20);
    assert.equal(widgetStyle.paddingLeft, 24);
    assert.equal(widgetStyle.paddingRight, 24);
    assert.equal(widgetStyle.cornerRadius, 22);
    assert.equal(widgetStyle.surfaceBlur, 16);
    assert.equal(widgetStyle.surfaceOpacity, 0.72);
  }

  // Generation trend keeps the current 110px density sparkline height.
  assert.equal(config.widgetStyles.generationTrend.trendHeight, 110);
  assert.equal(config.widgetStyles.phasePower.valueRowAlign, "end");
  assert.equal(config.widgetStyles.weather.valueMarginTop, 14);
  assert.equal(config.widgetStyles.alertNotifications.valueMarginTop, 18);
});

test("resolveOverviewModernDefaultConfig falls back to seed widget styles when config omits widgetStyles", () => {
  const seedConfig = createOverviewDisplayPageSeedConfig();
  const legacyConfig = createOverviewDisplayPageSeedConfig();
  delete (legacyConfig as Partial<typeof legacyConfig>).widgetStyles;

  const resolved = resolveOverviewModernDefaultConfig(legacyConfig as typeof seedConfig, seedConfig);

  assert.deepEqual(resolved.widgetStyles, seedConfig.widgetStyles);
});

test("resolveOverviewModernDefaultConfig keeps an operator-edited density widget style", () => {
  const seedConfig = createOverviewDisplayPageSeedConfig();
  const editedConfig = createOverviewDisplayPageSeedConfig();
  editedConfig.widgetStyles.weather = {
    ...editedConfig.widgetStyles.weather,
    valueFontSize: 99
  };

  const resolved = resolveOverviewModernDefaultConfig(editedConfig, seedConfig);

  assert.equal(resolved.widgetStyles.weather.valueFontSize, 99);
  assert.deepEqual(resolved.widgetStyles.phasePower, seedConfig.widgetStyles.phasePower);
});

test("each density widget region exposes internal card-style fields including trend height and end alignment", () => {
  for (const key of widgetKeys) {
    const region = overviewDisplayPageEditorRegions.find((entry) => entry.id === `overview-widget-${key}`);
    assert.ok(region, `expected region overview-widget-${key}`);

    const valueFontField = region.fields.find(
      (field) => field.path.join(".") === `widgetStyles.${key}.valueFontSize`
    );
    assert.ok(valueFontField, `expected ${key} value font size field`);
    assert.equal(valueFontField.fieldType, "number");

    const trendField = region.fields.find(
      (field) => field.path.join(".") === `widgetStyles.${key}.trendHeight`
    );
    assert.ok(trendField, `expected ${key} trend height field`);

    const alignField = region.fields.find(
      (field) => field.path.join(".") === `widgetStyles.${key}.valueRowAlign`
    );
    assert.ok(alignField, `expected ${key} value row align field`);
    assert.equal(alignField.fieldType, "select");
    assert.ok(
      "options" in alignField &&
      Array.isArray(alignField.options) &&
      alignField.options.some((option) => option.value === "end"),
      `expected ${key} align field to offer end`
    );
  }
});

test("overview editor exposes family appearance regions for KPI cards and bottom widgets", () => {
  const kpiRegion = overviewDisplayPageEditorRegions.find((entry) => entry.id === "overview-kpi-cards-appearance");
  const widgetRegion = overviewDisplayPageEditorRegions.find((entry) => entry.id === "overview-bottom-widgets-appearance");

  assert.ok(kpiRegion);
  assert.ok(widgetRegion);
  assert.deepEqual(
    kpiRegion.fields.map((field) => field.label),
    ["Surface Opacity", "Surface Blur", "Shadow Strength"]
  );
  assert.deepEqual(
    widgetRegion.fields.map((field) => field.label),
    ["Surface Opacity", "Surface Blur", "Shadow Strength"]
  );
  assert.equal(kpiRegion.fields[0]?.path.join("."), "cardStyles.power.surfaceOpacity");
  assert.equal(widgetRegion.fields[0]?.path.join("."), "widgetStyles.weather.surfaceOpacity");
});

test("group appearance updates fan out to every overview card or widget in the matching family", () => {
  const config = createOverviewDisplayPageSeedConfig();

  const nextKpiConfig = applyOverviewGroupStyleFieldUpdate(
    config,
    "overview-kpi-cards-appearance",
    ["cardStyles", "power", "surfaceOpacity"],
    0.46
  );
  const nextWidgetConfig = applyOverviewGroupStyleFieldUpdate(
    nextKpiConfig,
    "overview-bottom-widgets-appearance",
    ["widgetStyles", "weather", "surfaceBlur"],
    22
  );

  for (const key of kpiKeys) {
    assert.equal(nextWidgetConfig.cardStyles[key].surfaceOpacity, 0.46);
  }

  for (const key of widgetKeys) {
    assert.equal(nextWidgetConfig.widgetStyles[key].surfaceBlur, 22);
  }

  assert.equal(nextWidgetConfig.widgetStyles.weather.surfaceOpacity, config.widgetStyles.weather.surfaceOpacity);
});
