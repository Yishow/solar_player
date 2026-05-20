export const sustainabilityPeriodKeys = ["month", "quarter", "year", "lifetime"] as const;

export type SustainabilityPeriodKey = (typeof sustainabilityPeriodKeys)[number];
export type SustainabilitySyncState = "fresh" | "missing" | "stale" | "warning";
export type SustainabilitySourceClass =
  | "runtime-aggregate"
  | "derived-metric"
  | "manual-module"
  | "missing";
export type SustainabilityComparisonFallbackReason =
  | "aggregate-missing"
  | "comparison-baseline-missing";
export type SustainabilityComparisonState = "available" | "unavailable";
export type SustainabilityBigNumberKey =
  | "annualEnergySavingPercent"
  | "accumulatedCarbonReductionTons"
  | "accumulatedGenerationGwh"
  | "plantedTreeEquivalent";
export type SustainabilityStoryModuleType =
  | "esg-summary"
  | "milestone"
  | "project-outcome";

export type SustainabilityProvenance = {
  label: string;
  source: string;
  sourceClass: SustainabilitySourceClass;
  syncState: SustainabilitySyncState;
  updatedAt: string | null;
};

export type SustainabilityStoryHighlightInput = {
  label: string;
  provenance?: Partial<SustainabilityProvenance> | null;
  unit: string;
  value: string;
};

export type SustainabilityStoryHighlight = {
  label: string;
  provenance: SustainabilityProvenance;
  unit: string;
  value: string;
};

export type SustainabilityStoryModuleInput = {
  bullets?: Array<string | null | undefined>;
  description?: string | null;
  id: string;
  provenance?: Partial<SustainabilityProvenance> | null;
  title?: string | null;
  type: SustainabilityStoryModuleType;
};

export type SustainabilityStoryBigNumbers = Record<SustainabilityBigNumberKey, number | null>;
export type SustainabilityStoryBigNumberProvenance = Record<
  SustainabilityBigNumberKey,
  SustainabilityProvenance
>;

export type SustainabilityStoryComparison = {
  delta: string | null;
  fallbackReason: SustainabilityComparisonFallbackReason | null;
  label: string;
  state: SustainabilityComparisonState;
};

export type SustainabilityPeriodStoryInput = {
  bigNumberProvenance?: Partial<SustainabilityStoryBigNumberProvenance>;
  bigNumbers: SustainabilityStoryBigNumbers;
  comparison?: Partial<SustainabilityStoryComparison> | null;
  highlights: SustainabilityStoryHighlightInput[];
  provenance: Partial<SustainabilityProvenance>;
};

export type SustainabilityPeriodStory = {
  bigNumberProvenance: SustainabilityStoryBigNumberProvenance;
  bigNumbers: SustainabilityStoryBigNumbers;
  comparison: SustainabilityStoryComparison;
  highlights: SustainabilityStoryHighlight[];
  provenance: SustainabilityProvenance;
};

export type SustainabilityStoryInput = {
  availablePeriods: SustainabilityPeriodKey[];
  modules: SustainabilityStoryModuleInput[];
  periods: Partial<Record<SustainabilityPeriodKey, SustainabilityPeriodStoryInput>>;
  selectedPeriod?: SustainabilityPeriodKey;
};

export type SustainabilityStoryModule = {
  bullets: string[];
  description: string;
  id: string;
  provenance: SustainabilityProvenance;
  title: string;
  type: SustainabilityStoryModuleType;
};

export type SustainabilityStory = {
  availablePeriods: SustainabilityPeriodKey[];
  modules: SustainabilityStoryModule[];
  periods: Partial<Record<SustainabilityPeriodKey, SustainabilityPeriodStory>>;
  selectedPeriod: SustainabilityPeriodKey;
};

function defaultModuleTitle(type: SustainabilityStoryModuleType) {
  switch (type) {
    case "milestone":
      return "年度里程碑";
    case "project-outcome":
      return "綠色採購敘事";
    default:
      return "ESG 行動摘要";
  }
}

function buildProvenance(
  input: Partial<SustainabilityProvenance> | null | undefined,
  defaults: SustainabilityProvenance
) {
  return {
    label: input?.label?.trim() || defaults.label,
    source: input?.source?.trim() || defaults.source,
    sourceClass: input?.sourceClass ?? defaults.sourceClass,
    syncState: input?.syncState ?? defaults.syncState,
    updatedAt: input?.updatedAt ?? defaults.updatedAt
  } satisfies SustainabilityProvenance;
}

function buildModuleDefaults(module: SustainabilityStoryModuleInput): SustainabilityProvenance {
  return {
    label: module.title?.trim() || defaultModuleTitle(module.type),
    source: "manual-curation",
    sourceClass: "manual-module",
    syncState: "fresh",
    updatedAt: null
  };
}

function buildMissingProvenance(label: string) {
  return {
    label,
    source: "aggregate-missing",
    sourceClass: "missing",
    syncState: "missing",
    updatedAt: null
  } satisfies SustainabilityProvenance;
}

