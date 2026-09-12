import assert from "node:assert/strict";
import test from "node:test";
import { buildTrendChartModel } from "./chartModel";

const points = (values: Array<number | null>) => values.map((value, index) => ({ label: String(index), value }));

test("trend domain includes zero and every finite value for each original unit", () => {
  for (const unit of ["kW", "kWh", "t"]) {
    const model = buildTrendChartModel(points([-20, 0, 40]), unit);
    assert.deepEqual(model.domain, { min: -20, max: 40 });
    assert.deepEqual(model.ticks.map((tick) => tick.value), [40, 20, 0, -20]);
    assert.equal(model.ticks[0]!.label, `40 ${unit}`);
  }
});

test("percentage domain covers 0–100 and expands for values outside that interval", () => {
  assert.deepEqual(buildTrendChartModel(points([20, 40]), "%").domain, { min: 0, max: 100 });
  assert.deepEqual(buildTrendChartModel(points([-10, 120]), "%").domain, { min: -10, max: 120 });
});

test("missing and nonfinite readings never become zero; measured zero has a nonzero span", () => {
  assert.deepEqual(buildTrendChartModel(points([null, NaN, Infinity]), "kWh").points, []);
  const zero = buildTrendChartModel(points([0, 0]), "kWh");
  assert.equal(zero.points.length, 2);
  assert.deepEqual(zero.domain, { min: 0, max: 1 });
});
