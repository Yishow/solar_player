import assert from "node:assert/strict";
import test from "node:test";
import type { LiveMetricsSnapshot } from "../../services/socket";
import { buildEnergyTrendViewModel } from "./viewModel";

const liveSnapshot: LiveMetricsSnapshot = {
  metrics: {
    consumptionEnergy: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "kWh",
      value: 12680
    },
    realTimePower: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "kW",
      value: 1280
    },
    selfConsumptionRatio: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "%",
      value: 32
    },
    todayCo2Reduction: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "t",
      value: 4.21
    },
    todayGeneration: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "kWh",
      value: 8450
    }
  },
  timestamp: "2026-05-13T10:00:00.000Z"
};

const historySnapshots = [
  {
    capturedAt: "2026-05-13T00:00:00.000Z",
    co2: 0.5,
    consumption: 300,
    efficiency: 82,
    generation: 280,
    ratio: 24,
    selfConsumption: 160
  },
  {
    capturedAt: "2026-05-13T01:00:00.000Z",
    co2: 0.8,
    consumption: 420,
    efficiency: 84,
    generation: 360,
    ratio: 31,
    selfConsumption: 210
  },
  {
    capturedAt: "2026-05-13T02:00:00.000Z",
    co2: 1.1,
    consumption: 520,
    efficiency: 86,
    generation: 480,
    ratio: 35,
    selfConsumption: 260
  }
];

test("buildEnergyTrendViewModel maps five prototype chart cards from live and history metrics", () => {
  const model = buildEnergyTrendViewModel({
    liveSnapshot,
    now: "2026-05-13T10:02:00.000Z",
    periodSummary: { quality: "exact", valueKwh: "4300" },
    range: "day",
    snapshots: historySnapshots
  });

  assert.equal(model.tabs.length, 4);
  assert.equal(model.tabs[0]?.label, "日 Day");
  assert.equal(model.tabs[0]?.active, true);
  assert.equal(model.cards.length, 5);
  assert.equal(model.cards[0]?.titleZh, "發電功率");
  assert.equal(model.cards[0]?.valueLabel, "1,280");
  assert.equal(model.cards[0]?.unitLabel, "kW");
  assert.equal(model.cards[1]?.valueLabel, "8,450");
  assert.equal(model.cards[2]?.valueLabel, "4,300");
  assert.equal(model.cards[3]?.valueLabel, "32");
  assert.equal(model.cards[4]?.valueLabel, "4.21");
  assert.equal(model.cards[4]?.unitLabel, "t");
  assert.equal(model.cards[0]?.chartPoints.length, 3);
  assert.equal(model.refreshLabel, "資料每 30 秒更新一次");
  assert.equal(model.monitoringState.category, "fresh");
  assert.equal(model.monitoringState.freshnessLabel, "即時資料");
  assert.equal(model.monitoringState.sourceRoleLabel, "MQTT Live + History Snapshot");
});

test("E3-R1 consumption card uses period 4300 instead of live register 100000", () => {
  const model = buildEnergyTrendViewModel({
    liveSnapshot: {
      ...liveSnapshot,
      metrics: {
        ...liveSnapshot.metrics,
        consumptionEnergy: {
          quality: "good",
          timestamp: "2026-05-13T10:00:00.000Z",
          unit: "kWh",
          value: 100000
        }
      }
    },
    now: "2026-05-13T10:02:00.000Z",
    periodSummary: { quality: "exact", valueKwh: "4300" },
    range: "month",
    snapshots: historySnapshots
  });
  assert.equal(model.cards[2]?.valueLabel, "4,300");
  assert.notEqual(model.cards[2]?.valueLabel, "100,000");
});

test("buildEnergyTrendViewModel keeps fallback copy when snapshots are empty", () => {
  const model = buildEnergyTrendViewModel({
    liveSnapshot: {
      metrics: {},
      timestamp: null
    },
    now: "2026-05-13T10:02:00.000Z",
    range: "total",
    snapshots: []
  });

  assert.equal(model.cards.length, 5);
  assert.equal(model.cards[0]?.valueLabel, "--");
  assert.equal(model.cards[0]?.chartPoints.length, 0);
  assert.match(model.leadDescription, /掌握綠電發電/);
  assert.equal(model.tabs[3]?.active, true);
  assert.equal(model.monitoringState.category, "empty");
  assert.equal(model.monitoringState.emptyStateLabel, "目前沒有可用的趨勢資料來源");
});

