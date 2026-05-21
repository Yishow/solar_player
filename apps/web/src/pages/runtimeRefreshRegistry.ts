import type {
  DisplayPageKey,
  DisplaySyncEventScope,
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
    refreshScopes: ["circuits", "display-pages", "mqtt"],
    sourceKind: "display-story"
  },
  images: {
    refreshKey: (context) => `images:${context.activeIndex ?? 0}`,
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
    refreshScopes: ["sustainability"],
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

export function resolveMonitoringHistoryRuntimeRefreshSpec(range: MonitoringHistoryRuntimeRangeKey) {
  return {
    refreshKey: `monitoring-history:${range}`,
    refreshScopes: ["monitoring-history"] as DisplaySyncEventScope[],
    sourceKind: "monitoring-history" as const
  };
}
