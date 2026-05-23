import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-weather-route-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;
const originalFetch = globalThis.fetch;

const sampleDataset = {
  records: {
    Station: [
      {
        GeoInfo: {
          CountyName: "臺北市",
          TownName: "內湖區"
        },
        ObsTime: {
          DateTime: "2026-05-23T06:18:00.000Z"
        },
        StationId: "C0I080",
        StationName: "內湖",
        WeatherElement: {
          AirPressure: "1008.2",
          AirTemperature: "31.4",
          DailyExtreme: {
            DailyHigh: {
              TemperatureInfo: {
                AirTemperature: "33.8"
              }
            },
            DailyLow: {
              TemperatureInfo: {
                AirTemperature: "25.2"
              }
            }
          },
          Precipitation: "0.0",
          RelativeHumidity: "70",
          Weather: "晴",
          WindDirection: "180",
          WindSpeed: "2.4"
        }
      },
      {
        GeoInfo: {
          CountyName: "新北市",
          TownName: "板橋區"
        },
        ObsTime: {
          DateTime: "2026-05-23T06:15:00.000Z"
        },
        StationId: "C0I090",
        StationName: "板橋",
        WeatherElement: {
          AirPressure: "1007.1",
          AirTemperature: "30.1",
          DailyExtreme: {
            DailyHigh: {
              TemperatureInfo: {
                AirTemperature: "31.5"
              }
            },
            DailyLow: {
              TemperatureInfo: {
                AirTemperature: "24.7"
              }
            }
          },
          Precipitation: "0.0",
          RelativeHumidity: "74",
          Weather: "多雲",
          WindDirection: "180",
          WindSpeed: "1.1"
        }
      }
    ]
  }
};

const [
  { buildApp },
  { closeDatabaseConnection },
  { migrateDatabase },
  { seedDatabase },
  { resetWeatherServiceForTests }
] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../services/weatherService.js")
]);

function removeDatabaseFiles() {
  if (!databasePath) {
    return;
  }

  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
}

function installFetchStub(payload: unknown) {
  globalThis.fetch = ((
    async () => ({
      async json() {
        return payload;
      },
      ok: true,
      status: 200
    })
  ) as unknown) as typeof globalThis.fetch;
}

beforeEach(() => {
  closeDatabaseConnection();
  resetWeatherServiceForTests();
  removeDatabaseFiles();
  migrateDatabase();
  seedDatabase();
  delete process.env.CWA_AUTHORIZATION;
  delete process.env.CWA_OPEN_DATA_URL;
  delete process.env.WEATHER_REQUEST_TIMEOUT_MS;
  globalThis.fetch = originalFetch;
});

after(() => {
  closeDatabaseConnection();
  resetWeatherServiceForTests();
  globalThis.fetch = originalFetch;
  rmSync(tempDir, { force: true, recursive: true });
});

test("weather settings persist through the API and emit weather-scoped display sync events", async () => {
  process.env.CWA_AUTHORIZATION = "test-token";
  installFetchStub(sampleDataset);

  const app = await buildApp();
  const emitted: Array<{ reason: string; scope: string }> = [];
  const originalEmitDisplaySync = app.socketService.emitDisplaySync.bind(app.socketService);
  app.socketService.emitDisplaySync = ((payload) => {
    emitted.push({ reason: payload.reason, scope: payload.scope });
    originalEmitDisplaySync(payload);
  }) as typeof app.socketService.emitDisplaySync;

  try {
    const saveResponse = await app.inject({
      method: "PUT",
      payload: {
        countyName: "臺北市",
        enabled: true,
        fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
        locationMode: "station",
        preset: "standard",
        stationId: "C0I080"
      },
      url: "/api/weather/settings"
    });

    assert.equal(saveResponse.statusCode, 200);
    assert.deepEqual(saveResponse.json(), {
      settings: {
        countyName: "臺北市",
        enabled: true,
        fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
        locationMode: "station",
        preset: "standard",
        stationId: "C0I080"
      }
    });

    const getResponse = await app.inject({
      method: "GET",
      url: "/api/weather/settings"
    });

    assert.equal(getResponse.statusCode, 200);
    assert.deepEqual(getResponse.json(), {
      settings: {
        countyName: "臺北市",
        enabled: true,
        fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
        locationMode: "station",
        preset: "standard",
        stationId: "C0I080"
      }
    });

    assert.deepEqual(emitted, [{ reason: "weather-settings-updated", scope: "weather" }]);
  } finally {
    await app.close();
  }
});

