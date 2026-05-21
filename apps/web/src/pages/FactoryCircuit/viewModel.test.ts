import assert from "node:assert/strict";
import test from "node:test";
import type { CircuitConfig } from "@solar-display/shared";
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

const circuitConfigs: CircuitConfig[] = [
  {
    attentionMax: 620,
    attentionMin: 434,
    displayOrder: 2,
    displaySlot: "hvac",
    enabled: true,
    icon: "wind",
    id: 2,
    mqttTopic: "factory/power/hvac",
    nameEn: "HVAC & Environment",
    nameZh: "空調與環境設備",
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
    displaySlot: "production",
    enabled: true,
    icon: "factory",
    id: 1,
    mqttTopic: "factory/power/production",
    nameEn: "Production Line",
    nameZh: "生產線用電",
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
    displaySlot: "lighting",
    enabled: false,
    icon: "lightbulb",
    id: 3,
    mqttTopic: "factory/power/lighting",
    nameEn: "Lighting",
    nameZh: "照明系統",
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
  assert.equal(runtimes[0]?.nameZh, "生產線用電");
  assert.equal(runtimes[1]?.nameZh, "空調與環境設備");
  assert.equal(runtimes[0]?.livePowerKw, null);
  assert.equal(runtimes[1]?.livePowerKw, null);
});

test("buildFactoryCircuitViewModel centralizes threshold mapping by power and keeps six load rows", () => {
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

  assert.equal(model.loadRows.length, 6);
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
  assert.equal(model.kpis[1]?.value, "--");
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
  assert.equal(model.loadRows.length, 6);
  assert.equal(model.loadRows.every((row) => row.isEmpty), true);
  assert.equal(model.loadRows[0]?.statusLabel, "未接入");
  assert.equal(model.kpis[0]?.value, "--");
  assert.equal(model.kpis[0]?.provenance, "fallback");
  assert.equal(model.summary.statusLabel, "迴路資料未連線，顯示版型 fallback");
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
    factoryCircuitStory: {
      kpis: [
        {
          alertTone: "warning",
          bindingState: "missing",
          dependencyKeys: ["production", "hvac", "lighting", "office", "ev", "infrastructure"],
          fallbackReason: "missing-slot-binding",
          fallbackStrategy: "placeholder",
          freshnessState: "fallback",
          helper: "缺少空調迴路綁定",
          label: "目前廠區總用電",
          metricKey: "totalPower",
          provenance: "fallback",
          sourceClass: "slot-aggregate",
          unit: "kW",
          value: "--"
        },
        {
          alertTone: "warning",
          bindingState: "missing",
          dependencyKeys: ["realTimePower", "production", "hvac", "lighting", "office", "ev", "infrastructure"],
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
          unit: "kWh",
          value: "2,430"
        },
        {
          alertTone: "warning",
          bindingState: "missing",
          dependencyKeys: ["production", "hvac", "lighting", "office", "ev", "infrastructure"],
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
          dependencyKeys: ["production", "hvac", "lighting", "office", "ev", "infrastructure"],
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
        { slotKey: "production", label: "故事版生產線", bindingState: "bound", fallbackReason: null, freshnessState: "fresh", alertTone: "normal", livePowerKw: 520, circuitId: 1 },
        { slotKey: "hvac", label: "故事版空調", bindingState: "bound", fallbackReason: null, freshnessState: "fresh", alertTone: "warning", livePowerKw: 310, circuitId: 2 },
        { slotKey: "lighting", label: "故事版照明", bindingState: "missing", fallbackReason: "missing-slot-binding", freshnessState: "fallback", alertTone: "warning", livePowerKw: null, circuitId: null },
        { slotKey: "office", label: "故事版辦公區", bindingState: "bound", fallbackReason: null, freshnessState: "fresh", alertTone: "normal", livePowerKw: 90, circuitId: 4 },
        { slotKey: "ev", label: "故事版充電站", bindingState: "bound", fallbackReason: null, freshnessState: "fresh", alertTone: "normal", livePowerKw: 45, circuitId: 5 },
        { slotKey: "infrastructure", label: "故事版基礎設施", bindingState: "bound", fallbackReason: null, freshnessState: "fresh", alertTone: "normal", livePowerKw: 35, circuitId: 6 }
      ],
      summary: { alertTone: "normal", bindingState: "bound", fallbackReason: null, freshnessState: "fresh" }
    }
  });

  assert.equal(model.loadRows.length, 6);
  assert.equal(model.loadRows[0]?.labelZh, "故事版生產線");
  assert.equal(model.loadRows[0]?.livePowerKw, 520);
  assert.equal(model.loadRows[0]?.statusLabel, "正常");
  assert.equal(model.loadRows[2]?.isEmpty, true);
  assert.equal(model.loadRows[2]?.statusLabel, "未綁定");
  assert.equal(model.loadRows[2]?.livePowerKw, null);
  assert.equal(model.kpis[0]?.value, "--");
  assert.equal(model.kpis[0]?.provenance, "fallback");
  assert.equal(model.kpis[0]?.sourceClass, "slot-aggregate");
  assert.equal(model.kpis[2]?.value, "2,430");
  assert.equal(model.kpis[2]?.provenance, "live");
  assert.equal(model.summary.statusLabel, "迴路資料已同步");
});

test("buildFactoryCircuitViewModel falls back to circuits when factoryCircuitStory has too few slots", () => {
  const runtimes = buildFactoryCircuitRuntimes(circuitConfigs);
  const model = buildFactoryCircuitViewModel({
    circuits: runtimes,
    connectionState: "connected",
    loadState: "ready",
    snapshot,
    factoryCircuitStory: {
      kpis: [],
      slots: [
        { slotKey: "production", label: "單一", bindingState: "bound", fallbackReason: null, freshnessState: "fresh", alertTone: "normal", livePowerKw: 520, circuitId: 1 }
      ],
      summary: { alertTone: "normal", bindingState: "bound", fallbackReason: null, freshnessState: "fresh" }
    }
  });

  assert.equal(model.loadRows[0]?.labelZh, "生產線用電");
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
  assert.equal(model.loadRows[0]?.labelZh, "生產線用電");
  assert.equal(model.loadRows[0]?.isEmpty, false);
  assert.equal(model.loadRows[0]?.livePowerKw, 520);
  assert.equal(model.loadRows[1]?.labelZh, "空調與環境設備");
  assert.equal(model.summary.statusLabel, "迴路資料未連線，顯示版型 fallback");
});
