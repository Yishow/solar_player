import type {
  DisplayCircuitSlotKey,
  MonitoringMetricBinding,
  MonitoringStoryState,
  SolarComparisonTarget
} from "@solar-display/shared";
import {
  resolveMonitoringMetricBinding,
  resolveMonitoringSlotBinding,
  resolveMonitoringSummaryState,
  resolveSolarComparison,
  resolveSolarFlowState
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readLiveMetricsSnapshot } from "../metrics/liveMetrics.js";

type StoryMetricKey =
  | "realTimePower"
  | "todayGeneration"
  | "totalGeneration"
  | "todayCo2Reduction"
  | "totalCo2Reduction"
  | "selfConsumptionRatio"
  | "systemEfficiency";

type CircuitRow = {
  attention_min: number | null;
  display_slot: string | null;
  enabled: number;
  id: number;
  mqtt_topic: string | null;
  name_en: string | null;
  name_zh: string | null;
  warning_min: number | null;
};

type OverviewMetricDefinition = MonitoringMetricBinding<StoryMetricKey> & {
  fallbackValue: string;
};

const overviewMetrics: OverviewMetricDefinition[] = [
  {
    dependencyKeys: ["realTimePower"],
    fallbackIndex: 0,
    fallbackValue: "--",
    label: "即時發電功率",
    metricKey: "realTimePower",
    sourceClass: "mqtt-live",
    unit: "kW"
  },
  {
    dependencyKeys: ["todayGeneration"],
    fallbackIndex: 1,
    fallbackValue: "--",
    label: "今日發電量",
    metricKey: "todayGeneration",
    sourceClass: "mqtt-live",
    unit: "kWh"
  },
  {
    dependencyKeys: ["totalGeneration"],
    fallbackIndex: 2,
    fallbackValue: "--",
    label: "累積發電量",
    metricKey: "totalGeneration",
    sourceClass: "cumulative-counter",
    unit: "GWh"
  },
  {
    dependencyKeys: ["todayCo2Reduction"],
    fallbackIndex: 3,
    fallbackValue: "--",
    label: "今日 CO₂ 減量",
    metricKey: "todayCo2Reduction",
    sourceClass: "mqtt-live",
    unit: "t"
  },
  {
    dependencyKeys: ["totalCo2Reduction"],
    fallbackIndex: 4,
    fallbackValue: "--",
    label: "累積 CO₂ 減量",
    metricKey: "totalCo2Reduction",
    sourceClass: "cumulative-counter",
    unit: "t"
  }
];

const solarKpis: Array<MonitoringMetricBinding<StoryMetricKey>> = [
  {
    dependencyKeys: ["todayGeneration"],
    fallbackIndex: 1,
    label: "今日發電量",
    metricKey: "todayGeneration",
    sourceClass: "mqtt-live",
    unit: "kWh"
  },
  {
    dependencyKeys: ["selfConsumptionRatio", "selfConsumptionEnergy", "consumptionEnergy"],
    fallbackHelper: "缺少自發自用比例所需輸入",
    fallbackIndex: 2,
    fallbackStrategy: "derive-from-dependencies",
    label: "自發自用比例",
    metricKey: "selfConsumptionRatio",
    sourceClass: "derived-metric",
    unit: "%"
  },
  {
    dependencyKeys: ["todayCo2Reduction"],
    fallbackIndex: 3,
    label: "今日減碳量",
    metricKey: "todayCo2Reduction",
    sourceClass: "mqtt-live",
    unit: "t"
  },
  {
    dependencyKeys: ["totalCo2Reduction"],
    fallbackIndex: 3,
    label: "累積減碳量",
    metricKey: "totalCo2Reduction",
    sourceClass: "cumulative-counter",
    unit: "t"
  },
  {
    dependencyKeys: ["systemEfficiency"],
    fallbackIndex: 4,
    label: "系統效率",
    metricKey: "systemEfficiency",
    sourceClass: "mqtt-live",
    unit: "%"
  }
];

const solarTargets: Partial<Record<StoryMetricKey, SolarComparisonTarget>> = {
  selfConsumptionRatio: { label: "營運目標", unit: "%", value: 70 },
  systemEfficiency: { label: "效率目標", unit: "%", value: 95 },
  todayCo2Reduction: { label: "今日目標", unit: "t", value: 55 },
  todayGeneration: { label: "今日目標", unit: "kWh", value: 2400 }
};

const slotMetricMap: Record<DisplayCircuitSlotKey, string> = {
  ev: "factoryEvGreenPower",
  hvac: "factoryHvacPower",
  infrastructure: "factoryInfrastructurePower",
  lighting: "factoryLightingPower",
  office: "factoryOfficePower",
  production: "factoryProductionPower"
};

const slotOrder: DisplayCircuitSlotKey[] = [
  "production",
  "hvac",
  "lighting",
  "office",
  "ev",
  "infrastructure"
];

function toBoolean(value: unknown) {
  return value === true || value === 1;
}

function readCircuits() {
  return getDatabase()
    .prepare(
      `
        SELECT
          id,
          name_zh,
          name_en,
          mqtt_topic,
          display_slot,
          attention_min,
          warning_min,
          enabled
        FROM circuit_configs
        ORDER BY display_order ASC, id ASC
      `
    )
    .all() as CircuitRow[];
}

