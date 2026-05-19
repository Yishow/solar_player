import type {
  DisplayPageKey,
  DisplaySyncEventScope,
  SustainabilityPeriodKey
} from "@solar-display/shared";

export type DisplayPageRuntimeSourceKind =
  | "display-story"
  | "image-playlist"
  | "sustainability-story";

type RuntimeRefreshRegistryContext = {
  activeIndex?: number;
  dependencyKey?: string | null;
  selectedPeriod?: SustainabilityPeriodKey;
};

type RuntimeRefreshRegistryEntry = {
  sourceKind: DisplayPageRuntimeSourceKind;
  refreshKey: (context: RuntimeRefreshRegistryContext) => string;
  refreshScopes: DisplaySyncEventScope[];
};

const runtimeRefreshRegistry: Record<DisplayPageKey, RuntimeRefreshRegistryEntry> = {
  "factory-circuit": {
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
    refreshScopes: ["display-pages"],
    sourceKind: "sustainability-story"
  }
};

export function resolveDisplayPageRuntimeRefreshSpec(
  pageKey: DisplayPageKey,
  context: RuntimeRefreshRegistryContext = {}
) {
  const entry = runtimeRefreshRegistry[pageKey];

  return {
    pageKey,
    refreshKey: entry.refreshKey(context),
    refreshScopes: entry.refreshScopes,
    sourceKind: entry.sourceKind
  };
}
