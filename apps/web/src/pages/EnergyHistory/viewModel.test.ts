import assert from "node:assert/strict";
import test from "node:test";
import type { DailyEnergySummary } from "./viewModel";
import {
  buildEnergyHistoryViewModel,
  isEnergyHistoryPayloadForSelection,
  resolveEnergyHistorySelection,
  updateEnergyHistorySearchParams
} from "./viewModel";

test("energy history URL selection defaults explicitly and keeps scope and range independent", () => {
  assert.deepEqual(resolveEnergyHistorySelection(""), { metricScope: "global", range: "day" });
  assert.deepEqual(resolveEnergyHistorySelection("?metricScope=cl&range=month"), { metricScope: "cl", range: "month" });
  assert.deepEqual(resolveEnergyHistorySelection("?metricScope=invalid&range=invalid"), { metricScope: "global", range: "day" });

  assert.equal(
    updateEnergyHistorySearchParams("?metricScope=cl&range=month", { metricScope: "kn" }).toString(),
    "metricScope=kn&range=month"
  );
  assert.equal(
    updateEnergyHistorySearchParams("?metricScope=kn&range=month", { range: "year" }).toString(),
    "metricScope=kn&range=year"
  );
});

test("energy history payload identity gate rejects the previous scope or range", () => {
  assert.equal(
    isEnergyHistoryPayloadForSelection(
      { metricScope: "cl", range: "month" },
      { metricScope: "kn", range: "month" }
    ),
    false
  );
  assert.equal(
    isEnergyHistoryPayloadForSelection(
      { metricScope: "kn", range: "month" },
      { metricScope: "kn", range: "month" }
    ),
    true
  );
});

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
    metricScope: "cl",
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
  assert.equal(model.scopeLabel, "CL 廠區 / CL Site");
  assert.equal(model.bottomSummary[2]?.valueLabel, "CL 廠區 / CL Site · History Summary");
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
    metricScope: "global",
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
  assert.equal(model.scopeLabel, "Global · 跨廠 / Cross-site");
  assert.equal(model.bottomSummary[2]?.valueLabel, "Global · 跨廠 / Cross-site · Cumulative Counter");
  assert.equal(model.monitoringState.category, "fresh");
  assert.equal(model.monitoringState.freshnessLabel, "累積資料");
});

test("buildEnergyHistoryViewModel uses chronological daily kWh summaries for the monthly consumption curve", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "cl",
    now: "2026-05-13T10:02:00.000Z",
    range: "month",
    snapshots,
    summaries: [
      {
        co2Total: 4210,
        consumptionTotal: 720,
        date: "2026-05-12",
        generationTotal: 480,
        peakConsumption: 1860,
        peakConsumptionTime: "13:45",
        peakGeneration: 1920,
        peakGenerationTime: "12:30",
        selfConsumptionTotal: 220
      },
      dailySummaries[0]!
    ]
  });

  assert.deepEqual(model.chartLines[0]?.points, [
    { label: "2026-05-12", value: 480 },
    { label: "2026-05-13", value: 8450 }
  ]);
  assert.deepEqual(model.chartLines[2]?.points, [
    { label: "2026-05-12", value: 720 },
    { label: "2026-05-13", value: 12680 }
  ]);
  assert.equal(model.chartLines[2]?.label, "用電量 (kWh)");
});

test("buildEnergyHistoryViewModel keeps year distinct from total-only counters and labels", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "cl",
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
  assert.equal(model.bottomSummary[2]?.valueLabel, "CL 廠區 / CL Site · History Summary");
  assert.equal(model.chartTitle, "今年趨勢");
  assert.equal(model.chartSubtitle, "This Year");
  assert.equal(model.monitoringState.category, "fresh");
});

