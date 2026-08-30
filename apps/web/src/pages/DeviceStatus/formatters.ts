import type {
  AppTimeSnapshot,
  DisplayClientLivenessSnapshot,
  UnpairedDisplayAccessSummary
} from "@solar-display/shared";
import type {
  DeviceFanTelemetry,
  DeviceLogSummary,
  DeviceReleaseIdentity,
  DeviceTemperatureTelemetry
} from "../../services/api";
import { displayClientPageLabels } from "./localization";

export type DeviceRouteStatus = {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSeconds: number;
  cpu: { cores: number; loadAvg: [number, number, number] };
  memory: { totalMB: number; usedMB: number; freeMB: number; usePercent: number };
  disk: { totalMB: number; usedMB: number; availableMB: number; usePercent: number };
  temperature?: DeviceTemperatureTelemetry;
  fan?: DeviceFanTelemetry;
  displayClients?: DisplayClientLivenessSnapshot;
  unpairedDisplayAccess?: UnpairedDisplayAccessSummary;
  pid: number;
  release?: DeviceReleaseIdentity;
};

export function formatServerTime(epochMs: number | null): string {
  if (epochMs === null) {
    return "--:--:-- (Asia/Taipei)";
  }
  const date = new Date(epochMs);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Taipei",
    year: "numeric"
  });
  const parts = formatter.formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}/${part("month")}/${part("day")} ${part("hour")}:${part("minute")}:${part("second")} (Asia/Taipei)`;
}

export function formatTimeSyncStatus(state: AppTimeSnapshot["state"] | undefined): { tone: string; value: string } {
  if (!state || state === "waiting") {
    return { tone: "is-warning", value: "● 等待同步" };
  }
  if (state === "synced") {
    return { tone: "is-good", value: "● 正常同步中 (已校時)" };
  }
  if (state === "stale") {
    return { tone: "is-warning", value: "● 訊號延遲" };
  }
  return { tone: "is-error", value: "● 時間不可信" };
}

export function formatUptime(seconds: number | null): string {
  if (seconds === null) {
    return "-";
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days} 天 ${hours} 時`;
  }

  if (hours > 0) {
    return `${hours} 時 ${minutes} 分`;
  }

  return `${minutes} 分`;
}

export function formatFanTelemetry(fan: DeviceFanTelemetry | undefined): string {
  if (!fan?.available || fan.status === "unavailable") {
    return "無法取得";
  }

  const statusLabel = fan.status === "running" ? "運轉中" : "已停止";
  if (fan.rpm !== null) {
    return `${statusLabel} · ${fan.rpm} RPM`;
  }
  if (fan.coolingState !== null) {
    return `${statusLabel} · 冷卻檔位 ${fan.coolingState}`;
  }
  return "無法取得";
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return `${Math.round(value)}%`;
}

