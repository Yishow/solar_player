import type {
  DisplayStoryPageId,
  DisplayStoryPagePayload,
  DisplayStoryPayload,
  DisplayStoryPayloadByPageId,
  DisplayCircuitSlotKey,
  FactoryCircuitKpiKey,
  FactoryCircuitStoryPayload,
  MonitoringMetricBinding,
  MonitoringStoryState,
  OverviewStoryPayload,
  SolarComparisonTarget
} from "@solar-display/shared";
import {
  formatMonitoringValue,
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

type DisplayStorySourceContext = {
  circuits: CircuitRow[];
  flowState: ReturnType<typeof resolveSolarFlowState>;
  generatedAt: string;
  isConnected: boolean;
  snapshot: ReturnType<typeof readLiveMetricsSnapshot>;
};

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
  value: number | null;
  warningMin: number | null;
}) {
  if (args.value === null || args.value <= 0) {
    return {
      alertTone: "warning" as const,
      fallbackReason: "missing-live-power" as const,
      freshnessState: "fallback" as const
    };
  }

  if (args.warningMin !== null && args.value >= args.warningMin) {
    return {
      alertTone: "danger" as const,
      fallbackReason: "warning-threshold-exceeded" as const,
      freshnessState: "fresh" as const
    };
  }

  if (args.attentionMin !== null && args.value >= args.attentionMin) {
    return {
      alertTone: "warning" as const,
      fallbackReason: "attention-threshold-exceeded" as const,
      freshnessState: "fresh" as const
    };
  }

  return {
    alertTone: "normal" as const,
    fallbackReason: null,
    freshnessState: "fresh" as const
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

function resolveFactoryMetricBinding(args: {
  dependencyKeys: string[];
  isConnected: boolean;
  label: string;
  metricKey: string;
  now?: string;
  reading: ReturnType<typeof readLiveMetricsSnapshot>["metrics"][string] | null;
  unit: string;
}) {
  return resolveMonitoringMetricBinding({
    binding: {
      dependencyKeys: args.dependencyKeys,
      fallbackIndex: 0,
      fallbackValue: "--",
      label: args.label,
      metricKey: args.metricKey,
      unit: args.unit
    },
    isConnected: args.isConnected,
    now: args.now,
    reading: args.reading
  });
}

function buildFactoryFallbackKpi(args: {
  bindingState: MonitoringStoryState["bindingState"];
  dependencyKeys: string[];
  fallbackReason: MonitoringStoryState["fallbackReason"];
  fallbackStrategy: "derive-from-dependencies" | "placeholder";
  freshnessState: MonitoringStoryState["freshnessState"];
  helper: string;
  label: string;
  metricKey: FactoryCircuitKpiKey;
  sourceClass: "derived-metric" | "mqtt-live" | "slot-aggregate";
  unit: string;
  value?: string;
}) {
  return {
    alertTone: "warning" as const,
    bindingState: args.bindingState,
    dependencyKeys: args.dependencyKeys,
    fallbackReason: args.fallbackReason,
    fallbackStrategy: args.fallbackStrategy,
    freshnessState: args.freshnessState,
    helper: args.helper,
    label: args.label,
    metricKey: args.metricKey,
    provenance: "fallback" as const,
    sourceClass: args.sourceClass,
    unit: args.unit,
    value: args.value ?? "--"
  };
}

function buildFactoryResolvedKpi(args: {
  dependencyKeys: string[];
  fallbackStrategy: "derive-from-dependencies" | "placeholder";
  helper: string;
  label: string;
  metricKey: FactoryCircuitKpiKey;
  provenance: "aggregate" | "derived" | "live";
  sourceClass: "derived-metric" | "mqtt-live" | "slot-aggregate";
  unit: string;
  value: number | string;
}) {
  return {
    alertTone: "normal" as const,
    bindingState: "bound" as const,
    dependencyKeys: args.dependencyKeys,
    fallbackReason: null,
    fallbackStrategy: args.fallbackStrategy,
    freshnessState: "fresh" as const,
    helper: args.helper,
    label: args.label,
    metricKey: args.metricKey,
    provenance: args.provenance,
    sourceClass: args.sourceClass,
    unit: args.unit,
    value: typeof args.value === "number" ? formatMonitoringValue(args.value, args.unit) : args.value
  };
}

function resolveFactoryDegradedHelper(slot: FactoryCircuitStoryPayload["slots"][number] | undefined) {
  if (!slot) {
    return "等待完整迴路聚合";
  }

  if (slot.bindingState !== "bound") {
    return `缺少 ${slot.label} 迴路綁定`;
  }

  if (slot.fallbackReason === "stale-data") {
    return `${slot.label} 即時功率已延遲`;
  }

  if (slot.fallbackReason === "socket-disconnected") {
    return "Socket 未連線，等待迴路資料恢復";
  }

  return `${slot.label} 尚未回報即時功率`;
}

function resolveFactoryCircuitKpis(args: {
  isConnected: boolean;
  slots: FactoryCircuitStoryPayload["slots"];
  snapshot: ReturnType<typeof readLiveMetricsSnapshot>;
  summary: FactoryCircuitStoryPayload["summary"];
}) {
  const aggregateDependencyKeys = [...slotOrder];
  const aggregateFailure = args.slots.find(
    (slot) =>
      slot.bindingState !== "bound" ||
      slot.freshnessState !== "fresh" ||
      slot.livePowerKw === null
  );
  const totalPowerValue = aggregateFailure
    ? null
    : args.slots.reduce((sum, slot) => sum + (slot.livePowerKw ?? 0), 0);
  const aggregateHelper = resolveFactoryDegradedHelper(aggregateFailure);

  const totalPower = totalPowerValue === null
    ? buildFactoryFallbackKpi({
        bindingState: aggregateFailure?.bindingState ?? args.summary.bindingState,
        dependencyKeys: aggregateDependencyKeys,
        fallbackReason: aggregateFailure?.fallbackReason ?? args.summary.fallbackReason,
        fallbackStrategy: "placeholder",
        freshnessState: aggregateFailure?.freshnessState ?? args.summary.freshnessState,
        helper: aggregateHelper,
        label: "目前廠區總用電",
        metricKey: "totalPower",
        sourceClass: "slot-aggregate",
        unit: "kW"
      })
    : buildFactoryResolvedKpi({
        dependencyKeys: aggregateDependencyKeys,
        fallbackStrategy: "placeholder",
        helper: `${args.slots.length} 個迴路來源`,
        label: "目前廠區總用電",
        metricKey: "totalPower",
        provenance: "aggregate",
        sourceClass: "slot-aggregate",
        unit: "kW",
        value: totalPowerValue
      });

  const solarPower = resolveFactoryMetricBinding({
    dependencyKeys: ["realTimePower"],
    isConnected: args.isConnected,
    label: "太陽能供應占比",
    metricKey: "realTimePower",
    now: args.snapshot.timestamp ?? undefined,
    reading: args.snapshot.metrics.realTimePower ?? null,
    unit: "kW"
  });
  const solarShare = totalPowerValue === null
    ? buildFactoryFallbackKpi({
        bindingState: totalPower.bindingState,
        dependencyKeys: ["realTimePower", ...aggregateDependencyKeys],
        fallbackReason: totalPower.fallbackReason,
        fallbackStrategy: "derive-from-dependencies",
        freshnessState: totalPower.freshnessState,
        helper: aggregateHelper,
        label: "太陽能供應占比",
        metricKey: "solarShare",
        sourceClass: "derived-metric",
        unit: "%"
      })
    : solarPower.bindingState !== "bound" || solarPower.freshnessState !== "fresh"
      ? buildFactoryFallbackKpi({
          bindingState: solarPower.bindingState,
          dependencyKeys: ["realTimePower", ...aggregateDependencyKeys],
          fallbackReason: solarPower.fallbackReason,
          fallbackStrategy: "derive-from-dependencies",
          freshnessState: solarPower.freshnessState,
          helper: solarPower.helper,
          label: "太陽能供應占比",
          metricKey: "solarShare",
          sourceClass: "derived-metric",
          unit: "%"
        })
      : buildFactoryResolvedKpi({
          dependencyKeys: ["realTimePower", ...aggregateDependencyKeys],
          fallbackStrategy: "derive-from-dependencies",
          helper: "Solar Supply Share",
          label: "太陽能供應占比",
          metricKey: "solarShare",
          provenance: "derived",
          sourceClass: "derived-metric",
          unit: "%",
          value: (args.snapshot.metrics.realTimePower!.value / totalPowerValue) * 100
        });

  const selfConsumption = resolveFactoryMetricBinding({
    dependencyKeys: ["selfConsumptionEnergy"],
    isConnected: args.isConnected,
    label: "今日自發自用電量",
    metricKey: "selfConsumptionEnergy",
    now: args.snapshot.timestamp ?? undefined,
    reading: args.snapshot.metrics.selfConsumptionEnergy ?? null,
    unit: "kWh"
  });
  const selfConsumptionKpi = selfConsumption.bindingState !== "bound" || selfConsumption.freshnessState !== "fresh"
    ? buildFactoryFallbackKpi({
        bindingState: selfConsumption.bindingState,
        dependencyKeys: ["selfConsumptionEnergy"],
        fallbackReason: selfConsumption.fallbackReason,
        fallbackStrategy: "placeholder",
        freshnessState: selfConsumption.freshnessState,
        helper: selfConsumption.helper,
        label: "今日自發自用電量",
        metricKey: "selfConsumption",
        sourceClass: "mqtt-live",
        unit: "kWh"
      })
    : buildFactoryResolvedKpi({
        dependencyKeys: ["selfConsumptionEnergy"],
        fallbackStrategy: "placeholder",
        helper: selfConsumption.helper,
        label: "今日自發自用電量",
        metricKey: "selfConsumption",
        provenance: "live",
        sourceClass: "mqtt-live",
        unit: selfConsumption.unit,
        value: selfConsumption.value
      });

  const peak = totalPowerValue === null
    ? buildFactoryFallbackKpi({
        bindingState: totalPower.bindingState,
        dependencyKeys: aggregateDependencyKeys,
        fallbackReason: totalPower.fallbackReason,
        fallbackStrategy: "derive-from-dependencies",
        freshnessState: totalPower.freshnessState,
        helper: aggregateHelper,
        label: "尖峰負載",
        metricKey: "peak",
        sourceClass: "derived-metric",
        unit: "kW"
      })
    : buildFactoryResolvedKpi({
        dependencyKeys: aggregateDependencyKeys,
        fallbackStrategy: "derive-from-dependencies",
        helper: "依目前總負載推估",
        label: "尖峰負載",
        metricKey: "peak",
        provenance: "derived",
        sourceClass: "derived-metric",
        unit: "kW",
        value: totalPowerValue * 1.45
      });

  const flow = totalPowerValue === null
    ? buildFactoryFallbackKpi({
        bindingState: totalPower.bindingState,
        dependencyKeys: aggregateDependencyKeys,
        fallbackReason: totalPower.fallbackReason,
        fallbackStrategy: "placeholder",
        freshnessState: totalPower.freshnessState,
        helper: aggregateHelper,
        label: "目前綠電流向",
        metricKey: "flow",
        sourceClass: "derived-metric",
        unit: "Fallback",
        value: "待命"
      })
    : buildFactoryResolvedKpi({
        dependencyKeys: aggregateDependencyKeys,
        fallbackStrategy: "placeholder",
        helper: "Green Energy Routing",
        label: "目前綠電流向",
        metricKey: "flow",
        provenance: "derived",
        sourceClass: "derived-metric",
        unit: "Normal",
        value: "供應中"
      });

  return [totalPower, solarShare, selfConsumptionKpi, peak, flow];
}

function createDisplayStorySourceContext(): DisplayStorySourceContext {
  const snapshot = readLiveMetricsSnapshot();
  const isConnected = snapshot.timestamp !== null;
  const power = snapshot.metrics.realTimePower?.value ?? null;
  const efficiency = snapshot.metrics.systemEfficiency?.value ?? null;

  return {
    circuits: readCircuits().filter((circuit) => toBoolean(circuit.enabled)),
    flowState: resolveSolarFlowState({
      efficiencyPercent: isConnected ? efficiency : null,
      isConnected,
      powerKw: isConnected ? power : null
    }),
    generatedAt: new Date().toISOString(),
    isConnected,
    snapshot
  };
}

export function readOverviewDisplayStory(
  context: DisplayStorySourceContext = createDisplayStorySourceContext()
): OverviewStoryPayload {
  const overview = overviewMetrics.map((binding) =>
    resolveMonitoringMetricBinding({
      binding,
      isConnected: context.isConnected,
      now: context.snapshot.timestamp ?? undefined,
      reading: context.snapshot.metrics[binding.metricKey] ?? null
    })
  );

  return {
    metrics: overview,
    summary: resolveMonitoringSummaryState(overview)
  };
}

export function readSolarDisplayStory(
  context: DisplayStorySourceContext = createDisplayStorySourceContext()
): DisplayStoryPayload["solar"] {
  return {
    kpis: solarKpis.map((binding) => {
      const resolved = resolveSolarKpiBinding({
        binding,
        isConnected: context.isConnected,
        now: context.snapshot.timestamp ?? undefined,
        snapshot: context.snapshot
      });
      return {
        ...resolved,
        comparison: resolveSolarComparison({
          actualUnit: resolved.unit,
          actualValue: context.isConnected
            ? context.snapshot.metrics[binding.metricKey]?.value ?? null
            : null,
          target: solarTargets[binding.metricKey]
        })
      };
    }),
    story: {
      flowState: context.flowState
    }
  };
}

export function readFactoryCircuitDisplayStory(
  context: DisplayStorySourceContext = createDisplayStorySourceContext()
): FactoryCircuitStoryPayload {
  const slotStates: MonitoringStoryState[] = [];

  const factorySlots = slotOrder.map((slotKey) => {
    const matches = context.circuits.filter((circuit) => circuit.display_slot === slotKey);
    const binding = resolveMonitoringSlotBinding({
      circuitId: matches.length === 1 ? matches[0]!.id : null,
      conflictingCircuitIds: matches.map((circuit) => circuit.id),
      slotKey
    });
    const circuit = matches.length === 1 ? matches[0]! : null;
    const metricKey = slotMetricMap[slotKey];
    const reading = metricKey ? context.snapshot.metrics[metricKey] ?? null : null;
    const state =
      binding.bindingState !== "bound"
        ? ({
            alertTone: binding.alertTone as MonitoringStoryState["alertTone"],
            bindingState: binding.bindingState as MonitoringStoryState["bindingState"],
            fallbackReason: binding.fallbackReason as MonitoringStoryState["fallbackReason"],
            freshnessState: binding.freshnessState as MonitoringStoryState["freshnessState"]
          } satisfies MonitoringStoryState)
        : (() => {
            const readingState = resolveFactoryMetricBinding({
              dependencyKeys: [metricKey],
              isConnected: context.isConnected,
              label: circuit?.name_zh ?? circuit?.name_en ?? slotKey,
              metricKey,
              now: context.snapshot.timestamp ?? undefined,
              reading,
              unit: "kW"
            });

            if (readingState.bindingState !== "bound" || readingState.freshnessState !== "fresh") {
              return {
                alertTone: readingState.alertTone,
                bindingState: "bound",
                fallbackReason: readingState.fallbackReason,
                freshnessState: readingState.freshnessState
              } satisfies MonitoringStoryState;
            }

            const circuitState = resolveCircuitState({
              attentionMin: circuit?.attention_min ?? null,
              value: reading?.value ?? null,
              warningMin: circuit?.warning_min ?? null
            });
            return {
              alertTone: circuitState.alertTone,
              bindingState: "bound",
              fallbackReason: circuitState.fallbackReason,
              freshnessState: circuitState.freshnessState
            } satisfies MonitoringStoryState;
          })();

    slotStates.push(state);

    return {
      ...state,
      circuitId: circuit?.id ?? null,
      label: circuit?.name_zh ?? circuit?.name_en ?? slotKey,
      livePowerKw:
        state.bindingState === "bound" &&
        state.freshnessState === "fresh" &&
        state.fallbackReason !== "missing-live-power"
          ? reading?.value ?? null
          : null,
      slotKey
    };
  });
  const factorySummary = resolveMonitoringSummaryState(slotStates);

  return {
    kpis: resolveFactoryCircuitKpis({
      isConnected: context.isConnected,
      slots: factorySlots,
      snapshot: context.snapshot,
      summary: factorySummary
    }),
    slots: factorySlots,
    summary: factorySummary
  };
}

export function readDisplayStoryPages(
  context: DisplayStorySourceContext = createDisplayStorySourceContext()
): DisplayStoryPayloadByPageId {
  return {
    "factory-circuit": readFactoryCircuitDisplayStory(context),
    overview: readOverviewDisplayStory(context),
    solar: readSolarDisplayStory(context)
  };
}

export function readDisplayStoryPage<PageId extends DisplayStoryPageId>(
  pageId: PageId,
  context: DisplayStorySourceContext = createDisplayStorySourceContext()
): DisplayStoryPagePayload<PageId> {
  const pages = readDisplayStoryPages(context);

  return {
    generatedAt: context.generatedAt,
    pageId,
    payload: pages[pageId]
  };
}

export function readDisplayStory(): DisplayStoryPayload {
  const context = createDisplayStorySourceContext();
  const pages = readDisplayStoryPages(context);

  return {
    factoryCircuit: pages["factory-circuit"],
    generatedAt: context.generatedAt,
    overview: pages.overview,
    solar: pages.solar
  };
}