test("buildEnergyHistoryViewModel keeps partial history inputs in the shared degraded category", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "kn",
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
    metricScope: "cl",
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
    metricScope: "cl",
    now: "2026-05-13T10:02:00.000Z",
    range: "year",
    snapshots: [],
    summaries: []
  });

  assert.equal(model.monitoringState.category, "empty");
  assert.equal(model.monitoringState.emptyStateLabel, "CL 廠區 / CL Site · 目前沒有可用的歷史資料來源");
});

test("buildEnergyHistoryViewModel keeps an empty selected scope visibly scoped", () => {
  const model = buildEnergyHistoryViewModel({
    counters: [],
    metricScope: "kn",
    now: "2026-05-13T10:02:00.000Z",
    range: "week",
    snapshots: [],
    summaries: []
  });

  assert.equal(model.scopeLabel, "KN 廠區 / KN Site");
  assert.equal(model.monitoringState.category, "empty");
  assert.match(model.monitoringState.emptyStateLabel, /KN 廠區/);
});

/**
 * The management history API shape a configured site returns: canonical daily consumption with its
 * own quality, and a period result that owns the card. Rows keep their legacy non-consumption
 * fields, so the fixtures below mirror the route response rather than a trimmed convenience shape.
 */
function canonicalSummary(overrides: Partial<DailyEnergySummary> & { date: string }): DailyEnergySummary {
  return {
    co2Total: 5,
    consumptionTotal: null,
    generationTotal: 10,
    peakConsumption: 488,
    peakConsumptionTime: "15:00",
    peakGeneration: 612,
    peakGenerationTime: "11:00",
    quality: "partial",
    selfConsumptionTotal: 7,
    ...overrides
  };
}

test("N3 the monthly curve and table keep canonical daily gaps beside a known month total", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "kn",
    now: "2026-09-30T10:02:00.000Z",
    periodSummary: { quality: "exact", valueKwh: "900" },
    range: "month",
    snapshots,
    summaries: [
      canonicalSummary({ consumptionTotal: 300, date: "2026-09-01", quality: "exact" }),
      canonicalSummary({ consumptionTotal: null, date: "2026-09-02", quality: "partial" })
    ]
  });

  assert.equal(model.metricCards[2]?.valueLabel, "900", "the card keeps the supported month total");
  assert.deepEqual(model.chartLines[2]?.points, [
    { label: "2026-09-01", value: 300 },
    { label: "2026-09-02", value: null }
  ]);
  assert.deepEqual(model.tableRows.map((row) => row.consumptionLabel), ["300", "--"]);
  assert.deepEqual(model.tableRows.map((row) => row.generationLabel), ["10", "10"]);
});

test("N3 a legacy sentinel row cannot outrank the canonical period result", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "kn",
    now: "2026-09-02T10:02:00.000Z",
    periodSummary: { quality: "partial", valueKwh: null },
    range: "week",
    snapshots,
    summaries: [
      canonicalSummary({ consumptionTotal: null, date: "2026-09-01" }),
      canonicalSummary({ consumptionTotal: null, date: "2026-09-02" })
    ]
  });

  assert.equal(model.metricCards[2]?.valueLabel, "--", "missing week evidence is unavailable, not zero");
  assert.notEqual(model.metricCards[2]?.valueLabel, "0");
  assert.equal(model.metricCards[0]?.valueLabel, "20", "non-consumption cards keep summing their own rows");
});

test("N4 a canonical unavailable total does not fall back to the lifetime counter", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "kn",
    now: "2026-09-02T10:02:00.000Z",
    periodSummary: { quality: "partial", valueKwh: null },
    range: "total",
    snapshots: [],
    summaries: []
  });

  assert.equal(model.metricCards[2]?.valueLabel, "--", "an unproven accounting span must not borrow the raw counter");
});

test("N4 a measured zero stays a measured zero", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "kn",
    now: "2026-09-02T10:02:00.000Z",
    periodSummary: { quality: "exact", valueKwh: "0" },
    range: "week",
    snapshots,
    summaries: [canonicalSummary({ consumptionTotal: 0, date: "2026-09-02", quality: "exact" })]
  });

  assert.equal(model.metricCards[2]?.valueLabel, "0");
});

