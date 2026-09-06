import type {
  CircuitConfig,
  DisplayCircuitSlotKey,
  FactoryCircuitKpiKey,
  FactoryCircuitStoryPayload
} from "@solar-display/shared";
import {
  resolveFreshnessPresentation,
  resolveMonitoringSlotBinding
} from "@solar-display/shared";
import type { LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";
import { buildMonitoringSourceTooltip } from "../shared/monitoringSourceTooltip";

export type FactoryCircuitLoadState = "loading" | "ready" | "error";
export type FactoryCircuitRuntime = CircuitConfig & {
  livePowerKw: number | null;
};

export type FactoryCircuitIconKey =
  | "bolt"
  | "bars"
  | "leaf"
  | "production-line"
  | "hvac"
  | "lighting"
  | "office"
  | "ev"
  | "infrastructure"
  | "solar"
  | "inverter"
  | "pie"
  | "switchboard"
  | "sun";

type CircuitSlotDefinition = {
  defaultEn: string;
  defaultZh: string;
  iconKey: FactoryCircuitIconKey;
  key: DisplayCircuitSlotKey;
  sharePercent: number;
};

type BuildFactoryCircuitViewModelArgs = {
  circuits: FactoryCircuitRuntime[];
  connectionState: SocketConnectionState["status"];
  energyShares?: Record<string, number | null>;
  factoryCircuitStory?: FactoryCircuitStoryPayload;
  loadState: FactoryCircuitLoadState;
  snapshot: LiveMetricsSnapshot;
};

const slotDefinitions: CircuitSlotDefinition[] = [
  { defaultEn: "Stamping Shop", defaultZh: "沖壓工程", iconKey: "production-line", key: "stamping", sharePercent: 25 },
  { defaultEn: "Body Shop", defaultZh: "車身工程", iconKey: "hvac", key: "body", sharePercent: 20 },
  { defaultEn: "Painting Shop", defaultZh: "塗裝工程", iconKey: "lighting", key: "painting", sharePercent: 15 },
  { defaultEn: "Assembly Shop", defaultZh: "裝配工程", iconKey: "office", key: "assembly", sharePercent: 15 },
  { defaultEn: "Utility & Powerhouse", defaultZh: "原動力", iconKey: "ev", key: "utility", sharePercent: 10 },
  { defaultEn: "Office & Administration", defaultZh: "事務系", iconKey: "infrastructure", key: "office", sharePercent: 5 },
  { defaultEn: "Heavy Vehicle Line", defaultZh: "大車工程", iconKey: "production-line", key: "heavy_vehicle", sharePercent: 5 },
  { defaultEn: "ED Coating Line", defaultZh: "ED電著", iconKey: "infrastructure", key: "ed_coating", sharePercent: 5 }
];

const kpiIcons: Record<FactoryCircuitKpiKey, FactoryCircuitIconKey> = {
  flow: "leaf",
  peak: "bars",
  selfConsumption: "sun",
  solarShare: "pie",
  totalPower: "bolt"
};

function formatNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString("zh-TW", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits
  });
}

function resolveSlotOrder(slot: string | null | undefined) {
  return slotDefinitions.findIndex((definition) => definition.key === slot) + 1 || Number.MAX_SAFE_INTEGER;
}

function resolveStatus(circuit: FactoryCircuitRuntime) {
  if (circuit.livePowerKw === null || circuit.livePowerKw <= 0) {
    return {
      alertReason: "missing-live-power" as const,
      label: "待資料",
      progressClass: "bg-neutral-300",
      textClass: "text-neutral-500",
      tone: "neutral" as const
    };
  }

  if (circuit.livePowerKw >= (circuit.warningMin ?? Number.POSITIVE_INFINITY)) {
    return {
      alertReason: "warning-threshold-exceeded" as const,
      label: "警告",
      progressClass: "bg-[#c96745]",
      textClass: "text-[#9f4324]",
      tone: "danger" as const
    };
  }

  if (circuit.livePowerKw >= (circuit.attentionMin ?? Number.POSITIVE_INFINITY)) {
    return {
      alertReason: "attention-threshold-exceeded" as const,
      label: "注意",
      progressClass: "bg-[#d6a73f]",
      textClass: "text-[#9b7121]",
      tone: "warning" as const
    };
  }

  return {
    alertReason: null,
    label: "正常",
    progressClass: "bg-[#5f8c50]",
    textClass: "text-[#557a43]",
    tone: "success" as const
  };
}

