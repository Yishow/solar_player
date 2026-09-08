export const freshnessCategories = [
  "realtime",
  "daily",
  "cumulative",
  "static"
] as const;

export const freshnessStates = [
  "live",
  "delayed",
  "stale",
  "historical",
  "unavailable"
] as const;

export type FreshnessCategory = (typeof freshnessCategories)[number];
export type FreshnessState = (typeof freshnessStates)[number];

export type FreshnessThresholds = {
  delayedAfterMs: number;
  historicalAfterMs: number;
  staleAfterMs: number;
};

export type FreshnessPolicy = {
  cumulative: FreshnessThresholds;
  daily: FreshnessThresholds;
  realtime: FreshnessThresholds;
  static: null;
};

export type FreshnessResult = {
  ageFrozen: boolean;
  ageMs: number | null;
  category: FreshnessCategory;
  nextTransitionAt: string | null;
  sourceTimestamp: string | null;
  state: FreshnessState;
};

export const freshnessMetricCategoryRegistry = {
  accumulatedCarbonReductionTons: "cumulative",
  accumulatedGenerationGwh: "cumulative",
  annualEnergySavingPercent: "daily",
  consumptionEnergy: "cumulative",
  plantedTreeEquivalent: "cumulative",
  realTimePower: "realtime",
  selfConsumptionEnergy: "cumulative",
  selfConsumptionRatio: "realtime",
  systemEfficiency: "realtime",
  todayCo2Reduction: "daily",
  todayGeneration: "daily",
  totalCo2Reduction: "cumulative",
  totalGeneration: "cumulative"
} as const satisfies Record<string, FreshnessCategory>;

export function resolveFreshnessCategoryForMetric(
  metricKey: string
): FreshnessCategory {
  const registered =
    freshnessMetricCategoryRegistry[
      metricKey as keyof typeof freshnessMetricCategoryRegistry
    ];
  if (registered) {
    return registered;
  }

  if (
    metricKey.startsWith("factoryCircuit.")
    || /^factory(?:Stamping|Body|Painting|Assembly|Utility|Office|HeavyVehicle|EdCoating)Power$/.test(
      metricKey
    )
  ) {
    return "realtime";
  }

  if (metricKey.startsWith("factoryGeneration.")) {
    return metricKey.endsWith(".todayMwh") ? "daily" : "cumulative";
  }

  if (/(?:Energy|Generation|Reduction|Mwh|Gwh|Total)$/u.test(metricKey)) {
    return /(?:today|daily)/iu.test(metricKey) ? "daily" : "cumulative";
  }

  return "realtime";
}

export function createDefaultFreshnessPolicy(): FreshnessPolicy {
  return {
    cumulative: {
      delayedAfterMs: 600_000,
      historicalAfterMs: 86_400_000,
      staleAfterMs: 3_600_000
    },
    daily: {
      delayedAfterMs: 93_600_000,
      historicalAfterMs: 604_800_000,
      staleAfterMs: 172_800_000
    },
    realtime: {
      delayedAfterMs: 30_000,
      historicalAfterMs: 1_800_000,
      staleAfterMs: 90_000
    },
    static: null
  };
}

function isValidThresholds(value: unknown): value is FreshnessThresholds {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const delayed = candidate.delayedAfterMs;
  const stale = candidate.staleAfterMs;
  const historical = candidate.historicalAfterMs;
  return (
    typeof delayed === "number"
    && Number.isFinite(delayed)
    && delayed > 0
    && typeof stale === "number"
    && Number.isFinite(stale)
    && stale > delayed
    && typeof historical === "number"
    && Number.isFinite(historical)
    && historical > stale
  );
}

export function validateFreshnessPolicy(value: unknown):
  | { policy: FreshnessPolicy; valid: true }
  | { error: "freshness_policy_invalid"; valid: false } {
  if (typeof value !== "object" || value === null) {
    return { error: "freshness_policy_invalid", valid: false };
  }
  const candidate = value as Record<string, unknown>;
  if (
    Object.keys(candidate).length !== freshnessCategories.length
    || !isValidThresholds(candidate.realtime)
    || !isValidThresholds(candidate.daily)
    || !isValidThresholds(candidate.cumulative)
    || candidate.static !== null
  ) {
    return { error: "freshness_policy_invalid", valid: false };
  }

  return {
    policy: {
      cumulative: { ...candidate.cumulative },
      daily: { ...candidate.daily },
      realtime: { ...candidate.realtime },
      static: null
    },
    valid: true
  };
}

