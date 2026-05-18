export const sustainabilityPeriodKeys = ["month", "quarter", "year", "lifetime"] as const;

export type SustainabilityPeriodKey = (typeof sustainabilityPeriodKeys)[number];
export type SustainabilitySyncState = "fresh" | "missing" | "stale" | "warning";

export type SustainabilityStoryModuleInput = {
  bullets?: Array<string | null | undefined>;
  description?: string | null;
  id: string;
  title?: string | null;
  type: "esg-summary" | "milestone" | "project-outcome";
};

export type SustainabilityPeriodStoryInput = {
  bigNumbers: {
    annualEnergySavingPercent: number;
    accumulatedCarbonReductionTons: number;
    accumulatedGenerationGwh: number;
    plantedTreeEquivalent: number;
  };
  highlights: Array<{
    label: string;
    unit: string;
    value: string;
  }>;
  provenance: {
    label: string;
    source: string;
    syncState: SustainabilitySyncState;
    updatedAt: string | null;
  };
};

export type SustainabilityStoryInput = {
  availablePeriods: SustainabilityPeriodKey[];
  modules: SustainabilityStoryModuleInput[];
  periods: Partial<Record<SustainabilityPeriodKey, SustainabilityPeriodStoryInput>>;
  selectedPeriod?: SustainabilityPeriodKey;
};

export type SustainabilityStory = {
  availablePeriods: SustainabilityPeriodKey[];
  modules: Array<{
    bullets: string[];
    description: string;
    id: string;
    title: string;
    type: SustainabilityStoryModuleInput["type"];
  }>;
  periods: Partial<Record<SustainabilityPeriodKey, SustainabilityPeriodStoryInput>>;
  selectedPeriod: SustainabilityPeriodKey;
};

function defaultModuleTitle(type: SustainabilityStoryModuleInput["type"]) {
  switch (type) {
    case "milestone":
      return "永續里程碑";
    case "project-outcome":
      return "專案成果";
    default:
      return "ESG 行動摘要";
  }
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
      bullets: (module.bullets ?? []).filter((bullet): bullet is string => Boolean(bullet?.trim())),
      description: module.description?.trim() || "內容整理中",
      id: module.id,
      title: module.title?.trim() || defaultModuleTitle(module.type),
      type: module.type
    })),
    periods: input.periods,
    selectedPeriod
  } satisfies SustainabilityStory;
}

export function resolveSustainabilityStoryPeriod(
  story: SustainabilityStory,
  requestedPeriod?: SustainabilityPeriodKey
) {
  const selectedPeriod = story.availablePeriods.includes(requestedPeriod ?? story.selectedPeriod)
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