function readMetricValue(snapshot: LiveMetricsSnapshot, key: string) {
  return snapshot.metrics[key]?.value ?? null;
}

function readMetricReading(snapshot: LiveMetricsSnapshot, key: string) {
  return snapshot.metrics[key] ?? null;
}

function resolveMetricDay(timestamp: string | null | undefined) {
  return typeof timestamp === "string" && timestamp.length >= 10 ? timestamp.slice(0, 10) : null;
}

function isReadingOnReferenceDay(reading: { timestamp?: string | null } | null, referenceTimestamp: string | null) {
  const referenceDay = resolveMetricDay(referenceTimestamp);
  const readingDay = resolveMetricDay(reading?.timestamp);

  return referenceDay === null || readingDay === null || readingDay === referenceDay;
}

function formatFlexibleNumber(value: number) {
  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: 2
  });
}

function resolveStoryEmptyStatus(args: {
  bindingState: string;
  fallbackReason: string | null;
  freshnessState: string;
}) {
  if (args.bindingState === "conflict") {
    return "衝突";
  }

  if (args.bindingState === "missing") {
    return "未綁定";
  }

  if (args.freshnessState === "stale") {
    return "資料延遲";
  }

  if (args.fallbackReason === "socket-disconnected") {
    return "待同步";
  }

  return "待資料";
}

function resolveSummaryStatusLabel(summary: FactoryCircuitStoryPayload["summary"]) {
  if (summary.bindingState === "bound" && summary.freshnessState === "fresh") {
    return "迴路資料已同步";
  }

  if (summary.fallbackReason === "stale-data" || summary.freshnessState === "stale") {
    return "迴路資料延遲，顯示最近一次有效狀態";
  }

  if (summary.bindingState === "conflict") {
    return "迴路配置衝突，請檢查 slot 指派";
  }

  if (summary.fallbackReason === "missing-slot-binding") {
    return "迴路配置未完成，部分卡片顯示降級資訊";
  }

  if (summary.fallbackReason === "missing-live-power") {
    return "部分迴路尚未回報即時功率";
  }

  if (summary.fallbackReason === "socket-disconnected") {
    return "Socket 未連線，顯示迴路降級資訊";
  }

  return summary.fallbackReason ? `迴路資料異常：${summary.fallbackReason}` : "迴路資料待確認";
}

function buildFallbackKpi(args: {
  dependencyKeys: string[];
  fallbackReason: string | null;
  fallbackStrategy: "derive-from-dependencies" | "placeholder";
  helper: string;
  label: string;
  metricKey: FactoryCircuitKpiKey;
  sourceClass: string;
  unit: string;
  value?: string;
}) {
  return {
    alertTone: "warning" as const,
    bindingState: "missing" as const,
    dependencyKeys: args.dependencyKeys,
    fallbackReason: args.fallbackReason,
    fallbackStrategy: args.fallbackStrategy,
    freshnessState: "fallback" as const,
    helper: args.helper,
    iconKey: kpiIcons[args.metricKey],
    label: args.label,
    metricKey: args.metricKey,
    provenance: "fallback" as const,
    sourceClass: args.sourceClass,
    unit: args.unit,
    value: args.value ?? "--"
  };
}

function withFactoryCircuitKpiSourceTooltip<T extends {
  dependencyKeys: string[];
  label: string;
  metricKey: string;
  sourceClass: string;
  sourceTopics?: Array<{ metricKey: string; topic: string }>;
  unit: string;
  freshness?: FactoryCircuitStoryPayload["kpis"][number]["freshness"];
}>(kpi: T) {
  return {
    ...kpi,
    freshnessView: kpi.freshness
      ? {
          ...resolveFreshnessPresentation(kpi.freshness.state),
          sourceTimestamp: kpi.freshness.sourceTimestamp
        }
      : null,
    sourceTooltip: buildMonitoringSourceTooltip({
      dependencyKeys: kpi.dependencyKeys,
      label: kpi.label,
      metricKey: kpi.metricKey,
      sourceTopics: kpi.sourceTopics,
      sourceClass: kpi.sourceClass,
      unit: kpi.unit
    })
  };
}

