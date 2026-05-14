import type { CircuitConfig } from "@solar-display/shared";
import type { LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";

export type FactoryCircuitLoadState = "loading" | "ready" | "error";
export type FactoryCircuitRuntime = CircuitConfig & {
  livePowerKw: number;
};

type CircuitSlotKey =
  | "production"
  | "hvac"
  | "lighting"
  | "office"
  | "ev"
  | "infrastructure";

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

type BuildFactoryCircuitViewModelArgs = {
  circuits: FactoryCircuitRuntime[];
  connectionState: SocketConnectionState["status"];
  loadState: FactoryCircuitLoadState;
  snapshot: LiveMetricsSnapshot;
};

type CircuitSlotDefinition = {
  defaultEn: string;
  defaultZh: string;
  iconKey: FactoryCircuitIconKey;
  key: CircuitSlotKey;
  sharePercent: number;
};

const prototypeTotalLoadKw = 1280;
const prototypeSolarShareSourceKw = 410;
const prototypeSelfConsumptionKwh = 2430;

const slotDefinitions: CircuitSlotDefinition[] = [
  {
    defaultEn: "Production Line",
    defaultZh: "生產線用電",
    iconKey: "production-line",
    key: "production",
    sharePercent: 45
  },
  {
    defaultEn: "HVAC & Environment",
    defaultZh: "空調與環境設備",
    iconKey: "hvac",
    key: "hvac",
    sharePercent: 20
  },
  {
    defaultEn: "Lighting",
    defaultZh: "照明系統",
    iconKey: "lighting",
    key: "lighting",
    sharePercent: 10
  },
  {
    defaultEn: "Office & Common Area",
    defaultZh: "辦公與公共區域",
    iconKey: "office",
    key: "office",
    sharePercent: 10
  },
  {
    defaultEn: "EV / Green Facility",
    defaultZh: "充電設備 / 綠能設施",
    iconKey: "ev",
    key: "ev",
    sharePercent: 10
  },
  {
    defaultEn: "Infrastructure",
    defaultZh: "其他基礎設施",
    iconKey: "infrastructure",
    key: "infrastructure",
    sharePercent: 5
  }
];

function formatNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString("zh-TW", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits
  });
}

function formatPowerValue(value: number) {
  return formatNumber(value, value >= 100 ? 0 : 1);
}

function resolveSlotKey(circuit: Pick<CircuitConfig, "icon" | "nameEn" | "nameZh">): CircuitSlotKey | null {
  switch (circuit.icon) {
    case "factory":
      return "production";
    case "wind":
      return "hvac";
    case "lightbulb":
      return "lighting";
    case "building-2":
      return "office";
    case "battery-charging":
      return "ev";
    case "settings-2":
      return "infrastructure";
    default: {
      const name = `${circuit.nameZh ?? ""} ${circuit.nameEn ?? ""}`.toLowerCase();

      if (name.includes("production")) return "production";
      if (name.includes("hvac")) return "hvac";
      if (name.includes("light")) return "lighting";
      if (name.includes("office")) return "office";
      if (name.includes("green") || name.includes("charging")) return "ev";
      if (name.includes("infra")) return "infrastructure";
      return null;
    }
  }
}

function buildFallbackLivePower(sharePercent: number) {
  return Math.round(prototypeTotalLoadKw * (sharePercent / 100));
}

function resolveStatus(circuit: FactoryCircuitRuntime) {
  if (circuit.livePowerKw <= 0) {
    return {
      label: "離線",
      progressClass: "bg-neutral-300",
      textClass: "text-neutral-500",
      tone: "neutral" as const
    };
  }

  const warningMin = circuit.warningMin ?? Number.POSITIVE_INFINITY;
  const attentionMin = circuit.attentionMin ?? Number.POSITIVE_INFINITY;

  if (circuit.livePowerKw >= warningMin) {
    return {
      label: "警告",
      progressClass: "bg-[#c96745]",
      textClass: "text-[#9f4324]",
      tone: "danger" as const
    };
  }

  if (circuit.livePowerKw >= attentionMin) {
    return {
      label: "注意",
      progressClass: "bg-[#d6a73f]",
      textClass: "text-[#9b7121]",
      tone: "warning" as const
    };
  }

  return {
    label: "正常",
    progressClass: "bg-[#5f8c50]",
    textClass: "text-[#557a43]",
    tone: "success" as const
  };
}

function readMetricValue(snapshot: LiveMetricsSnapshot, key: string) {
  const metric = snapshot.metrics[key];
  return metric?.value ?? null;
}

