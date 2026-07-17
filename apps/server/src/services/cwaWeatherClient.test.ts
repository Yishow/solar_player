import assert from "node:assert/strict";
import test from "node:test";
import { CwaWeatherClient, CwaWeatherRequestError } from "./cwaWeatherClient.js";

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
          Precipitation: "X",
          RelativeHumidity: "-99",
          Weather: "晴",
          WindDirection: "990",
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

function buildOkResponse(payload: unknown) {
  return {
    async json() {
      return payload;
    },
    ok: true,
    status: 200
  };
}

test("CwaWeatherClient normalizes CWA special values before exposing current weather", async () => {
  const client = new CwaWeatherClient({
    authorization: "test-token",
    fetchImplementation: async () => buildOkResponse(sampleDataset)
  });

  const current = await client.readCurrentWeather({
    stationId: "C0I080"
  });

  assert.equal(current.stationName, "內湖");
  assert.equal(current.countyName, "臺北市");
  assert.equal(current.townName, "內湖區");
  assert.equal(current.weather, "晴");
  assert.equal(current.airTemperature, 31.4);
  assert.equal(current.relativeHumidity, null);
  assert.equal(current.windDirection, null);
  assert.equal(current.precipitation, null);
  assert.equal(current.windSpeed, 2.4);
  assert.equal(current.airPressure, 1008.2);
  assert.equal(current.dailyHigh, 33.8);
  assert.equal(current.dailyLow, 25.2);
  assert.equal(current.observationTime, "2026-05-23T06:18:00.000Z");
  assert.equal(current.fetchState, "fresh");
});

test("CwaWeatherClient lists county-filtered station options for management surfaces", async () => {
  const client = new CwaWeatherClient({
    authorization: "test-token",
    fetchImplementation: async () => buildOkResponse(sampleDataset)
  });

  const options = await client.readOptions({
    countyName: "臺北市"
  });

  assert.deepEqual(options.counties, ["新北市", "臺北市"]);
  assert.deepEqual(options.stations, [
    {
      countyName: "臺北市",
      stationId: "C0I080",
      stationName: "內湖",
      townName: "內湖區"
    }
  ]);
  assert.equal(options.fetchState, "fresh");
});

const classifiedFailures = [
  {
    code: "WEATHER_DNS_LOOKUP_FAILED",
    error: Object.assign(new TypeError("fetch failed for secret.example.internal"), {
      cause: Object.assign(new Error("getaddrinfo ENOTFOUND secret.example.internal"), { code: "ENOTFOUND" })
    }),
    name: "DNS lookup",
    retryable: true
  },
  {
    code: "WEATHER_CONNECTION_TIMEOUT",
    error: Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error("connect ETIMEDOUT 10.0.0.7:443"), { code: "ETIMEDOUT" })
    }),
    name: "connection timeout",
    retryable: true
  },
  {
    code: "WEATHER_REQUEST_TIMEOUT",
    error: Object.assign(new Error("This operation was aborted for token=secret-token"), { name: "AbortError" }),
    name: "request timeout",
    retryable: true
  },
  {
    code: "WEATHER_TLS_FAILED",
    error: Object.assign(new TypeError("fetch failed for secret.example.internal"), {
      cause: Object.assign(new Error("certificate has expired"), { code: "CERT_HAS_EXPIRED" })
    }),
    name: "TLS failure",
    retryable: true
  },
  {
    code: "WEATHER_UNKNOWN_ERROR",
    error: new Error("unexpected token=secret-token url=https://secret.example.internal/weather"),
    name: "unknown failure",
    retryable: true
  }
] as const;

for (const scenario of classifiedFailures) {
  test(`CwaWeatherClient classifies ${scenario.name} without exposing raw request details`, async () => {
    const client = new CwaWeatherClient({
      authorization: "secret-token",
      datasetUrl: "https://secret.example.internal/weather",
      fetchImplementation: async () => {
        throw scenario.error;
      }
    });

    await assert.rejects(client.readOptions(), (error: unknown) => {
      assert.ok(error instanceof CwaWeatherRequestError);
      assert.equal(error.code, scenario.code);
      assert.equal(error.retryable, scenario.retryable);
      assert.equal(error.httpStatus, null);
      const exposed = JSON.stringify(error);
      assert.doesNotMatch(exposed, /secret-token|secret\.example\.internal|10\.0\.0\.7|stack/i);
      return true;
    });
  });
}

test("CwaWeatherClient classifies HTTP failures with a bounded status", async () => {
  const client = new CwaWeatherClient({
    authorization: "secret-token",
    fetchImplementation: async () => ({
      async json() {
        return {};
      },
      ok: false,
      status: 503
    })
  });

  await assert.rejects(client.readCurrentWeather(), (error: unknown) => {
    assert.ok(error instanceof CwaWeatherRequestError);
    assert.equal(error.code, "WEATHER_HTTP_ERROR");
    assert.equal(error.httpStatus, 503);
    assert.equal(error.retryable, true);
    assert.doesNotMatch(JSON.stringify(error), /secret-token|Authorization|opendata\.cwa\.gov\.tw/i);
    return true;
  });
});

test("CwaWeatherClient classifies invalid JSON payloads", async () => {
  const client = new CwaWeatherClient({
    authorization: "secret-token",
    fetchImplementation: async () => ({
      async json() {
        throw new SyntaxError("Unexpected token near secret-token");
      },
      ok: true,
      status: 200
    })
  });

  await assert.rejects(client.readOptions(), (error: unknown) => {
    assert.ok(error instanceof CwaWeatherRequestError);
    assert.equal(error.code, "WEATHER_INVALID_PAYLOAD");
    assert.equal(error.retryable, true);
    assert.doesNotMatch(JSON.stringify(error), /secret-token|Unexpected token/i);
    return true;
  });
});

test("CwaWeatherClient rejects HTTP 200 payloads without an array-shaped station collection", async () => {
  for (const payload of [{}, { records: { Station: {} } }]) {
    const client = new CwaWeatherClient({
      authorization: "secret-token",
      fetchImplementation: async () => buildOkResponse(payload)
    });

    await assert.rejects(client.readOptions(), (error: unknown) => {
      assert.ok(error instanceof CwaWeatherRequestError);
      assert.equal(error.code, "WEATHER_INVALID_PAYLOAD");
      assert.equal(error.retryable, true);
      return true;
    });
  }
});