function buildFactoryCircuitStoryKpis(story: FactoryCircuitStoryPayload) {
  const kpiOrder: FactoryCircuitKpiKey[] = [
    "totalPower",
    "solarShare",
    "selfConsumption",
    "peak",
    "flow"
  ];
  const storyKpiByKey = new Map(
    story.kpis.map((kpi) => [kpi.itemId ?? kpi.metricKey, kpi])
  );

  return kpiOrder.map((key) => {
    const storyKpi = storyKpiByKey.get(key);
    if (storyKpi) {
      return {
        ...storyKpi,
        iconKey: kpiIcons[key]
      };
    }

    return buildFallbackKpi({
      dependencyKeys: [],
      fallbackReason: "metric-unavailable",
      fallbackStrategy: key === "peak" || key === "solarShare" ? "derive-from-dependencies" : "placeholder",
      helper: "共享故事尚未提供 KPI",
      label: key,
      metricKey: key,
      sourceClass: key === "totalPower" ? "slot-aggregate" : key === "selfConsumption" ? "mqtt-live" : "derived-metric",
      unit: key === "flow" ? "Fallback" : key === "solarShare" ? "%" : key === "selfConsumption" ? "kWh" : "kW",
      value: key === "flow" ? "待命" : "--"
    });
  }).map(withFactoryCircuitKpiSourceTooltip);
}

function buildFlowFallbackLabel(args: {
  connectionState: SocketConnectionState["status"];
  loadState: FactoryCircuitLoadState;
}) {
  if (args.loadState === "error") {
    return "Circuit API Fallback";
  }

  if (args.connectionState !== "connected") {
    return "Socket Fallback";
  }

  return "等待完整迴路聚合";
}

export function buildFactoryCircuitRuntimes(circuits: CircuitConfig[]): FactoryCircuitRuntime[] {
  return circuits
    .filter((circuit) => circuit.enabled)
    .map((circuit) => ({
      ...circuit,
      livePowerKw: null
    }))
    .sort((left, right) => resolveSlotOrder(left.displaySlot) - resolveSlotOrder(right.displaySlot));
}

export const DEPARTMENT_SLOT_ALIASES: Record<string, string> = {
  a: "stamping",
  assembly: "assembly",
  b: "body",
  body: "body",
  c: "painting",
  ed_coating: "ed_coating",
  heavy_vehicle: "heavy_vehicle",
  office: "office",
  painting: "painting",
  stamping: "stamping",
  utility: "utility"
};

export function mapDepartmentShareToSlot(departmentId: string) {
  return DEPARTMENT_SLOT_ALIASES[departmentId] ?? departmentId;
}

function resolveEnergySharePercent(
  slotKey: string,
  fallbackSharePercent: number,
  energyShares: Record<string, number | null> | undefined
): number | null {
  if (!energyShares) {
    return fallbackSharePercent;
  }
  if (!(slotKey in energyShares)) {
    return null;
  }
  return energyShares[slotKey] ?? null;
}

