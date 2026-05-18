import type { CircuitConfig, DisplayCircuitSlotKey } from "@solar-display/shared";
import { resolveMonitoringSlotBinding } from "@solar-display/shared";
import type { LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";

export type FactoryCircuitLoadState = "loading" | "ready" | "error";
export type FactoryCircuitRuntime = CircuitConfig & {
  livePowerKw: number;
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
  loadState: FactoryCircuitLoadState;
  snapshot: LiveMetricsSnapshot;
  factoryCircuitStory?: {
    slots: Array<{
      slotKey: string;
      label: string;
      bindingState: string;
      fallbackReason: string | null;
      freshnessState: string;
      alertTone: string;
      livePowerKw: number | null;
      circuitId: number | null;
    }>;
    summary: {
      alertTone: string;
      bindingState: string;
      fallbackReason: string | null;
      freshnessState: string;
    };
  };
};

const prototypeTotalLoadKw = 1280;
const prototypeSolarShareSourceKw = 410;
const prototypeSelfConsumptionKwh = 2430;

const slotDefinitions: CircuitSlotDefinition[] = [
  { defaultEn: "Production Line", defaultZh: "生產線用電", iconKey: "production-line", key: "production", sharePercent: 45 },
  { defaultEn: "HVAC & Environment", defaultZh: "空調與環境設備", iconKey: "hvac", key: "hvac", sharePercent: 20 },
  { defaultEn: "Lighting", defaultZh: "照明系統", iconKey: "lighting", key: "lighting", sharePercent: 10 },
  { defaultEn: "Office & Common Area", defaultZh: "辦公與公共區域", iconKey: "office", key: "office", sharePercent: 10 },
  { defaultEn: "EV / Green Facility", defaultZh: "充電設備 / 綠能設施", iconKey: "ev", key: "ev", sharePercent: 10 },
  { defaultEn: "Infrastructure", defaultZh: "其他基礎設施", iconKey: "infrastructure", key: "infrastructure", sharePercent: 5 }
];

function formatNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString("zh-TW", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits
  });
}

function buildFallbackLivePower(sharePercent: number) {
  return Math.round(prototypeTotalLoadKw * (sharePercent / 100));
}

function resolveSlotOrder(slot: string | null | undefined) {
  return slotDefinitions.findIndex((definition) => definition.key === slot) + 1 || Number.MAX_SAFE_INTEGER;
}

