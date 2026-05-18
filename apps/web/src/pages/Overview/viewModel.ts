import type {
  MonitoringAlertTone,
  MonitoringBindingState,
  MonitoringFallbackReason,
  MonitoringFreshnessState,
  MonitoringMetricBinding
} from "@solar-display/shared";
import {
  resolveMonitoringMetricBinding,
  resolveMonitoringSummaryState
} from "@solar-display/shared";
import { liveMetrics } from "../../mocks/metrics";
import type { LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";

type OverviewMetricKey =
  | "realTimePower"
  | "todayGeneration"
  | "totalGeneration"
  | "todayCo2Reduction"
  | "totalCo2Reduction";

type OverviewStatus = "connected" | "connecting" | "disconnected";
type OverviewMetricIconKey = "bars" | "bolt" | "co2" | "leaf" | "sun";

type OverviewMetricCard = {
  accentColor?: boolean;
  iconKey: OverviewMetricIconKey;
} & MonitoringMetricBinding<OverviewMetricKey>;

type BuildOverviewViewModelArgs = {
  connectionState: SocketConnectionState["status"];
  isSocketConnected: boolean;
  metricBindings?: OverviewMetricCard[];
  now?: string;
  snapshot: LiveMetricsSnapshot;
  storyOverview?: {
    metrics: Array<MonitoringMetricBinding<string>>;
    summary: {
      alertTone: MonitoringAlertTone;
      bindingState: MonitoringBindingState;
      fallbackReason: MonitoringFallbackReason | null;
      freshnessState: MonitoringFreshnessState;
    };
  };
  summaryMetricKeys?: OverviewMetricKey[];
};

export type OverviewViewModel = ReturnType<typeof buildOverviewViewModel>;

const metricCards: OverviewMetricCard[] = [
  { accentColor: false, fallbackIndex: 0, iconKey: "bolt", metricKey: "realTimePower", label: "即時發電功率", unit: "kW" },
  { accentColor: true, fallbackIndex: 1, iconKey: "sun", metricKey: "todayGeneration", label: "今日發電量", unit: "kWh" },
  { accentColor: false, fallbackIndex: 2, iconKey: "bars", metricKey: "totalGeneration", label: "累積發電量", unit: "GWh" },
  { accentColor: false, fallbackIndex: 3, iconKey: "co2", metricKey: "todayCo2Reduction", label: "今日 CO₂ 減量", unit: "t" },
  { accentColor: false, fallbackIndex: 4, iconKey: "leaf", metricKey: "totalCo2Reduction", label: "累積 CO₂ 減量", unit: "t" }
];

function resolveSummaryStatus(connectionState: SocketConnectionState["status"]): OverviewStatus {
  if (connectionState === "connected") {
    return "connected";
  }

  if (connectionState === "connecting") {
    return "connecting";
  }

  return "disconnected";
}

function resolveSummaryLabel(args: {
  isSocketConnected: boolean;
  summaryState: {
    bindingState: MonitoringBindingState;
    fallbackReason: MonitoringFallbackReason | null;
    freshnessState: MonitoringFreshnessState;
  };
}) {
  if (!args.isSocketConnected) {
    return "Socket 未連線，顯示 mock 資料";
  }

  if (args.summaryState.fallbackReason === "stale-data" || args.summaryState.freshnessState === "stale") {
    return "資料延遲，摘要使用最近一次有效讀值";
  }

  if (args.summaryState.bindingState === "missing" || args.summaryState.freshnessState === "fallback") {
    return "部分 KPI 缺資料，使用 fallback 顯示";
  }

  return "Socket 即時更新中";
}

function resolveStoryMetricCards(storyMetrics: Array<MonitoringMetricBinding<string>>) {
  const storyMetricByKey = new Map(storyMetrics.map((metric) => [metric.metricKey, metric]));

  return metricCards.map((metricCard) => {
    const storyMetric = storyMetricByKey.get(metricCard.metricKey);

    if (!storyMetric) {
      return metricCard;
    }

    return {
      ...storyMetric,
      accentColor: metricCard.accentColor,
      iconKey: metricCard.iconKey,
      metricKey: metricCard.metricKey
    };
  });
}

export function buildOverviewViewModel({
  connectionState,
  isSocketConnected,
  metricBindings = metricCards,
  now,
  snapshot,
  storyOverview,
  summaryMetricKeys
}: BuildOverviewViewModelArgs) {
  const shouldUseStoryOverview =
    storyOverview !== undefined &&
    storyOverview.metrics.length >= 3 &&
    storyOverview.summary.freshnessState !== "fallback";
  const resolvedMetricBindings = shouldUseStoryOverview
    ? resolveStoryMetricCards(storyOverview.metrics)
    : metricBindings;

  const metrics = resolvedMetricBindings.map(({ accentColor = false, iconKey, ...binding }) => {
    const fallbackMetric = liveMetrics[binding.fallbackIndex]!;
    const resolved = resolveMonitoringMetricBinding({
      binding: {
        ...binding,
        fallbackHelper: fallbackMetric.helper,
        fallbackValue: fallbackMetric.value
      },
      isConnected: isSocketConnected,
      now,
      reading: snapshot.metrics[binding.metricKey] ?? null
    });

    return {
      accentColor,
      alertTone: resolved.alertTone,
      bindingState: resolved.bindingState,
      fallbackReason: resolved.fallbackReason,
      freshnessState: resolved.freshnessState,
      helper: resolved.helper,
      iconKey,
      label: resolved.label,
      metricKey: resolved.metricKey,
      unit: resolved.unit,
      value: resolved.value
    };
  });
  const summaryState = shouldUseStoryOverview
    ? storyOverview.summary
    : resolveMonitoringSummaryState(
        metrics.filter((metric) =>
          (summaryMetricKeys ?? resolvedMetricBindings.map((binding) => binding.metricKey)).includes(
            metric.metricKey as OverviewMetricKey
          )
        )
      );

  return {
    hero: {
      eyebrow: "綠能驅動・永續未來",
      subtitleLines: ["Driving a Better Future with", "Green Manufacturing"],
      titleLines: ["以綠色製造", "驅動美好生活"]
    },
    metrics,
    summary: {
      alertTone: summaryState.alertTone,
      fallbackReason: summaryState.fallbackReason,
      status: resolveSummaryStatus(connectionState),
      statusLabel: resolveSummaryLabel({
        isSocketConnected,
        summaryState
      })
    }
  };
}