test("N3 a scope without an accounting profile keeps the legacy summary fallback", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "global",
    now: "2026-09-02T10:02:00.000Z",
    periodSummary: null,
    range: "week",
    snapshots,
    summaries: [
      { co2Total: 1, consumptionTotal: 120, date: "2026-09-01", generationTotal: 10, peakConsumption: null, peakConsumptionTime: null, peakGeneration: null, peakGenerationTime: null, selfConsumptionTotal: 3 },
      { co2Total: 1, consumptionTotal: 80, date: "2026-09-02", generationTotal: 10, peakConsumption: null, peakConsumptionTime: null, peakGeneration: null, peakGenerationTime: null, selfConsumptionTotal: 3 }
    ]
  });

  assert.equal(model.metricCards[2]?.valueLabel, "200", "the no-profile compatibility path is unchanged");
});

test("N4 an unavailable canonical consumption is reported with its quality instead of a fresh claim", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "kn",
    now: "2026-05-13T10:02:00.000Z",
    periodSummary: { issues: ["MISSING_BASELINE:kn-main"], quality: "partial", valueKwh: null },
    range: "week",
    snapshots,
    summaries: [canonicalSummary({ consumptionTotal: null, date: "2026-05-13" })]
  });

  assert.equal(model.metricCards[2]?.valueLabel, "--");
  assert.equal(model.monitoringState.category, "degraded");
  assert.match(model.monitoringState.detailLabel, /用電/);
  assert.match(model.monitoringState.detailLabel, /partial/);
  assert.match(model.monitoringState.detailLabel, /MISSING_BASELINE:kn-main/);
});

test("N4 an unavailable canonical total does not overwrite a more specific empty or stale state", () => {
  const empty = buildEnergyHistoryViewModel({
    counters: [],
    metricScope: "kn",
    now: "2026-09-02T10:02:00.000Z",
    periodSummary: { quality: "unavailable", valueKwh: null },
    range: "total",
    snapshots: [],
    summaries: []
  });
  assert.equal(empty.monitoringState.category, "empty");

  const stale = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "kn",
    now: "2026-09-02T10:02:00.000Z",
    periodSummary: { quality: "partial", valueKwh: null },
    range: "week",
    snapshots: [{ ...snapshots[0]!, capturedAt: "2026-08-01T00:00:00.000Z" }],
    summaries: [canonicalSummary({ consumptionTotal: null, date: "2026-08-01" })]
  });
  assert.equal(stale.monitoringState.category, "stale");
});

test("N4 a supported consumption value keeps the existing monitoring category", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "kn",
    now: "2026-05-13T10:02:00.000Z",
    periodSummary: { quality: "exact", valueKwh: "300" },
    range: "week",
    snapshots,
    summaries: [canonicalSummary({ consumptionTotal: 300, date: "2026-05-13", quality: "exact" })]
  });

  assert.equal(model.monitoringState.category, "fresh");
  assert.equal(model.metricCards[2]?.valueLabel, "300");
});

test("N4 the cumulative range states the accounting span its consumption actually covers", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "kn",
    now: "2026-09-08T10:02:00.000Z",
    periodSummary: {
      periodStart: "2026-05-31T16:00:00.000Z",
      quality: "exact",
      siteTimeZone: "Asia/Taipei",
      valueKwh: "100"
    },
    range: "total",
    snapshots: [],
    summaries: []
  });

  const source = model.bottomSummary.find((item) => item.label === "資料來源");
  assert.equal(model.metricCards[2]?.valueLabel, "100");
  assert.equal(source?.detailLabel, "用電統計期間 2026-06-01 起");
});