function resolveCircuitState(args: {
  attentionMin: number | null;
  hasReading: boolean;
  value: number | null;
  warningMin: number | null;
}) {
  if (!args.hasReading || args.value === null || args.value <= 0) {
    return {
      alertTone: "warning" as const,
      fallbackReason: "missing-live-power" as const
    };
  }

  if (args.warningMin !== null && args.value >= args.warningMin) {
    return {
      alertTone: "danger" as const,
      fallbackReason: "warning-threshold-exceeded" as const
    };
  }

  if (args.attentionMin !== null && args.value >= args.attentionMin) {
    return {
      alertTone: "warning" as const,
      fallbackReason: "attention-threshold-exceeded" as const
    };
  }

  return {
    alertTone: "normal" as const,
    fallbackReason: null
  };
}

function resolveSolarKpiBinding(args: {
  binding: MonitoringMetricBinding<StoryMetricKey>;
  isConnected: boolean;
  now?: string;
  snapshot: ReturnType<typeof readLiveMetricsSnapshot>;
}) {
  if (args.binding.metricKey !== "selfConsumptionRatio") {
    return resolveMonitoringMetricBinding({
      binding: args.binding,
      isConnected: args.isConnected,
      now: args.now,
      reading: args.snapshot.metrics[args.binding.metricKey] ?? null
    });
  }

  const directReading = args.snapshot.metrics.selfConsumptionRatio ?? null;
  if (directReading) {
    return resolveMonitoringMetricBinding({
      binding: args.binding,
      isConnected: args.isConnected,
      now: args.now,
      reading: directReading
    });
  }

  const selfConsumptionReading = args.snapshot.metrics.selfConsumptionEnergy ?? null;
  const consumptionReading = args.snapshot.metrics.consumptionEnergy ?? null;
  if (
    args.isConnected &&
    selfConsumptionReading &&
    consumptionReading &&
    consumptionReading.value > 0
  ) {
    const observedAt =
      selfConsumptionReading.timestamp > consumptionReading.timestamp
        ? selfConsumptionReading.timestamp
        : consumptionReading.timestamp;
    const resolved = resolveMonitoringMetricBinding({
      binding: args.binding,
      isConnected: true,
      now: args.now,
      reading: {
        quality: selfConsumptionReading.quality ?? consumptionReading.quality,
        timestamp: observedAt,
        unit: "%",
        value: (selfConsumptionReading.value / consumptionReading.value) * 100
      }
    });

    return {
      ...resolved,
      helper: "由自發自用量與總用電推導",
      provenance: "derived" as const
    };
  }

  return resolveMonitoringMetricBinding({
    binding: args.binding,
    isConnected: args.isConnected,
    now: args.now,
    reading: null
  });
}

export function readDisplayStory() {
  const snapshot = readLiveMetricsSnapshot();
  const isConnected = snapshot.timestamp !== null;
  const overview = overviewMetrics.map((binding) =>
    resolveMonitoringMetricBinding({
      binding,
      isConnected,
      now: snapshot.timestamp ?? undefined,
      reading: snapshot.metrics[binding.metricKey] ?? null
    })
  );
  const power = snapshot.metrics.realTimePower?.value ?? null;
  const efficiency = snapshot.metrics.systemEfficiency?.value ?? null;
  const flowState = resolveSolarFlowState({
    efficiencyPercent: isConnected ? efficiency : null,
    isConnected,
    powerKw: isConnected ? power : null
  });
  const circuits = readCircuits().filter((circuit) => toBoolean(circuit.enabled));
  const slotStates: MonitoringStoryState[] = [];

  const factorySlots = slotOrder.map((slotKey) => {
    const matches = circuits.filter((circuit) => circuit.display_slot === slotKey);
    const binding = resolveMonitoringSlotBinding({
      circuitId: matches.length === 1 ? matches[0]!.id : null,
      conflictingCircuitIds: matches.map((circuit) => circuit.id),
      slotKey
    });
    const circuit = matches.length === 1 ? matches[0]! : null;
    const metricKey = slotMetricMap[slotKey];
    const reading = metricKey ? snapshot.metrics[metricKey] ?? null : null;
    const circuitState = resolveCircuitState({
      attentionMin: circuit?.attention_min ?? null,
      hasReading: isConnected,
      value: reading?.value ?? null,
      warningMin: circuit?.warning_min ?? null
    });
    const state =
      binding.bindingState !== "bound"
        ? ({
            alertTone: binding.alertTone as MonitoringStoryState["alertTone"],
            bindingState: binding.bindingState as MonitoringStoryState["bindingState"],
            fallbackReason: binding.fallbackReason as MonitoringStoryState["fallbackReason"],
            freshnessState: binding.freshnessState as MonitoringStoryState["freshnessState"]
          } satisfies MonitoringStoryState)
        : ({
            alertTone: circuitState.alertTone,
            bindingState: "bound",
            fallbackReason: circuitState.fallbackReason,
            freshnessState: "fresh"
          } satisfies MonitoringStoryState);

    slotStates.push(state);

    return {
      ...state,
      circuitId: circuit?.id ?? null,
      label: circuit?.name_zh ?? circuit?.name_en ?? slotKey,
      livePowerKw: reading?.value ?? null,
      slotKey
    };
  });

  return {
    factoryCircuit: {
      slots: factorySlots,
      summary: resolveMonitoringSummaryState(slotStates)
    },
    generatedAt: new Date().toISOString(),
    overview: {
      metrics: overview,
      summary: resolveMonitoringSummaryState(overview)
    },
    solar: {
      kpis: solarKpis.map((binding) => {
        const resolved = resolveSolarKpiBinding({
          binding,
          isConnected,
          now: snapshot.timestamp ?? undefined,
          snapshot
        });
        return {
          ...resolved,
          comparison: resolveSolarComparison({
            actualUnit: resolved.unit,
            actualValue: isConnected ? snapshot.metrics[binding.metricKey]?.value ?? null : null,
            target: solarTargets[binding.metricKey]
          })
        };
      }),
      story: {
        flowState
      }
    }
  };
}
