import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildMonthlyConsumptionTrend,
  PhasePowerTableWidget,
  shouldRefreshMonthlyConsumption
} from "./PhasePowerTableWidget";

test("PhasePowerTableWidget renders monthly consumption title and empty state before data arrives", () => {
  const markup = renderToStaticMarkup(<PhasePowerTableWidget />);

  assert.match(markup, /月用量曲線/);
  assert.match(markup, /Monthly Consumption/);
  assert.match(markup, /尚無用量趨勢資料/);
  assert.doesNotMatch(markup, /overview-trend-chart-svg/);
});

test("buildMonthlyConsumptionTrend clears mock data when monthly summaries have no consumption", () => {
  const trend = buildMonthlyConsumptionTrend([
    { consumptionTotal: null, date: "2026-07-01" },
    { consumptionTotal: null, date: "2026-07-02" }
  ]);

  assert.deepEqual(trend.series, [null, null]);
  assert.deepEqual(trend.dates, ["7/1", "7/2"]);
});

test("buildMonthlyConsumptionTrend maps current-month summaries chronologically", () => {
  const trend = buildMonthlyConsumptionTrend([
    { consumptionTotal: 2200, date: "2026-07-02" },
    { consumptionTotal: null, date: "2026-07-03" },
    { consumptionTotal: 1800, date: "2026-07-01" }
  ]);

  assert.deepEqual(trend.series, [1800, 2200, null]);
  assert.deepEqual(trend.dates, ["7/1", "7/2", "7/3"]);
});

test("E4 zero remains a plotted observation", () => {
  const trend = buildMonthlyConsumptionTrend([
    { consumptionTotal: 0, date: "2026-07-01" }
  ]);
  assert.deepEqual(trend.series, [0]);
});

test("monthly consumption refreshes only for monitoring-history sync", () => {
  assert.equal(shouldRefreshMonthlyConsumption({ scope: "monitoring-history" }), true);
  assert.equal(shouldRefreshMonthlyConsumption({ scope: "mqtt" }), false);
  assert.equal(shouldRefreshMonthlyConsumption({ scope: "display-pages" }), false);
});

test("E4 canonical point quality reaches the trend model instead of claiming exact", () => {
  const estimated = buildMonthlyConsumptionTrend([
    { consumptionTotal: 1800, date: "2026-07-01", quality: "estimated-boundary", valueKwh: "1800" },
    { consumptionTotal: 2200, date: "2026-07-02", quality: "exact", valueKwh: "2200" }
  ]);
  assert.equal(estimated.quality, "estimated-boundary");
  assert.deepEqual(estimated.series, [1800, 2200]);

  const missing = buildMonthlyConsumptionTrend([
    { consumptionTotal: 1800, date: "2026-07-01", quality: "exact", valueKwh: "1800" },
    { consumptionTotal: null, date: "2026-07-02", quality: "unavailable", valueKwh: null }
  ]);
  assert.equal(missing.quality, "partial");
  assert.deepEqual(missing.series, [1800, null]);
});
