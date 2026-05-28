import type { CircuitConfig, DisplayReadinessReport } from "@solar-display/shared";
import type { ReferenceGlyphName } from "../../components/ReferenceGlyph";
import type { ReferenceTone } from "../../components/reference/ReferenceManagement";

export type CircuitSettingsFeedbackTone = "error" | "loading" | "ready";
export type CircuitRowTone = "connected" | "connecting" | "disconnected";

type BuildCircuitSettingsViewModelArgs = {
  circuits: CircuitConfig[];
  deletingId: number | null;
  dirtyIds: number[];
  errorMessage: string;
  isAdding: boolean;
  isLoading: boolean;
  isReloading: boolean;
  isSaving: boolean;
  message: string;
  readiness?: DisplayReadinessReport | null;
};

const circuitSlotLabelMap: Record<string, string> = {
  ev: "EV",
  hvac: "HVAC",
  infrastructure: "Infrastructure",
  lighting: "Lighting",
  office: "Office",
  production: "Production"
};

const boundedIconOptions = [
  { label: "發電 / 一般", value: "bolt" },
  { label: "車輛 / 充電", value: "car" },
  { label: "空調 / 風扇", value: "fan" },
  { label: "照明", value: "light" }
] as const;

const boundedUnitOptions = ["kW", "kWh", "%", "A", "V"] as const;

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

function resolveIconGlyph(icon: string | null): ReferenceGlyphName {
  switch (icon) {
    case "car":
      return "leaf";
    case "fan":
      return "refresh";
    case "light":
      return "sun";
    default:
      return "bolt";
  }
}

function resolveValidationState(circuit: CircuitConfig) {
  if (!circuit.nameZh?.trim()) {
    return {
      detail: "缺少中文名稱",
      label: "需補欄位",
      tone: "danger" as ReferenceTone
    };
  }

  if (!circuit.mqttTopic?.trim()) {
    return {
      detail: "尚未設定 MQTT topic",
      label: "待補 topic",
      tone: "warning" as ReferenceTone
    };
  }

  const ranges = [
    circuit.normalMin,
    circuit.normalMax,
    circuit.attentionMin,
    circuit.attentionMax,
    circuit.warningMin,
    circuit.warningMax
  ];

  const hasValidRanges = ranges.every((value) => value !== null) &&
    (circuit.normalMin ?? 0) <= (circuit.normalMax ?? 0) &&
    (circuit.normalMax ?? 0) <= (circuit.attentionMin ?? 0) &&
    (circuit.attentionMin ?? 0) <= (circuit.attentionMax ?? 0) &&
    (circuit.attentionMax ?? 0) <= (circuit.warningMin ?? 0) &&
    (circuit.warningMin ?? 0) <= (circuit.warningMax ?? 0);

  if (hasValidRanges) {
    return {
      detail: "門檻區間已建立",
      label: "已設定",
      tone: "success" as ReferenceTone
    };
  }

  return {
    detail: "請確認 threshold 區間",
    label: "待確認",
    tone: "warning" as ReferenceTone
  };
}

function resolveThresholdSummary(circuit: CircuitConfig, isReady: boolean) {
  if (!isReady) {
    return "Threshold ranges 未完成或順序錯誤";
  }

  return `Normal ${formatRange(circuit.normalMin, circuit.normalMax)} · Attention ${formatRange(circuit.attentionMin, circuit.attentionMax)} · Warning ${formatRange(circuit.warningMin, circuit.warningMax)}`;
}

function resolveCircuitReadinessFinding(
  circuit: CircuitConfig,
  readiness: DisplayReadinessReport | null | undefined
) {
  return (
    readiness?.findings.find((finding) => {
      if (finding.sourceType !== "circuit-slot") {
        return false;
      }

      if (finding.sourceId) {
        return finding.sourceId.split(",").includes(String(circuit.id));
      }

      return circuit.displaySlot !== null && finding.requirementKey === circuit.displaySlot;
    }) ?? null
  );
}

function buildBoundedOptions(
  currentValue: string | null | undefined,
  options: readonly { label: string; value: string }[]
) {
  if (!currentValue || options.some((option) => option.value === currentValue)) {
    return [...options];
  }

  return [...options, { label: `保留現值 (${currentValue})`, value: currentValue }];
}

