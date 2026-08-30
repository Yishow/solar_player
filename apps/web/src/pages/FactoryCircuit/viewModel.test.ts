import assert from "node:assert/strict";
import test from "node:test";
import type { CircuitConfig, FactoryCircuitStoryPayload } from "@solar-display/shared";
import type { LiveMetricsSnapshot } from "../../services/socket";
import {
  buildFactoryCircuitRuntimes,
  buildFactoryCircuitViewModel
} from "./viewModel";

const snapshot: LiveMetricsSnapshot = {
  metrics: {
    realTimePower: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "kW",
      value: 410
    },
    selfConsumptionEnergy: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "kWh",
      value: 2430
    }
  },
  timestamp: "2026-05-13T10:00:00.000Z"
};

type UnscopedFactoryCircuitStoryPayload = Omit<FactoryCircuitStoryPayload, "kpis" | "slots"> & {
  kpis: Array<Omit<FactoryCircuitStoryPayload["kpis"][number], "metricScope">>;
  slots: Array<Omit<FactoryCircuitStoryPayload["slots"][number], "metricScope">>;
};

function scopeFactoryCircuitStory(
  payload: UnscopedFactoryCircuitStoryPayload
): FactoryCircuitStoryPayload {
  return {
    ...payload,
    kpis: payload.kpis.map((kpi) => ({ ...kpi, metricScope: "cl" })),
    slots: payload.slots.map((slot) => ({ ...slot, metricScope: "cl" }))
  };
}

const circuitConfigs: CircuitConfig[] = [
  {
    attentionMax: 620,
    attentionMin: 434,
    displayOrder: 2,
    displaySlot: "body",
    enabled: true,
    icon: "wind",
    id: 2,
    mqttTopic: "factory/power/body",
    nameEn: "Body Shop",
    nameZh: "車身工程",
    normalMax: 434,
    normalMin: 0,
    ratedCapacity: 620,
    unit: "kW",
    warningMax: 620,
    warningMin: 558
  },
  {
    attentionMax: 850,
    attentionMin: 595,
    displayOrder: 1,
    displaySlot: "stamping",
    enabled: true,
    icon: "factory",
    id: 1,
    mqttTopic: "factory/power/stamping",
    nameEn: "Stamping Shop",
    nameZh: "沖壓工程",
    normalMax: 595,
    normalMin: 0,
    ratedCapacity: 850,
    unit: "kW",
    warningMax: 850,
    warningMin: 765
  },
  {
    attentionMax: 180,
    attentionMin: 126,
    displayOrder: 3,
    displaySlot: "painting",
    enabled: false,
    icon: "lightbulb",
    id: 3,
    mqttTopic: "factory/power/painting",
    nameEn: "Painting Shop",
    nameZh: "塗裝工程",
    normalMax: 126,
    normalMin: 0,
    ratedCapacity: 180,
    unit: "kW",
    warningMax: 180,
    warningMin: 162
  }
];

test("buildFactoryCircuitRuntimes orders enabled circuits into prototype slot order", () => {
  const runtimes = buildFactoryCircuitRuntimes(circuitConfigs);

  assert.equal(runtimes.length, 2);
  assert.equal(runtimes[0]?.nameZh, "沖壓工程");
  assert.equal(runtimes[1]?.nameZh, "車身工程");
  assert.equal(runtimes[0]?.livePowerKw, null);
  assert.equal(runtimes[1]?.livePowerKw, null);
});

