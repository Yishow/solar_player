import type {
  DisplayStoryPageId,
  DisplayStoryPagePayload,
  DisplayStoryPayload,
  DisplayStoryPayloadByPageId,
  DisplayCircuitSlotKey,
  FactoryCircuitPageKey,
  FactoryCircuitKpiKey,
  FactoryCircuitStoryPayload,
  MonitoringMetricBinding,
  MonitoringMetricSourceTopic,
  MonitoringStoryState,
  OverviewStoryPayload,
  ResolvedMonitoringMetricBinding,
  SolarComparisonTarget
} from "@solar-display/shared";
import {
  formatMonitoringValue,
  resolveFactoryCircuitSlotKeys,
  resolveFactoryCircuitSlotMetricKey,
  resolveMonitoringMetricBinding,
  resolveMonitoringSlotBinding,
  resolveMonitoringSummaryState,
  resolveSolarComparison,
  resolveSolarFlowState
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readCalculationSettings, type CalculationSettings } from "./calculationSettingsService.js";
import { readDisplayReadinessReport } from "./displayReadinessService.js";
import { readPlaybackSettings } from "./displayRotationService.js";
import {
  type HourlyGenerationTrendRow,
  selectHourlyGenerationTrendProfile
} from "./generationTrendSeries.js";
import { readLiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import {
  formatDisplayOverrideValue,
  readActiveDisplayValueOverrides
} from "./displayValueOverrideService.js";

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
  page_key: string;
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

const slotDefaultLabels: Record<DisplayCircuitSlotKey, { en: string; zh: string }> = {
  stamping: { en: "Stamping Shop", zh: "沖壓工程" },
  body: { en: "Body Shop", zh: "車身工程" },
  painting: { en: "Painting Shop", zh: "塗裝工程" },
  assembly: { en: "Assembly Shop", zh: "裝配工程" },
  utility: { en: "Utility & Powerhouse", zh: "原動力" },
  office: { en: "Office & Administration", zh: "事務系" },
  heavy_vehicle: { en: "Heavy Vehicle Line", zh: "大車工程" },
  ed_coating: { en: "ED Coating Line", zh: "ED電著" }
};

type TopicDisplayName = {
  nameEn: string | null;
  nameZh: string | null;
  topic: string | null;
};

type DisplayStorySourceContext = {
  allowStaleRuntimeData: boolean;
  calculationSettings: CalculationSettings;
  circuits: CircuitRow[];
  flowState: ReturnType<typeof resolveSolarFlowState>;
  generatedAt: string;
  isConnected: boolean;
  snapshot: ReturnType<typeof readLiveMetricsSnapshot>;
  topicNames: Map<string, TopicDisplayName>;
};

type DisplayStoryReadOptions = {
  applyDisplayOverrides?: boolean;
};

function toBoolean(value: unknown) {
  return value === true || value === 1;
}

function roundTo(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function normalizeGenerationKwh(value: number, unit: string | null) {
  switch (unit?.trim().toLowerCase()) {
    case "gwh":
      return value * 1_000_000;
    case "mwh":
      return value * 1_000;
    case "wh":
      return value / 1_000;
    default:
      return value;
  }
}

function readCumulativeCounter(metricKey: string) {
  return getDatabase()
    .prepare(
      `
        SELECT total_value, last_updated
        FROM cumulative_counters
        WHERE metric_key = ?
      `
    )
    .get(metricKey) as { last_updated: string | null; total_value: number | null } | undefined;
}

function buildDerivedCarbonReductionReading(
  generationReading: ReturnType<typeof readLiveMetricsSnapshot>["metrics"][string] | null,
  carbonEmissionFactor: number
) {
  if (!generationReading || !Number.isFinite(generationReading.value)) {
    return null;
  }

  return {
    quality: generationReading.quality,
    timestamp: generationReading.timestamp,
    unit: "t",
    value: roundTo(
      normalizeGenerationKwh(generationReading.value, generationReading.unit) * carbonEmissionFactor / 1000,
      6
    )
  };
}

function buildCumulativeGenerationReading(
  snapshot: ReturnType<typeof readLiveMetricsSnapshot>
) {
  const cumulativeGeneration = readCumulativeCounter("generation");

  if (
    typeof cumulativeGeneration?.total_value === "number"
    && cumulativeGeneration.last_updated
  ) {
    return {
      quality: null,
      timestamp: cumulativeGeneration.last_updated,
      unit: "kWh",
      value: cumulativeGeneration.total_value
    };
  }

  return snapshot.metrics.totalGeneration ?? null;
}

function resolveStoryMetricReading(
  metricKey: StoryMetricKey,
  context: DisplayStorySourceContext
) {
  if (metricKey === "todayCo2Reduction") {
    return buildDerivedCarbonReductionReading(
      context.snapshot.metrics.todayGeneration ?? null,
      context.calculationSettings.carbonEmissionFactor
    );
  }

  if (metricKey === "totalCo2Reduction") {
    return buildDerivedCarbonReductionReading(
      buildCumulativeGenerationReading(context.snapshot),
      context.calculationSettings.carbonEmissionFactor
    );
  }

  return context.snapshot.metrics[metricKey] ?? null;
}

/**
 * 讀取 topic_mappings 的自訂中英文名稱,以 metric_key 為鍵,
 * 供 playback story label 解析使用。空字串視同未設定(null)。
 */
function readTopicDisplayNames(): Map<string, TopicDisplayName> {
  const rows = getDatabase()
    .prepare("SELECT metric_key, name_zh, name_en, topic FROM topic_mappings")
    .all() as Array<{
      metric_key: string;
      name_en: string | null;
      name_zh: string | null;
      topic: string | null;
    }>;

  return new Map(
    rows.map((row) => [
      row.metric_key,
      {
        nameEn: row.name_en?.trim() || null,
        nameZh: row.name_zh?.trim() || null,
        topic: row.topic?.trim() || null
      }
    ])
  );
}

/**
 * 以 topic 自訂名稱(中文優先,其次英文)覆寫預設 label;皆未設定時回傳預設。
 */
function resolveTopicLabel(
  topicNames: Map<string, TopicDisplayName>,
  metricKey: string,
  defaultLabel: string
) {
  const custom = topicNames.get(metricKey);
  return custom?.nameZh ?? custom?.nameEn ?? defaultLabel;
}

function resolveTopicDisplayLabels(args: {
  topicNames: Map<string, TopicDisplayName>;
  metricKey: string;
  defaultZh: string;
  defaultEn: string;
}) {
  const custom = args.topicNames.get(args.metricKey);

  return {
    labelEn: custom?.nameEn ?? args.defaultEn,
    labelZh: custom?.nameZh ?? args.defaultZh
  };
}

function resolveSourceTopics(args: {
  dependencyKeys?: string[];
  metricKey: string;
  topicNames: Map<string, TopicDisplayName>;
}): MonitoringMetricSourceTopic[] | undefined {
  const keys = args.dependencyKeys?.length ? args.dependencyKeys : [args.metricKey];
  const sourceTopics = keys.flatMap((metricKey) => {
    const topic = args.topicNames.get(metricKey)?.topic;
    return topic ? [{ metricKey, topic }] : [];
  });

  return sourceTopics.length > 0 ? sourceTopics : undefined;
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
          page_key,
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
  calculationSettings: CalculationSettings;
  isConnected: boolean;
  now?: string;
  snapshot: ReturnType<typeof readLiveMetricsSnapshot>;
}) {
  if (args.binding.metricKey !== "selfConsumptionRatio") {
    return resolveMonitoringMetricBinding({
      binding: args.binding,
      displayValueOptions: {
        preferKilogramsForSubTonCo2:
          args.calculationSettings.co2AutoConvertSmallToKg &&
          (args.binding.metricKey === "todayCo2Reduction" ||
            args.binding.metricKey === "totalCo2Reduction")
      },
      isConnected: args.isConnected,
      now: args.now,
      reading:
        args.binding.metricKey === "todayCo2Reduction"
          ? buildDerivedCarbonReductionReading(
            args.snapshot.metrics.todayGeneration ?? null,
            args.calculationSettings.carbonEmissionFactor
          )
          : args.binding.metricKey === "totalCo2Reduction"
            ? buildDerivedCarbonReductionReading(
              buildCumulativeGenerationReading(args.snapshot),
              args.calculationSettings.carbonEmissionFactor
            )
            : args.snapshot.metrics[args.binding.metricKey] ?? null
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
  allowStaleRuntimeData?: boolean;
  dependencyKeys: string[];
  isConnected: boolean;
  label: string;
  metricKey: string;
  now?: string;
  reading: ReturnType<typeof readLiveMetricsSnapshot>["metrics"][string] | null;
  unit: string;
}) {
  const resolved = resolveMonitoringMetricBinding({
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

  if (args.allowStaleRuntimeData && resolved.bindingState === "bound" && resolved.freshnessState === "stale") {
    return {
      ...resolved,
      fallbackStrategy: "retain-last-reading" as const,
      helper: "顯示最近一次有效讀值"
    };
  }

  return resolved;
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
  sourceTopics?: MonitoringMetricSourceTopic[];
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
    sourceTopics: args.sourceTopics,
    unit: args.unit,
    value: args.value ?? "--"
  };
}

function buildFactoryResolvedKpi(args: {
  alertTone?: MonitoringStoryState["alertTone"];
  dependencyKeys: string[];
  fallbackReason?: MonitoringStoryState["fallbackReason"];
  fallbackStrategy: "derive-from-dependencies" | "placeholder";
  freshnessState?: MonitoringStoryState["freshnessState"];
  helper: string;
  label: string;
  metricKey: FactoryCircuitKpiKey;
  provenance: "aggregate" | "derived" | "live";
  sourceClass: "derived-metric" | "mqtt-live" | "slot-aggregate";
  sourceTopics?: MonitoringMetricSourceTopic[];
  unit: string;
  value: number | string;
}) {
  return {
    alertTone: args.alertTone ?? "normal" as const,
    bindingState: "bound" as const,
    dependencyKeys: args.dependencyKeys,
    fallbackReason: args.fallbackReason ?? null,
    fallbackStrategy: args.fallbackStrategy,
    freshnessState: args.freshnessState ?? "fresh" as const,
    helper: args.helper,
    label: args.label,
    metricKey: args.metricKey,
    provenance: args.provenance,
    sourceClass: args.sourceClass,
    sourceTopics: args.sourceTopics,
    unit: args.unit,
    value: typeof args.value === "number" ? formatMonitoringValue(args.value, args.unit) : args.value
  };
}

function isUsableFactoryMetric(
  state: Pick<MonitoringStoryState, "bindingState" | "freshnessState">,
  allowStaleRuntimeData: boolean
) {
  return state.bindingState === "bound" && (
    state.freshnessState === "fresh" ||
    (allowStaleRuntimeData && state.freshnessState === "stale")
  );
}

function resolveRetainedReadingHelper(baseHelper: string) {
  return baseHelper === "顯示最近一次有效讀值" ? baseHelper : `顯示最近一次有效讀值｜${baseHelper}`;
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
  allowStaleRuntimeData: boolean;
  pageKey: FactoryCircuitPageKey;
  isConnected: boolean;
  slots: FactoryCircuitStoryPayload["slots"];
  snapshot: ReturnType<typeof readLiveMetricsSnapshot>;
  summary: FactoryCircuitStoryPayload["summary"];
  topicNames: Map<string, TopicDisplayName>;
}) {
  const aggregateDependencyKeys = args.slots.flatMap((slot) => slot.metricKey ? [slot.metricKey] : []);
  const aggregateFailure = args.slots.find(
    (slot) =>
      !isUsableFactoryMetric(slot, args.allowStaleRuntimeData) ||
      slot.livePowerKw === null
  );
  const totalPowerValue = aggregateFailure
    ? null
    : args.slots.reduce((sum, slot) => sum + (slot.livePowerKw ?? 0), 0);
  const aggregateHelper = resolveFactoryDegradedHelper(aggregateFailure);
  const aggregateFreshnessState = aggregateFailure?.freshnessState ??
    (args.slots.some((slot) => slot.freshnessState === "stale") ? "stale" : "fresh");
  const aggregateFallbackReason = aggregateFailure?.fallbackReason ??
    (aggregateFreshnessState === "stale" ? "stale-data" : null);
  const aggregateAlertTone = aggregateFreshnessState === "stale" ? "warning" : "normal";

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
        alertTone: aggregateAlertTone,
        dependencyKeys: aggregateDependencyKeys,
        fallbackReason: aggregateFallbackReason,
        fallbackStrategy: "placeholder",
        freshnessState: aggregateFreshnessState,
        helper:
          aggregateFreshnessState === "stale"
            ? resolveRetainedReadingHelper(`${args.slots.length} 個迴路來源`)
            : `${args.slots.length} 個迴路來源`,
        label: "目前廠區總用電",
        metricKey: "totalPower",
        provenance: "aggregate",
        sourceClass: "slot-aggregate",
        unit: "kW",
        value: totalPowerValue
      });

  const solarPower = resolveFactoryMetricBinding({
    allowStaleRuntimeData: args.allowStaleRuntimeData,
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
        sourceTopics: resolveSourceTopics({
          dependencyKeys: ["realTimePower"],
          metricKey: "solarShare",
          topicNames: args.topicNames
        }),
        unit: "%"
      })
    : !isUsableFactoryMetric(solarPower, args.allowStaleRuntimeData)
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
          sourceTopics: resolveSourceTopics({
            dependencyKeys: ["realTimePower"],
            metricKey: "solarShare",
            topicNames: args.topicNames
          }),
          unit: "%"
        })
      : buildFactoryResolvedKpi({
          alertTone:
            totalPower.freshnessState === "stale" || solarPower.freshnessState === "stale"
              ? "warning"
              : "normal",
          dependencyKeys: ["realTimePower", ...aggregateDependencyKeys],
          fallbackReason:
            totalPower.freshnessState === "stale" || solarPower.freshnessState === "stale"
              ? "stale-data"
              : null,
          fallbackStrategy: "derive-from-dependencies",
          freshnessState:
            totalPower.freshnessState === "stale" || solarPower.freshnessState === "stale"
              ? "stale"
              : "fresh",
          helper:
            totalPower.freshnessState === "stale" || solarPower.freshnessState === "stale"
              ? resolveRetainedReadingHelper("Solar Supply Share")
              : "Solar Supply Share",
          label: "太陽能供應占比",
          metricKey: "solarShare",
          provenance: "derived",
          sourceClass: "derived-metric",
          sourceTopics: resolveSourceTopics({
            dependencyKeys: ["realTimePower"],
            metricKey: "solarShare",
            topicNames: args.topicNames
          }),
          unit: "%",
          value: (args.snapshot.metrics.realTimePower!.value / totalPowerValue) * 100
        });

  const selfConsumption = resolveFactoryMetricBinding({
    allowStaleRuntimeData: args.allowStaleRuntimeData,
    dependencyKeys: ["selfConsumptionEnergy"],
    isConnected: args.isConnected,
    label: "今日自發自用電量",
    metricKey: "selfConsumptionEnergy",
    now: args.snapshot.timestamp ?? undefined,
    reading: args.snapshot.metrics.selfConsumptionEnergy ?? null,
    unit: "kWh"
  });
  const todayGenerationFallback = resolveFactoryMetricBinding({
    allowStaleRuntimeData: args.allowStaleRuntimeData,
    dependencyKeys: ["todayGeneration"],
    isConnected: args.isConnected,
    label: "今日自發自用電量",
    metricKey: "todayGeneration",
    now: args.snapshot.timestamp ?? undefined,
    reading: args.snapshot.metrics.todayGeneration ?? null,
    unit: args.snapshot.metrics.todayGeneration?.unit ?? "kWh"
  });
  const selfConsumptionKpi = !isUsableFactoryMetric(selfConsumption, args.allowStaleRuntimeData)
    ? isUsableFactoryMetric(todayGenerationFallback, args.allowStaleRuntimeData)
      ? buildFactoryResolvedKpi({
          alertTone: todayGenerationFallback.freshnessState === "stale" ? "warning" : "normal",
          dependencyKeys: ["selfConsumptionEnergy", "todayGeneration"],
          fallbackReason: todayGenerationFallback.freshnessState === "stale" ? "stale-data" : null,
          fallbackStrategy: "derive-from-dependencies",
          freshnessState: todayGenerationFallback.freshnessState,
          helper:
            todayGenerationFallback.freshnessState === "stale"
              ? resolveRetainedReadingHelper("以今日發電量替代自發自用量")
              : "以今日發電量替代自發自用量",
          label: "今日自發自用電量",
          metricKey: "selfConsumption",
          provenance: "derived",
          sourceClass: "derived-metric",
          sourceTopics: resolveSourceTopics({
            dependencyKeys: ["selfConsumptionEnergy", "todayGeneration"],
            metricKey: "selfConsumption",
            topicNames: args.topicNames
          }),
          unit: todayGenerationFallback.unit,
          value: todayGenerationFallback.value
        })
      : buildFactoryFallbackKpi({
          bindingState: selfConsumption.bindingState,
          dependencyKeys: ["selfConsumptionEnergy", "todayGeneration"],
          fallbackReason: selfConsumption.fallbackReason,
          fallbackStrategy: "derive-from-dependencies",
          freshnessState: selfConsumption.freshnessState,
          helper: selfConsumption.helper,
          label: "今日自發自用電量",
          metricKey: "selfConsumption",
          sourceClass: "derived-metric",
          sourceTopics: resolveSourceTopics({
            dependencyKeys: ["selfConsumptionEnergy", "todayGeneration"],
            metricKey: "selfConsumption",
            topicNames: args.topicNames
          }),
          unit: "kWh"
        })
    : buildFactoryResolvedKpi({
        alertTone: selfConsumption.freshnessState === "stale" ? "warning" : "normal",
        dependencyKeys: ["selfConsumptionEnergy"],
        fallbackReason: selfConsumption.freshnessState === "stale" ? "stale-data" : null,
        fallbackStrategy: "placeholder",
        freshnessState: selfConsumption.freshnessState,
        helper:
          selfConsumption.freshnessState === "stale"
            ? resolveRetainedReadingHelper(selfConsumption.helper)
            : selfConsumption.helper,
        label: "今日自發自用電量",
        metricKey: "selfConsumption",
        provenance: "live",
        sourceClass: "mqtt-live",
        sourceTopics: resolveSourceTopics({
          dependencyKeys: ["selfConsumptionEnergy"],
          metricKey: "selfConsumption",
          topicNames: args.topicNames
        }),
        unit: selfConsumption.unit,
        value: selfConsumption.value
      });

  const peakMultiplier = resolveFactoryMetricBinding({
    allowStaleRuntimeData: args.allowStaleRuntimeData,
    dependencyKeys: ["factoryPeakMultiplier"],
    isConnected: args.isConnected,
    label: "尖峰倍率",
    metricKey: "factoryPeakMultiplier",
    now: args.snapshot.timestamp ?? undefined,
    reading: args.snapshot.metrics.factoryPeakMultiplier ?? null,
    unit: "x"
  });
  const peakDependencyKeys = ["factoryPeakMultiplier", ...aggregateDependencyKeys];
  const peakMultiplierValue = Number.parseFloat(peakMultiplier.value);
  const peakMultiplierAvailable =
    isUsableFactoryMetric(peakMultiplier, args.allowStaleRuntimeData) &&
    Number.isFinite(peakMultiplierValue) &&
    peakMultiplierValue > 0;

  const peak = totalPowerValue === null
    ? buildFactoryFallbackKpi({
        bindingState: totalPower.bindingState,
        dependencyKeys: peakDependencyKeys,
        fallbackReason: totalPower.fallbackReason,
        fallbackStrategy: "derive-from-dependencies",
        freshnessState: totalPower.freshnessState,
        helper: aggregateHelper,
        label: "尖峰負載",
        metricKey: "peak",
        sourceClass: "derived-metric",
        sourceTopics: resolveSourceTopics({
          dependencyKeys: ["factoryPeakMultiplier"],
          metricKey: "peak",
          topicNames: args.topicNames
        }),
        unit: "kW"
      })
    : !peakMultiplierAvailable
      ? buildFactoryFallbackKpi({
          bindingState: peakMultiplier.bindingState,
          dependencyKeys: peakDependencyKeys,
          fallbackReason: peakMultiplier.fallbackReason ?? "metric-unavailable",
          fallbackStrategy: "derive-from-dependencies",
          freshnessState: peakMultiplier.freshnessState,
          helper: peakMultiplier.helper,
          label: "尖峰負載",
          metricKey: "peak",
          sourceClass: "derived-metric",
          sourceTopics: resolveSourceTopics({
            dependencyKeys: ["factoryPeakMultiplier"],
            metricKey: "peak",
            topicNames: args.topicNames
          }),
          unit: "kW"
        })
    : buildFactoryResolvedKpi({
        alertTone:
          totalPower.freshnessState === "stale" || peakMultiplier.freshnessState === "stale"
            ? "warning"
            : "normal",
        dependencyKeys: peakDependencyKeys,
        fallbackReason:
          totalPower.freshnessState === "stale" || peakMultiplier.freshnessState === "stale"
            ? "stale-data"
            : null,
        fallbackStrategy: "derive-from-dependencies",
        freshnessState:
          totalPower.freshnessState === "stale" || peakMultiplier.freshnessState === "stale"
            ? "stale"
            : "fresh",
        helper:
          totalPower.freshnessState === "stale" || peakMultiplier.freshnessState === "stale"
            ? resolveRetainedReadingHelper(`依目前總負載與倍率 ${peakMultiplierValue} 推估`)
            : `依目前總負載與倍率 ${peakMultiplierValue} 推估`,
        label: "尖峰負載",
        metricKey: "peak",
        provenance: "derived",
        sourceClass: "derived-metric",
        sourceTopics: resolveSourceTopics({
          dependencyKeys: ["factoryPeakMultiplier"],
          metricKey: "peak",
          topicNames: args.topicNames
        }),
        unit: "kW",
        value: totalPowerValue * peakMultiplierValue
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
        alertTone: totalPower.freshnessState === "stale" ? "warning" : "normal",
        dependencyKeys: aggregateDependencyKeys,
        fallbackReason: totalPower.freshnessState === "stale" ? "stale-data" : null,
        fallbackStrategy: "placeholder",
        freshnessState: totalPower.freshnessState,
        helper:
          totalPower.freshnessState === "stale"
            ? resolveRetainedReadingHelper("Green Energy Routing")
            : "Green Energy Routing",
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
  const playbackSettings = readPlaybackSettings();

  return {
    allowStaleRuntimeData: !playbackSettings.enforceFreshRuntimeData,
    calculationSettings: readCalculationSettings(),
    circuits: readCircuits().filter((circuit) => toBoolean(circuit.enabled)),
    flowState: resolveSolarFlowState({
      efficiencyPercent: isConnected ? efficiency : null,
      isConnected,
      powerKw: isConnected ? power : null
    }),
    generatedAt: new Date().toISOString(),
    isConnected,
    snapshot,
    topicNames: readTopicDisplayNames()
  };
}

function readOverviewGenerationTrendSeries() {
  const database = getDatabase();
  // Pull a bounded recent window (≈ a day-plus at the 60s snapshot cadence) and
  // let the hourly bucketing collapse it to one point per hour. Using a row limit
  // instead of a wall-clock cutoff keeps the reader deterministic and avoids
  // dropping points at day boundaries.
  const rows = database
    .prepare(
      `
        SELECT generation, generation_power, captured_at
        FROM metric_snapshots
        WHERE generation IS NOT NULL OR generation_power IS NOT NULL
        ORDER BY captured_at DESC
        LIMIT 2000
      `
    )
    .all() as HourlyGenerationTrendRow[];

  return selectHourlyGenerationTrendProfile(rows, { now: new Date() });
}

function applyMonitoringDisplayOverrides<
  TMetric extends string,
  TMetricRow extends ResolvedMonitoringMetricBinding<TMetric>
>(
  pageId: DisplayStoryPageId,
  metrics: TMetricRow[],
  options: DisplayStoryReadOptions = {}
) {
  if (options.applyDisplayOverrides === false) {
    return metrics;
  }

  const overrides = readActiveDisplayValueOverrides();

  return metrics.map((metric) => {
    const override = overrides.get(`${pageId}.${metric.metricKey}`);
    if (!override) {
      return metric;
    }

    return {
      ...metric,
      value: formatDisplayOverrideValue(override.displayValue, override.unit ?? metric.unit)
    };
  });
}

export function readOverviewDisplayStory(
  context: DisplayStorySourceContext = createDisplayStorySourceContext(),
  options: DisplayStoryReadOptions = {}
): OverviewStoryPayload {
  const trendProfile = readOverviewGenerationTrendSeries();
  const overview = overviewMetrics.map((binding) => {
    const reading = resolveStoryMetricReading(binding.metricKey, context);
    const resolved = {
      ...resolveMonitoringMetricBinding({
        binding,
        displayValueOptions: {
          preferKilogramsForSubTonCo2:
            context.calculationSettings.co2AutoConvertSmallToKg &&
            (binding.metricKey === "todayCo2Reduction" ||
              binding.metricKey === "totalCo2Reduction")
        },
        isConnected: context.isConnected,
        now: context.snapshot.timestamp ?? undefined,
        reading
      }),
      label: resolveTopicLabel(context.topicNames, binding.metricKey, binding.label),
      sourceTopics: resolveSourceTopics({
        dependencyKeys: binding.dependencyKeys,
        metricKey: binding.metricKey,
        topicNames: context.topicNames
      })
    };

    if (binding.metricKey === "realTimePower" && trendProfile.series.length > 0) {
      return {
        ...resolved,
        trendHours: trendProfile.hours,
        trendSeries: trendProfile.series,
        trendUnit: trendProfile.unit
      };
    }

    return resolved;
  });

  const metrics = applyMonitoringDisplayOverrides("overview", overview, options);

  return {
    metrics,
    readinessFindings: readDisplayReadinessReport().findings.filter(
      (finding) => finding.pageId === "overview" && finding.status !== "ready"
    ),
    summary: resolveMonitoringSummaryState(metrics)
  };
}

export function readSolarDisplayStory(
  context: DisplayStorySourceContext = createDisplayStorySourceContext(),
  options: DisplayStoryReadOptions = {}
): DisplayStoryPayload["solar"] {
  return {
    kpis: applyMonitoringDisplayOverrides("solar", solarKpis.map((binding) => {
      const resolved = resolveSolarKpiBinding({
        binding,
        calculationSettings: context.calculationSettings,
        isConnected: context.isConnected,
        now: context.snapshot.timestamp ?? undefined,
        snapshot: context.snapshot
      });
      const comparisonActualValue =
        binding.metricKey === "todayCo2Reduction"
          ? buildDerivedCarbonReductionReading(
            context.snapshot.metrics.todayGeneration ?? null,
            context.calculationSettings.carbonEmissionFactor
          )?.value ?? null
          : binding.metricKey === "totalCo2Reduction"
            ? buildDerivedCarbonReductionReading(
              buildCumulativeGenerationReading(context.snapshot),
              context.calculationSettings.carbonEmissionFactor
            )?.value ?? null
            : context.isConnected
              ? context.snapshot.metrics[binding.metricKey]?.value ?? null
              : null;
      return {
        ...resolved,
        label: resolveTopicLabel(context.topicNames, binding.metricKey, binding.label),
        sourceTopics: resolveSourceTopics({
          dependencyKeys: resolved.dependencyKeys,
          metricKey: binding.metricKey,
          topicNames: context.topicNames
        }),
        comparison: resolveSolarComparison({
          actualUnit: resolved.unit,
          actualValue: comparisonActualValue,
          target: solarTargets[binding.metricKey]
        })
      };
    }), options),
    story: {
      flowState: context.flowState
    }
  };
}

export function readFactoryCircuitDisplayStory(): FactoryCircuitStoryPayload;
export function readFactoryCircuitDisplayStory(
  pageKey: FactoryCircuitPageKey,
  context?: DisplayStorySourceContext,
  options?: DisplayStoryReadOptions
): FactoryCircuitStoryPayload;
export function readFactoryCircuitDisplayStory(
  context: DisplayStorySourceContext,
  options?: DisplayStoryReadOptions
): FactoryCircuitStoryPayload;
export function readFactoryCircuitDisplayStory(
  pageKeyOrContext: FactoryCircuitPageKey | DisplayStorySourceContext = "factory-circuit",
  contextOrOptions?: DisplayStorySourceContext | DisplayStoryReadOptions,
  maybeOptions: DisplayStoryReadOptions = {}
): FactoryCircuitStoryPayload {
  const pageKey = typeof pageKeyOrContext === "string" ? pageKeyOrContext : "factory-circuit";
  const context =
    typeof pageKeyOrContext === "string"
      ? (contextOrOptions && "snapshot" in contextOrOptions
        ? contextOrOptions
        : createDisplayStorySourceContext())
      : pageKeyOrContext;
  const options =
    typeof pageKeyOrContext === "string"
      ? maybeOptions
      : (contextOrOptions as DisplayStoryReadOptions | undefined) ?? {};
  const slotStates: MonitoringStoryState[] = [];
  const scopedSlotKeys = resolveFactoryCircuitSlotKeys(pageKey);
  const scopedCircuits = context.circuits.filter((circuit) => circuit.page_key === pageKey);

  const factorySlots = scopedSlotKeys.map((slotKey) => {
    const matches = scopedCircuits.filter((circuit) => circuit.display_slot === slotKey);
    const binding = resolveMonitoringSlotBinding({
      circuitId: matches.length === 1 ? matches[0]!.id : null,
      conflictingCircuitIds: matches.map((circuit) => circuit.id),
      slotKey
    });
    const circuit = matches.length === 1 ? matches[0]! : null;
    const metricKey = resolveFactoryCircuitSlotMetricKey(pageKey, slotKey);
    const reading = metricKey ? context.snapshot.metrics[metricKey] ?? null : null;
    const slotDefaults = slotDefaultLabels[slotKey];
    const slotLabels = resolveTopicDisplayLabels({
      topicNames: context.topicNames,
      metricKey,
      defaultEn: circuit?.name_en ?? slotDefaults.en,
      defaultZh: circuit?.name_zh ?? slotDefaults.zh
    });
    // Name priority: topic custom name → circuit config name → slot key default.
    const slotLabel = slotLabels.labelZh || slotLabels.labelEn;
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
              allowStaleRuntimeData: context.allowStaleRuntimeData,
              dependencyKeys: [metricKey],
              isConnected: context.isConnected,
              label: slotLabel,
              metricKey,
              now: context.snapshot.timestamp ?? undefined,
              reading,
              unit: "kW"
            });

            if (!isUsableFactoryMetric(readingState, context.allowStaleRuntimeData)) {
              return {
                alertTone: readingState.alertTone,
                bindingState: "bound",
                fallbackReason: readingState.fallbackReason,
                freshnessState: readingState.freshnessState
              } satisfies MonitoringStoryState;
            }

            if (readingState.freshnessState === "stale") {
              return {
                alertTone: readingState.alertTone,
                bindingState: "bound",
                fallbackReason: readingState.fallbackReason,
                freshnessState: "stale"
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
      label: slotLabel,
      labelEn: slotLabels.labelEn,
      labelZh: slotLabels.labelZh,
      livePowerKw:
        isUsableFactoryMetric(state, context.allowStaleRuntimeData) &&
        state.fallbackReason !== "missing-live-power"
          ? reading?.value ?? null
          : null,
      metricKey,
      slotKey
    };
  });
  const factorySummary = resolveMonitoringSummaryState(slotStates);

  return {
    kpis: applyMonitoringDisplayOverrides(pageKey, resolveFactoryCircuitKpis({
      allowStaleRuntimeData: context.allowStaleRuntimeData,
      pageKey,
      isConnected: context.isConnected,
      slots: factorySlots,
      snapshot: context.snapshot,
      summary: factorySummary,
      topicNames: context.topicNames
    }), options),
    slots: factorySlots,
    summary: factorySummary
  };
}

