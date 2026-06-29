import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const dataSourceSettingsSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("data source settings includes a persisted checkbox for the sub-ton CO2 display preference", () => {
  assert.match(dataSourceSettingsSource, /co2AutoConvertSmallToKg/);
  assert.match(dataSourceSettingsSource, /type="checkbox"/);
  assert.match(dataSourceSettingsSource, /handleCalculationSettingChange\(toggle\.key, event\.target\.checked\)/);
});

test("data source settings sends the CO2 display preference in the calculation settings payload", () => {
  assert.match(dataSourceSettingsSource, /co2AutoConvertSmallToKg:\s*draft\.co2AutoConvertSmallToKg/);
});
