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
  assert.equal(runtimes[0]?.livePowerKw, 576);
  assert.equal(runtimes[1]?.livePowerKw, 256);
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
  assert.equal(model.kpis[0]?.value, "1,230");
  assert.equal(model.kpis[0]?.iconKey, "bolt");
  assert.equal(model.kpis[1]?.value, "33");
  assert.equal(model.kpis[4]?.value, "供應中");
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
  assert.equal(model.kpis[0]?.value, "1,280");
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
  assert.equal(model.loadRows[1]?.statusLabel, "離線");
});