function normalizeComparison(
  input: Partial<SustainabilityStoryComparison> | null | undefined
): SustainabilityStoryComparison {
  return {
    delta: input?.delta ?? null,
    fallbackReason: input?.fallbackReason ?? "comparison-baseline-missing",
    label: input?.label?.trim() || "缺少比較基準",
    state: input?.state ?? "unavailable"
  };
}

function normalizeHighlights(
  highlights: SustainabilityStoryHighlightInput[],
  fallbackProvenance: SustainabilityProvenance
) {
  return highlights.map((highlight) => ({
    label: highlight.label,
    provenance: buildProvenance(highlight.provenance, fallbackProvenance),
    unit: highlight.unit,
    value: highlight.value
  }));
}

function buildDefaultBigNumberProvenance() {
  return {
    accumulatedCarbonReductionTons: buildMissingProvenance("累積減碳"),
    accumulatedGenerationGwh: buildMissingProvenance("累積發電"),
    annualEnergySavingPercent: buildMissingProvenance("年度節能成效"),
    plantedTreeEquivalent: buildMissingProvenance("植樹等效")
  } satisfies SustainabilityStoryBigNumberProvenance;
}

function normalizePeriodStory(input: SustainabilityPeriodStoryInput): SustainabilityPeriodStory {
  const defaultProvenance = buildProvenance(input.provenance, buildMissingProvenance("永續指標"));
  const defaultBigNumberProvenance = buildDefaultBigNumberProvenance();

  return {
    bigNumberProvenance: {
      accumulatedCarbonReductionTons: buildProvenance(
        input.bigNumberProvenance?.accumulatedCarbonReductionTons,
        defaultBigNumberProvenance.accumulatedCarbonReductionTons
      ),
      accumulatedGenerationGwh: buildProvenance(
        input.bigNumberProvenance?.accumulatedGenerationGwh,
        defaultBigNumberProvenance.accumulatedGenerationGwh
      ),
      annualEnergySavingPercent: buildProvenance(
        input.bigNumberProvenance?.annualEnergySavingPercent,
        defaultBigNumberProvenance.annualEnergySavingPercent
      ),
      plantedTreeEquivalent: buildProvenance(
        input.bigNumberProvenance?.plantedTreeEquivalent,
        defaultBigNumberProvenance.plantedTreeEquivalent
      )
    },
    bigNumbers: {
      accumulatedCarbonReductionTons:
        input.bigNumbers.accumulatedCarbonReductionTons ?? null,
      accumulatedGenerationGwh: input.bigNumbers.accumulatedGenerationGwh ?? null,
      annualEnergySavingPercent: input.bigNumbers.annualEnergySavingPercent ?? null,
      plantedTreeEquivalent: input.bigNumbers.plantedTreeEquivalent ?? null
    },
    comparison: normalizeComparison(input.comparison),
    highlights: normalizeHighlights(input.highlights, defaultProvenance),
    provenance: defaultProvenance
  };
}

export function normalizeSustainabilityStory(input: SustainabilityStoryInput) {
  const availablePeriods = input.availablePeriods.filter((period) =>
    sustainabilityPeriodKeys.includes(period)
  );
  const selectedPeriod = availablePeriods.includes(input.selectedPeriod ?? "lifetime")
    ? (input.selectedPeriod ?? "lifetime")
    : availablePeriods[0] ?? "lifetime";

  return {
    availablePeriods,
    modules: input.modules.map((module) => ({
      bullets: (module.bullets ?? []).filter(
        (bullet): bullet is string => Boolean(bullet?.trim())
      ),
      description: module.description?.trim() || "內容整理中",
      id: module.id,
      provenance: buildProvenance(module.provenance, buildModuleDefaults(module)),
      title: module.title?.trim() || defaultModuleTitle(module.type),
      type: module.type
    })),
    periods: Object.fromEntries(
      Object.entries(input.periods).map(([periodKey, period]) => [
        periodKey,
        normalizePeriodStory(period as SustainabilityPeriodStoryInput)
      ])
    ) as Partial<Record<SustainabilityPeriodKey, SustainabilityPeriodStory>>,
    selectedPeriod
  } satisfies SustainabilityStory;
}

export function resolveSustainabilityStoryPeriod(
  story: SustainabilityStory,
  requestedPeriod?: SustainabilityPeriodKey
) {
  const selectedPeriod = story.availablePeriods.includes(
    requestedPeriod ?? story.selectedPeriod
  )
    ? (requestedPeriod ?? story.selectedPeriod)
    : story.selectedPeriod;
  const period =
    story.periods[selectedPeriod] ??
    story.periods.lifetime ??
    story.periods.year ??
    story.periods.month;

  if (!period) {
    throw new Error("Sustainability story is missing all period payloads");
  }

  return {
    availablePeriods: story.availablePeriods,
    period,
    selectedPeriod
  };
}