test("buildFactoryCircuitViewModel centralizes threshold mapping by power and keeps eight load rows", () => {
  const runtimes = buildFactoryCircuitRuntimes(circuitConfigs).map((circuit) =>
    circuit.id === 1
      ? { ...circuit, livePowerKw: 790 }
      : circuit.id === 2
        ? { ...circuit, livePowerKw: 440 }
        : circuit
  );
  const model = buildFactoryCircuitViewModel({
    circuits: runtimes,
    connectionState: "connected",
    loadState: "ready",
    snapshot
  });

  assert.equal(model.loadRows.length, 8);
  assert.equal(model.loadRows[0]?.statusLabel, "警告");
  assert.equal(model.loadRows[0]?.statusTone, "danger");
  assert.equal(model.loadRows[0]?.iconKey, "production-line");
  assert.equal(model.loadRows[1]?.statusLabel, "注意");
  assert.equal(model.loadRows[1]?.statusTone, "warning");
  assert.equal(model.flowNodes[2]?.iconKey, "switchboard");
  assert.equal(model.loadRows[2]?.isEmpty, true);
  assert.equal(model.kpis[0]?.value, "--");
  assert.equal(model.kpis[0]?.provenance, "fallback");
  assert.equal(model.kpis[0]?.iconKey, "bolt");
  assert.match(model.kpis[0]?.sourceTooltip ?? "", /Metric: totalPower/);
  assert.match(model.kpis[0]?.sourceTooltip ?? "", /Source: slot-aggregate/);
  assert.match(model.kpis[0]?.sourceTooltip ?? "", /Depends on: stamping/);
  assert.equal(model.kpis[1]?.value, "--");
  assert.equal(model.kpis[1]?.helper, "等待 Registry Story");
  assert.equal(model.kpis[3]?.value, "--");
  assert.equal(model.kpis[3]?.helper, "等待 Registry Story");
  assert.equal(model.kpis[4]?.value, "待命");
});

test("buildFactoryCircuitViewModel keeps the full prototype structure for empty data", () => {
  const model = buildFactoryCircuitViewModel({
    circuits: [],
    connectionState: "disconnected",
    loadState: "error",
    snapshot: {
      metrics: {},
      timestamp: null
    }
  });

  assert.equal(model.emptyState?.title, "目前沒有可播放的迴路資料");
  assert.equal(model.loadRows.length, 8);
  assert.equal(model.loadRows.every((row) => row.isEmpty), true);
  assert.equal(model.loadRows[0]?.statusLabel, "未接入");
  assert.equal(model.kpis[0]?.value, "--");
  assert.equal(model.kpis[0]?.provenance, "fallback");
  assert.equal(model.summary.statusLabel, "迴路資料未連線，顯示版型 fallback");
});

test("buildFactoryCircuitViewModel falls back self-consumption KPI to today's generation when self-consumption is stale", () => {
  const model = buildFactoryCircuitViewModel({
    circuits: [],
    connectionState: "connected",
    loadState: "ready",
    snapshot: {
      metrics: {
        selfConsumptionEnergy: {
          quality: "good",
          timestamp: "2026-06-30T08:09:41.000Z",
          unit: "kWh",
          value: 22584
        },
        todayGeneration: {
          quality: "good",
          timestamp: "2026-07-09T08:43:14.000Z",
          unit: "MWh",
          value: 7.99
        }
      },
      timestamp: "2026-07-09T08:43:14.000Z"
    }
  });

  assert.equal(model.kpis[2]?.value, "7.99");
  assert.equal(model.kpis[2]?.unit, "MWh");
  assert.equal(model.kpis[2]?.helper, "以今日發電量替代自發自用量");
  assert.equal(model.kpis[2]?.provenance, "derived");
  assert.deepEqual(model.kpis[2]?.dependencyKeys, ["selfConsumptionEnergy", "todayGeneration"]);
});

test("buildFactoryCircuitRuntimes no longer guesses slot bindings from icon heuristics", () => {
  const runtimes = buildFactoryCircuitRuntimes([
    {
      ...circuitConfigs[0]!,
      displaySlot: null,
      icon: "factory"
    }
  ]);

  const model = buildFactoryCircuitViewModel({
    circuits: runtimes,
    connectionState: "connected",
    loadState: "ready",
    snapshot
  });

  assert.equal(runtimes[0]?.displaySlot, null);
  assert.equal(model.loadRows[0]?.isEmpty, true);
  assert.equal(model.loadRows[0]?.bindingState, "missing");
  assert.equal(model.loadRows[0]?.fallbackReason, "missing-slot-binding");
});

test("buildFactoryCircuitViewModel exposes deterministic alert reasons and missing-data states", () => {
  const model = buildFactoryCircuitViewModel({
    circuits: [
      {
        ...circuitConfigs[1]!,
        livePowerKw: 790
      },
      {
        ...circuitConfigs[0]!,
        livePowerKw: 0
      }
    ],
    connectionState: "connected",
    loadState: "ready",
    snapshot
  });

  assert.equal(model.loadRows[0]?.alertReason, "warning-threshold-exceeded");
  assert.equal(model.loadRows[1]?.alertReason, "missing-live-power");
  assert.equal(model.loadRows[1]?.statusLabel, "待資料");
});

