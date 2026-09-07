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

test("E2-R3 estimated-boundary in daily points degrades monthly quality to estimated-boundary", () => {
  const series = buildMonthlyConsumptionSeries([
    { date: "2026-09-01", quality: "exact", valueKwh: "100" },
    { date: "2026-09-02", quality: "estimated-boundary", valueKwh: "120" }
  ], "2026-09");
  assert.equal(series.quality, "estimated-boundary");
});

test("E2-R4 invalid or partial point degrades monthly quality accordingly", () => {
  const invalid = buildMonthlyConsumptionSeries([
    { date: "2026-09-01", quality: "exact", valueKwh: "100" },
    { date: "2026-09-02", quality: "invalid", valueKwh: "120" }
  ], "2026-09");
  assert.equal(invalid.quality, "invalid");

  const partial = buildMonthlyConsumptionSeries([
    { date: "2026-09-01", quality: "exact", valueKwh: "100" },
    { date: "2026-09-02", quality: "partial", valueKwh: "120" }
  ], "2026-09");
  assert.equal(partial.quality, "partial");

  const unavailable = buildMonthlyConsumptionSeries([
    { date: "2026-09-01", quality: "exact", valueKwh: "100" },
    { date: "2026-09-02", quality: "unavailable", valueKwh: "120" }
  ], "2026-09");
  assert.equal(unavailable.quality, "partial");
});

test("E4 empty month points produce unavailable quality without points", () => {
  const empty = buildMonthlyConsumptionSeries([], "2026-09");
  assert.equal(empty.quality, "unavailable");
  assert.deepEqual(empty.points, []);
});

test("E4 all-null or all-unavailable monthly points produce unavailable quality", () => {
  const allNull = buildMonthlyConsumptionSeries([
    { date: "2026-09-01", valueKwh: null },
    { date: "2026-09-02", valueKwh: null }
  ], "2026-09");
  assert.equal(allNull.quality, "unavailable");

  const allUnavailable = buildMonthlyConsumptionSeries([
    { date: "2026-09-01", quality: "unavailable", valueKwh: "100" },
    { date: "2026-09-02", quality: "unavailable", valueKwh: "120" }
  ], "2026-09");
  assert.equal(allUnavailable.quality, "unavailable");
});
