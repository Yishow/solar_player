import assert from "node:assert/strict";
import test from "node:test";
import type { WeatherCurrentSnapshot } from "@solar-display/shared";
import type { LiveMetricsSnapshot } from "../../services/socket";
import { buildOverviewViewModel } from "./viewModel";

const baseArgs = {
  connectionState: "connected" as const,
  isSocketConnected: true
};

function snapshotWith(metrics: LiveMetricsSnapshot["metrics"]): LiveMetricsSnapshot {
  return { metrics, timestamp: "2026-05-13T10:00:00.000Z" };
}

function reading(value: number, unit: string) {
  return { quality: "good", timestamp: "2026-05-13T10:00:00.000Z", unit, value };
}

const freshWeather: WeatherCurrentSnapshot = {
  airPressure: 1012,
  airTemperature: 31.2,
  countyName: "豐原區",
  dailyHigh: 33,
  dailyLow: 25,
  fetchState: "fresh",
  observationTime: "2026-05-13T10:00:00.000Z",
  precipitation: 0,
  relativeHumidity: 68,
  staleAt: null,
  stationId: "C0F9N0",
  stationName: "豐原",
  townName: "豐原",
  updatedAt: "2026-05-13T10:00:00.000Z",
  weather: "晴",
  windDirection: 180,
  windSpeed: 2.1
};

test("weather projection exposes display values when snapshot is fresh", () => {
  const viewModel = buildOverviewViewModel({
    ...baseArgs,
    snapshot: snapshotWith({}),
    weatherSnapshot: freshWeather
  });

  assert.equal(viewModel.weather.available, true);
  assert.equal(viewModel.weather.condition, "晴");
  assert.equal(viewModel.weather.temperature, "31°C");
  assert.equal(viewModel.weather.humidity, "68%");
  assert.equal((viewModel.weather as typeof viewModel.weather & { windSpeed?: string }).windSpeed, "2.1 m/s");
  assert.equal((viewModel.weather as typeof viewModel.weather & { precipitation?: string }).precipitation, "0 mm");
});

test("weather projection is unavailable when fetch state is not fresh", () => {
  const viewModel = buildOverviewViewModel({
    ...baseArgs,
    snapshot: snapshotWith({}),
    weatherSnapshot: { ...freshWeather, fetchState: "unavailable" }
  });

  assert.equal(viewModel.weather.available, false);
});

test("weather projection is unavailable when no weather snapshot is provided", () => {
  const viewModel = buildOverviewViewModel({
    ...baseArgs,
    snapshot: snapshotWith({})
  });

  assert.equal(viewModel.weather.available, false);
});

test("phase power projection reads R/S/T voltage current power from metric channel", () => {
  const viewModel = buildOverviewViewModel({
    ...baseArgs,
    snapshot: snapshotWith({
      phaseRVoltage: reading(220.5, "V"),
      phaseRCurrent: reading(12.3, "A"),
      phaseRPower: reading(2.7, "kW"),
      phaseSVoltage: reading(219.8, "V"),
      phaseSCurrent: reading(11.9, "A"),
      phaseSPower: reading(2.6, "kW"),
      phaseTVoltage: reading(221.1, "V"),
      phaseTCurrent: reading(12.1, "A"),
      phaseTPower: reading(2.65, "kW")
    })
  });

  const rPhase = viewModel.phasePower.phases.find((phase) => phase.id === "R");
  assert.ok(rPhase, "R phase row exists");
  assert.equal(rPhase.available, true);
  assert.equal(rPhase.voltage, "220.5");
  assert.equal(rPhase.current, "12.3");
  assert.equal(rPhase.power, "2.70");
});

test("phase power projection marks missing readings as fallback placeholder without NaN", () => {
  const viewModel = buildOverviewViewModel({
    ...baseArgs,
    snapshot: snapshotWith({})
  });

  const rPhase = viewModel.phasePower.phases.find((phase) => phase.id === "R");
  assert.ok(rPhase);
  assert.equal(rPhase.available, false);
  assert.equal(rPhase.voltage, "--");
  assert.equal(rPhase.current, "--");
  assert.equal(rPhase.power, "--");
  assert.equal(viewModel.phasePower.phases.length, 3);
});