test("buildFactoryCircuitViewModel uses factoryCircuitStory slots when available", () => {
  const model = buildFactoryCircuitViewModel({
    circuits: [],
    connectionState: "connected",
    loadState: "ready",
    snapshot,
    factoryCircuitStory: scopeFactoryCircuitStory({
      kpis: [
        {
          alertTone: "warning",
          bindingState: "missing",
          dependencyKeys: ["stamping", "body", "painting", "assembly", "utility", "office", "heavy_vehicle", "ed_coating"],
          fallbackReason: "missing-slot-binding",
          fallbackStrategy: "placeholder",
          freshnessState: "fallback",
          helper: "缺少空調迴路綁定",
          itemId: "totalPower",
          label: "目前廠區總用電",
          metricKey: "custom.factoryPower",
          provenance: "derived",
          sourceClass: "derived-metric",
          unit: "kW",
          value: "123.4"
        },
        {
          alertTone: "warning",
          bindingState: "missing",
          dependencyKeys: ["realTimePower", "stamping", "body", "painting", "assembly", "utility", "office", "heavy_vehicle", "ed_coating"],
          fallbackReason: "missing-slot-binding",
          fallbackStrategy: "derive-from-dependencies",
          freshnessState: "fallback",
          helper: "等待完整迴路聚合",
          label: "太陽能供應占比",
          metricKey: "solarShare",
          provenance: "fallback",
          sourceClass: "derived-metric",
          unit: "%",
          value: "--"
        },
        {
          alertTone: "normal",
          bindingState: "bound",
          dependencyKeys: ["selfConsumptionEnergy"],
          fallbackReason: null,
          fallbackStrategy: "placeholder",
          freshnessState: "fresh",
          helper: "最後更新 2026-05-13T10:00:00.000Z",
          label: "今日自發自用電量",
          metricKey: "selfConsumption",
          provenance: "live",
          sourceClass: "mqtt-live",
          sourceTopics: [
            { metricKey: "selfConsumptionEnergy", topic: "kuozui/plant/solar/self_consumption" }
          ],
          unit: "kWh",
          value: "2,430"
        },
        {
          alertTone: "warning",
          bindingState: "missing",
          dependencyKeys: ["stamping", "body", "painting", "assembly", "utility", "office", "heavy_vehicle", "ed_coating"],
          fallbackReason: "missing-slot-binding",
          fallbackStrategy: "derive-from-dependencies",
          freshnessState: "fallback",
          helper: "等待完整迴路聚合",
          label: "尖峰負載",
          metricKey: "peak",
          provenance: "fallback",
          sourceClass: "derived-metric",
          unit: "kW",
          value: "--"
        },
        {
          alertTone: "warning",
          bindingState: "missing",
          dependencyKeys: ["stamping", "body", "painting", "assembly", "utility", "office", "heavy_vehicle", "ed_coating"],
          fallbackReason: "missing-slot-binding",
          fallbackStrategy: "placeholder",
          freshnessState: "fallback",
          helper: "等待完整迴路聚合",
          label: "目前綠電流向",
          metricKey: "flow",
          provenance: "fallback",
          sourceClass: "derived-metric",
          unit: "Fallback",
          value: "待命"
        }
      ],
      slots: [
        { slotKey: "stamping", label: "故事版沖壓", bindingState: "bound", fallbackReason: null, freshnessState: "fresh", alertTone: "normal", livePowerKw: 520, circuitId: 1 },
        { slotKey: "body", label: "故事版車身", bindingState: "bound", fallbackReason: null, freshnessState: "fresh", alertTone: "warning", livePowerKw: 310, circuitId: 2 },
        { slotKey: "painting", label: "故事版塗裝", bindingState: "missing", fallbackReason: "missing-slot-binding", freshnessState: "fallback", alertTone: "warning", livePowerKw: null, circuitId: null },
        { slotKey: "assembly", label: "故事版裝配", bindingState: "bound", fallbackReason: null, freshnessState: "fresh", alertTone: "normal", livePowerKw: 90, circuitId: 4 },
        { slotKey: "utility", label: "故事版原動力", bindingState: "bound", fallbackReason: null, freshnessState: "fresh", alertTone: "normal", livePowerKw: 45, circuitId: 5 },
        { slotKey: "office", label: "故事版事務系", bindingState: "bound", fallbackReason: null, freshnessState: "fresh", alertTone: "normal", livePowerKw: 35, circuitId: 6 },
        { slotKey: "heavy_vehicle", label: "故事版大車", bindingState: "missing", fallbackReason: "missing-slot-binding", freshnessState: "fallback", alertTone: "warning", livePowerKw: null, circuitId: null },
        { slotKey: "ed_coating", label: "故事版ED電著", bindingState: "missing", fallbackReason: "missing-slot-binding", freshnessState: "fallback", alertTone: "warning", livePowerKw: null, circuitId: null }
      ],
      summary: { alertTone: "normal", bindingState: "bound", fallbackReason: null, freshnessState: "fresh" }
    })
  });

  assert.equal(model.loadRows.length, 8);
  assert.equal(model.loadRows[0]?.labelZh, "故事版沖壓");
  assert.equal(model.loadRows[0]?.labelEn, "Stamping Shop");
  assert.equal(model.loadRows[0]?.livePowerKw, 520);
  assert.equal(model.loadRows[0]?.statusLabel, "正常");
  assert.equal(model.loadRows[2]?.isEmpty, true);
  assert.equal(model.loadRows[2]?.labelEn, "Painting Shop");
  assert.equal(model.loadRows[2]?.statusLabel, "未綁定");
  assert.equal(model.loadRows[2]?.livePowerKw, null);
  assert.equal(model.kpis[0]?.metricKey, "custom.factoryPower");
  assert.equal(model.kpis[0]?.value, "123.4");
  assert.equal(model.kpis[0]?.provenance, "derived");
  assert.equal(model.kpis[0]?.sourceClass, "derived-metric");
  assert.equal(model.kpis[2]?.value, "2,430");
  assert.equal(model.kpis[2]?.provenance, "live");
  assert.ok(
    (model.kpis[2]?.sourceTooltip ?? "").includes(
      "Topic: selfConsumptionEnergy=kuozui/plant/solar/self_consumption"
    )
  );
  assert.equal(model.summary.statusLabel, "迴路資料已同步");
});

