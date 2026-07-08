import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const dataSourceSettingsSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("data source settings includes a persisted switch for the sub-ton CO2 display preference", () => {
  assert.match(dataSourceSettingsSource, /co2AutoConvertSmallToKg/);
  assert.match(dataSourceSettingsSource, /role="switch"/);
  assert.match(dataSourceSettingsSource, /aria-checked=\{toggle\.checked\}/);
  assert.match(dataSourceSettingsSource, /handleCalculationSettingChange\(toggle\.key, !toggle\.checked\)/);
});

test("data source settings sends the CO2 display preference in the calculation settings payload", () => {
  assert.match(dataSourceSettingsSource, /co2AutoConvertSmallToKg:\s*draft\.co2AutoConvertSmallToKg/);
});

test("data source settings route loader starts overview and calculation settings reads together", () => {
  assert.match(dataSourceSettingsSource, /await Promise\.allSettled\(\[/);
  assert.match(dataSourceSettingsSource, /getDataSourceOverview\(\)/);
  assert.match(dataSourceSettingsSource, /getCalculationSettings\(\)/);
});