test("buildEnergyTrendViewModel labels stale cumulative fallback telemetry explicitly", () => {
  const model = buildEnergyTrendViewModel({
    liveSnapshot,
    now: "2026-05-13T10:20:00.000Z",
    periodSummary: { quality: "exact", valueKwh: "4300" },
    range: "day",
    snapshots: historySnapshots
  });

  assert.equal(model.monitoringState.category, "stale");
  assert.equal(model.monitoringState.freshnessLabel, "逾時資料");
  assert.equal(model.monitoringState.sourceRoleLabel, "Cumulative Telemetry Fallback");
});

test("buildEnergyTrendViewModel marks history-only fallback data as degraded", () => {
  const model = buildEnergyTrendViewModel({
    liveSnapshot: {
      metrics: {},
      timestamp: null
    },
    now: "2026-05-13T10:02:00.000Z",
    range: "week",
    snapshots: historySnapshots
  });

  assert.equal(model.monitoringState.category, "degraded");
  assert.equal(model.monitoringState.freshnessLabel, "降級資料");
  assert.equal(model.monitoringState.sourceRoleLabel, "History Snapshot Fallback");
});

test("N4 a canonical unavailable week keeps the consumption card empty instead of using the live register", () => {
  const model = buildEnergyTrendViewModel({
    liveSnapshot: {
      ...liveSnapshot,
      metrics: {
        ...liveSnapshot.metrics,
        consumptionEnergy: {
          quality: "good",
          timestamp: "2026-05-13T10:00:00.000Z",
          unit: "kWh",
          value: 100000
        }
      }
    },
    now: "2026-05-13T10:02:00.000Z",
    periodSummary: { quality: "partial", valueKwh: null },
    range: "week",
    snapshots: historySnapshots
  });

  assert.equal(model.cards[2]?.valueLabel, "--");
  assert.notEqual(model.cards[2]?.valueLabel, "0");
  assert.notEqual(model.cards[2]?.valueLabel, "100,000");
});

test("N4 a measured zero week is reported as zero rather than missing", () => {
  const model = buildEnergyTrendViewModel({
    liveSnapshot,
    now: "2026-05-13T10:02:00.000Z",
    periodSummary: { quality: "exact", valueKwh: "0" },
    range: "week",
    snapshots: historySnapshots
  });

  assert.equal(model.cards[2]?.valueLabel, "0");
});

const legacyConsumptionSentinel = 987654.321;
const calendarRanges = ["day", "month"] as const;

const legacySentinelLiveSnapshot: LiveMetricsSnapshot = {
  ...liveSnapshot,
  metrics: {
    ...liveSnapshot.metrics,
    consumptionEnergy: {
      ...liveSnapshot.metrics.consumptionEnergy!,
      value: legacyConsumptionSentinel
    }
  }
};

for (const range of calendarRanges) {
  test(`N4 ${range} canonical unavailable consumption does not use the legacy sentinel or zero`, () => {
    const model = buildEnergyTrendViewModel({
      liveSnapshot: legacySentinelLiveSnapshot,
      now: "2026-05-13T10:02:00.000Z",
      periodSummary: { quality: "unavailable", valueKwh: null },
      range,
      snapshots: historySnapshots
    });

    assert.equal(model.cards[2]?.valueLabel, "--");
    assert.notEqual(model.cards[2]?.valueLabel, "987,654");
    assert.notEqual(model.cards[2]?.valueLabel, "0");
  });
}

for (const range of calendarRanges) {
  test(`N4 ${range} measured zero remains a valid zero beside the legacy sentinel`, () => {
    const model = buildEnergyTrendViewModel({
      liveSnapshot: legacySentinelLiveSnapshot,
      now: "2026-05-13T10:02:00.000Z",
      periodSummary: { quality: "exact", valueKwh: "0" },
      range,
      snapshots: historySnapshots
    });

    assert.equal(model.cards[2]?.valueLabel, "0");
    assert.notEqual(model.cards[2]?.valueLabel, "--");
    assert.notEqual(model.cards[2]?.valueLabel, "987,654");
  });
}

for (const range of calendarRanges) {
  test(`N3 ${range} without an accounting profile keeps the legacy live compatibility path`, () => {
    const model = buildEnergyTrendViewModel({
      liveSnapshot,
      now: "2026-05-13T10:02:00.000Z",
      range,
      snapshots: historySnapshots
    });

    assert.equal(model.cards[2]?.valueLabel, "12,680");
  });
}
