import assert from "node:assert/strict";
import test from "node:test";
import type { WeatherCurrentSnapshot, WeatherSettings } from "@solar-display/shared";
import { resolveHeaderWeatherMeta } from "./headerWeatherMeta";

function createSettings(overrides: Partial<WeatherSettings> = {}): WeatherSettings {
  return {
    countyName: "台北",
    enabled: true,
    fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
    locationMode: "station",
    preset: "standard",
    stationId: "C0I080",
    ...overrides
  };
}

function createSnapshot(overrides: Partial<WeatherCurrentSnapshot> = {}): WeatherCurrentSnapshot {
  return {
    airPressure: 1008.2,
    airTemperature: 31,
    countyName: "台北",
    dailyHigh: 33,
    dailyLow: 25,
    fetchState: "fresh",
    observationTime: "2026-05-23T14:20:00+08:00",
    precipitation: 0,
    relativeHumidity: 72,
    staleAt: null,
    stationId: "C0I080",
    stationName: "台北",
    townName: "內湖區",
    updatedAt: "2026-05-23T14:22:00+08:00",
    weather: "多雲",
    windDirection: 180,
    windSpeed: 2.4,
    ...overrides
  };
}

test("resolveHeaderWeatherMeta composes structured ready metadata from the standard preset example", () => {
  const meta = resolveHeaderWeatherMeta({
    current: createSnapshot(),
    isHydrated: true,
    settings: createSettings()
  });

  assert.deepEqual(meta, {
    primaryText: "台北 多雲 31°C",
    secondaryText: "濕度 72%・觀測 14:20",
    state: "ready"
  });
});

test("resolveHeaderWeatherMeta keeps ready metadata structured even when only the primary fields are configured", () => {
  const meta = resolveHeaderWeatherMeta({
    current: createSnapshot(),
    isHydrated: true,
    settings: createSettings({
      fieldKeys: ["weather", "airTemperature"]
    })
  });

  assert.equal(meta.state, "ready");
  assert.equal(meta.primaryText, "台北 多雲 31°C");
  assert.equal(meta.secondaryText, "");
});
