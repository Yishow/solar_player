import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_WEATHER_FIELD_KEYS,
  type WeatherSettings,
  type WeatherStationOption,
  weatherFieldKeys
} from "@solar-display/shared";
import {
  applyWeatherSettingChange,
  matchWeatherFieldPreset,
  resolveWeatherFieldKeysForPreset,
  toggleWeatherFieldKey,
  weatherFieldPresetOptions
} from "./weatherFieldPresets";

function createWeatherSettings(overrides: Partial<WeatherSettings> = {}): WeatherSettings {
  return {
    countyName: "臺北市",
    enabled: true,
    fieldKeys: ["weather", "airTemperature"],
    locationMode: "station",
    preset: "custom",
    stationId: "C0I080",
    ...overrides
  };
}

const stationOptions: WeatherStationOption[] = [
  { countyName: "臺北市", stationId: "C0I080", stationName: "內湖", townName: "內湖區" },
  { countyName: "新北市", stationId: "C0I090", stationName: "板橋", townName: "板橋區" }
];

test("weather field presets expose compact standard complete and custom options", () => {
  assert.deepEqual(
    weatherFieldPresetOptions.map((option) => option.value),
    ["compact", "standard", "complete", "custom"]
  );
});

test("resolveWeatherFieldKeysForPreset returns the contract-backed field groups", () => {
  assert.deepEqual(resolveWeatherFieldKeysForPreset("compact"), ["weather", "airTemperature"]);
  assert.deepEqual(resolveWeatherFieldKeysForPreset("standard"), DEFAULT_WEATHER_FIELD_KEYS);
  assert.deepEqual(resolveWeatherFieldKeysForPreset("complete"), weatherFieldKeys);
});

test("matchWeatherFieldPreset keeps canonical presets distinct from custom fallback", () => {
  assert.equal(matchWeatherFieldPreset(["weather", "airTemperature"]), "compact");
  assert.equal(matchWeatherFieldPreset(DEFAULT_WEATHER_FIELD_KEYS), "standard");
  assert.equal(matchWeatherFieldPreset(weatherFieldKeys), "complete");
  assert.equal(matchWeatherFieldPreset(["weather", "dailyHigh"]), "custom");
});

test("applyWeatherSettingChange overwrites field keys when switching to a named preset", () => {
  const next = applyWeatherSettingChange(createWeatherSettings(), "preset", "standard");
  assert.equal(next.preset, "standard");
  assert.deepEqual(next.fieldKeys, DEFAULT_WEATHER_FIELD_KEYS);
});

test("applyWeatherSettingChange keeps the current field keys when switching to custom", () => {
  const current = createWeatherSettings({ fieldKeys: ["weather", "dailyHigh"], preset: "standard" });
  const next = applyWeatherSettingChange(current, "preset", "custom");
  assert.equal(next.preset, "custom");
  assert.deepEqual(next.fieldKeys, ["weather", "dailyHigh"]);
});

test("applyWeatherSettingChange clears the station when it no longer belongs to the new county", () => {
  const next = applyWeatherSettingChange(createWeatherSettings(), "countyName", "新北市", stationOptions);
  assert.equal(next.countyName, "新北市");
  assert.equal(next.stationId, null);
});

test("applyWeatherSettingChange keeps the station when it still belongs to the new county", () => {
  const current = createWeatherSettings({ countyName: "新北市", stationId: "C0I090" });
  const next = applyWeatherSettingChange(current, "countyName", "新北市", stationOptions);
  assert.equal(next.stationId, "C0I090");
});

test("toggleWeatherFieldKey adds and removes fields while keeping the custom preset", () => {
  const enabled = toggleWeatherFieldKey(createWeatherSettings(), "relativeHumidity", true);
  assert.deepEqual(enabled.fieldKeys, ["weather", "airTemperature", "relativeHumidity"]);
  assert.equal(enabled.preset, "custom");

  const disabled = toggleWeatherFieldKey(enabled, "airTemperature", false);
  assert.deepEqual(disabled.fieldKeys, ["weather", "relativeHumidity"]);
  assert.equal(disabled.preset, "custom");
});
