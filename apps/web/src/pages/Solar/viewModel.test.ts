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

test("buildSolarViewModel surfaces the custom topic name via the story KPI label and falls back without a story", () => {
  const withStory = buildSolarViewModel({
    isSocketConnected: true,
    snapshot,
    solarStory: {
      kpis: [
        { metricKey: "todayGeneration", label: "今日產出", unit: "kWh", value: "3,842", comparison: { state: "unavailable", delta: null, fallbackReason: null, label: "" } },
        { metricKey: "selfConsumptionRatio", label: "自用", unit: "%", value: "78", comparison: { state: "unavailable", delta: null, fallbackReason: null, label: "" } },
        { metricKey: "todayCo2Reduction", label: "減碳", unit: "t", value: "1.9", comparison: { state: "unavailable", delta: null, fallbackReason: null, label: "" } },
        { metricKey: "totalCo2Reduction", label: "累積減碳", unit: "t", value: "9,842", comparison: { state: "unavailable", delta: null, fallbackReason: null, label: "" } },
        { metricKey: "systemEfficiency", label: "效率", unit: "%", value: "96", comparison: { state: "unavailable", delta: null, fallbackReason: null, label: "" } }
      ],
      story: { flowState: { state: "healthy", reason: null, label: "運作正常" } }
    }
  });

  assert.equal(withStory.kpis[0]?.label, "今日產出");

  const withoutStory = buildSolarViewModel({ isSocketConnected: true, snapshot });
  assert.equal(withoutStory.kpis[0]?.label, "今日發電量");
});

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

test("buildSolarViewModel resolves degraded flow storytelling and comparison targets", () => {
  const model = buildSolarViewModel({
    comparisonTargets: {
      systemEfficiency: {
        label: "效率基準",
        unit: "%",
        value: 95
      },
      todayGeneration: {
        label: "今日目標",
        unit: "kWh",
        value: 4000
      }
    },
    isSocketConnected: true,
    snapshot: {
      metrics: {
        ...snapshot.metrics,
        realTimePower: {
          quality: "good",
          timestamp: "2026-05-13T10:00:00.000Z",
          unit: "kW",
          value: 84
        },
        systemEfficiency: {
          quality: "good",
          timestamp: "2026-05-13T10:00:00.000Z",
          unit: "%",
          value: 88.1
        }
      },
      timestamp: "2026-05-13T10:00:00.000Z"
    }
  });

  assert.equal(model.story.flowState.state, "degraded");
  assert.equal(model.story.flowState.reason, "reduced-efficiency");
  assert.equal(model.kpis[0]?.comparison?.state, "below-target");
  assert.match(model.kpis[0]?.comparison?.label ?? "", /今日目標/);
  assert.equal(model.kpis[4]?.comparison?.state, "below-target");
});

test("buildSolarViewModel preserves missing comparison target diagnostics", () => {
  const model = buildSolarViewModel({
    isSocketConnected: true,
    snapshot
  });

  assert.equal(model.kpis[0]?.comparison?.state, "unavailable");
  assert.equal(model.kpis[0]?.comparison?.fallbackReason, "comparison-target-missing");
});

test("buildSolarViewModel uses solar story KPIs and keeps live power fallback when the shared story omits it", () => {
  const model = buildSolarViewModel({
    isSocketConnected: true,
    snapshot,
    solarStory: {
      kpis: [
        {
          alertTone: "normal",
          bindingState: "bound",
          fallbackReason: null,
          freshnessState: "fresh",
          helper: "共享故事今日發電量",
          metricKey: "todayGeneration",
          label: "故事版今日發電量",
          provenance: "live",
          sourceClass: "mqtt-live",
          unit: "kWh",
          value: "4,200",
          comparison: { state: "above-target", delta: "+200", fallbackReason: null, label: "超越目標" }
        },
        {
          alertTone: "warning",
          bindingState: "bound",
          fallbackReason: null,
          freshnessState: "fresh",
          helper: "由自用電與總用電推導",
          metricKey: "selfConsumptionRatio",
          label: "故事版自用比例",
          provenance: "derived",
          sourceClass: "derived-metric",
          unit: "%",
          value: "82",
          comparison: { state: "at-target", delta: "0.0", fallbackReason: null, label: "符合目標" }
        },
        {
          alertTone: "normal",
          bindingState: "bound",
          fallbackReason: null,
          freshnessState: "fresh",
          helper: "共享故事今日減碳",
          metricKey: "todayCo2Reduction",
          label: "故事版今日減碳",
          provenance: "live",
          sourceClass: "mqtt-live",
          unit: "t",
          value: "2.1",
          comparison: { state: "above-target", delta: "+0.16", fallbackReason: null, label: "超越目標" }
        },
        {
          alertTone: "warning",
          bindingState: "bound",
          fallbackReason: null,
          freshnessState: "fresh",
          helper: "共享故事累積減碳",
          metricKey: "totalCo2Reduction",
          label: "故事版累積減碳",
          provenance: "cumulative",
          sourceClass: "cumulative-counter",
          unit: "t",
          value: "10,000",
          comparison: { state: "unavailable", delta: null, fallbackReason: "comparison-target-missing", label: "未設定對標" }
        },
        {
          alertTone: "normal",
          bindingState: "bound",
          fallbackReason: null,
          freshnessState: "fresh",
          helper: "共享故事系統效率",
          metricKey: "systemEfficiency",
          label: "故事版系統效率",
          provenance: "live",
          sourceClass: "mqtt-live",
          unit: "%",
          value: "97.2",
          comparison: { state: "above-target", delta: "+2.2", fallbackReason: null, label: "超越目標" }
        }
      ],
      story: {
        flowState: { state: "healthy", reason: null, label: "運作正常" }
      }
    }
  });

  assert.equal(model.kpis.length, 5);
  assert.equal(model.kpis[0]?.label, "故事版今日發電量");
  assert.equal(model.kpis[0]?.value, "4,200");
  assert.equal(model.kpis[0]?.comparison?.state, "above-target");
  assert.equal(model.kpis[1]?.bindingState, "bound");
  assert.equal(model.kpis[1]?.provenance, "derived");
  assert.equal(model.kpis[1]?.sourceClass, "derived-metric");
  assert.equal(model.kpis[3]?.comparison?.fallbackReason, "comparison-target-missing");
  assert.equal(model.story.flowState.state, "healthy");
  assert.equal(model.flowNodes[0]?.value, "586 kW");
});

test("buildSolarViewModel falls back to socket when solarStory has too few KPIs", () => {
  const model = buildSolarViewModel({
    isSocketConnected: true,
    snapshot,
    solarStory: {
      kpis: [
        { metricKey: "todayGeneration", label: "故事版", unit: "kWh", value: "4,200", comparison: { state: "unavailable", delta: null, fallbackReason: null, label: "" } }
      ],
      story: { flowState: { state: "healthy", reason: null, label: "" } }
    }
  });

  assert.equal(model.kpis[0]?.label, "今日發電量");
  assert.equal(model.kpis[0]?.value, "3,842");
});
