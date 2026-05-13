import type { CircuitConfig } from "@solar-display/shared";

export type CircuitSettingsFeedbackTone = "error" | "loading" | "ready";
export type CircuitRowTone = "connected" | "connecting" | "disconnected";

type BuildCircuitSettingsViewModelArgs = {
  circuits: CircuitConfig[];
  errorMessage: string;
  isLoading: boolean;
  message: string;
};

function sortCircuits(circuits: CircuitConfig[]) {
  return circuits
    .slice()
    .sort(
      (left, right) =>
        (left.displayOrder ?? Number.MAX_SAFE_INTEGER) -
          (right.displayOrder ?? Number.MAX_SAFE_INTEGER) || left.id - right.id
    );
}

function formatCapacity(value: number | null) {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1
  });
}

function formatRange(min: number | null, max: number | null) {
  if (min === null || max === null) {
    return "--";
  }

  return `${formatCapacity(min)}-${formatCapacity(max)}`;
}

export function buildCircuitSettingsViewModel({
  circuits,
  errorMessage,
  isLoading,
  message
}: BuildCircuitSettingsViewModelArgs) {
  const sortedCircuits = sortCircuits(circuits);
  const enabledCircuitCount = sortedCircuits.filter((circuit) => circuit.enabled).length;
  const totalCapacity = sortedCircuits.reduce((sum, circuit) => sum + (circuit.ratedCapacity ?? 0), 0);

  return {
    emptyState:
      sortedCircuits.length === 0
        ? {
            description: "目前還沒有任何迴路設定，請先新增第一筆迴路，再補齊 topic 與門檻。",
            title: "尚未建立任何迴路"
          }
        : null,
    feedbackBanner: {
      detail: errorMessage || message,
      title: errorMessage ? "載入失敗" : isLoading ? "正在載入迴路設定..." : "迴路設定已就緒",
      tone: (errorMessage ? "error" : isLoading ? "loading" : "ready") as CircuitSettingsFeedbackTone
    },
    rows: sortedCircuits.map((circuit) => ({
      ...circuit,
      attentionRangeLabel: formatRange(circuit.attentionMin, circuit.attentionMax),
      iconLabel: circuit.icon ?? "未設定",
      normalRangeLabel: formatRange(circuit.normalMin, circuit.normalMax),
      orderLabel: circuit.displayOrder === null ? "--" : String(circuit.displayOrder),
      statusLabel: circuit.enabled ? "已發布" : "草稿",
      statusTone: (circuit.enabled ? "connected" : "disconnected") as CircuitRowTone,
      topicLabel: circuit.mqttTopic ?? "未設定 topic",
      unitLabel: circuit.unit ?? "--",
      visibilityLabel: circuit.enabled ? "顯示中" : "已隱藏",
      visibilityTone: (circuit.enabled ? "connected" : "disconnected") as CircuitRowTone,
      warningRangeLabel: formatRange(circuit.warningMin, circuit.warningMax)
    })),
    summary: {
      capacityLabel: `${formatCapacity(totalCapacity)} kW`,
      disabledCircuitCount: sortedCircuits.length - enabledCircuitCount,
      enabledCircuitCount,
      totalCircuitCount: sortedCircuits.length
    }
  };
}
