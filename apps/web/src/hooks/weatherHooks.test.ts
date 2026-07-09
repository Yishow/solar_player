import assert from "node:assert/strict";
import test from "node:test";
import type { WeatherHeaderContract } from "@solar-display/shared";
import { setupWeatherPolling } from "./weatherPolling.js";
import {
  resolveWeatherContractAfterRefresh,
  shouldPollWeatherContract
} from "./useHeaderWeatherMeta";

test("setupWeatherPolling sets up setInterval and returns clearInterval cleanup", () => {
  let intervalCallback: (() => void) | null = null;
  let intervalDelay = 0;

  // Stub setInterval
  const originalSetInterval = globalThis.setInterval;
  (globalThis as any).setInterval = (cb: any, delay: number) => {
    intervalCallback = cb;
    intervalDelay = delay;
    return 999 as any;
  };

  const originalClearInterval = globalThis.clearInterval;
  let clearedId: any = null;
  (globalThis as any).clearInterval = (id: any) => {
    clearedId = id;
  };

  try {
    let callCount = 0;
    const cleanup = setupWeatherPolling(true, 15, () => {
      callCount += 1;
    });

    assert.equal(intervalDelay, 15 * 60 * 1000);
    assert.ok(intervalCallback);

    const cb = intervalCallback as any;
    cb();
    assert.equal(callCount, 1);

    if (cleanup) cleanup();
    assert.equal(clearedId, 999);
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test("setupWeatherPolling returns undefined when disabled or intervalMinutes <= 0", () => {
  const cleanup1 = setupWeatherPolling(false, 15, () => {});
  assert.equal(cleanup1, undefined);

  const cleanup2 = setupWeatherPolling(true, 0, () => {});
  assert.equal(cleanup2, undefined);

  const cleanup3 = setupWeatherPolling(true, -5, () => {});
  assert.equal(cleanup3, undefined);
});

function createWeatherContract(
  overrides: Partial<WeatherHeaderContract> = {}
): WeatherHeaderContract {
  return {
    current: {
      airPressure: null,
      airTemperature: 30.2,
      countyName: "桃園市",
      dailyHigh: 34,
      dailyLow: 27,
      fetchState: "fresh",
      observationTime: "2026-07-09T10:57:44.758Z",
      precipitation: null,
      relativeHumidity: 77,
      staleAt: "2026-07-09T11:27:44.758Z",
      stationId: "C0C700",
      stationName: "觀音工業區",
      townName: "觀音區",
      updatedAt: "2026-07-09T10:57:44.758Z",
      weather: "多雲",
      windDirection: 120,
      windSpeed: 3.4
    },
    settings: {
      enabled: true,
      fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
      locationMode: "station",
      preset: "standard",
      updateIntervalMinutes: 30
    },
    ...overrides
  };
}

test("shouldPollWeatherContract keeps retry polling active until the first contract arrives", () => {
  assert.equal(shouldPollWeatherContract(true, null), true);
  assert.equal(shouldPollWeatherContract(false, null), false);
  assert.equal(
    shouldPollWeatherContract(
      true,
      createWeatherContract({
        settings: {
          enabled: false,
          fieldKeys: ["weather"],
          locationMode: "station",
          preset: "compact",
          updateIntervalMinutes: 30
        }
      })
    ),
    false
  );
});

test("resolveWeatherContractAfterRefresh preserves the last good contract on refresh failure", () => {
  const previous = createWeatherContract();

  assert.equal(resolveWeatherContractAfterRefresh(previous, null), previous);
  assert.deepEqual(
    resolveWeatherContractAfterRefresh(previous, createWeatherContract({
      current: {
        ...previous.current,
        airTemperature: 31.5
      }
    })),
    createWeatherContract({
      current: {
        ...previous.current,
        airTemperature: 31.5
      }
    })
  );
});
