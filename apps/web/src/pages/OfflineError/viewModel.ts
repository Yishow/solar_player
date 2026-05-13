type BuildOfflineErrorViewModelArgs = {
  lastUpdatedAt: string | null;
  reason: string | null;
  retryCountdown: number;
  returnTo: string;
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "尚未收到";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-TW", {
    hour12: false
  });
}

function resolveReasonLabel(reason: string | null) {
  if (reason === "reconnecting") {
    return "MQTT broker 正在重新連線，系統暫停即時推送。";
  }

  if (reason === "mock") {
    return "目前為 mock mode，不會連到實體 broker。";
  }

  if (reason === "offline") {
    return "MQTT broker 離線或網路中斷。";
  }

  if (!reason || reason === "connected") {
    return "正在等待最新的連線狀態。";
  }

  return reason;
}

export function buildOfflineErrorViewModel({
  lastUpdatedAt,
  reason,
  retryCountdown,
  returnTo
}: BuildOfflineErrorViewModelArgs) {
  return {
    guidanceRows: [
      {
        label: "最後更新時間",
        value: formatTimestamp(lastUpdatedAt)
      },
      {
        label: "錯誤原因",
        value: resolveReasonLabel(reason)
      },
      {
        label: "建議處理方式",
        value: "請檢查網路、broker 狀態與 `settings/mqtt` 設定，必要時先切回備援輪播。"
      }
    ],
    headline: "無法取得即時資料",
    reasonLabel: resolveReasonLabel(reason),
    returnToLabel: returnTo,
    retryLabel: `將於 ${retryCountdown} 秒後重新嘗試連線`,
    subtitle: "Unable to retrieve live data.",
    lastUpdatedLabel: formatTimestamp(lastUpdatedAt)
  };
}
