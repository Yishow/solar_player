import assert from "node:assert/strict";
import test from "node:test";
import { CwaWeatherClient } from "./cwaWeatherClient.js";

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