export function buildCircuitSettingsViewModel({
  circuits,
  deletingId,
  dirtyIds,
  errorMessage,
  isAdding,
  isLoading,
  isReloading,
  isSaving,
  message,
  readiness
}: BuildCircuitSettingsViewModelArgs) {
  const sortedCircuits = sortCircuits(circuits);
  const enabledCircuitCount = sortedCircuits.filter((circuit) => circuit.enabled).length;
  const totalCapacity = sortedCircuits.reduce((sum, circuit) => sum + (circuit.ratedCapacity ?? 0), 0);
  const dirtySet = new Set(dirtyIds);
  const feedbackTone = errorMessage ? "error" : isLoading ? "loading" : "ready";

  return {
    actions: {
      addDisabled: isAdding,
      addLabel: isAdding ? "新增中..." : "新增迴路",
      reloadDisabled: isReloading,
      reloadLabel: isReloading ? "重新整理中..." : "重新整理",
      saveDisabled: isSaving || dirtyIds.length === 0,
      saveLabel: isSaving ? "儲存中..." : "儲存設定"
    },
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
      tone: feedbackTone
    },
    rows: sortedCircuits.map((circuit) => {
      const validation = resolveValidationState(circuit);
      const isDirty = dirtySet.has(circuit.id);
      const readinessFinding = resolveCircuitReadinessFinding(circuit, readiness);
      const thresholdReady = validation.label === "已設定";
      const slotImpactLabel = circuit.displaySlot
        ? `Factory Circuit slot · ${circuitSlotLabelMap[circuit.displaySlot] ?? circuit.displaySlot}`
        : "尚未綁定 display slot";
      const rowRisk = readinessFinding
        ? {
            detail: readinessFinding.reason,
            label: readinessFinding.status === "blocking" ? "Blocking Readiness" : "Warning Readiness",
            tone: readinessFinding.status === "blocking" ? ("danger" as ReferenceTone) : ("warning" as ReferenceTone)
          }
        : isDirty
          ? {
              detail: "此列仍有未儲存變更，發布前請再確認 slot 與 threshold。",
              label: "Dirty Change",
              tone: "accent" as ReferenceTone
            }
          : validation.tone === "success"
            ? {
                detail: "slot、topic 與 threshold 契約可直接供 display binding review 使用。",
                label: "Display Ready",
                tone: "success" as ReferenceTone
              }
            : {
                detail: validation.detail,
                label: "Needs Review",
                tone: validation.tone
              };

      return {
        ...circuit,
        attentionRangeLabel: formatRange(circuit.attentionMin, circuit.attentionMax),
        deleting: deletingId === circuit.id,
        dirtyLabel: isDirty ? "待儲存" : "已同步",
        dirtyTone: isDirty ? ("accent" as ReferenceTone) : ("muted" as ReferenceTone),
        iconGlyph: resolveIconGlyph(circuit.icon ?? null),
        iconLabel: circuit.icon ?? "未設定",
        iconOptions: buildBoundedOptions(circuit.icon ?? null, boundedIconOptions),
        isDirty,
        normalRangeLabel: formatRange(circuit.normalMin, circuit.normalMax),
        orderLabel: circuit.displayOrder === null ? "--" : String(circuit.displayOrder),
        readinessDetail: readinessFinding?.reason ?? null,
        rowRiskDetail: rowRisk.detail,
        rowRiskLabel: rowRisk.label,
        rowRiskTone: rowRisk.tone,
        slotImpactLabel,
        statusLabel: circuit.enabled ? "已發布" : "草稿",
        statusTone: (circuit.enabled ? "connected" : "disconnected") as CircuitRowTone,
        thresholdSummaryLabel: resolveThresholdSummary(circuit, thresholdReady),
        topicLabel: circuit.mqttTopic ?? "未設定 topic",
        unitLabel: circuit.unit ?? "--",
        unitOptions: buildBoundedOptions(
          circuit.unit ?? null,
          boundedUnitOptions.map((value) => ({ label: value, value }))
        ),
        validationDetail: validation.detail,
        validationLabel: validation.label,
        validationTone: validation.tone,
        visibilityLabel: circuit.enabled ? "顯示中" : "已隱藏",
        visibilityTone: (circuit.enabled ? "connected" : "disconnected") as CircuitRowTone,
        warningRangeLabel: formatRange(circuit.warningMin, circuit.warningMax)
      };
    }),
    summary: {
      capacityLabel: `${formatCapacity(totalCapacity)} kW`,
      disabledCircuitCount: sortedCircuits.length - enabledCircuitCount,
      enabledCircuitCount,
      totalCircuitCount: sortedCircuits.length
    },
    summaryCards: [
      {
        helper: "目前 circuits route 已建立的設定筆數",
        icon: "bars" as ReferenceGlyphName,
        id: "total",
        subtitle: "Total Circuits",
        title: "迴路總數",
        tone: "default" as ReferenceTone,
        value: String(sortedCircuits.length)
      },
      {
        helper: "會在展示頁與 live metrics 中出現的迴路數量",
        icon: "bolt" as ReferenceGlyphName,
        id: "enabled",
        subtitle: "Visible Circuits",
        title: "顯示中",
        tone: enabledCircuitCount > 0 ? ("success" as ReferenceTone) : ("muted" as ReferenceTone),
        value: String(enabledCircuitCount)
      },
      {
        helper: "保留設定但暫時不顯示的迴路數量",
        icon: "leaf" as ReferenceGlyphName,
        id: "hidden",
        subtitle: "Hidden Circuits",
        title: "隱藏中",
        tone: sortedCircuits.length - enabledCircuitCount > 0 ? ("accent" as ReferenceTone) : ("muted" as ReferenceTone),
        value: String(sortedCircuits.length - enabledCircuitCount)
      },
      {
        helper: "所有迴路額定容量加總，方便對照門檻設定",
        icon: "sun" as ReferenceGlyphName,
        id: "capacity",
        subtitle: "Rated Capacity",
        title: "額定容量總和",
        tone: "default" as ReferenceTone,
        value: `${formatCapacity(totalCapacity)} kW`
      }
    ]
  };
}
