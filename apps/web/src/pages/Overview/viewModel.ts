import type {
  MonitoringAlertTone,
  MonitoringBindingState,
  MonitoringFallbackReason,
  MonitoringFreshnessState,
  MonitoringMetricBinding,
  ResolvedMonitoringMetricBinding
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
    metrics: Array<ResolvedMonitoringMetricBinding<string>>;
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
  usesSharedStory: boolean;
  summaryState: {
    bindingState: MonitoringBindingState;
    fallbackReason: MonitoringFallbackReason | null;
    freshnessState: MonitoringFreshnessState;
  };
}) {
  if (args.usesSharedStory) {
    if (args.summaryState.fallbackReason === "stale-data" || args.summaryState.freshnessState === "stale") {
      return "共享故事資料延遲，摘要使用最近一次有效讀值";
    }

    if (args.summaryState.bindingState === "missing" || args.summaryState.freshnessState === "fallback") {
      return "共享故事部分缺值，缺少 KPI 會回退顯示";
    }

    return "共享故事資料同步中";
  }

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

function resolveStoryMetricCards(
  metricBindings: OverviewMetricCard[],
  storyMetrics: Array<ResolvedMonitoringMetricBinding<string>>
) {
  const storyMetricByKey = new Map(storyMetrics.map((metric) => [metric.metricKey, metric]));

  return metricBindings.map((metricCard) => {
    const storyMetric = storyMetricByKey.get(metricCard.metricKey);

    if (!storyMetric) {
      return metricCard;
    }

    return {
      accentColor: metricCard.accentColor,
      alertTone: storyMetric.alertTone,
      bindingState: storyMetric.bindingState,
      fallbackReason: storyMetric.fallbackReason,
      freshnessState: storyMetric.freshnessState,
      helper: storyMetric.helper,
      iconKey: metricCard.iconKey,
      label: storyMetric.label,
      metricKey: metricCard.metricKey,
      unit: storyMetric.unit,
      value: storyMetric.value
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
  const hasStoryOverview = storyOverview !== undefined;
  const resolvedMetricBindings = hasStoryOverview
    ? resolveStoryMetricCards(metricBindings, storyOverview.metrics)
    : metricBindings;

  const metrics = resolvedMetricBindings.map((metricCard) => {
    const { accentColor = false, iconKey } = metricCard;

    if ("helper" in metricCard) {
      return {
        accentColor,
        alertTone: metricCard.alertTone,
        bindingState: metricCard.bindingState,
        fallbackReason: metricCard.fallbackReason,
        freshnessState: metricCard.freshnessState,
        helper: metricCard.helper,
        iconKey,
        label: metricCard.label,
        metricKey: metricCard.metricKey,
        unit: metricCard.unit,
        value: metricCard.value
      };
    }

    const binding = metricCard;
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
  const summaryState = hasStoryOverview
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
        usesSharedStory: hasStoryOverview,
        summaryState
      })
    }
  };
}