test("buildFactoryCircuitViewModel keeps stale story slots visible instead of treating them as empty", () => {
  const model = buildFactoryCircuitViewModel({
    circuits: [],
    connectionState: "connected",
    loadState: "ready",
    snapshot,
    factoryCircuitStory: scopeFactoryCircuitStory({
      kpis: [
        {
          alertTone: "warning",
          bindingState: "bound",
          dependencyKeys: ["stamping", "body"],
          fallbackReason: "stale-data",
          fallbackStrategy: "retain-last-reading",
          freshnessState: "stale",
          helper: "顯示最近一次有效讀值",
          label: "目前廠區總用電",
          metricKey: "totalPower",
          provenance: "aggregate",
          sourceClass: "slot-aggregate",
          unit: "kW",
          value: "830"
        },
        {
          alertTone: "warning",
          bindingState: "bound",
          dependencyKeys: ["realTimePower", "stamping", "body"],
          fallbackReason: "stale-data",
          fallbackStrategy: "retain-last-reading",
          freshnessState: "stale",
          helper: "顯示最近一次有效讀值",
          label: "太陽能供應占比",
          metricKey: "solarShare",
          provenance: "derived",
          sourceClass: "derived-metric",
          unit: "%",
          value: "49.4"
        },
        {
          alertTone: "warning",
          bindingState: "bound",
          dependencyKeys: ["selfConsumptionEnergy"],
          fallbackReason: "stale-data",
          fallbackStrategy: "retain-last-reading",
          freshnessState: "stale",
          helper: "顯示最近一次有效讀值",
          label: "今日自發自用電量",
          metricKey: "selfConsumption",
          provenance: "live",
          sourceClass: "mqtt-live",
          unit: "MWh",
          value: "9.2"
        },
        {
          alertTone: "warning",
          bindingState: "bound",
          dependencyKeys: ["factoryPeakMultiplier", "stamping", "body"],
          fallbackReason: "stale-data",
          fallbackStrategy: "retain-last-reading",
          freshnessState: "stale",
          helper: "顯示最近一次有效讀值",
          label: "尖峰負載",
          metricKey: "peak",
          provenance: "derived",
          sourceClass: "derived-metric",
          unit: "kW",
          value: "996"
        },
        {
          alertTone: "warning",
          bindingState: "bound",
          dependencyKeys: ["stamping", "body"],
          fallbackReason: "stale-data",
          fallbackStrategy: "retain-last-reading",
          freshnessState: "stale",
          helper: "顯示最近一次有效讀值",
          label: "目前綠電流向",
          metricKey: "flow",
          provenance: "derived",
          sourceClass: "derived-metric",
          unit: "Fallback",
          value: "供應中"
        }
      ],
      slots: [
        { slotKey: "stamping", label: "故事版沖壓", bindingState: "bound", fallbackReason: "stale-data", freshnessState: "stale", alertTone: "warning", livePowerKw: 520, circuitId: 1 },
        { slotKey: "body", label: "故事版車身", bindingState: "bound", fallbackReason: "stale-data", freshnessState: "stale", alertTone: "warning", livePowerKw: 310, circuitId: 2 },
        { slotKey: "painting", label: "故事版塗裝", bindingState: "missing", fallbackReason: "missing-slot-binding", freshnessState: "fallback", alertTone: "warning", livePowerKw: null, circuitId: null },
        { slotKey: "assembly", label: "故事版裝配", bindingState: "bound", fallbackReason: "stale-data", freshnessState: "stale", alertTone: "warning", livePowerKw: 0, circuitId: 4 },
        { slotKey: "utility", label: "故事版原動力", bindingState: "bound", fallbackReason: "stale-data", freshnessState: "stale", alertTone: "warning", livePowerKw: 0, circuitId: 5 },
        { slotKey: "office", label: "故事版事務系", bindingState: "bound", fallbackReason: "stale-data", freshnessState: "stale", alertTone: "warning", livePowerKw: 0, circuitId: 6 },
        { slotKey: "heavy_vehicle", label: "故事版大車", bindingState: "missing", fallbackReason: "missing-slot-binding", freshnessState: "fallback", alertTone: "warning", livePowerKw: null, circuitId: null },
        { slotKey: "ed_coating", label: "故事版ED電著", bindingState: "missing", fallbackReason: "missing-slot-binding", freshnessState: "fallback", alertTone: "warning", livePowerKw: null, circuitId: null }
      ],
      summary: { alertTone: "warning", bindingState: "bound", fallbackReason: "stale-data", freshnessState: "stale" }
    })
  });

  assert.equal(model.loadRows[0]?.isEmpty, false);
  assert.equal(model.loadRows[0]?.livePowerKw, 520);
  assert.equal(model.loadRows[0]?.statusLabel, "注意");
  assert.equal(model.loadRows[0]?.statusTone, "warning");
  assert.equal(model.kpis[0]?.value, "830");
  assert.equal(model.kpis[0]?.freshnessState, "stale");
  assert.equal(model.summary.statusLabel, "迴路資料延遲，顯示最近一次有效狀態");
});