test("weather management reads stay trusted while current weather stays public-safe", async () => {
  process.env.CWA_AUTHORIZATION = "test-token";
  installFetchStub(sampleDataset);

  const app = await buildApp();

  try {
    const [settingsResponse, optionsResponse, currentResponse] = await Promise.all([
      app.inject({
        headers: {
          host: "player.example",
          origin: "https://evil.example"
        },
        method: "GET",
        url: "/api/weather/settings"
      }),
      app.inject({
        headers: {
          host: "player.example",
          origin: "https://evil.example"
        },
        method: "GET",
        url: "/api/weather/options"
      }),
      app.inject({
        headers: {
          host: "player.example",
          origin: "https://evil.example"
        },
        method: "GET",
        url: "/api/weather/current"
      })
    ]);

    assert.equal(settingsResponse.statusCode, 403);
    assert.equal(optionsResponse.statusCode, 403);
    assert.equal(currentResponse.statusCode, 200);
    assert.equal(currentResponse.json<{ current: { fetchState: string } }>().current.fetchState, "unconfigured");
  } finally {
    await app.close();
  }
});

test("current weather exposes only the safe header settings subset and stays neutral while weather is disabled", async () => {
  process.env.CWA_AUTHORIZATION = "test-token";
  installFetchStub(sampleDataset);

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/weather/current"
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      current: {
        airPressure: null,
        airTemperature: null,
        countyName: null,
        dailyHigh: null,
        dailyLow: null,
        fetchState: "unconfigured",
        observationTime: null,
        precipitation: null,
        relativeHumidity: null,
        staleAt: null,
        stationId: null,
        stationName: null,
        townName: null,
        updatedAt: null,
        weather: null,
        windDirection: null,
        windSpeed: null
      },
      settings: {
        enabled: false,
        fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
        preset: "standard"
      }
    });
  } finally {
    await app.close();
  }
});

test("weather options filter stations by county and current weather returns a normalized snapshot", async () => {
  process.env.CWA_AUTHORIZATION = "test-token";
  installFetchStub(sampleDataset);

  const app = await buildApp();

  try {
    const saveResponse = await app.inject({
      method: "PUT",
      payload: {
        countyName: "臺北市",
        enabled: true,
        fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
        locationMode: "station",
        preset: "standard",
        stationId: "C0I080"
      },
      url: "/api/weather/settings"
    });

    assert.equal(saveResponse.statusCode, 200);

    const [optionsResponse, currentResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/weather/options?countyName=%E8%87%BA%E5%8C%97%E5%B8%82"
      }),
      app.inject({
        method: "GET",
        url: "/api/weather/current"
      })
    ]);

    assert.equal(optionsResponse.statusCode, 200);
    assert.deepEqual(optionsResponse.json(), {
      counties: ["新北市", "臺北市"],
      fetchState: "fresh",
      stations: [
        {
          countyName: "臺北市",
          stationId: "C0I080",
          stationName: "內湖",
          townName: "內湖區"
        }
      ],
      updatedAt: optionsResponse.json<{ updatedAt: string }>().updatedAt
    });

    assert.equal(currentResponse.statusCode, 200);
    const currentBody = currentResponse.json() as {
      current: {
        airPressure: number | null;
        airTemperature: number | null;
        countyName: string | null;
        dailyHigh: number | null;
        dailyLow: number | null;
        fetchState: string;
        observationTime: string | null;
        precipitation: number | null;
        relativeHumidity: number | null;
        stationName: string | null;
        townName: string | null;
        weather: string | null;
        windDirection: number | null;
        windSpeed: number | null;
      };
      settings: {
        enabled: boolean;
        fieldKeys: string[];
        preset: string;
      };
    };

    assert.equal(currentBody.current.fetchState, "fresh");
    assert.equal(currentBody.current.stationName, "內湖");
    assert.equal(currentBody.current.countyName, "臺北市");
    assert.equal(currentBody.current.townName, "內湖區");
    assert.equal(currentBody.current.weather, "晴");
    assert.equal(currentBody.current.airTemperature, 31.4);
    assert.equal(currentBody.current.relativeHumidity, 70);
    assert.equal(currentBody.current.windSpeed, 2.4);
    assert.equal(currentBody.current.windDirection, 180);
    assert.equal(currentBody.current.airPressure, 1008.2);
    assert.equal(currentBody.current.precipitation, 0);
    assert.equal(currentBody.current.dailyHigh, 33.8);
    assert.equal(currentBody.current.dailyLow, 25.2);
    assert.equal(currentBody.current.observationTime, "2026-05-23T06:18:00.000Z");
    assert.deepEqual(currentBody.settings, {
      enabled: true,
      fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
      preset: "standard"
    });
  } finally {
    await app.close();
  }
});

