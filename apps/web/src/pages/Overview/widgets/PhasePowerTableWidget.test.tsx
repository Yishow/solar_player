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

  assert.deepEqual(trend.series, []);
  assert.deepEqual(trend.dates, []);
});

test("buildMonthlyConsumptionTrend maps current-month summaries chronologically", () => {
  const trend = buildMonthlyConsumptionTrend([
    { consumptionTotal: 2200, date: "2026-07-02" },
    { consumptionTotal: null, date: "2026-07-03" },
    { consumptionTotal: 1800, date: "2026-07-01" }
  ]);

  assert.deepEqual(trend.series, [1800, 2200]);
  assert.deepEqual(trend.dates, ["7/1", "7/2"]);
});

test("monthly consumption refreshes only for monitoring-history sync", () => {
  assert.equal(shouldRefreshMonthlyConsumption({ scope: "monitoring-history" }), true);
  assert.equal(shouldRefreshMonthlyConsumption({ scope: "mqtt" }), false);
  assert.equal(shouldRefreshMonthlyConsumption({ scope: "display-pages" }), false);
});
