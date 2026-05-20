export type MonitoringStateCategory = "degraded" | "empty" | "fresh" | "stale";

export type MonitoringSurfaceState = {
  category: MonitoringStateCategory;
  detailLabel: string;
  emptyStateLabel: string;
  freshnessLabel: string;
  sourceRoleLabel: string;
  statusLabel: string;
};

const CATEGORY_STATUS_LABELS: Record<MonitoringStateCategory, string> = {
  degraded: "目前以降級資料維持畫面",
  empty: "目前沒有可用資料",
  fresh: "主要來源已同步",
  stale: "主要來源已逾時"
};

function formatUpdatedLabel(lastUpdatedAt: string) {
  return new Date(lastUpdatedAt).toLocaleString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit"
  });
}

export function isMonitoringSourceStale(
  lastUpdatedAt: string | null,
  options?: {
    now?: Date | string;
    staleAfterMs?: number;
  }
) {
  if (!lastUpdatedAt) {
    return false;
  }

  const staleAfterMs = options?.staleAfterMs ?? 30 * 60 * 1000;
  const nowTime =
    options?.now instanceof Date
      ? options.now.getTime()
      : typeof options?.now === "string"
        ? new Date(options.now).getTime()
        : Date.now();
  const updatedTime = new Date(lastUpdatedAt).getTime();

  if (!Number.isFinite(nowTime) || !Number.isFinite(updatedTime)) {
    return false;
  }

  return nowTime - updatedTime > staleAfterMs;
}

export function buildMonitoringSurfaceState({
  category,
  detailLabel,
  emptyStateLabel,
  freshnessLabel,
  lastUpdatedAt,
  sourceRoleLabel
}: {
  category: MonitoringStateCategory;
  detailLabel: string;
  emptyStateLabel: string;
  freshnessLabel: string;
  lastUpdatedAt: string | null;
  sourceRoleLabel: string;
}): MonitoringSurfaceState {
  const resolvedDetailLabel =
    lastUpdatedAt && category !== "empty"
      ? `${detailLabel} · ${formatUpdatedLabel(lastUpdatedAt)}`
      : detailLabel;

  return {
    category,
    detailLabel: resolvedDetailLabel,
    emptyStateLabel,
    freshnessLabel,
    sourceRoleLabel,
    statusLabel: CATEGORY_STATUS_LABELS[category]
  };
}
