import type { DataSourceOverviewResponse } from "../../services/api";

export type { DataSourceOverviewResponse };

type ViewState = "loading" | "ready" | "error";
type SectionTone = "ready" | "warning" | "error";

export type DataSourceSettingsViewModel = {
  banner: {
    detail: string;
    title: string;
    tone: SectionTone;
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

export function buildDataSourceSettingsViewModel({
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
