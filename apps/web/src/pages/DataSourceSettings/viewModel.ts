import type { CalculationSettings, DataSourceOverviewResponse } from "../../services/api";

export type { CalculationSettings, DataSourceOverviewResponse };

type ViewState = "loading" | "ready" | "error";
type SectionTone = "ready" | "warning" | "error";
type CalculationSettingsState = "loading" | "ready" | "saving" | "success" | "error";

export type CalculationSettingsForm = {
  carbonEmissionFactor: string;
  estimatedTariffPerKwh: string;
  householdDailyUsageKwh: string;
  householdMonthlyUsageKwh: string;
  treeEquivalentFactor: string;
};

export type DataSourceSettingsViewModel = {
  banner: {
    detail: string;
    title: string;
    tone: SectionTone;
  };
  calculationSettingsCard: {
    banner: {
      detail: string;
      title: string;
      tone: SectionTone;
    };
    fields: Array<{
      description: string;
      key: keyof CalculationSettingsForm;
      label: string;
      unit: string;
      value: string;
    }>;
    saveButtonLabel: string;
    saveDisabled: boolean;
  };
  recommendations: Array<{
    description: string;
    kind: "recommendation";
    status: "recommended";
    title: string;
  }>;
  relatedActions: Array<{
    kind: "navigation";
    label: string;
    path: string;
  }>;
  sections: Array<{
    detail: string;
    metrics: string[];
    title: string;
    tone: SectionTone;
  }>;
};