test("buildFactoryCircuitViewModel surfaces the custom topic name via the story slot label", () => {
  const baseSlot = { bindingState: "bound" as const, fallbackReason: null, freshnessState: "fresh" as const, alertTone: "normal" as const, livePowerKw: 100 };
  const model = buildFactoryCircuitViewModel({
    circuits: [],
    connectionState: "connected",
    loadState: "ready",
    snapshot,
    factoryCircuitStory: scopeFactoryCircuitStory({
      kpis: [
        { alertTone: "normal", bindingState: "bound", dependencyKeys: [], fallbackReason: null, fallbackStrategy: "placeholder", freshnessState: "fresh", helper: "", label: "目前廠區總用電", metricKey: "totalPower", provenance: "live", sourceClass: "slot-aggregate", unit: "kW", value: "920" },
        { alertTone: "normal", bindingState: "bound", dependencyKeys: [], fallbackReason: null, fallbackStrategy: "placeholder", freshnessState: "fresh", helper: "", label: "太陽能供應占比", metricKey: "solarShare", provenance: "derived", sourceClass: "derived-metric", unit: "%", value: "40" },
        { alertTone: "normal", bindingState: "bound", dependencyKeys: [], fallbackReason: null, fallbackStrategy: "placeholder", freshnessState: "fresh", helper: "", label: "今日自發自用電量", metricKey: "selfConsumption", provenance: "live", sourceClass: "mqtt-live", unit: "kWh", value: "2,430" },
        { alertTone: "normal", bindingState: "bound", dependencyKeys: [], fallbackReason: null, fallbackStrategy: "placeholder", freshnessState: "fresh", helper: "", label: "尖峰負載", metricKey: "peak", provenance: "live", sourceClass: "mqtt-live", unit: "kW", value: "640" },
        { alertTone: "normal", bindingState: "bound", dependencyKeys: [], fallbackReason: null, fallbackStrategy: "placeholder", freshnessState: "fresh", helper: "", label: "目前綠電流向", metricKey: "flow", provenance: "live", sourceClass: "mqtt-live", unit: "kW", value: "368" }
      ],
      slots: [
        { ...baseSlot, slotKey: "stamping", label: "一號產線", labelZh: "一號產線", labelEn: "Line 1", livePowerKw: 520, circuitId: 1 },
        { ...baseSlot, slotKey: "body", label: "車身", labelZh: "車身", labelEn: "Body", circuitId: 2 },
        { ...baseSlot, slotKey: "painting", label: "塗裝", labelZh: "塗裝", labelEn: "Painting", circuitId: 3 },
        { ...baseSlot, slotKey: "assembly", label: "裝配", labelZh: "裝配", labelEn: "Assembly", circuitId: 4 },
        { ...baseSlot, slotKey: "utility", label: "原動力", labelZh: "原動力", labelEn: "Utility", circuitId: 5 },
        { ...baseSlot, slotKey: "office", label: "事務系", labelZh: "事務系", labelEn: "Office", circuitId: 6 },
        { ...baseSlot, slotKey: "heavy_vehicle", label: "大車", labelZh: "大車", labelEn: "Heavy Vehicle", circuitId: 7 },
        { ...baseSlot, slotKey: "ed_coating", label: "ED電著", labelZh: "ED電著", labelEn: "ED Coating", circuitId: 8 }
      ],
      summary: { alertTone: "normal", bindingState: "bound", fallbackReason: null, freshnessState: "fresh" }
    })
  });

  assert.equal(model.loadRows[0]?.labelZh, "一號產線");
  assert.equal(model.loadRows[0]?.labelEn, "Line 1");
});

