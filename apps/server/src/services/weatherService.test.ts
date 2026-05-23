import assert from "node:assert/strict";
import test from "node:test";
import type { WeatherSettings } from "@solar-display/shared";
import { WeatherService } from "./weatherService.js";

const settings: WeatherSettings = {
  countyName: "臺北市",
  enabled: true,
  fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
  locationMode: "station",
  preset: "standard",
  stationId: "C0I080"
};

const baseSnapshot = {
  airPressure: 1008.2,
  airTemperature: 31.4,
  countyName: "臺北市",
  dailyHigh: 33.8,
  dailyLow: 25.2,
  fetchState: "fresh",
  observationTime: "2026-05-23T06:18:00.000Z",
  precipitation: 0,
  relativeHumidity: 70,
  staleAt: null,
  stationId: "C0I080",
  stationName: "內湖",
  townName: "內湖區",
  updatedAt: "2026-05-23T06:20:00.000Z",
  weather: "晴",
  windDirection: 180,
  windSpeed: 2.4
} as const;

test("WeatherService returns stale cached weather when the upstream fetch later fails", async () => {
  let callCount = 0;
  const timestamps = [
    new Date("2026-05-23T06:25:00.000Z")
  ];
  const service = new WeatherService({
    authorizationConfigured: true,
    client: {
      readCurrentWeather: async () => {
        callCount += 1;
        if (callCount === 1) {
          return baseSnapshot;
        }

        throw new Error("upstream timeout");
      },
      readOptions: async () => ({
        counties: ["臺北市"],
        fetchState: "fresh",
        stations: [
          {
            countyName: "臺北市",
            stationId: "C0I080",
            stationName: "內湖",
            townName: "內湖區"
          }
        ],
        updatedAt: "2026-05-23T06:20:00.000Z"
      })
    },
    now: () => timestamps.shift() ?? new Date("2026-05-23T06:30:00.000Z")
  });

  const fresh = await service.getCurrentWeather(settings);
  const stale = await service.getCurrentWeather(settings);

  assert.equal(fresh.fetchState, "fresh");
  assert.equal(fresh.updatedAt, "2026-05-23T06:20:00.000Z");
  assert.equal(fresh.staleAt, null);

  assert.equal(stale.fetchState, "stale");
  assert.equal(stale.updatedAt, "2026-05-23T06:20:00.000Z");
  assert.equal(stale.staleAt, "2026-05-23T06:25:00.000Z");
  assert.equal(stale.stationName, "內湖");
});

test("WeatherService exposes an explicit unconfigured state when CWA authorization is absent", async () => {
  const service = new WeatherService({
    authorizationConfigured: false,
    client: {
      readCurrentWeather: async () => {
        throw new Error("should not fetch without auth");
      },
      readOptions: async () => {
        throw new Error("should not fetch options without auth");
      }
    },
    now: () => new Date("2026-05-23T07:00:00.000Z")
  });

  const current = await service.getCurrentWeather(settings);

  assert.equal(current.fetchState, "unconfigured");
  assert.equal(current.stationName, null);
  assert.equal(current.updatedAt, null);
});