type BuildDataSourceSettingsViewModelArgs = {
  calculationSettings: CalculationSettings | null;
  calculationSettingsDraft: CalculationSettingsForm;
  calculationSettingsErrorMessage?: string;
  calculationSettingsState: CalculationSettingsState;
  errorMessage?: string;
  overview: DataSourceOverviewResponse | null;
  state: ViewState;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function secretStatusLabel(value: "configured" | "missing") {
  return value === "configured" ? "已設定" : "未設定";
}

function sectionTone(status: "ready" | "degraded" | "unavailable"): SectionTone {
  return status === "ready" ? "ready" : "warning";
}

function tableCountSummary(tableCounts: Record<string, number>) {
  const entries = Object.entries(tableCounts);
  if (entries.length === 0) {
    return "無可用表格計數";
  }

  return entries.map(([name, count]) => `${name}: ${count}`).join(" / ");
}

export function createCalculationSettingsForm(
  settings: CalculationSettings | null
): CalculationSettingsForm {
  if (!settings) {
    return {
      carbonEmissionFactor: "",
      estimatedTariffPerKwh: "",
      householdDailyUsageKwh: "",
      householdMonthlyUsageKwh: "",
      treeEquivalentFactor: ""
    };
  }

  return {
    carbonEmissionFactor: String(settings.carbonEmissionFactor),
    estimatedTariffPerKwh: String(settings.estimatedTariffPerKwh),
    householdDailyUsageKwh: String(settings.householdDailyUsageKwh),
    householdMonthlyUsageKwh: String(settings.householdMonthlyUsageKwh),
    treeEquivalentFactor: String(settings.treeEquivalentFactor)
  };
}

function areCalculationSettingsFormsEqual(
  left: CalculationSettingsForm,
  right: CalculationSettingsForm
) {
  return (
    left.carbonEmissionFactor === right.carbonEmissionFactor
    && left.estimatedTariffPerKwh === right.estimatedTariffPerKwh
    && left.householdDailyUsageKwh === right.householdDailyUsageKwh
    && left.householdMonthlyUsageKwh === right.householdMonthlyUsageKwh
    && left.treeEquivalentFactor === right.treeEquivalentFactor
  );
}

function buildCalculationSettingsCard(
  settings: CalculationSettings | null,
  draft: CalculationSettingsForm,
  settingsState: CalculationSettingsState,
  errorMessage = ""
) {
  const savedDraft = createCalculationSettingsForm(settings);
  const isLoaded = settings !== null;
  const isDirty = isLoaded && !areCalculationSettingsFormsEqual(draft, savedDraft);
  const fields: DataSourceSettingsViewModel["calculationSettingsCard"]["fields"] = [
    {
      description: "Overview / Solar / Sustainability 共用的減碳換算基準。",
      key: "carbonEmissionFactor",
      label: "排碳係數",
      unit: "kg CO2e / kWh",
      value: draft.carbonEmissionFactor
    },
    {
      description: "每公噸減碳對應的植樹等效數量。",
      key: "treeEquivalentFactor",
      label: "植樹等效係數",
      unit: "trees / tCO2e",
      value: draft.treeEquivalentFactor
    },
    {
      description: "今日自發自用量換算四口之家戶數的每日基準。",
      key: "householdDailyUsageKwh",
      label: "每日家庭用電",
      unit: "kWh / day",
      value: draft.householdDailyUsageKwh
    },
    {
      description: "累積自發自用量換算四口之家戶數的每月基準。",
      key: "householdMonthlyUsageKwh",
      label: "每月家庭用電",
      unit: "kWh / month",
      value: draft.householdMonthlyUsageKwh
    },
    {
      description: "四口之家節省金額說明使用的每度電估算費率。",
      key: "estimatedTariffPerKwh",
      label: "估算電價",
      unit: "NTD / kWh",
      value: draft.estimatedTariffPerKwh
    }
  ];

  if (!isLoaded && settingsState === "error") {
    return {
      banner: {
        detail: errorMessage || "換算係數暫時無法讀取。",
        title: "換算係數讀取失敗",
        tone: "error" as const
      },
      fields,
      saveButtonLabel: "儲存換算係數",
      saveDisabled: true
    };
  }

  if (!isLoaded || settingsState === "loading") {
    return {
      banner: {
        detail: "正在同步目前使用中的換算係數。",
        title: "換算係數載入中",
        tone: "ready" as const
      },
      fields,
      saveButtonLabel: "儲存換算係數",
      saveDisabled: true
    };
  }

  if (settingsState === "saving") {
    return {
      banner: {
        detail: "儲存完成後，三個 playback 頁會套用同一組係數刷新。",
        title: "換算係數儲存中",
        tone: "warning" as const
      },
      fields,
      saveButtonLabel: "儲存中...",
      saveDisabled: true
    };
  }

  if (settingsState === "error") {
    return {
      banner: {
        detail: errorMessage || "換算係數未儲存。",
        title: "換算係數未儲存",
        tone: "error" as const
      },
      fields,
      saveButtonLabel: "儲存換算係數",
      saveDisabled: false
    };
  }

  if (settingsState === "success") {
    return {
      banner: {
        detail: "新的換算係數已持久化，重新整理後仍會保留。",
        title: "換算係數已儲存",
        tone: "ready" as const
      },
      fields,
      saveButtonLabel: "儲存換算係數",
      saveDisabled: true
    };
  }

  if (isDirty) {
    return {
      banner: {
        detail: "尚有未儲存變更；儲存後會同步影響減碳、植樹與四口之家換算。",
        title: "有未儲存的換算係數變更",
        tone: "warning" as const
      },
      fields,
      saveButtonLabel: "儲存換算係數",
      saveDisabled: false
    };
  }

  return {
    banner: {
      detail: "目前使用中的係數已從 server 同步，可直接在此調整。",
      title: "換算係數已同步",
      tone: "ready" as const
    },
    fields,
    saveButtonLabel: "儲存換算係數",
    saveDisabled: true
  };
}

export function buildDataSourceSettingsViewModel({
  calculationSettings,
  calculationSettingsDraft,
  calculationSettingsErrorMessage = "",
  calculationSettingsState,
  errorMessage = "",
  overview,
  state
}: BuildDataSourceSettingsViewModelArgs): DataSourceSettingsViewModel {
  if (state === "loading") {
    return {
      banner: {
        detail: "正在同步目前資料來源與儲存狀態。",
        title: "載入資料來源診斷",
        tone: "ready"
      },
      calculationSettingsCard: buildCalculationSettingsCard(
        calculationSettings,
        calculationSettingsDraft,
        calculationSettingsState,
        calculationSettingsErrorMessage
      ),
      recommendations: [],
      relatedActions: [],
      sections: []
    };
  }

  if (!overview || state === "error") {
    return {
      banner: {
        detail: errorMessage || "資料來源診斷暫時無法讀取。",
        title: "資料來源診斷降級",
        tone: "error"
      },
      calculationSettingsCard: buildCalculationSettingsCard(
        calculationSettings,
        calculationSettingsDraft,
        calculationSettingsState,
        calculationSettingsErrorMessage
      ),
      recommendations: [],
      relatedActions: [],
      sections: []
    };
  }

  const hasWarnings = overview.warnings.length > 0;

  return {
    banner: {
      detail: hasWarnings
        ? overview.warnings.join("；")
        : `最後更新 ${overview.generatedAt}`,
      title: hasWarnings ? "資料來源診斷部分降級" : "資料來源診斷已同步",
      tone: hasWarnings ? "warning" : "ready"
    },
    calculationSettingsCard: buildCalculationSettingsCard(
      calculationSettings,
      calculationSettingsDraft,
      calculationSettingsState,
      calculationSettingsErrorMessage
    ),
    recommendations: overview.recommendations.map((recommendation) => ({
      description: recommendation.description,
      kind: "recommendation",
      status: recommendation.status,
      title: recommendation.title
    })),
    relatedActions: overview.relatedRoutes.map((route) => ({
      kind: "navigation",
      label: route.label,
      path: route.path
    })),
    sections: [
      {
        detail: overview.sqlite.status === "ready"
          ? `DB: ${overview.sqlite.databasePath}`
          : `DB: ${overview.sqlite.databasePath}（目前無法讀取表格計數）`,
        metrics: [
          `資料目錄 ${overview.runtimeStorage.dataDir}`,
          tableCountSummary(overview.sqlite.tableCounts)
        ],
        title: "Runtime SQLite",
        tone: sectionTone(overview.sqlite.status)
      },
      {
        detail: overview.uploads.imageUploads.dir,
        metrics: [
          `${overview.uploads.imageUploads.fileCount} files`,
          formatBytes(overview.uploads.imageUploads.totalBytes)
        ],
        title: "圖片上傳",
        tone: sectionTone(overview.uploads.imageUploads.status)
      },
      {
        detail: overview.uploads.brandUploads.dir,
        metrics: [
          `${overview.uploads.brandUploads.fileCount} files`,
          formatBytes(overview.uploads.brandUploads.totalBytes)
        ],
        title: "品牌上傳",
        tone: sectionTone(overview.uploads.brandUploads.status)
      },
      {
        detail: `${overview.mqtt.host}:${overview.mqtt.port} / ${overview.mqtt.dataMode}`,
        metrics: [
          `帳號${secretStatusLabel(overview.mqtt.username)}`,
          `密碼${secretStatusLabel(overview.mqtt.password)}`
        ],
        title: "MQTT",
        tone: sectionTone(overview.mqtt.status)
      },
      {
        detail: overview.weather.openDataUrl,
        metrics: [
          `CWA 授權${secretStatusLabel(overview.weather.cwaAuthorization)}`,
          `${overview.weather.requestTimeoutMs} ms timeout`
        ],
        title: "天氣來源",
        tone: sectionTone(overview.weather.status)
      },
      {
        detail: `metric snapshots ${overview.retention.metricSnapshotRetentionDays} 天 / daily summaries ${overview.retention.dailySummaryRetentionDays} 天`,
        metrics: [
          overview.retention.vacuumEnabled ? "VACUUM enabled" : "VACUUM disabled"
        ],
        title: "歷史保留",
        tone: sectionTone(overview.retention.status)
      },
      {
        detail: overview.browserLocalCache.description,
        metrics: ["server remains source of truth"],
        title: "瀏覽器暫存",
        tone: "ready"
      }
    ]
  };
}
