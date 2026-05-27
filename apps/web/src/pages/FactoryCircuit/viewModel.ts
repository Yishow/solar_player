import type {
  CircuitConfig,
  DisplayCircuitSlotKey,
  FactoryCircuitKpiKey,
  FactoryCircuitStoryPayload
} from "@solar-display/shared";
import { resolveMonitoringSlotBinding } from "@solar-display/shared";
import type { LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";

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
  factoryCircuitStory?: FactoryCircuitStoryPayload;
  loadState: FactoryCircuitLoadState;
  snapshot: LiveMetricsSnapshot;
};

const slotDefinitions: CircuitSlotDefinition[] = [
  { defaultEn: "Production Line", defaultZh: "生產線用電", iconKey: "production-line", key: "production", sharePercent: 45 },
  { defaultEn: "HVAC & Environment", defaultZh: "空調與環境設備", iconKey: "hvac", key: "hvac", sharePercent: 20 },
  { defaultEn: "Lighting", defaultZh: "照明系統", iconKey: "lighting", key: "lighting", sharePercent: 10 },
  { defaultEn: "Office & Common Area", defaultZh: "辦公與公共區域", iconKey: "office", key: "office", sharePercent: 10 },
  { defaultEn: "EV / Green Facility", defaultZh: "充電設備 / 綠能設施", iconKey: "ev", key: "ev", sharePercent: 10 },
  { defaultEn: "Infrastructure", defaultZh: "其他基礎設施", iconKey: "infrastructure", key: "infrastructure", sharePercent: 5 }
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

function buildFactoryCircuitStoryKpis(story: FactoryCircuitStoryPayload) {
  const kpiOrder: FactoryCircuitKpiKey[] = [
    "totalPower",
    "solarShare",
    "selfConsumption",
    "peak",
    "flow"
  ];
  const storyKpiByKey = new Map(story.kpis.map((kpi) => [kpi.metricKey, kpi]));

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
  });
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