export function parseGaugeValue(label: string, valueLabel: string): number {
  if (label === "CPU 負載") {
    const numeric = Number.parseFloat(valueLabel);
    if (Number.isFinite(numeric)) {
      return Math.max(0, Math.min(100, Math.round(numeric * 100)));
    }
  }

  const numeric = Number.parseFloat(valueLabel.replace("%", ""));
  if (Number.isFinite(numeric)) {
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  return 0;
}

export function gaugePercentForCard(label: string, gaugeValue: string, valueLabel: string): number {
  return label === "CPU 負載" ? parseGaugeValue(label, valueLabel) : parseGaugeValue(label, gaugeValue);
}

export function buildResourceCards(status: DeviceRouteStatus | null) {
  const cards = [
    {
      gaugeValue: status ? formatPercent(status.cpu.loadAvg[0] * 100) : "--",
      helper: status ? `1分 / 5分 / 15分: ${status.cpu.loadAvg.map((value) => value.toFixed(2)).join(" / ")}` : "--",
      label: "CPU 負載",
      valueLabel: status ? status.cpu.loadAvg[0].toFixed(2) : "--"
    },
    {
      gaugeValue: status ? formatPercent(status.memory.usePercent) : "--",
      helper: status ? `${status.memory.usedMB} / ${status.memory.totalMB} MB` : "--",
      label: "記憶體使用率",
      valueLabel: status ? formatPercent(status.memory.usePercent) : "--"
    },
    {
      gaugeValue: status ? formatPercent(status.disk.usePercent) : "--",
      helper: status ? `${status.disk.usedMB} / ${status.disk.totalMB} MB` : "--",
      label: "磁碟使用率",
      valueLabel: status ? formatPercent(status.disk.usePercent) : "--"
    },
    {
      gaugeValue: status?.temperature?.available && status.temperature.celsius !== null
        ? `${status.temperature.celsius.toFixed(1)}°C`
        : "--",
      helper: status
        ? status.temperature?.available
          ? "Pi 5 核心溫度"
          : "目前無可信溫度量測來源"
        : "--",
      label: "系統溫度",
      valueLabel: status === null
        ? "--"
        : status.temperature?.available && status.temperature.celsius !== null
          ? `${status.temperature.celsius.toFixed(1)}°C`
          : "無法取得"
    }
  ];

  return cards.map((card, index) => {
    const gaugePercent = gaugePercentForCard(card.label, card.gaugeValue, card.valueLabel);
    let gaugeColor: string;
    if (card.valueLabel === "無法取得" || card.valueLabel === "Unavailable") {
      gaugeColor = "#7c847c";
    } else if (index === 3) {
      gaugeColor = gaugePercent >= 75 ? "#c14a4a" : gaugePercent >= 55 ? "#c9881a" : "#d89c45";
    } else {
      gaugeColor = gaugePercent >= 90 ? "#c14a4a" : gaugePercent >= 70 ? "#c9881a" : "#4f7c42";
    }
    return { ...card, gaugeColor, gaugePercent };
  });
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function formatRelativeTime(value: string | null | undefined, now: Date): string {
  if (!value) {
    return "--";
  }

  const timestamp = new Date(value).getTime();
  const nowValue = now.getTime();
  if (!Number.isFinite(timestamp) || !Number.isFinite(nowValue)) {
    return "--";
  }

  const deltaSeconds = Math.max(0, Math.round((nowValue - timestamp) / 1000));
  if (deltaSeconds < 60) {
    return `${deltaSeconds} 秒前`;
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (deltaMinutes < 60) {
    return `${deltaMinutes} 分前`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  return `${deltaHours} 小時前`;
}

export function buildRuntimeSummary(
  isLoading: boolean,
  status: DeviceRouteStatus | null,
  accessDenied: boolean
) {
  if (accessDenied) {
    return {
      detail: "此頁面僅對受信任的管理端開放。",
      title: "存取受限"
    };
  }

  if (isLoading) {
    return {
      detail: "正在讀取裝置運行狀態...",
      title: "同步中"
    };
  }

  if (status === null) {
    return {
      detail: "無法讀取裝置遙測資訊。",
      title: "同步失敗"
    };
  }

  return {
    detail: "裝置遙測正常運作中",
    title: "正常運作"
  };
}

export function buildDisplayClientSummary(
  snapshot: DisplayClientLivenessSnapshot | undefined,
  now: Date
) {
  const summary = snapshot?.summary ?? {
    offline: 0,
    online: 0,
    stale: 0,
    total: 0
  };

  const clientPageLabel = (pageId: string | null | undefined, route: string) =>
    pageId ? (displayClientPageLabels[pageId] ?? pageId) : `路由 ${route}`;

  return {
    badges: [
      { count: summary.online, label: "在線", tone: "is-good" },
      { count: summary.stale, label: "延遲", tone: "is-warning" },
      { count: summary.offline, label: "離線", tone: "is-error" }
    ],
    rows: (snapshot?.clients ?? []).map((client) => ({
      badgeTone: client.state === "online" ? "is-good" : client.state === "stale" ? "is-warning" : "is-error",
      clientId: client.clientId,
      connectionLabel: `${client.connectedCount} 條連線`,
      deviceId: client.deviceId,
      duplicateWarningLabel: client.duplicateIdentity ? "疑似重複身份" : null,
      groupLabel: `分組 ${client.groupId}`,
      lastSeenLabel: formatRelativeTime(client.lastSeenAt, now),
      pageLabel: clientPageLabel(client.pageKey, client.route),
      playbackLabel: client.state === "offline" ? "已離線" : client.isIdle ? "閒置中" : client.isPlaying ? "播放中" : "待命中",
      routeLabel: client.route,
      runtimeSyncResolvedAtLabel: formatTimestamp(client.runtimeSyncResolvedAt),
      runtimeSyncStateLabel:
        client.runtimeSyncState === "synced"
          ? "同步正常"
          : client.runtimeSyncState === "loading"
            ? "同步中"
            : client.runtimeSyncState === "degraded"
              ? "同步異常"
              : "未回報",
      siteLabel: `廠區 ${client.siteScope.toUpperCase()}`,
      stateLabel: client.state,
      timeSyncLabel:
        client.timeSyncState === "synced"
          ? "時間同步 已校時"
          : client.timeSyncState === "stale"
            ? "時間同步 延遲"
            : client.timeSyncState === "time-untrusted"
              ? "時間同步 不可信"
              : "時間同步 等待"
    })),
    totalLabel: `${summary.total} 台展示端`
  };
}

export function buildUnpairedDisplayAccessSummary(summary: UnpairedDisplayAccessSummary | undefined, now: Date) {
  const totalCount = summary?.totalCount ?? 0;
  return {
    lastDeniedRouteLabel: summary?.lastDeniedRoute ?? "--",
    lastSeenLabel: formatRelativeTime(summary?.lastSeenAt, now),
    totalCount,
    totalLabel: totalCount === 0 ? "無未配對存取" : `${totalCount} 次未配對存取`
  };
}

export type SystemRowItem = {
  label: string;
  tone?: string;
  value: string;
};

export type DeviceLogSummaryInput = (DeviceLogSummary & {
  entryCount?: number;
  exportAvailable?: boolean;
  lines?: number;
  retentionDays?: number | string;
  summary?: string;
}) | null;

export function buildLogsSummary(
  logSummary: DeviceLogSummaryInput,
  logSummaryAccessDenied: boolean,
  logSummaryError: string,
  logSummaryLoading: boolean
) {
  if (logSummaryAccessDenied) {
    return {
      detail: "此頁面僅對受信任的管理端開放。",
      entryCountLabel: "--",
      exportAvailable: false,
      retentionLabel: "--",
      sourceLabel: "journald",
      statusTitle: "存取受限"
    };
  }

  if (logSummaryLoading && logSummary === null && !logSummaryError) {
    return {
      detail: "正在同步 Journald 日誌摘要。",
      entryCountLabel: "--",
      exportAvailable: false,
      retentionLabel: "--",
      sourceLabel: "journald",
      statusTitle: "同步中"
    };
  }

  if (logSummaryError) {
    return {
      detail: logSummaryError,
      entryCountLabel: "無法取得",
      exportAvailable: false,
      retentionLabel: "--",
      sourceLabel: "journald",
      statusTitle: "日誌不可用"
    };
  }

  if (logSummary === null) {
    return {
      detail: "尚未載入 Journald 日誌摘要。",
      entryCountLabel: "--",
      exportAvailable: false,
      retentionLabel: "--",
      sourceLabel: "journald",
      statusTitle: "尚未載入"
    };
  }

  if (logSummary.available === false && logSummary.unavailableReason) {
    return {
      detail: logSummary.unavailableReason,
      entryCountLabel: "無法取得",
      exportAvailable: false,
      retentionLabel: "--",
      sourceLabel: logSummary.source ?? "journald",
      statusTitle: "日誌不可用"
    };
  }

  const linesCount = logSummary.lines ?? logSummary.entries?.length ?? logSummary.entryCount ?? 0;
  const retentionDays = logSummary.retentionDays ?? (logSummary.retention?.scope === "current-boot" ? "當前開機" : "--");

  return {
    detail: logSummary.summary ?? (logSummary.entries?.[0]?.message || "--"),
    entryCountLabel: `${linesCount} 筆記錄`,
    exportAvailable: Boolean(logSummary.exportAvailable),
    retentionLabel: typeof retentionDays === "number" ? `保留 ${retentionDays} 天` : `保留 ${retentionDays}`,
    sourceLabel: logSummary.source ?? "journald",
    statusTitle: logSummary.available !== false ? "Journald 可用" : "日誌不可用"
  };
}

export function buildReleaseRows(
  status: DeviceRouteStatus | null,
  statusAccessDenied: boolean
) {
  if (statusAccessDenied) {
    return [
      { label: "發布版本 ID", tone: "is-error", value: "存取受限" },
      { label: "程式碼版本 (Commit)", tone: "is-error", value: "存取受限" },
      { label: "資料架構 (Schema)", tone: "is-error", value: "存取受限" }
    ];
  }

  const release = status?.release;
  return [
    {
      label: "發布版本 ID",
      value: release?.sourceDirty ? `${release.releaseId} (已修改)` : (release?.releaseId ?? "本地開發環境")
    },
    {
      label: "程式碼版本 (Commit)",
      value: release?.commit ? `${release.commit}${release.sourceDirty ? " (未提交修改)" : ""}` : "未知版本"
    },
    {
      label: "資料架構 (Schema)",
      value: release?.schemaVersion ? String(release.schemaVersion) : "--"
    }
  ];
}
