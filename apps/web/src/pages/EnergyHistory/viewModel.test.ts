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
    now: "2026-05-13T10:02:00.000Z",
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
  assert.equal(model.metricCards[3]?.valueLabel, "29");
  assert.equal(model.metricCards[4]?.unitLabel, "t");
  assert.equal(model.chartLines.length, 3);
  assert.equal(model.chartTitle, "今日趨勢");
  assert.equal(model.chartSubtitle, "Today's Trend");
  assert.equal(model.bottomSummary[0]?.label, "尖峰發電");
  assert.equal(model.bottomSummary[0]?.valueLabel, "1,920 kW");
  assert.equal(model.bottomSummary[0]?.detailLabel, "12:30");
  assert.equal(model.bottomSummary[2]?.valueLabel, "History Summary");
  assert.equal(model.tableRows.length, 1);
  assert.equal(model.tableRows[0]?.dateLabel, "2026-05-13");
  assert.equal(model.tableRows[0]?.consumptionLabel, "12,680");
  assert.equal(model.monitoringState.category, "fresh");
  assert.equal(model.monitoringState.freshnessLabel, "歷史資料");
  assert.equal(model.monitoringState.sourceRoleLabel, "History Summary + Trend Snapshot");
});

test("buildEnergyHistoryViewModel falls back to cumulative counters for total range", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    now: "2026-05-13T10:02:00.000Z",
    range: "total",
    snapshots: [],
    summaries: []
  });

  assert.equal(model.rangeOptions[4]?.active, true);
  assert.equal(model.chartTitle, "累積趨勢");
  assert.equal(model.chartSubtitle, "Cumulative Trend");
  assert.equal(model.metricCards[0]?.valueLabel, "582,340");
  assert.equal(model.metricCards[2]?.valueLabel, "734,120");
  assert.equal(model.tableRows.length, 0);
  assert.equal(model.bottomSummary[2]?.label, "資料來源");
  assert.equal(model.bottomSummary[2]?.valueLabel, "Cumulative Counter");
  assert.equal(model.monitoringState.category, "fresh");
  assert.equal(model.monitoringState.freshnessLabel, "累積資料");
});

test("buildEnergyHistoryViewModel keeps year distinct from total-only counters and labels", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    now: "2026-05-13T10:02:00.000Z",
    range: "year",
    snapshots,
    summaries: [
      {
        co2Total: 2100,
        consumptionTotal: 6400,
        date: "2026-05-13",
        generationTotal: 4200,
        peakConsumption: 1200,
        peakConsumptionTime: "10:15",
        peakGeneration: 1300,
        peakGenerationTime: "11:20",
        selfConsumptionTotal: 2100
      },
      {
        co2Total: 1900,
        consumptionTotal: 5800,
        date: "2026-01-08",
        generationTotal: 3800,
        peakConsumption: 1680,
        peakConsumptionTime: "15:40",
        peakGeneration: 1720,
        peakGenerationTime: "12:45",
        selfConsumptionTotal: 1500
      }
    ]
  });

  assert.equal(model.rangeOptions[3]?.active, true);
  assert.equal(model.metricCards[0]?.valueLabel, "8,000");
  assert.equal(model.metricCards[1]?.valueLabel, "3,600");
  assert.equal(model.metricCards[2]?.valueLabel, "12,200");
  assert.equal(model.metricCards[3]?.valueLabel, "45");
  assert.equal(model.bottomSummary[0]?.valueLabel, "1,720 kW");
  assert.equal(model.bottomSummary[0]?.detailLabel, "12:45");
  assert.equal(model.bottomSummary[1]?.valueLabel, "1,680 kW");
  assert.equal(model.bottomSummary[1]?.detailLabel, "15:40");
  assert.equal(model.bottomSummary[2]?.valueLabel, "History Summary");
  assert.equal(model.chartTitle, "今年趨勢");
  assert.equal(model.chartSubtitle, "This Year");
  assert.equal(model.monitoringState.category, "fresh");
});

test("buildEnergyHistoryViewModel keeps partial history inputs in the shared degraded category", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    now: "2026-05-13T10:02:00.000Z",
    range: "month",
    snapshots: [],
    summaries: dailySummaries
  });

  assert.equal(model.monitoringState.category, "degraded");
  assert.equal(model.monitoringState.freshnessLabel, "降級資料");
  assert.equal(model.monitoringState.sourceRoleLabel, "History Summary");
});

test("buildEnergyHistoryViewModel marks stale history sources explicitly", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    now: "2026-05-15T10:02:00.000Z",
    range: "day",
    snapshots,
    summaries: dailySummaries
  });

  assert.equal(model.monitoringState.category, "stale");
  assert.equal(model.monitoringState.freshnessLabel, "逾時資料");
});

test("buildEnergyHistoryViewModel keeps missing annual data in the shared empty category", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    now: "2026-05-13T10:02:00.000Z",
    range: "year",
    snapshots: [],
    summaries: []
  });

  assert.equal(model.monitoringState.category, "empty");
  assert.equal(model.monitoringState.emptyStateLabel, "目前沒有可用的歷史資料來源");
});