test("weather preview resolves pending station selections without mutating persisted settings", async () => {
  process.env.CWA_AUTHORIZATION = "test-token";
  installFetchStub(sampleDataset);

  const app = await buildApp();

  try {
    const previewResponse = await app.inject({
      method: "POST",
      payload: {
        countyName: "新北市",
        enabled: true,
        fieldKeys: ["weather", "airTemperature"],
        locationMode: "station",
        preset: "compact",
        stationId: "C0I090"
      },
      url: "/api/weather/preview"
    });

    assert.equal(previewResponse.statusCode, 200);
    assert.deepEqual(previewResponse.json(), {
      current: {
        airPressure: 1007.1,
        airTemperature: 30.1,
        countyName: "新北市",
        dailyHigh: 31.5,
        dailyLow: 24.7,
        fetchState: "fresh",
        observationTime: "2026-05-23T06:15:00.000Z",
        precipitation: 0,
        relativeHumidity: 74,
        staleAt: null,
        stationId: "C0I090",
        stationName: "板橋",
        townName: "板橋區",
        updatedAt: previewResponse.json<{ current: { updatedAt: string } }>().current.updatedAt,
        weather: "多雲",
        windDirection: 180,
        windSpeed: 1.1
      },
      settings: {
        enabled: true,
        fieldKeys: ["weather", "airTemperature"],
        preset: "compact"
      }
    });

    const persisted = await app.inject({
      method: "GET",
      url: "/api/weather/settings"
    });

    assert.deepEqual(persisted.json(), {
      settings: {
        countyName: null,
        enabled: false,
        fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
        locationMode: "station",
        preset: "standard",
        stationId: null
      }
    });
  } finally {
    await app.close();
  }
});

test("invalid weather station selections are rejected before persistence mutates stored settings", async () => {
  process.env.CWA_AUTHORIZATION = "test-token";
  installFetchStub(sampleDataset);

  const app = await buildApp();

  try {
    const rejectedSave = await app.inject({
      method: "PUT",
      payload: {
        countyName: "臺北市",
        enabled: true,
        fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
        locationMode: "station",
        preset: "standard",
        stationId: "INVALID"
      },
      url: "/api/weather/settings"
    });

    assert.equal(rejectedSave.statusCode, 400);

    const readBack = await app.inject({
      method: "GET",
      url: "/api/weather/settings"
    });

    assert.deepEqual(readBack.json(), {
      settings: {
        countyName: null,
        enabled: false,
        fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
        locationMode: "station",
        preset: "standard",
        stationId: null
      }
    });
  } finally {
    await app.close();
  }
});

test("current weather reports an explicit unconfigured state when CWA auth is absent", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/weather/current"
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      current: {
        airPressure: null,
        airTemperature: null,
        countyName: null,
        dailyHigh: null,
        dailyLow: null,
        fetchState: "unconfigured",
        observationTime: null,
        precipitation: null,
        relativeHumidity: null,
        staleAt: null,
        stationId: null,
        stationName: null,
        townName: null,
        updatedAt: null,
        weather: null,
        windDirection: null,
        windSpeed: null
      },
      settings: {
        enabled: false,
        fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
        preset: "standard"
      }
    });
  } finally {
    await app.close();
  }
});