export function readDisplayStoryPages(
  context: DisplayStorySourceContext = createDisplayStorySourceContext(),
  options: DisplayStoryReadOptions = {}
): DisplayStoryPayloadByPageId {
  return {
    "factory-circuit": readFactoryCircuitDisplayStory("factory-circuit", context, options),
    "factory-circuit-guanyin": readFactoryCircuitDisplayStory("factory-circuit-guanyin", context, options),
    overview: readOverviewDisplayStory(context, options),
    solar: readSolarDisplayStory(context, options)
  };
}

export function readDisplayStoryPage<PageId extends DisplayStoryPageId>(
  pageId: PageId,
  context: DisplayStorySourceContext = createDisplayStorySourceContext(),
  options: DisplayStoryReadOptions = {}
): DisplayStoryPagePayload<PageId> {
  const pages = readDisplayStoryPages(context, options);

  return {
    generatedAt: context.generatedAt,
    pageId,
    payload: pages[pageId]
  };
}

export function readDisplayStory(options: DisplayStoryReadOptions = {}): DisplayStoryPayload {
  const context = createDisplayStorySourceContext();
  const pages = readDisplayStoryPages(context, options);

  return {
    factoryCircuit: pages["factory-circuit"],
    generatedAt: context.generatedAt,
    overview: pages.overview,
    solar: pages.solar
  };
}
