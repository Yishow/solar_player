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
  assert.equal(model.cards[2]?.valueLabel, "12,680");
  assert.equal(model.cards[3]?.valueLabel, "32");
  assert.equal(model.cards[4]?.valueLabel, "4.21");
  assert.equal(model.cards[4]?.unitLabel, "t");
  assert.equal(model.cards[0]?.chartPoints.length, 3);
  assert.equal(model.refreshLabel, "資料每 30 秒更新一次");
});

test("buildEnergyTrendViewModel keeps fallback copy when snapshots are empty", () => {
  const model = buildEnergyTrendViewModel({
    liveSnapshot: {
      metrics: {},
      timestamp: null
    },
    range: "total",
    snapshots: []
  });

  assert.equal(model.cards.length, 5);
  assert.equal(model.cards[0]?.valueLabel, "--");
  assert.equal(model.cards[0]?.chartPoints.length, 0);
  assert.match(model.leadDescription, /掌握綠電發電/);
  assert.equal(model.tabs[3]?.active, true);
});
