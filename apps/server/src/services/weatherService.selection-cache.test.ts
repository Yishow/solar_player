import assert from "node:assert/strict";
import test from "node:test";
import type { WeatherSettings } from "@solar-display/shared";
import { WeatherService } from "./weatherService.js";

function weatherSettings(countyName: string, stationId: string): WeatherSettings {
  return {
    countyName,
    enabled: true,
    fieldKeys: ["weather", "airTemperature"],
    locationMode: "station",
    preset: "standard",
    stationId,
    updateIntervalMinutes: 30
  };
}

function snapshot(countyName: string, stationId: string) {
  return {
    airPressure: 1008,
    airTemperature: stationId === "A" ? 30 : 26,
    countyName,
    dailyHigh: 32,
    dailyLow: 22,
    fetchState: "fresh" as const,
    observationTime: "2026-08-12T04:00:00.000Z",
    precipitation: 0,
    relativeHumidity: 60,
    staleAt: null,
    stationId,
    stationName: `站點-${stationId}`,
    townName: null,
    updatedAt: "2026-08-12T04:01:00.000Z",
    weather: "晴",
    windDirection: 90,
    windSpeed: 2
  };
}

test("WeatherService fetches a different selection instead of reusing another location cache", async () => {
  let callCount = 0;
  const service = new WeatherService({
    authorizationConfigured: true,
    client: {
      readCurrentWeather: async ({ countyName, stationId }) => {
        callCount += 1;
        return snapshot(countyName ?? "", stationId ?? "");
      },
      readOptions: async () => ({ counties: [], fetchState: "fresh", stations: [], updatedAt: null })
    },
    now: () => new Date("2026-08-12T04:05:00.000Z")
  });

  const taipei = await service.getCurrentWeather(weatherSettings("臺北市", "A"));
  const taoyuan = await service.getCurrentWeather(weatherSettings("桃園市", "B"));

  assert.equal(callCount, 2);
  assert.equal(taipei.countyName, "臺北市");
  assert.equal(taoyuan.countyName, "桃園市");
  assert.equal(taoyuan.stationId, "B");
});

test("WeatherService never uses a stale snapshot from another selection", async () => {
  let callCount = 0;
  const service = new WeatherService({
    authorizationConfigured: true,
    client: {
      readCurrentWeather: async ({ countyName, stationId }) => {
        callCount += 1;
        if (stationId === "B") {
          throw new Error("station B unavailable");
        }
        return snapshot(countyName ?? "", stationId ?? "");
      },
      readOptions: async () => ({ counties: [], fetchState: "fresh", stations: [], updatedAt: null })
    },
    now: () => new Date("2026-08-12T04:05:00.000Z")
  });

  await service.getCurrentWeather(weatherSettings("臺北市", "A"));
  const unavailable = await service.getCurrentWeather(weatherSettings("桃園市", "B"));

  assert.equal(callCount, 2);
  assert.equal(unavailable.fetchState, "unavailable");
  assert.equal(unavailable.stationId, null);
  assert.equal(unavailable.countyName, null);
});
