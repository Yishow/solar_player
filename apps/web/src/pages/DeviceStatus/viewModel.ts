import type { DeviceDisplayOpsSummary } from "@solar-display/shared";
import type { DeviceLogExportMetadata } from "../../services/api";

type DeviceRouteStatus = {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSeconds: number;
  cpu: { cores: number; loadAvg: [number, number, number] };
  memory: { totalMB: number; usedMB: number; freeMB: number; usePercent: number };
  disk: { totalMB: number; usedMB: number; availableMB: number; usePercent: number };
  pid: number;
};

export type DeviceActionFeedback = {
  detail: string;
  title: string;
  tone: "error" | "loading" | "ready";
} | null;

type BuildDeviceStatusViewModelArgs = {
  actionFeedback: DeviceActionFeedback;
  displayOpsSummary?: DeviceDisplayOpsSummary | null;
  isLoading: boolean;
  logExport: DeviceLogExportMetadata | null;
  logExportError: string;
  status: DeviceRouteStatus | null;
};

function parseGaugeValue(label: string, valueLabel: string) {
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

function gaugePercentForCard(label: string, gaugeValue: string, valueLabel: string) {
  if (label === "CPU 負載") {
    return parseGaugeValue(label, valueLabel);
  }

  return parseGaugeValue(label, gaugeValue);
}

function buildRuntimeSummary(isLoading: boolean, status: DeviceRouteStatus | null) {
  if (isLoading) {
    return {
      detail: "Normalizing runtime status...",
      title: "同步中"
    };
  }

  if (status === null) {
    return {
      detail: "Unable to load device telemetry.",
      title: "同步失敗"
    };
  }

  return {
    detail: "Device telemetry available",
    title: "正常運作"
  };
}

function formatUptime(seconds: number | null) {
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

function formatPercent(value: number | null) {
  if (value === null) {
    return "--";
  }

  return `${Math.round(value)}%`;
}

function formatTimestamp(value: string | null | undefined) {
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

export function buildDeviceStatusViewModel({
  actionFeedback,
  displayOpsSummary,
  isLoading,
  logExport,
  logExportError,
  status
}: BuildDeviceStatusViewModelArgs) {
  const runtimeSummary = buildRuntimeSummary(isLoading, status);

  return {
    feedback:
      actionFeedback ??
      (isLoading
        ? {
            detail: "正在同步系統資訊、資源監控與維護操作狀態。",
            title: "正在同步裝置狀態",
            tone: "loading" as const
          }
        : {
            detail: "可在此檢查裝置資訊、資源監控與維護操作回饋。",
            title: "裝置狀態已同步",
            tone: "ready" as const
          }),
    runtimeSummary,
    networkRows: [
      {
        label: "網路狀態",
        value: isLoading ? "同步中" : status ? "● 管理通道可達" : "● 未連線"
      },
      {
        label: "訊號強度",
        value: status ? "目前無可信訊號強度量測" : "需待裝置狀態恢復後確認"
      }
    ],
    displayOpsSummary: {
      alertCount: displayOpsSummary?.alerts.length ?? 0,
      alerts:
        displayOpsSummary?.alerts.map((alert) => ({
          ...alert,
          pageLabel: alert.pageId ? `${alert.pageId}` : "global"
        })) ?? [],
      assetHealthLabel: `${displayOpsSummary?.assetHealthSummary.unhealthyCount ?? 0} unhealthy`,
      degraded: displayOpsSummary?.degraded ?? false,
      diagnosticsLabel:
        displayOpsSummary?.diagnosticActions.map((action) => action.label).join(" / ") ?? "--",
      diagnostics: displayOpsSummary?.diagnosticActions ?? [],
      draftCount: displayOpsSummary?.draftCount ?? 0,
      helper:
        displayOpsSummary?.alerts[0]?.message ??
        "可在此查看 live publish、skip 與 readiness 摘要。",
      lastPublishLabel: formatTimestamp(displayOpsSummary?.lastPublishAt),
      liveVersion:
        displayOpsSummary?.liveVersion === null || displayOpsSummary?.liveVersion === undefined
          ? "--"
          : `v${displayOpsSummary.liveVersion}`,
      readinessLabel: `${displayOpsSummary?.readinessSummary.blockingCount ?? 0} blocking`,
      skipLabel: `${displayOpsSummary?.skipSummary.count ?? 0} skipped`,
      statusTitle: displayOpsSummary?.degraded ? "展示退化" : "展示正常"
    },
    logsSummary: logExportError
      ? {
          detail: logExportError,
          directoryLabel: "--",
          fileCountLabel: "Unavailable",
          statusTitle: "日誌不可用"
        }
      : {
          detail:
            logExport === null
              ? "尚未載入裝置日誌 metadata。"
              : logExport.files.length > 0
                ? logExport.files.slice(0, 3).join(" / ")
                : "目前沒有可供匯出的 .log 檔案。",
          directoryLabel: logExport?.directory ?? "--",
          fileCountLabel: logExport === null ? "--" : `${logExport.files.length} files`,
          statusTitle: logExport === null ? "尚未載入" : "最近日誌"
        },
    resourceCards: [
      {
        gaugeValue: status ? formatPercent(status.cpu.loadAvg[0] * 100) : "--",
        helper: status ? `1m / 5m / 15m: ${status.cpu.loadAvg.map((value) => value.toFixed(2)).join(" / ")}` : "--",
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
        gaugeValue: "--",
        helper: status ? "目前無可信溫度量測來源" : "--",
        label: "系統溫度",
        valueLabel: status ? "Unavailable" : "--"
      }
    ].map((card, index) => {
      const gaugePercent = gaugePercentForCard(card.label, card.gaugeValue, card.valueLabel);
      let gaugeColor: string;
      if (card.valueLabel === "Unavailable") {
        gaugeColor = "#7c847c";
      } else if (index === 3) {
        gaugeColor = gaugePercent >= 75 ? "#c14a4a" : gaugePercent >= 55 ? "#c9881a" : "#d89c45";
      } else {
        gaugeColor = gaugePercent >= 90 ? "#c14a4a" : gaugePercent >= 70 ? "#c9881a" : "#4f7c42";
      }
      return { ...card, gaugeColor, gaugePercent };
    }),
    systemRows: [
      {
        label: "裝置名稱",
        value: status?.hostname ?? "-"
      },
      {
        label: "平台",
        value: status ? `${status.platform} / ${status.arch}` : "-"
      },
      {
        label: "Node.js",
        value: status?.nodeVersion ?? "-"
      },
      {
        label: "運行時間",
        value: formatUptime(status?.uptimeSeconds ?? null)
      },
      {
        label: "CPU 核心",
        value: status ? String(status.cpu.cores) : "-"
      },
      {
        label: "PID",
        value: status ? String(status.pid) : "-"
      }
    ]
  };
}
