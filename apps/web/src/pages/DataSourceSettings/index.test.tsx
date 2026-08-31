import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const dataSourceSettingsSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const dataSourceOperationsSource = readFileSync(
  path.join(import.meta.dirname, "DataSourceOperations.tsx"),
  "utf8"
);
const dataSourceOperationsViewSource = readFileSync(
  path.join(import.meta.dirname, "DataSourceOperationsView.tsx"),
  "utf8"
);
const dataSourceSurfaceSource = `${dataSourceSettingsSource}\n${dataSourceOperationsSource}\n${dataSourceOperationsViewSource}`;

test("data source settings includes a persisted switch for the sub-ton CO2 display preference", () => {
  assert.match(dataSourceSurfaceSource, /co2AutoConvertSmallToKg/);
  assert.match(dataSourceSurfaceSource, /role="switch"/);
  assert.match(dataSourceSurfaceSource, /aria-checked=\{toggle\.checked\}/);
  assert.match(dataSourceSurfaceSource, /onCalculationSettingChange\(toggle\.key, !toggle\.checked\)/);
});

test("data source settings sends the CO2 display preference in the calculation settings payload", () => {
  assert.match(dataSourceSurfaceSource, /co2AutoConvertSmallToKg:\s*draft\.co2AutoConvertSmallToKg/);
});

test("data source settings route loader starts overview and calculation settings reads together", () => {
  assert.match(dataSourceSurfaceSource, /await Promise\.allSettled\(\[/);
  assert.match(dataSourceSurfaceSource, /getDataSourceOverview\(\)/);
  assert.match(dataSourceSurfaceSource, /getCalculationSettings\(\)/);
});

test("legacy data source settings keeps the full surface while operations is reusable", () => {
  assert.match(dataSourceSettingsSource, /<DataSourceOperations showTodayReset>/u);
  assert.match(dataSourceSettingsSource, /<DerivedMetricRegistryPanel \/>/u);
  assert.match(dataSourceSettingsSource, /path="\/settings\/data-source"/u);
});