function stateForAge(
  category: FreshnessCategory,
  ageMs: number,
  policy: FreshnessPolicy
): FreshnessState {
  const thresholds = policy[category];
  if (thresholds === null) {
    return "live";
  }
  if (ageMs >= thresholds.historicalAfterMs) {
    return "historical";
  }
  if (ageMs >= thresholds.staleAfterMs) {
    return "stale";
  }
  if (ageMs >= thresholds.delayedAfterMs) {
    return "delayed";
  }
  return "live";
}

function nextBoundaryForAge(
  category: FreshnessCategory,
  ageMs: number,
  policy: FreshnessPolicy
) {
  const thresholds = policy[category];
  if (thresholds === null) {
    return null;
  }
  return [
    thresholds.delayedAfterMs,
    thresholds.staleAfterMs,
    thresholds.historicalAfterMs
  ].find((boundary) => ageMs < boundary) ?? null;
}

export function evaluateFreshness(input: {
  category: FreshnessCategory;
  nowMs: number;
  policy: FreshnessPolicy;
  sourceTimestamp: string | null;
}): FreshnessResult {
  const parsedSourceTimestamp =
    input.sourceTimestamp === null ? Number.NaN : Date.parse(input.sourceTimestamp);
  if (!Number.isFinite(parsedSourceTimestamp)) {
    return {
      ageFrozen: false,
      ageMs: null,
      category: input.category,
      nextTransitionAt: null,
      sourceTimestamp: null,
      state: "unavailable"
    };
  }

  const ageMs = Math.max(0, input.nowMs - parsedSourceTimestamp);
  const nextBoundary = nextBoundaryForAge(input.category, ageMs, input.policy);
  return {
    ageFrozen: false,
    ageMs,
    category: input.category,
    nextTransitionAt:
      nextBoundary === null
        ? null
        : new Date(parsedSourceTimestamp + nextBoundary).toISOString(),
    sourceTimestamp: new Date(parsedSourceTimestamp).toISOString(),
    state: stateForAge(input.category, ageMs, input.policy)
  };
}

export function advanceFreshnessWhileOffline(input: {
  elapsedMs: number;
  policy: FreshnessPolicy;
  snapshot: FreshnessResult;
  timeTrusted: boolean;
}): FreshnessResult {
  if (!input.timeTrusted || input.snapshot.ageMs === null) {
    return {
      ...input.snapshot,
      ageFrozen: !input.timeTrusted
    };
  }

  const ageMs = input.snapshot.ageMs + Math.max(0, input.elapsedMs);
  const sourceTimestamp = input.snapshot.sourceTimestamp;
  if (sourceTimestamp === null) {
    return input.snapshot;
  }
  const sourceMs = Date.parse(sourceTimestamp);
  return evaluateFreshness({
    category: input.snapshot.category,
    nowMs: sourceMs + ageMs,
    policy: input.policy,
    sourceTimestamp
  });
}

const freshnessStateRank: Record<FreshnessState, number> = {
  live: 0,
  delayed: 1,
  stale: 2,
  historical: 3,
  unavailable: 4
};

export function dominantFreshnessState(states: FreshnessState[]): FreshnessState {
  return [...states].sort((left, right) => freshnessStateRank[right] - freshnessStateRank[left])[0] ?? "unavailable";
}

export function aggregateFreshnessResults(
  results: Array<{ metricKey: string; freshness: FreshnessResult }>
) {
  const dominant = [...results].sort(
    (left, right) =>
      freshnessStateRank[right.freshness.state]
      - freshnessStateRank[left.freshness.state]
  )[0] ?? null;

  return {
    metricKey: dominant?.metricKey ?? null,
    sourceTimestamp: dominant?.freshness.sourceTimestamp ?? null,
    state: dominant?.freshness.state ?? "unavailable"
  };
}

export function resolveFreshnessPresentation(state: FreshnessState) {
  switch (state) {
    case "delayed":
      return { label: "Data delayed", labelZh: "資料延遲", liveVisuals: false };
    case "stale":
      return { label: "Non-live data", labelZh: "非即時資料", liveVisuals: false };
    case "historical":
      return { label: "Historical snapshot", labelZh: "歷史快照", liveVisuals: false };
    case "unavailable":
      return { label: "Data unavailable", labelZh: "資料不可用", liveVisuals: false };
    default:
      return { label: "Live", labelZh: "即時資料", liveVisuals: true };
  }
}
