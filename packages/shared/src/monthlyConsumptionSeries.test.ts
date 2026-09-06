import assert from "node:assert/strict";
import test from "node:test";
import { buildMonthlyConsumptionSeries } from "./monthlyConsumptionSeries.js";

test("E4 monthly series keeps calendar order and does not invent missing days", () => {
  const series = buildMonthlyConsumptionSeries([
    { date: "2026-09-02", valueKwh: "120" },
    { date: "2026-09-01", valueKwh: "100" },
    { date: "2026-08-31", valueKwh: "90" }
  ], "2026-09");
  assert.deepEqual(series.points.map((point) => point.date), ["2026-09-01", "2026-09-02"]);
  assert.equal(series.quality, "exact");
});

test("E4-R2 missing day keeps its calendar position and does not bridge the gap", () => {
  const series = buildMonthlyConsumptionSeries([
    { date: "2026-09-03", valueKwh: "250" },
    { date: "2026-09-01", valueKwh: "100" },
    { date: "2026-09-04", valueKwh: "80" }
  ], "2026-09");
  assert.deepEqual(series.points.map((point) => point.date), ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"]);
  assert.equal(series.points[1]?.valueKwh, null);
  assert.equal(series.quality, "partial");
});

test("E4 zero is valid and NaN is rejected", () => {
  const zero = buildMonthlyConsumptionSeries([{ date: "2026-09-01", valueKwh: "0" }], "2026-09");
  assert.equal(zero.points[0]?.valueKwh, "0");
  const invalid = buildMonthlyConsumptionSeries([{ date: "2026-09-01", valueKwh: "NaN" }], "2026-09");
  assert.equal(invalid.quality, "error");
});
