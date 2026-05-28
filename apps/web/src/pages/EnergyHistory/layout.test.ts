import assert from "node:assert/strict";
import test from "node:test";
import { energyHistoryLayout, energyHistoryMetricCardKeys } from "./layout";

test("energy history layout centralizes selector, metric, chart, and summary band geometry", () => {
  assert.deepEqual(energyHistoryLayout.title, { left: 58, top: 28 });
  assert.deepEqual(energyHistoryLayout.side, {
    height: 714,
    left: 30,
    top: 72,
    width: 290
  });
  assert.deepEqual(energyHistoryLayout.metric.card1, {
    height: 186,
    left: 350,
    top: 72,
    width: 292
  });
  assert.deepEqual(energyHistoryLayout.metric.card5, {
    height: 186,
    left: 1598,
    top: 72,
    width: 272
  });
  assert.deepEqual(energyHistoryLayout.chart, {
    height: 340,
    left: 350,
    top: 276,
    width: 1530
  });
  assert.deepEqual(energyHistoryLayout.bottom, {
    height: 154,
    left: 350,
    top: 632,
    width: 1530
  });
  assert.deepEqual(energyHistoryMetricCardKeys, ["card1", "card2", "card3", "card4", "card5"]);
});

test("energy history regions stack cleanly within content height 838", () => {
  const sideBottom = energyHistoryLayout.side.top + energyHistoryLayout.side.height;
  const metricBottom = energyHistoryLayout.metric.card1.top + energyHistoryLayout.metric.card1.height;
  const chartBottom = energyHistoryLayout.chart.top + energyHistoryLayout.chart.height;
  const bottomBottom = energyHistoryLayout.bottom.top + energyHistoryLayout.bottom.height;

  assert.ok(energyHistoryLayout.chart.top > metricBottom, "chart starts after metric row");
  assert.ok(energyHistoryLayout.bottom.top > chartBottom, "summary starts after chart");
  assert.ok(sideBottom <= 838, "side rail fits");
  assert.ok(bottomBottom <= 838, "summary band fits");
});
