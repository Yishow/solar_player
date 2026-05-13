import { liveMetrics } from "../../mocks/metrics";
import type { LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";

type OverviewMetricKey =
  | "realTimePower"
  | "todayGeneration"
  | "selfConsumptionRatio"
  | "todayCo2Reduction"
  | "systemEfficiency";

type OverviewMetricCard = {
  fallbackIndex: number;
  icon: string;
  key: OverviewMetricKey;
  label: string;
  unit: string;
};

type BuildOverviewViewModelArgs = {
  connectionState: SocketConnectionState["status"];
  isSocketConnected: boolean;
  snapshot: LiveMetricsSnapshot;
};

type OverviewStatus = "connected" | "connecting" | "disconnected";

export type OverviewViewModel = ReturnType<typeof buildOverviewViewModel>;

const metricCards: OverviewMetricCard[] = [
  { fallbackIndex: 0, icon: "⚡", key: "realTimePower", label: "即時功率", unit: "kW" },
  { fallbackIndex: 1, icon: "☀️", key: "todayGeneration", label: "今日發電量", unit: "kWh" },
  { fallbackIndex: 2, icon: "🏭", key: "selfConsumptionRatio", label: "自發自用比例", unit: "%" },
  { fallbackIndex: 3, icon: "🌿", key: "todayCo2Reduction", label: "今日減碳量", unit: "t" },
  { fallbackIndex: 4, icon: "🛰️", key: "systemEfficiency", label: "系統效率", unit: "%" }
];

function formatMetricValue(value: number, unit: string | null) {
  const digits = unit === "%" ? 1 : Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits === 0 ? 0 : 1
  });
}

function formatHelperTimestamp(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString("zh-TW", {
    hour12: false
  });
}

function resolveSummaryStatus(connectionState: SocketConnectionState["status"]): OverviewStatus {
  if (connectionState === "connected") {
    return "connected";
  }

  if (connectionState === "connecting") {
    return "connecting";
  }

  return "disconnected";
}

export function buildOverviewViewModel({
  connectionState,
  isSocketConnected,
  snapshot
}: BuildOverviewViewModelArgs) {
  return {
    hero: {
      eyebrow: "綠能驅動・永續未來",
      subtitle: "Driving a Better Future with Green Manufacturing",
      titleLines: ["以綠色製造", "驅動美好生活"]
    },
    metrics: metricCards.map(({ fallbackIndex, icon, key, label, unit }) => {
      const fallbackMetric = liveMetrics[fallbackIndex]!;
      const liveMetric = snapshot.metrics[key];

      if (!isSocketConnected || !liveMetric) {
        return {
          helper: fallbackMetric.helper,
          icon,
          label,
          unit,
          value: fallbackMetric.value
        };
      }

      return {
        helper: `最後更新 ${formatHelperTimestamp(liveMetric.timestamp)}`,
        icon,
        label,
        unit: liveMetric.unit ?? unit,
        value: formatMetricValue(liveMetric.value, liveMetric.unit ?? unit)
      };
    }),
    summary: {
      status: resolveSummaryStatus(connectionState),
      statusLabel:
        isSocketConnected ? "Socket 即時更新中" : "Socket 未連線，顯示 mock 資料"
    }
  };
}
