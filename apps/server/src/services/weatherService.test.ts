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
  stationId: "C0I080",
  updateIntervalMinutes: 30
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
    new Date("2026-05-23T06:20:00.000Z"),
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
  service.clearCache();
  const stale = await service.getCurrentWeather(settings);

  assert.equal(fresh.fetchState, "fresh");
  assert.equal(fresh.updatedAt, "2026-05-23T06:20:00.000Z");
  assert.equal(fresh.staleAt, null);

  assert.equal(stale.fetchState, "stale");
  assert.equal(stale.updatedAt, "2026-05-23T06:20:00.000Z");
  assert.equal(stale.staleAt, "2026-05-23T06:25:00.000Z");
  assert.equal(stale.stationName, "內湖");
});

test("WeatherService logs upstream fetch failures without breaking unavailable fallback", async () => {
  const warnings: Array<{ message?: string; payload: unknown }> = [];
  const upstreamError = Object.assign(new Error("connect ETIMEDOUT"), {
    code: "ETIMEDOUT"
  });
  const service = new WeatherService({
    authorizationConfigured: true,
    client: {
      readCurrentWeather: async () => {
        throw upstreamError;
      },
      readOptions: async () => {
        throw new Error("not used");
      }
    },
    logger: {
      warn: (payload, message) => {
        warnings.push({ message, payload });
      }
    },
    now: () => new Date("2026-05-23T06:25:00.000Z")
  });

  const current = await service.getCurrentWeather(settings);

  assert.equal(current.fetchState, "unavailable");
  assert.equal(warnings.length, 1);
  const warning = warnings[0];
  assert.ok(warning);
  assert.equal(warning.message, "CWA weather fetch failed");
  assert.deepEqual(warning.payload, {
    error: {
      code: "ETIMEDOUT",
      message: "connect ETIMEDOUT",
      name: "Error"
    }
  });
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

test("WeatherService caches weather data and returns cached data without calling CWA client again within the interval", async () => {
  let callCount = 0;
  const service = new WeatherService({
    authorizationConfigured: true,
    client: {
      readCurrentWeather: async () => {
        callCount += 1;
        return baseSnapshot;
      },
      readOptions: async () => {
        throw new Error("not used");
      }
    },
    now: () => new Date("2026-05-23T06:25:00.000Z")
  });

  const settingsWithCache: WeatherSettings = {
    ...settings,
    updateIntervalMinutes: 10
  };

  const first = await service.getCurrentWeather(settingsWithCache);
  const second = await service.getCurrentWeather(settingsWithCache);

  assert.equal(callCount, 1);
  assert.deepEqual(first, second);
});

test("WeatherService broadcasts weather snapshot to MQTT topic upon successful fetch", async () => {
  let publishedTopic: string | null = null;
  let publishedPayload: string | null = null;

  const service = new WeatherService({
    authorizationConfigured: true,
    client: {
      readCurrentWeather: async () => baseSnapshot,
      readOptions: async () => {
        throw new Error("not used");
      }
    },
    now: () => new Date("2026-05-23T06:25:00.000Z")
  });

  service.setMqttPublisher((topic, payload) => {
    publishedTopic = topic;
    publishedPayload = payload;
  });

  await service.getCurrentWeather(settings);

  assert.equal(publishedTopic, "solar/weather/current");
  assert.equal(JSON.parse(publishedPayload!).stationId, "C0I080");
});
