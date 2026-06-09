import assert from "node:assert/strict";
import test from "node:test";
import {
  selectGenerationTrendSeries,
  selectHourlyGenerationTrendProfile,
  selectHourlyGenerationTrendSeries
} from "./generationTrendSeries.js";

test("trend series prefers instantaneous generation power when present", () => {
  const series = selectGenerationTrendSeries([
    { generation: 1000, generation_power: 0 },
    { generation: 2000, generation_power: 3200 },
    { generation: 3000, generation_power: 1800 }
  ]);
  assert.deepEqual(series, [0, 3200, 1800]);
});

test("trend series falls back to cumulative generation when power is missing", () => {
  const series = selectGenerationTrendSeries([
    { generation: 1000, generation_power: null },
    { generation: 2000, generation_power: null }
  ]);
  assert.deepEqual(series, [1000, 2000]);
});

test("trend series skips rows with neither value", () => {
  const series = selectGenerationTrendSeries([
    { generation: null, generation_power: null },
    { generation: 2000, generation_power: null }
  ]);
  assert.deepEqual(series, [2000]);
});

test("trend series handles an empty result", () => {
  assert.deepEqual(selectGenerationTrendSeries([]), []);
});

test("trend series never mixes cumulative generation into an instantaneous-power window", () => {
  // Some rows carry instantaneous power, others only a large cumulative total.
  // The cumulative row must be dropped (not spike the trend), not fall back per-row.
  const series = selectGenerationTrendSeries([
    { generation: 5000, generation_power: 1800 },
    { generation: 12346, generation_power: null },
    { generation: 6000, generation_power: 2200 }
  ]);
  assert.deepEqual(series, [1800, 2200]);
});

test("hourly trend keeps one point per hour using the latest reading in each hour", () => {
  const series = selectHourlyGenerationTrendSeries([
    { generation: null, generation_power: 1000, captured_at: "2026-06-09 11:30:00" },
    { generation: null, generation_power: 3000, captured_at: "2026-06-09 12:10:00" },
    { generation: null, generation_power: 3500, captured_at: "2026-06-09 12:50:00" },
    { generation: null, generation_power: 2000, captured_at: "2026-06-09 13:05:00" }
  ]);
  assert.deepEqual(series, [1000, 3500, 2000]);
});

test("hourly trend renders a daily solar profile from 24 hourly readings", () => {
  const curve = [
    0, 0, 0, 0, 0, 200, 800, 1600, 2600, 3400, 3900, 4100, 4200, 4100, 3900, 3400, 2600, 1600,
    800, 200, 0, 0, 0, 0
  ];
  const rows = curve.map((power, hour) => ({
    generation: null,
    generation_power: power,
    captured_at: `2026-06-09 ${`${hour}`.padStart(2, "0")}:00:00`
  }));

  const series = selectHourlyGenerationTrendSeries(rows);

  assert.equal(series.length, 24);
  const peakIndex = series.indexOf(Math.max(...series));
  assert.ok(peakIndex >= 10 && peakIndex <= 14, `peak near midday, got ${peakIndex}`);
  assert.equal(series[0], 0);
  assert.equal(series[23], 0);
});

test("hourly trend uses power-only hours and drops cumulative-only hours (no spike)", () => {
  // Once any hour has instantaneous power, hours lacking it are dropped rather
  // than contributing a cumulative-energy spike.
  const series = selectHourlyGenerationTrendSeries([
    { generation: null, generation_power: 1800, captured_at: "2026-06-08 23:00:00" },
    { generation: null, generation_power: 3200, captured_at: "2026-06-09 09:00:00" },
    { generation: null, generation_power: 4100, captured_at: "2026-06-09 10:00:00" }
  ]);
  assert.deepEqual(series, [3200, 4100]);
});

test("hourly trend falls back to the cumulative series only when no hour has power", () => {
  const series = selectHourlyGenerationTrendSeries([
    { generation: 1500, generation_power: null, captured_at: "2026-06-09 09:00:00" },
    { generation: 2600, generation_power: null, captured_at: "2026-06-09 10:00:00" }
  ]);
  assert.deepEqual(series, [1500, 2600]);
});

test("hourly trend stays on the cumulative fallback until the latest day has full power coverage", () => {
  const series = selectHourlyGenerationTrendSeries([
    { generation: 900, generation_power: null, captured_at: "2026-06-08 18:00:00" },
    { generation: 1200, generation_power: null, captured_at: "2026-06-09 09:00:00" },
    { generation: 1600, generation_power: 3200, captured_at: "2026-06-09 10:00:00" }
  ]);

  assert.deepEqual(series, [1200, 1600]);
});

test("hourly trend keeps the seeded power profile when cumulative coverage is only a stub", () => {
  const profile = selectHourlyGenerationTrendProfile([
    { generation: null, generation_power: 1800, captured_at: "2026-06-09 08:00:00" },
    { generation: null, generation_power: 3200, captured_at: "2026-06-09 09:00:00" },
    { generation: 0, generation_power: null, captured_at: "2026-06-09 09:30:00" }
  ]);

  assert.deepEqual(profile.hours, [8, 9]);
  assert.deepEqual(profile.series, [1800, 3200]);
});

test("hourly trend keeps only the latest local calendar day when more history exists", () => {
  // 30 distinct hour-buckets spread across two days; values 0..29 ascending in time.
  const rows = Array.from({ length: 30 }, (_, index) => {
    const day = 8 + Math.floor(index / 24);
    const hour = index % 24;
    return {
      generation: null,
      generation_power: index,
      captured_at: `2026-06-${`${day}`.padStart(2, "0")} ${`${hour}`.padStart(2, "0")}:00:00`
    };
  });

  const series = selectHourlyGenerationTrendSeries(rows);

  assert.equal(series.length, 6);
  // Latest local day only => generation_power values 24..29.
  assert.equal(series[0], 24);
  assert.equal(series[5], 29);
});

test("hourly trend buckets the same instant by local hour regardless of UTC vs local-string form", () => {
  // The snapshot writer stores UTC ISO; the seed stores a local wall-clock string.
  // The same instant in both forms must land in one local-hour bucket so the
  // runtime feed never overwrites the wrong hour of the seeded daily curve.
  const utc = "2026-06-09T04:30:00.000Z";
  const local = new Date(utc);
  const pad = (value: number) => `${value}`.padStart(2, "0");
  const localString =
    `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())} ` +
    `${pad(local.getHours())}:${pad(local.getMinutes())}:00`;

  const series = selectHourlyGenerationTrendSeries([
    { generation: null, generation_power: 1000, captured_at: localString },
    { generation: null, generation_power: 2000, captured_at: utc }
  ]);

  assert.equal(series.length, 1, "same instant must collapse into a single local-hour bucket");
});
