import type {
  DisplayPageKey,
  DisplaySyncEvent,
  DisplaySyncEventScope,
  MetricScope,
  SustainabilityPeriodKey
} from "@solar-display/shared";

export type DisplayPageRuntimeSourceKind =
  | "display-story"
  | "image-playlist"
  | "monitoring-history"
  | "sustainability-story";

export type MonitoringHistoryRuntimeRangeKey = "day" | "month" | "total" | "week" | "year";

type RuntimeRefreshRegistryContext = {
  activeIndex?: number;
  dependencyKey?: string | null;
  selectedPeriod?: SustainabilityPeriodKey;
};

type RuntimeRefreshRegistryEntry = {
  fallbackRefreshScopes?: DisplaySyncEventScope[];
  sourceKind: DisplayPageRuntimeSourceKind;
  refreshKey: (context: RuntimeRefreshRegistryContext) => string;
  refreshScopes: DisplaySyncEventScope[];
};

const runtimeRefreshRegistry: Record<DisplayPageKey, RuntimeRefreshRegistryEntry> = {
  "factory-circuit": {
    fallbackRefreshScopes: ["circuits", "display-pages"],
    refreshKey: (context) =>
      context.dependencyKey ? `factory-circuit:${context.dependencyKey}` : "factory-circuit",
    refreshScopes: ["circuits", "display-pages", "mqtt", "playback"],
    sourceKind: "display-story"
  },
  "factory-circuit-guanyin": {
    fallbackRefreshScopes: ["circuits", "display-pages"],
    refreshKey: (context) =>
      context.dependencyKey ? `factory-circuit-guanyin:${context.dependencyKey}` : "factory-circuit-guanyin",
    refreshScopes: ["circuits", "display-pages", "mqtt", "playback"],
    sourceKind: "display-story"
  },
  images: {
    refreshKey: () => "images",
    refreshScopes: ["display-pages", "images"],
    sourceKind: "image-playlist"
  },
  overview: {
    refreshKey: () => "overview",
    refreshScopes: ["display-pages", "mqtt"],
    sourceKind: "display-story"
  },
  solar: {
    refreshKey: () => "solar",
    refreshScopes: ["display-pages", "mqtt"],
    sourceKind: "display-story"
  },
  sustainability: {
    refreshKey: (context) => `sustainability:${context.selectedPeriod ?? "lifetime"}`,
    refreshScopes: ["sustainability", "playback", "mqtt"],
    sourceKind: "sustainability-story"
  }
};

export function resolveDisplayPageRuntimeRefreshSpec(
  pageKey: DisplayPageKey,
  context: RuntimeRefreshRegistryContext = {}
) {
  const entry = runtimeRefreshRegistry[pageKey];

  return {
    fallbackRefreshScopes: entry.fallbackRefreshScopes ?? entry.refreshScopes,
    pageKey,
    refreshKey: entry.refreshKey(context),
    refreshScopes: entry.refreshScopes,
    sourceKind: entry.sourceKind
  };
}

export function resolveMonitoringHistoryRuntimeRefreshSpec(
  range: MonitoringHistoryRuntimeRangeKey,
  metricScope?: MetricScope
) {
  return {
    refreshKey: metricScope
      ? `monitoring-history:${metricScope}:${range}`
      : `monitoring-history:${range}`,
    refreshScopes: ["monitoring-history"] as DisplaySyncEventScope[],
    sourceKind: "monitoring-history" as const
  };
}

export function shouldRefreshMonitoringHistory(
  event: Pick<DisplaySyncEvent, "metricScope" | "scope">,
  metricScope: MetricScope
) {
  return event.scope === "monitoring-history" && event.metricScope === metricScope;
}
