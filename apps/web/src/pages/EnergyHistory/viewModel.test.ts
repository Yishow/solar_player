import assert from "node:assert/strict";
import test from "node:test";
import { buildEnergyHistoryViewModel } from "./viewModel";

const snapshots = [
  {
    capturedAt: "2026-05-13T00:00:00.000Z",
    co2: 0.9,
    consumption: 420,
    efficiency: 82,
    generation: 380,
    ratio: 26,
    selfConsumption: 220
  },
  {
    capturedAt: "2026-05-13T01:00:00.000Z",
    co2: 1.4,
    consumption: 610,
    efficiency: 84,
    generation: 520,
    ratio: 31,
    selfConsumption: 300
  }
];

const dailySummaries = [
  {
    co2Total: 4210,
    consumptionTotal: 12680,
    date: "2026-05-13",
    generationTotal: 8450,
    peakConsumption: 1860,
    peakConsumptionTime: "13:45",
    peakGeneration: 1920,
    peakGenerationTime: "12:30",
    selfConsumptionTotal: 2430
  }
];

const cumulativeCounters = [
  {
    lastUpdated: "2026-05-13T10:00:00.000Z",
    metricKey: "generation",
    resetCount: 0,
    totalValue: 582340
  },
  {
    lastUpdated: "2026-05-13T10:00:00.000Z",
    metricKey: "consumption",
    resetCount: 0,
    totalValue: 734120
  },
  {
    lastUpdated: "2026-05-13T10:00:00.000Z",
    metricKey: "selfConsumption",
    resetCount: 0,
    totalValue: 243560
  },
  {
    lastUpdated: "2026-05-13T10:00:00.000Z",
    metricKey: "ratio",
    resetCount: 0,
    totalValue: 32
  },
  {
    lastUpdated: "2026-05-13T10:00:00.000Z",
    metricKey: "co2",
    resetCount: 0,
    totalValue: 4210
  }
];

test("buildEnergyHistoryViewModel maps side navigation, summary cards, and dense rows", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    range: "day",
    snapshots,
    summaries: dailySummaries
  });

  assert.equal(model.rangeOptions.length, 5);
  assert.equal(model.rangeOptions[0]?.label, "今日");
  assert.equal(model.rangeOptions[0]?.active, true);
  assert.equal(model.metricCards.length, 5);
  assert.equal(model.metricCards[0]?.valueLabel, "8,450");
  assert.equal(model.metricCards[1]?.valueLabel, "2,430");
  assert.equal(model.metricCards[3]?.valueLabel, "32");
  assert.equal(model.metricCards[4]?.unitLabel, "t");
  assert.equal(model.chartLines.length, 3);
  assert.equal(model.bottomSummary[0]?.label, "尖峰發電");
  assert.equal(model.bottomSummary[0]?.valueLabel, "1,920 kW");
  assert.equal(model.bottomSummary[0]?.detailLabel, "12:30");
  assert.equal(model.tableRows.length, 1);
  assert.equal(model.tableRows[0]?.dateLabel, "2026-05-13");
  assert.equal(model.tableRows[0]?.consumptionLabel, "12,680");
});

test("buildEnergyHistoryViewModel falls back to cumulative counters for total range", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    range: "total",
    snapshots: [],
    summaries: []
  });

  assert.equal(model.rangeOptions[4]?.active, true);
  assert.equal(model.metricCards[0]?.valueLabel, "582,340");
  assert.equal(model.metricCards[2]?.valueLabel, "734,120");
  assert.equal(model.tableRows.length, 0);
  assert.equal(model.bottomSummary[2]?.label, "資料來源");
  assert.equal(model.bottomSummary[2]?.valueLabel, "MQTT Live");
});