export function buildFactoryCircuitViewModel({
  circuits,
  connectionState,
  energyShares,
  loadState,
  snapshot,
  factoryCircuitStory
}: BuildFactoryCircuitViewModelArgs) {
  const shouldUseStory =
    factoryCircuitStory !== undefined &&
    factoryCircuitStory.slots.length >= 2 &&
    factoryCircuitStory.kpis.length >= 5;

  if (shouldUseStory) {
    const storySlotByKey = new Map(
      factoryCircuitStory.slots.map((slot) => [slot.itemId ?? slot.slotKey, slot])
    );
    const toneMap: Record<string, { progressClass: string; textClass: string; tone: string; statusLabel: string }> = {
      normal: { progressClass: "bg-[#5f8c50]", textClass: "text-[#557a43]", tone: "success", statusLabel: "正常" },
      warning: { progressClass: "bg-[#d6a73f]", textClass: "text-[#9b7121]", tone: "warning", statusLabel: "注意" },
      danger: { progressClass: "bg-[#c96745]", textClass: "text-[#9f4324]", tone: "danger", statusLabel: "警告" }
    };
    const loadRows = slotDefinitions.map((slot) => {
      const storySlot = storySlotByKey.get(slot.key);
      const binding = resolveMonitoringSlotBinding({
        circuitId: storySlot?.circuitId ?? null,
        metricScope: storySlot?.metricScope ?? "global",
        slotKey: slot.key
      });
      const slotIsHealthy =
        storySlot !== undefined &&
        storySlot.bindingState === "bound" &&
        storySlot.livePowerKw !== null;

      if (!slotIsHealthy) {
        return {
          alertReason: storySlot?.fallbackReason ?? null,
          bindingState: storySlot?.bindingState ?? binding.bindingState,
          fallbackReason: storySlot?.fallbackReason ?? binding.fallbackReason,
          fallbackSharePercent: slot.sharePercent,
          iconKey: slot.iconKey,
          itemId: slot.key,
          isEmpty: true,
          labelEn: storySlot?.labelEn ?? slot.defaultEn,
          labelZh: storySlot?.labelZh ?? storySlot?.label ?? slot.defaultZh,
          livePowerKw: null,
          progressClass: "bg-neutral-300",
          sharePercent: resolveEnergySharePercent(slot.key, 0, energyShares),
          statusLabel: resolveStoryEmptyStatus({
            bindingState: storySlot?.bindingState ?? binding.bindingState,
            fallbackReason: storySlot?.fallbackReason ?? binding.fallbackReason,
            freshnessState: storySlot?.freshnessState ?? binding.freshnessState
          }),
          statusTone: "neutral" as const,
          textClass: "text-neutral-500",
          utilizationPercent: 0
        };
      }

      const tone = toneMap[storySlot.alertTone] ?? toneMap.normal!;
      const livePower = storySlot.livePowerKw ?? 0;
      return {
        alertReason: storySlot.fallbackReason,
        bindingState: binding.bindingState,
        fallbackReason: binding.fallbackReason,
        fallbackSharePercent: slot.sharePercent,
        iconKey: slot.iconKey,
        itemId: slot.key,
        isEmpty: false,
        labelEn: storySlot.labelEn ?? slot.defaultEn,
        labelZh: storySlot.labelZh ?? storySlot.label,
        livePowerKw: livePower,
        progressClass: tone.progressClass,
        sharePercent: resolveEnergySharePercent(slot.key, slot.sharePercent, energyShares),
        statusLabel: tone.statusLabel,
        statusTone: tone.tone as "success" | "warning" | "danger" | "neutral",
        textClass: tone.textClass,
        utilizationPercent: 0
      };
    });

    return {
      emptyState: null,
      flowNodes: [
        { iconKey: "solar", key: "solar" as const, label: "太陽能板", subtitle: "PV Modules" },
        { iconKey: "inverter", key: "inverter" as const, label: "逆變器", subtitle: "Inverter" },
        { iconKey: "switchboard", key: "board" as const, label: "配電盤", subtitle: "Switchboard" }
      ],
      hero: {
        copyEnLines: [
          "Solar energy is converted into clean power and",
          "distributed through the switchboard to support",
          "factory operations, driving green manufacturing",
          "every day."
        ],
        copyZhLines: [
          "太陽能發電轉換為潔淨電力，",
          "經由配電系統分配至廠區各項用電設備，",
          "驅動製造運作，落實綠色生產。"
        ],
        eyebrow: "綠能驅動・永續未來",
        subtitle: "Factory Energy Circuit",
        title: "廠區用電迴路"
      },
      kpis: buildFactoryCircuitStoryKpis(factoryCircuitStory),
      loadRows,
      summary: {
        statusLabel: resolveSummaryStatusLabel(factoryCircuitStory.summary)
      }
    };
  }

  const totalPowerDependencyKeys = slotDefinitions.map((slot) => slot.key);
  const selfConsumptionReading = readMetricReading(snapshot, "selfConsumptionEnergy");
  const todayGenerationReading = readMetricReading(snapshot, "todayGeneration");
  const selfConsumptionKwh = isReadingOnReferenceDay(selfConsumptionReading, snapshot.timestamp)
    ? selfConsumptionReading?.value ?? null
    : null;
  const todayGeneration = isReadingOnReferenceDay(todayGenerationReading, snapshot.timestamp)
    ? todayGenerationReading?.value ?? null
    : null;
  const hasCompleteRuntime = slotDefinitions.every((slot) => {
    const circuit = circuits.find((entry) => entry.displaySlot === slot.key);
    return circuit !== undefined && circuit.livePowerKw !== null;
  });
  const flowState = loadState === "error"
    ? "Fallback"
    : connectionState === "connected" && hasCompleteRuntime
      ? "供應中"
      : "待命";

  const loadRows = slotDefinitions.map((slot) => {
    const circuit = circuits.find((entry) => entry.displaySlot === slot.key) ?? null;
    const binding = resolveMonitoringSlotBinding({
      circuitId: circuit?.id ?? null,
      metricScope: "global",
      slotKey: slot.key
    });

    if (!circuit) {
      return {
        alertReason: null,
        bindingState: binding.bindingState,
        fallbackReason: binding.fallbackReason,
        fallbackSharePercent: slot.sharePercent,
        iconKey: slot.iconKey,
        itemId: slot.key,
        isEmpty: true,
        labelEn: slot.defaultEn,
        labelZh: slot.defaultZh,
        livePowerKw: null,
        progressClass: "bg-neutral-300",
        sharePercent: resolveEnergySharePercent(slot.key, 0, energyShares),
        statusLabel: loadState === "loading" ? "載入中" : loadState === "error" ? "未接入" : "待接入",
        statusTone: "neutral" as const,
        textClass: "text-neutral-500",
        utilizationPercent: 0
      };
    }

    const status = resolveStatus(circuit);
    if (circuit.livePowerKw === null) {
      return {
        alertReason: status.alertReason,
        bindingState: binding.bindingState,
        fallbackReason: "missing-live-power" as const,
        fallbackSharePercent: slot.sharePercent,
        iconKey: slot.iconKey,
        itemId: slot.key,
        isEmpty: true,
        labelEn: circuit.nameEn ?? slot.defaultEn,
        labelZh: circuit.nameZh ?? slot.defaultZh,
        livePowerKw: null,
        progressClass: status.progressClass,
        sharePercent: resolveEnergySharePercent(slot.key, 0, energyShares),
        statusLabel: loadState === "loading" ? "載入中" : status.label,
        statusTone: status.tone,
        textClass: status.textClass,
        utilizationPercent: 0
      };
    }

    return {
      alertReason: status.alertReason,
      bindingState: binding.bindingState,
      fallbackReason: binding.fallbackReason,
      fallbackSharePercent: slot.sharePercent,
      iconKey: slot.iconKey,
      itemId: slot.key,
      isEmpty: false,
      labelEn: circuit.nameEn ?? slot.defaultEn,
      labelZh: circuit.nameZh ?? slot.defaultZh,
      livePowerKw: circuit.livePowerKw,
      progressClass: status.progressClass,
      sharePercent: resolveEnergySharePercent(slot.key, slot.sharePercent, energyShares),
      statusLabel: status.label,
      statusTone: status.tone,
      textClass: status.textClass,
      utilizationPercent:
        circuit.ratedCapacity && circuit.ratedCapacity > 0
          ? Math.round(((circuit.livePowerKw ?? 0) / circuit.ratedCapacity) * 100)
          : 0
    };
  });

  return {
    emptyState: circuits.length > 0 || loadState === "loading"
      ? null
      : {
          description: "保留完整配電流程與負載面板，等待 circuits API 恢復或重新配置。",
          title: "目前沒有可播放的迴路資料"
        },
    flowNodes: [
      { iconKey: "solar", key: "solar" as const, label: "太陽能板", subtitle: "PV Modules" },
      { iconKey: "inverter", key: "inverter" as const, label: "逆變器", subtitle: "Inverter" },
      { iconKey: "switchboard", key: "board" as const, label: "配電盤", subtitle: "Switchboard" }
    ],
    hero: {
      copyEnLines: [
        "Solar energy is converted into clean power and",
        "distributed through the switchboard to support",
        "factory operations, driving green manufacturing",
        "every day."
      ],
      copyZhLines: [
        "太陽能發電轉換為潔淨電力，",
        "經由配電系統分配至廠區各項用電設備，",
        "驅動製造運作，落實綠色生產。"
      ],
      eyebrow: "綠能驅動・永續未來",
      subtitle: "Factory Energy Circuit",
      title: "廠區用電迴路"
    },
    kpis: [
      buildFallbackKpi({
        dependencyKeys: totalPowerDependencyKeys,
        fallbackReason: connectionState === "connected" ? "missing-live-power" : "socket-disconnected",
        fallbackStrategy: "placeholder",
        helper: "等待 Registry Story",
        label: "目前廠區總用電",
        metricKey: "totalPower",
        sourceClass: "slot-aggregate",
        unit: "kW"
      }),
      buildFallbackKpi({
        dependencyKeys: ["realTimePower", ...totalPowerDependencyKeys],
        fallbackReason: connectionState === "connected" ? "missing-live-power" : "socket-disconnected",
        fallbackStrategy: "derive-from-dependencies",
        helper: "等待 Registry Story",
        label: "太陽能供應占比",
        metricKey: "solarShare",
        sourceClass: "derived-metric",
        unit: "%"
      }),
      selfConsumptionKwh !== null
        ? {
            alertTone: "normal" as const,
            bindingState: "bound" as const,
            dependencyKeys: ["selfConsumptionEnergy"],
            fallbackReason: null,
            fallbackStrategy: "placeholder" as const,
            freshnessState: "fresh" as const,
            helper: "Today's Self-consumption",
            iconKey: "sun" as const,
            label: "今日自發自用電量",
            metricKey: "selfConsumption" as const,
            provenance: "live" as const,
            sourceClass: "mqtt-live" as const,
            unit: "kWh",
            value: formatNumber(selfConsumptionKwh)
          }
        : todayGeneration !== null
          ? {
              alertTone: "normal" as const,
              bindingState: "bound" as const,
              dependencyKeys: ["selfConsumptionEnergy", "todayGeneration"],
              fallbackReason: null,
              fallbackStrategy: "derive-from-dependencies" as const,
              freshnessState: "fresh" as const,
              helper: "以今日發電量替代自發自用量",
              iconKey: "sun" as const,
              label: "今日自發自用電量",
              metricKey: "selfConsumption" as const,
              provenance: "derived" as const,
              sourceClass: "derived-metric" as const,
              unit: todayGenerationReading?.unit ?? "MWh",
              value: formatFlexibleNumber(todayGeneration)
            }
        : buildFallbackKpi({
            dependencyKeys: ["selfConsumptionEnergy", "todayGeneration"],
            fallbackReason: connectionState === "connected" ? "metric-unavailable" : "socket-disconnected",
            fallbackStrategy: "placeholder",
            helper: "等待自發自用數據",
            label: "今日自發自用電量",
            metricKey: "selfConsumption",
            sourceClass: "mqtt-live",
            unit: "kWh"
          }),
      buildFallbackKpi({
        dependencyKeys: ["factoryPeakMultiplier", ...totalPowerDependencyKeys],
        fallbackReason: connectionState === "connected" ? "metric-unavailable" : "socket-disconnected",
        fallbackStrategy: "derive-from-dependencies",
        helper: "等待 Registry Story",
        label: "尖峰負載",
        metricKey: "peak",
        sourceClass: "derived-metric",
        unit: "kW"
      }),
      hasCompleteRuntime && connectionState === "connected"
        ? {
            alertTone: "normal" as const,
            bindingState: "bound" as const,
            dependencyKeys: totalPowerDependencyKeys,
            fallbackReason: null,
            fallbackStrategy: "placeholder" as const,
            freshnessState: "fresh" as const,
            helper: "Green Energy Routing",
            iconKey: "leaf" as const,
            label: "目前綠電流向",
            metricKey: "flow" as const,
            provenance: "derived" as const,
            sourceClass: "derived-metric" as const,
            unit: "Normal",
            value: flowState
          }
        : buildFallbackKpi({
            dependencyKeys: totalPowerDependencyKeys,
            fallbackReason: connectionState === "connected" ? "missing-live-power" : "socket-disconnected",
            fallbackStrategy: "placeholder",
            helper: buildFlowFallbackLabel({ connectionState, loadState }),
            label: "目前綠電流向",
            metricKey: "flow",
            sourceClass: "derived-metric",
            unit: "Fallback",
            value: "待命"
          })
    ].map(withFactoryCircuitKpiSourceTooltip),
    loadRows,
    summary: {
      statusLabel: loadState === "loading"
        ? "正在同步 circuits API，先保留版型骨架"
        : loadState === "error"
          ? "迴路資料未連線，顯示版型 fallback"
          : hasCompleteRuntime
            ? "迴路資料已同步"
            : connectionState === "connected"
              ? "部分迴路尚未回報即時功率"
              : "Socket 未連線，但頁面保留播放結構"
    }
  };
}