test("buildFactoryCircuitViewModel falls back to circuits when factoryCircuitStory has too few slots", () => {
  const runtimes = buildFactoryCircuitRuntimes(circuitConfigs);
  const model = buildFactoryCircuitViewModel({
    circuits: runtimes,
    connectionState: "connected",
    loadState: "ready",
    snapshot,
    factoryCircuitStory: scopeFactoryCircuitStory({
      kpis: [],
      slots: [
        { slotKey: "stamping", label: "單一", bindingState: "bound", fallbackReason: null, freshnessState: "fresh", alertTone: "normal", livePowerKw: 520, circuitId: 1 }
      ],
      summary: { alertTone: "normal", bindingState: "bound", fallbackReason: null, freshnessState: "fresh" }
    })
  });

  assert.equal(model.loadRows[0]?.labelZh, "沖壓工程");
  assert.equal(model.summary.statusLabel, "部分迴路尚未回報即時功率");
});

test("buildFactoryCircuitViewModel keeps the last settled fallback rows visible when refresh fails", () => {
  const runtimes = buildFactoryCircuitRuntimes(circuitConfigs).map((circuit) =>
    circuit.id === 1
      ? { ...circuit, livePowerKw: 520 }
      : circuit.id === 2
        ? { ...circuit, livePowerKw: 310 }
        : circuit
  );
  const model = buildFactoryCircuitViewModel({
    circuits: runtimes,
    connectionState: "connected",
    loadState: "error",
    snapshot
  });

  assert.equal(model.emptyState, null);
  assert.equal(model.loadRows[0]?.labelZh, "沖壓工程");
  assert.equal(model.loadRows[0]?.isEmpty, false);
  assert.equal(model.loadRows[0]?.livePowerKw, 520);
  assert.equal(model.loadRows[1]?.labelZh, "車身工程");
  assert.equal(model.summary.statusLabel, "迴路資料未連線，顯示版型 fallback");
});
