import assert from "node:assert/strict";
import test from "node:test";
import type { LiveMetricsSnapshot } from "../../services/socket";
import { buildSolarViewModel } from "./viewModel";

const snapshot: LiveMetricsSnapshot = {
  metrics: {
    realTimePower: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "kW",
      value: 586
    },
    todayGeneration: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "kWh",
      value: 3842
    },
    selfConsumptionRatio: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "%",
      value: 78.2
    },
    todayCo2Reduction: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "t",
      value: 1.94
    },
    totalCo2Reduction: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "t",
      value: 9842
    },
    systemEfficiency: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "%",
      value: 96.4
    }
  },
  timestamp: "2026-05-13T10:00:00.000Z"
};

test("buildSolarViewModel centralizes flow nodes and KPI display fields", () => {
  const model = buildSolarViewModel({
    isSocketConnected: true,
    snapshot
  });

  assert.equal(model.flowNodes.length, 4);
  assert.equal(model.kpis.length, 5);
  assert.equal(model.flowNodes[0]?.value, "586 kW");
  assert.equal(model.flowNodes[1]?.value, "96.4%");
  assert.equal(model.flowNodes[0]?.assetKey, "solar-panel-display");
  assert.equal(model.flowNodes[1]?.assetKey, "inverter-display");
  assert.equal(model.kpis[0]?.iconKey, "metric-generation-sun");
  assert.equal(model.kpis[4]?.iconKey, "metric-efficiency");
  assert.equal(model.kpis[0]?.value, "3,842");
});

test("buildSolarViewModel keeps fallback values when snapshot fields are missing", () => {
  const model = buildSolarViewModel({
    isSocketConnected: false,
    snapshot: {
      metrics: {},
      timestamp: null
    }
  });

  assert.equal(model.kpis[1]?.label, "自發自用比例");
  assert.equal(model.kpis[1]?.value, "71");
  assert.equal(model.flowNodes[2]?.value, "71%");
  assert.equal(model.flowNodes[3]?.assetKey, "carbon-reduction-display");
  assert.equal(model.kpis[3]?.value, "9,842");
});
