import assert from "node:assert/strict";
import test from "node:test";
import {
  createOverviewDisplayPageSeedConfig,
  overviewDisplayPageEditorRegions,
  resolveOverviewModernDefaultConfig,
  shouldRenderOverviewDashboardWidget
} from "./displayPageConfig";

test("seed config includes weather and phasePower density widgets visible by default", () => {
  const config = createOverviewDisplayPageSeedConfig();

  assert.equal(shouldRenderOverviewDashboardWidget(config.dashboardWidgets.weather), true);
  assert.equal(shouldRenderOverviewDashboardWidget(config.dashboardWidgets.phasePower), true);
});

test("seed config keeps generationTrend visible by default for density layout", () => {
  const config = createOverviewDisplayPageSeedConfig();

  assert.equal(shouldRenderOverviewDashboardWidget(config.dashboardWidgets.generationTrend), true);
});

test("density widgets have non-overlapping seed geometry within the canvas", () => {
  const config = createOverviewDisplayPageSeedConfig();

  for (const key of ["weather", "phasePower", "generationTrend"] as const) {
    const widget = config.dashboardWidgets[key];
    assert.ok(widget.width > 0 && widget.height > 0, `${key} has positive size`);
    assert.ok(widget.left >= 0 && widget.top >= 0, `${key} has non-negative origin`);
    assert.ok(widget.left + widget.width <= 1920, `${key} fits canvas width`);
  }
});

test("editor exposes region and visibility controls for the new density widgets", () => {
  for (const { id, key } of [
    { id: "overview-widget-weather", key: "weather" },
    { id: "overview-widget-phasePower", key: "phasePower" }
  ]) {
    const region = overviewDisplayPageEditorRegions.find((entry) => entry.id === id);
    assert.ok(region, `region ${id} exists`);

    const visibilityField = region.fields.find((field) => field.id === `${key}-visible`);
    assert.ok(visibilityField, `${key} visibility field exists`);
    assert.deepEqual(visibilityField.path, ["dashboardWidgets", key, "visible"]);

    assert.deepEqual(region.geometry?.leftPath, ["dashboardWidgets", key, "left"]);
    assert.deepEqual(region.geometry?.topPath, ["dashboardWidgets", key, "top"]);
    assert.deepEqual(region.geometry?.widthPath, ["dashboardWidgets", key, "width"]);
    assert.deepEqual(region.geometry?.heightPath, ["dashboardWidgets", key, "height"]);
  }
});

test("config merge falls back to seed widget when a density key is missing", () => {
  const seedConfig = createOverviewDisplayPageSeedConfig();
  const persisted = createOverviewDisplayPageSeedConfig();
  // Simulate a persisted config that predates the new density keys.
  const { weather: _weather, phasePower: _phasePower, ...legacyWidgets } = persisted.dashboardWidgets;
  (persisted as { dashboardWidgets: unknown }).dashboardWidgets = legacyWidgets;

  const resolved = resolveOverviewModernDefaultConfig(persisted, seedConfig);

  assert.deepEqual(resolved.dashboardWidgets.weather, seedConfig.dashboardWidgets.weather);
  assert.deepEqual(resolved.dashboardWidgets.phasePower, seedConfig.dashboardWidgets.phasePower);
});
