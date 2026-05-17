import { liveMetrics } from "../../mocks/metrics";
import type { LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";

type OverviewMetricKey =
  | "realTimePower"
  | "todayGeneration"
  | "totalGeneration"
  | "todayCo2Reduction"
  | "totalCo2Reduction";

type OverviewMetricCard = {
  accentColor: boolean;
  fallbackIndex: number;
  iconKey: OverviewMetricIconKey;
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

type OverviewMetricIconKey = "bars" | "bolt" | "co2" | "leaf" | "sun";

const metricCards: OverviewMetricCard[] = [
  { accentColor: false, fallbackIndex: 0, iconKey: "bolt", key: "realTimePower",     label: "即時發電功率",   unit: "kW"  },
  { accentColor: true,  fallbackIndex: 1, iconKey: "sun",  key: "todayGeneration",   label: "今日發電量",     unit: "kWh" },
  { accentColor: false, fallbackIndex: 2, iconKey: "bars", key: "totalGeneration",   label: "累積發電量",     unit: "GWh" },
  { accentColor: false, fallbackIndex: 3, iconKey: "co2",  key: "todayCo2Reduction", label: "今日 CO₂ 減量",  unit: "t"   },
  { accentColor: false, fallbackIndex: 4, iconKey: "leaf", key: "totalCo2Reduction", label: "累積 CO₂ 減量",  unit: "t"   }
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
      subtitleLines: ["Driving a Better Future with", "Green Manufacturing"],
      titleLines: ["以綠色製造", "驅動美好生活"]
    },
    metrics: metricCards.map(({ accentColor, fallbackIndex, iconKey, key, label, unit }) => {
      const fallbackMetric = liveMetrics[fallbackIndex]!;
      const liveMetric = snapshot.metrics[key];

      if (!isSocketConnected || !liveMetric) {
        return {
          accentColor: accentColor,
          helper: fallbackMetric.helper,
          iconKey,
          label,
          unit,
          value: fallbackMetric.value
        };
      }

      return {
        accentColor: accentColor,
        helper: `最後更新 ${formatHelperTimestamp(liveMetric.timestamp)}`,
        iconKey,
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
