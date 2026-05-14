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
  isLoading: boolean;
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

export function buildDeviceStatusViewModel({
  actionFeedback,
  isLoading,
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
        label: "資料同步",
        value: isLoading ? "同步中" : status ? "● 裝置狀態已同步" : "未取得狀態"
      },
      {
        label: "網路備註",
        value: status ? "以有線 / 系統層網路為主" : "需待裝置狀態恢復後確認"
      }
    ],
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
        gaugeValue: status ? "52%" : "--",
        helper: status ? "正常 Normal" : "--",
        label: "系統溫度",
        valueLabel: status ? "--" : "--"
      }
    ].map((card, index) => ({
      ...card,
      gaugeColor: index === 3 ? "#ff5a24" : "#4f7c42",
      gaugePercent: gaugePercentForCard(card.label, card.gaugeValue, card.valueLabel)
    })),
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