function resolveStatus(circuit: FactoryCircuitRuntime) {
  if (circuit.livePowerKw <= 0) {
    return {
      alertReason: "missing-live-power" as const,
      label: "離線",
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

export function buildFactoryCircuitRuntimes(circuits: CircuitConfig[]): FactoryCircuitRuntime[] {
  return circuits
    .filter((circuit) => circuit.enabled)
    .map((circuit) => {
      const slot = slotDefinitions.find((entry) => entry.key === circuit.displaySlot);
      return {
        ...circuit,
        livePowerKw: buildFallbackLivePower(slot?.sharePercent ?? 0)
      };
    })
    .sort((left, right) => resolveSlotOrder(left.displaySlot) - resolveSlotOrder(right.displaySlot));
}

export function buildFactoryCircuitViewModel({
  circuits,
  connectionState,
  loadState,
  snapshot,
  factoryCircuitStory
}: BuildFactoryCircuitViewModelArgs) {
  const shouldUseStory = factoryCircuitStory !== undefined && factoryCircuitStory.slots.length >= 2;

  if (shouldUseStory) {
    const storySlotByKey = new Map(factoryCircuitStory.slots.map((slot) => [slot.slotKey, slot]));
    const toneMap: Record<string, { progressClass: string; textClass: string; tone: string; statusLabel: string }> = {
      normal: { progressClass: "bg-[#5f8c50]", textClass: "text-[#557a43]", tone: "success", statusLabel: "正常" },
      warning: { progressClass: "bg-[#d6a73f]", textClass: "text-[#9b7121]", tone: "warning", statusLabel: "注意" },
      danger: { progressClass: "bg-[#c96745]", textClass: "text-[#9f4324]", tone: "danger", statusLabel: "警告" }
    };

    const loadRows = slotDefinitions.map((slot) => {
      const storySlot = storySlotByKey.get(slot.key);
      const binding = resolveMonitoringSlotBinding({
        circuitId: storySlot?.circuitId ?? null,
        slotKey: slot.key
      });

      if (!storySlot || storySlot.bindingState === "missing" || storySlot.bindingState === "conflict") {
        return {
          alertReason: storySlot ? storySlot.fallbackReason : null,
          bindingState: binding.bindingState,
          fallbackReason: binding.fallbackReason,
          fallbackSharePercent: slot.sharePercent,
          iconKey: slot.iconKey,
          isEmpty: true,
          labelEn: storySlot?.label ?? slot.defaultEn,
          labelZh: storySlot?.label ?? slot.defaultZh,
          livePowerKw: storySlot?.livePowerKw ?? 0,
          progressClass: "bg-neutral-300",
          sharePercent: 0,
          statusLabel: storySlot ? (storySlot.bindingState === "conflict" ? "衝突" : "未綁定") : "待接入",
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
        labelEn: storySlot.label,
        labelZh: storySlot.label,
        livePowerKw: livePower,
        progressClass: tone.progressClass,
        sharePercent: slot.sharePercent,
        statusLabel: tone.statusLabel,
        statusTone: tone.tone as "success" | "warning" | "danger" | "neutral",
        textClass: tone.textClass,
        utilizationPercent: 0
      };
    });

    const totalPowerKw = factoryCircuitStory.slots.reduce((sum, slot) => sum + (slot.livePowerKw ?? 0), 0);
    const solarSourceKw = readMetricValue(snapshot, "realTimePower") ?? prototypeSolarShareSourceKw;
    const selfConsumptionKwh = readMetricValue(snapshot, "selfConsumptionEnergy") ?? prototypeSelfConsumptionKwh;
    const summary = factoryCircuitStory.summary;

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
      kpis: [
        { helper: `${loadRows.filter((row) => !row.isEmpty).length || slotDefinitions.length} 個迴路面板`, iconKey: "bolt", label: "目前廠區總用電", unit: "kW", value: formatNumber(totalPowerKw || prototypeTotalLoadKw) },
        { helper: "Solar Supply Share", iconKey: "sun", label: "太陽能供應占比", unit: "%", value: formatNumber(Math.round((solarSourceKw / (totalPowerKw || prototypeTotalLoadKw)) * 100)) },
        { helper: "Today's Self-consumption", iconKey: "sun", label: "今日自發自用電量", unit: "kWh", value: formatNumber(selfConsumptionKwh) },
        { helper: "Estimated Peak Load", iconKey: "bars", label: "尖峰負載", unit: "kW", value: formatNumber(Math.round((totalPowerKw || prototypeTotalLoadKw) * 1.45)) },
        { helper: "Green Energy Routing", iconKey: "leaf", label: "目前綠電流向", unit: summary.freshnessState === "fresh" ? "Normal" : "Fallback", value: summary.freshnessState === "fresh" ? "供應中" : "待命" }
      ],
      loadRows,
      summary: {
        statusLabel: summary.freshnessState === "fresh" ? "迴路資料已同步" : summary.fallbackReason ? `資料異常：${summary.fallbackReason}` : "迴路資料待確認"
      }
    };
  }

  const totalPowerKw = circuits.reduce((sum, circuit) => sum + circuit.livePowerKw, 0);
  const hasCircuitData = circuits.length > 0;
  const totalPowerForDisplay = hasCircuitData ? totalPowerKw : prototypeTotalLoadKw;
  const solarSourceKw = readMetricValue(snapshot, "realTimePower") ?? prototypeSolarShareSourceKw;
  const selfConsumptionKwh = readMetricValue(snapshot, "selfConsumptionEnergy") ?? prototypeSelfConsumptionKwh;
  const flowState = loadState === "error"
    ? "Fallback"
    : connectionState === "connected" && hasCircuitData
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
        livePowerKw: 0,
        progressClass: "bg-neutral-300",
        sharePercent: 0,
        statusLabel: loadState === "loading" ? "載入中" : loadState === "error" ? "未接入" : "待接入",
        statusTone: "neutral" as const,
        textClass: "text-neutral-500",
        utilizationPercent: 0
      };
    }

    const status = resolveStatus(circuit);
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
      sharePercent: totalPowerKw > 0 ? Math.round((circuit.livePowerKw / totalPowerKw) * 100) : 0,
      statusLabel: status.label,
      statusTone: status.tone,
      textClass: status.textClass,
      utilizationPercent:
        circuit.ratedCapacity && circuit.ratedCapacity > 0
          ? Math.round((circuit.livePowerKw / circuit.ratedCapacity) * 100)
          : 0
    };
  });

  return {
    emptyState: hasCircuitData || loadState === "loading"
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
      { helper: `${loadRows.filter((row) => !row.isEmpty).length || slotDefinitions.length} 個迴路面板`, iconKey: "bolt", label: "目前廠區總用電", unit: "kW", value: formatNumber(totalPowerForDisplay) },
      { helper: "Solar Supply Share", iconKey: "sun", label: "太陽能供應占比", unit: "%", value: formatNumber(Math.round((solarSourceKw / totalPowerForDisplay) * 100)) },
      { helper: "Today's Self-consumption", iconKey: "sun", label: "今日自發自用電量", unit: "kWh", value: formatNumber(selfConsumptionKwh) },
      { helper: "Estimated Peak Load", iconKey: "bars", label: "尖峰負載", unit: "kW", value: formatNumber(hasCircuitData ? Math.round(totalPowerKw * 1.45) : 1860) },
      { helper: loadState === "error" ? "Circuit API Fallback" : "Green Energy Routing", iconKey: "leaf", label: "目前綠電流向", unit: loadState === "error" ? "Fallback" : "Normal", value: flowState }
    ],
    loadRows,
    summary: {
      statusLabel: loadState === "loading"
        ? "正在同步 circuits API，先保留版型骨架"
        : loadState === "error"
          ? "迴路資料未連線，顯示版型 fallback"
          : connectionState === "connected"
            ? "迴路資料已同步"
            : "Socket 未連線，但頁面保留播放結構"
    }
  };
}
