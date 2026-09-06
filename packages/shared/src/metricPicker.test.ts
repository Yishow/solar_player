import assert from "node:assert/strict";
import test from "node:test";
import { buildMetricPickerOptions } from "./metricPicker.js";

test("U4-R5-S01 missing baseline is visible and not shown as the month result", () => {
  const [option] = buildMetricPickerOptions({
    options: [{
      labelZh: "觀音月用量",
      measurementKind: "cumulative-energy",
      metricKey: "period.month.consumption",
      missingBaseline: true,
      latestValue: "18300",
      scope: "kn",
      unit: "kWh"
    }]
  });
  assert.equal(option?.coverage, "缺少期初基準");
  assert.match(option?.incompatibleReason ?? "", /月用量/);
  assert.notEqual(option?.latestValue, "月用量");
});

test("U4-R5-S02 catalog pending explains why the source cannot be saved", () => {
  const [option] = buildMetricPickerOptions({
    catalogPending: true,
    options: [{
      labelZh: "未入目錄來源",
      metricKey: "raw.register",
      scope: "kn"
    }]
  });
  assert.equal(option?.compatible, false);
  assert.match(option?.incompatibleReason ?? "", /可用目錄/);
});