export function buildFactoryCircuitViewModel({
  circuits,
  connectionState,
  loadState,
  snapshot,
  factoryCircuitStory
}: BuildFactoryCircuitViewModelArgs) {
  const shouldUseStory =
    factoryCircuitStory !== undefined &&
    factoryCircuitStory.slots.length >= 2 &&
    factoryCircuitStory.kpis.length >= 5;

  if (shouldUseStory) {
    const storySlotByKey = new Map(factoryCircuitStory.slots.map((slot) => [slot.slotKey, slot]));
    const toneMap: Record<string, { progressClass: string; textClass: string; tone: string; statusLabel: string }> = {
      normal: { progressClass: "bg-[#5f8c50]", textClass: "text-[#557a43]", tone: "success", statusLabel: "正常" },
      warning: { progressClass: "bg-[#d6a73f]", textClass: "text-[#9b7121]", tone: "warning", statusLabel: "注意" },
      danger: { progressClass: "bg-[#c96745]", textClass: "text-[#9f4324]", tone: "danger", statusLabel: "警告" }
    };
    const totalPowerKpi = factoryCircuitStory.kpis.find((kpi) => kpi.metricKey === "totalPower");
    const aggregateAvailable =
      totalPowerKpi?.provenance !== "fallback" &&
      totalPowerKpi?.value !== "--" &&
      factoryCircuitStory.slots.every(
        (slot) =>
          slot.bindingState === "bound" &&
          slot.freshnessState === "fresh" &&
          slot.livePowerKw !== null
      );
    const totalPowerKw = aggregateAvailable
      ? factoryCircuitStory.slots.reduce((sum, slot) => sum + (slot.livePowerKw ?? 0), 0)
      : null;

    const loadRows = slotDefinitions.map((slot) => {
      const storySlot = storySlotByKey.get(slot.key);
      const binding = resolveMonitoringSlotBinding({
        circuitId: storySlot?.circuitId ?? null,
        slotKey: slot.key
      });
      const slotIsHealthy =
        storySlot !== undefined &&
        storySlot.bindingState === "bound" &&
        storySlot.freshnessState === "fresh" &&
        storySlot.livePowerKw !== null;

      if (!slotIsHealthy) {
        return {
          alertReason: storySlot?.fallbackReason ?? null,
          bindingState: storySlot?.bindingState ?? binding.bindingState,
          fallbackReason: storySlot?.fallbackReason ?? binding.fallbackReason,
          fallbackSharePercent: slot.sharePercent,
          iconKey: slot.iconKey,
          isEmpty: true,
          labelEn: slot.defaultEn,
          labelZh: storySlot?.label ?? slot.defaultZh,
          livePowerKw: null,
          progressClass: "bg-neutral-300",
          sharePercent: 0,
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
        isEmpty: false,
        labelEn: slot.defaultEn,
        labelZh: storySlot.label,
        livePowerKw: livePower,
        progressClass: tone.progressClass,
        sharePercent: totalPowerKw && totalPowerKw > 0 ? Math.round((livePower / totalPowerKw) * 100) : slot.sharePercent,
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
  const totalPowerKw = circuits.reduce((sum, circuit) => sum + (circuit.livePowerKw ?? 0), 0);
  const selfConsumptionKwh = readMetricValue(snapshot, "selfConsumptionEnergy");
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
      slotKey: slot.key
    });

    if (!circuit) {
      return {
        alertReason: null,
        bindingState: binding.bindingState,
        fallbackReason: binding.fallbackReason,
        fallbackSharePercent: slot.sharePercent,
        iconKey: slot.iconKey,
        isEmpty: true,
        labelEn: slot.defaultEn,
        labelZh: slot.defaultZh,
        livePowerKw: null,
        progressClass: "bg-neutral-300",
        sharePercent: 0,
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
        isEmpty: true,
        labelEn: circuit.nameEn ?? slot.defaultEn,
        labelZh: circuit.nameZh ?? slot.defaultZh,
        livePowerKw: null,
        progressClass: status.progressClass,
        sharePercent: 0,
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
      isEmpty: false,
      labelEn: circuit.nameEn ?? slot.defaultEn,
      labelZh: circuit.nameZh ?? slot.defaultZh,
      livePowerKw: circuit.livePowerKw,
      progressClass: status.progressClass,
      sharePercent: totalPowerKw > 0 ? Math.round(((circuit.livePowerKw ?? 0) / totalPowerKw) * 100) : 0,
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
      hasCompleteRuntime
        ? {
            alertTone: "normal" as const,
            bindingState: "bound" as const,
            dependencyKeys: totalPowerDependencyKeys,
            fallbackReason: null,
            fallbackStrategy: "placeholder" as const,
            freshnessState: "fresh" as const,
            helper: `${loadRows.filter((row) => !row.isEmpty).length || slotDefinitions.length} 個迴路面板`,
            iconKey: "bolt" as const,
            label: "目前廠區總用電",
            metricKey: "totalPower" as const,
            provenance: "aggregate" as const,
            sourceClass: "slot-aggregate" as const,
            unit: "kW",
            value: formatNumber(totalPowerKw)
          }
        : buildFallbackKpi({
            dependencyKeys: totalPowerDependencyKeys,
            fallbackReason: connectionState === "connected" ? "missing-live-power" : "socket-disconnected",
            fallbackStrategy: "placeholder",
            helper: buildFlowFallbackLabel({ connectionState, loadState }),
            label: "目前廠區總用電",
            metricKey: "totalPower",
            sourceClass: "slot-aggregate",
            unit: "kW"
          }),
      hasCompleteRuntime && readMetricValue(snapshot, "realTimePower") !== null
        ? {
            alertTone: "normal" as const,
            bindingState: "bound" as const,
            dependencyKeys: ["realTimePower", ...totalPowerDependencyKeys],
            fallbackReason: null,
            fallbackStrategy: "derive-from-dependencies" as const,
            freshnessState: "fresh" as const,
            helper: "Solar Supply Share",
            iconKey: "pie" as const,
            label: "太陽能供應占比",
            metricKey: "solarShare" as const,
            provenance: "derived" as const,
            sourceClass: "derived-metric" as const,
            unit: "%",
            value: formatNumber(Math.round((readMetricValue(snapshot, "realTimePower")! / totalPowerKw) * 100))
          }
        : buildFallbackKpi({
            dependencyKeys: ["realTimePower", ...totalPowerDependencyKeys],
            fallbackReason: connectionState === "connected" ? "missing-live-power" : "socket-disconnected",
            fallbackStrategy: "derive-from-dependencies",
            helper: buildFlowFallbackLabel({ connectionState, loadState }),
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
        : buildFallbackKpi({
            dependencyKeys: ["selfConsumptionEnergy"],
            fallbackReason: connectionState === "connected" ? "metric-unavailable" : "socket-disconnected",
            fallbackStrategy: "placeholder",
            helper: "等待自發自用數據",
            label: "今日自發自用電量",
            metricKey: "selfConsumption",
            sourceClass: "mqtt-live",
            unit: "kWh"
          }),
      hasCompleteRuntime
        ? {
            alertTone: "normal" as const,
            bindingState: "bound" as const,
            dependencyKeys: totalPowerDependencyKeys,
            fallbackReason: null,
            fallbackStrategy: "derive-from-dependencies" as const,
            freshnessState: "fresh" as const,
            helper: "Estimated Peak Load",
            iconKey: "bars" as const,
            label: "尖峰負載",
            metricKey: "peak" as const,
            provenance: "derived" as const,
            sourceClass: "derived-metric" as const,
            unit: "kW",
            value: formatNumber(Math.round(totalPowerKw * 1.45))
          }
        : buildFallbackKpi({
            dependencyKeys: totalPowerDependencyKeys,
            fallbackReason: connectionState === "connected" ? "missing-live-power" : "socket-disconnected",
            fallbackStrategy: "derive-from-dependencies",
            helper: buildFlowFallbackLabel({ connectionState, loadState }),
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
    ],
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