test("N4 the week range states its own span and the calendar ranges stay unlabelled", () => {
  const build = (range: "week" | "month") =>
    buildEnergyHistoryViewModel({
      counters: cumulativeCounters,
      metricScope: "kn",
      now: "2026-09-08T10:02:00.000Z",
      periodSummary: {
        periodStart: "2026-09-01T16:00:00.000Z",
        quality: "partial",
        siteTimeZone: "Asia/Taipei",
        valueKwh: null
      },
      range,
      snapshots: [],
      summaries: []
    });

  assert.equal(build("week").bottomSummary.find((item) => item.label === "資料來源")?.detailLabel, "用電統計期間 2026-09-02 起");
  // 今日/本月/今年 already name their own period, so the row stays as it was.
  assert.equal(build("month").bottomSummary.find((item) => item.label === "資料來源")?.detailLabel, "");
});

test("N4 a cumulative range without a canonical span keeps the source row unchanged", () => {
  const model = buildEnergyHistoryViewModel({
    counters: cumulativeCounters,
    metricScope: "global",
    now: "2026-09-08T10:02:00.000Z",
    periodSummary: null,
    range: "total",
    snapshots: [],
    summaries: []
  });

  assert.equal(model.bottomSummary.find((item) => item.label === "資料來源")?.detailLabel, "");
});

const legacyConsumptionSentinel = 987654.321;
const calendarRanges = ["day", "month", "year"] as const;

function legacySummary(date: string, consumptionTotal: number): DailyEnergySummary {
  return {
    co2Total: 1,
    consumptionTotal,
    date,
    generationTotal: 10,
    peakConsumption: null,
    peakConsumptionTime: null,
    peakGeneration: null,
    peakGenerationTime: null,
    selfConsumptionTotal: 3
  };
}

for (const range of calendarRanges) {
  test(`N4 ${range} canonical unavailable consumption does not use the legacy sentinel or zero`, () => {
    const model = buildEnergyHistoryViewModel({
      counters: cumulativeCounters,
      metricScope: "kn",
      now: "2026-05-13T10:02:00.000Z",
      periodSummary: {
        issues: [`UNRESOLVED_ACCOUNTING_PERIOD:${range}`],
        quality: "unavailable",
        valueKwh: null
      },
      range,
      snapshots,
      summaries: [legacySummary("2026-09-02", legacyConsumptionSentinel)]
    });

    assert.equal(model.metricCards[2]?.valueLabel, "--");
    assert.notEqual(model.metricCards[2]?.valueLabel, "987,654");
    assert.notEqual(model.metricCards[2]?.valueLabel, "0");
    assert.equal(model.monitoringState.category, "degraded");
    assert.match(model.monitoringState.detailLabel, new RegExp(`UNRESOLVED_ACCOUNTING_PERIOD:${range}`));
  });
}

for (const range of calendarRanges) {
  test(`N4 ${range} measured zero remains a valid zero beside the legacy sentinel`, () => {
    const model = buildEnergyHistoryViewModel({
      counters: cumulativeCounters,
      metricScope: "kn",
      now: "2026-05-13T10:02:00.000Z",
      periodSummary: { quality: "exact", valueKwh: "0" },
      range,
      snapshots,
      summaries: [legacySummary("2026-09-02", legacyConsumptionSentinel)]
    });

    assert.equal(model.metricCards[2]?.valueLabel, "0");
    assert.notEqual(model.metricCards[2]?.valueLabel, "--");
  });
}

for (const range of calendarRanges) {
  test(`N3 ${range} without an accounting profile keeps the legacy summary compatibility path`, () => {
    const model = buildEnergyHistoryViewModel({
      counters: cumulativeCounters,
      metricScope: "kn",
      now: "2026-05-13T10:02:00.000Z",
      periodSummary: null,
      range,
      snapshots,
      summaries: [
        legacySummary("2026-09-01", 120),
        legacySummary("2026-09-02", 80)
      ]
    });

    assert.equal(model.metricCards[2]?.valueLabel, range === "day" ? "120" : "200");
  });
}