export function buildFactoryCircuitRuntimes(circuits: CircuitConfig[]): FactoryCircuitRuntime[] {
  return circuits
    .filter((circuit) => circuit.enabled)
    .map((circuit) => {
      const slotKey = resolveSlotKey(circuit);
      const slot = slotDefinitions.find((entry) => entry.key === slotKey);

      return {
        ...circuit,
        livePowerKw: buildFallbackLivePower(slot?.sharePercent ?? 0)
      };
    })
    .sort((left, right) => {
      const leftKey = resolveSlotKey(left);
      const rightKey = resolveSlotKey(right);
      const leftIndex = slotDefinitions.findIndex((entry) => entry.key === leftKey);
      const rightIndex = slotDefinitions.findIndex((entry) => entry.key === rightKey);

      return leftIndex - rightIndex;
    });
}

export function buildFactoryCircuitViewModel({
  circuits,
  connectionState,
  loadState,
  snapshot
}: BuildFactoryCircuitViewModelArgs) {
  const totalPowerKw = circuits.reduce((sum, circuit) => sum + circuit.livePowerKw, 0);
  const hasCircuitData = circuits.length > 0;
  const totalPowerForDisplay = hasCircuitData ? totalPowerKw : prototypeTotalLoadKw;
  const solarSourceKw = readMetricValue(snapshot, "realTimePower") ?? prototypeSolarShareSourceKw;
  const selfConsumptionKwh =
    readMetricValue(snapshot, "selfConsumptionEnergy") ?? prototypeSelfConsumptionKwh;
  const flowState =
    loadState === "error"
      ? "Fallback"
      : connectionState === "connected" && hasCircuitData
        ? "供應中"
        : "待命";

  const loadRows = slotDefinitions.map((slot) => {
    const circuit =
      circuits.find((entry) => resolveSlotKey(entry) === slot.key) ?? null;

    if (!circuit) {
      return {
        fallbackSharePercent: slot.sharePercent,
        iconKey: slot.iconKey,
        isEmpty: true,
        labelEn: slot.defaultEn,
        labelZh: slot.defaultZh,
        livePowerKw: 0,
        progressClass: "bg-neutral-300",
        sharePercent: 0,
        statusLabel:
          loadState === "loading" ? "載入中" : loadState === "error" ? "未接入" : "待接入",
        statusTone: "neutral" as const,
        textClass: "text-neutral-500",
        utilizationPercent: 0
      };
    }

    const sharePercent = totalPowerKw > 0 ? Math.round((circuit.livePowerKw / totalPowerKw) * 100) : 0;
    const utilizationPercent =
      circuit.ratedCapacity && circuit.ratedCapacity > 0
        ? Math.round((circuit.livePowerKw / circuit.ratedCapacity) * 100)
        : 0;
    const status = resolveStatus(circuit);

    return {
      fallbackSharePercent: slot.sharePercent,
      iconKey: slot.iconKey,
      isEmpty: false,
      labelEn: circuit.nameEn ?? slot.defaultEn,
      labelZh: circuit.nameZh ?? slot.defaultZh,
      livePowerKw: circuit.livePowerKw,
      progressClass: status.progressClass,
      sharePercent,
      statusLabel: status.label,
      statusTone: status.tone,
      textClass: status.textClass,
      utilizationPercent
    };
  });

  return {
    emptyState:
      hasCircuitData || loadState === "loading"
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
      {
        helper: `${loadRows.filter((row) => !row.isEmpty).length || slotDefinitions.length} 個迴路面板`,
        iconKey: "bolt",
        label: "目前廠區總用電",
        unit: "kW",
        value: formatNumber(totalPowerForDisplay)
      },
      {
        helper: "Solar Supply Share",
        iconKey: "sun",
        label: "太陽能供應占比",
        unit: "%",
        value: formatNumber(Math.round((solarSourceKw / totalPowerForDisplay) * 100))
      },
      {
        helper: "Today's Self-consumption",
        iconKey: "sun",
        label: "今日自發自用電量",
        unit: "kWh",
        value: formatNumber(selfConsumptionKwh)
      },
      {
        helper: "Estimated Peak Load",
        iconKey: "bars",
        label: "尖峰負載",
        unit: "kW",
        value: formatNumber(hasCircuitData ? Math.round(totalPowerKw * 1.45) : 1860)
      },
      {
        helper: loadState === "error" ? "Circuit API Fallback" : "Green Energy Routing",
        iconKey: "leaf",
        label: "目前綠電流向",
        unit: loadState === "error" ? "Fallback" : "Normal",
        value: flowState
      }
    ],
    loadRows,
    summary: {
      statusLabel:
        loadState === "loading"
          ? "正在同步 circuits API，先保留版型骨架"
          : loadState === "error"
            ? "迴路資料未連線，顯示版型 fallback"
            : connectionState === "connected"
              ? "迴路資料已同步"
              : "Socket 未連線，但頁面保留播放結構"
    }
  };
}
