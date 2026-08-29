import type { DisplayPageKey } from "./displayPageConfig.js";
import type { SiteScope } from "./deviceIdentity.js";
import type { FreshnessResult } from "./freshnessPolicy.js";
import type { MetricScope } from "./metricScope.js";

export const displayCircuitSlotKeys = [
  "stamping",
  "body",
  "painting",
  "assembly",
  "utility",
  "office",
  "heavy_vehicle",
  "ed_coating"
] as const;

export type DisplayCircuitSlotKey = (typeof displayCircuitSlotKeys)[number];
export const factoryCircuitPageKeys = ["factory-circuit", "factory-circuit-guanyin"] as const;
export type FactoryCircuitPageKey = (typeof factoryCircuitPageKeys)[number];

export const factoryCircuitSlotKeysByPageKey: Record<FactoryCircuitPageKey, DisplayCircuitSlotKey[]> = {
  "factory-circuit": ["stamping", "body", "painting", "assembly", "utility", "office"],
  "factory-circuit-guanyin": [...displayCircuitSlotKeys]
};

const factoryCircuitSlotMetricKeys: Record<DisplayCircuitSlotKey, string> = {
  stamping: "factoryCircuit.stampingPower",
  body: "factoryCircuit.bodyPower",
  painting: "factoryCircuit.paintingPower",
  assembly: "factoryCircuit.assemblyPower",
  utility: "factoryCircuit.utilityPower",
  office: "factoryCircuit.officePower",
  heavy_vehicle: "factoryCircuit.heavyVehiclePower",
  ed_coating: "factoryCircuit.edCoatingPower"
};

export function isFactoryCircuitPageKey(value: string): value is FactoryCircuitPageKey {
  return (factoryCircuitPageKeys as readonly string[]).includes(value);
}

export function resolveFactoryCircuitSlotKeys(pageKey: FactoryCircuitPageKey): DisplayCircuitSlotKey[] {
  return factoryCircuitSlotKeysByPageKey[pageKey];
}

export function resolveFactoryCircuitSlotMetricKey(
  _pageKey: FactoryCircuitPageKey,
  slotKey: DisplayCircuitSlotKey
): string {
  return factoryCircuitSlotMetricKeys[slotKey];
}

export type DisplayReadinessSourceType = "circuit-slot" | "derived-metric" | "mqtt-metric";
export type DisplayReadinessStatus = "blocking" | "ready" | "warning";

export type DisplayRequirementDescriptor = {
  dependencyKeys?: string[];
  pageId: DisplayPageKey;
  requirementKey: string;
  sourceType: DisplayReadinessSourceType;
};

export type DisplayReadinessFinding = {
  blocking: boolean;
  freshness?: FreshnessResult;
  metricScope: MetricScope;
  pageId: DisplayPageKey;
  reason: string;
  requirementKey: string;
  sourceId: string | null;
  sourceType: DisplayReadinessSourceType;
  status: DisplayReadinessStatus;
};

export type DisplayReadinessPageSummary = {
  blockingCount: number;
  pageId: DisplayPageKey;
  readyCount: number;
  status: DisplayReadinessStatus;
  warningCount: number;
};

export type DisplayReadinessReport = {
  findings: DisplayReadinessFinding[];
  generatedAt: string;
  pages: DisplayReadinessPageSummary[];
  summary: {
    blockingCount: number;
    mqttCoverage: {
      blockingCount: number;
      readyCount: number;
    };
    readyCount: number;
    slotCoverage: {
      blockingCount: number;
      readyCount: number;
    };
    warningCount: number;
  };
};

const factoryCircuitMetricRequirements: DisplayRequirementDescriptor[] = factoryCircuitPageKeys.flatMap(
  (pageId) =>
    resolveFactoryCircuitSlotKeys(pageId).map((slotKey) => ({
      pageId,
      requirementKey: resolveFactoryCircuitSlotMetricKey(pageId, slotKey),
      sourceType: "mqtt-metric" as const
    }))
);

export const factoryGenerationDependencyKeys: readonly string[] = [
  "factoryGeneration.todayMwh",
  "factoryGeneration.monthMwh",
  "factoryGeneration.totalMwh"
];

export const factoryGenerationDerivedRequirementKeys: readonly string[] = [
  "todayGeneration",
  "totalGeneration",
  "todayCo2Reduction",
  "totalCo2Reduction",
  "accumulatedGenerationGwh",
  "accumulatedCarbonReductionTons",
  "plantedTreeEquivalent"
];

export const displayMetricRequirements: DisplayRequirementDescriptor[] = [
  { pageId: "overview", requirementKey: "realTimePower", sourceType: "mqtt-metric" },
  { dependencyKeys: ["todayGeneration", ...factoryGenerationDependencyKeys], pageId: "overview", requirementKey: "todayGeneration", sourceType: "derived-metric" },
  { dependencyKeys: ["totalGeneration", ...factoryGenerationDependencyKeys], pageId: "overview", requirementKey: "totalGeneration", sourceType: "derived-metric" },
  { dependencyKeys: ["todayCo2Reduction", "todayGeneration", ...factoryGenerationDependencyKeys], pageId: "overview", requirementKey: "todayCo2Reduction", sourceType: "derived-metric" },
  { dependencyKeys: ["totalCo2Reduction", "totalGeneration", ...factoryGenerationDependencyKeys], pageId: "overview", requirementKey: "totalCo2Reduction", sourceType: "derived-metric" },
  { pageId: "solar", requirementKey: "realTimePower", sourceType: "mqtt-metric" },
  { dependencyKeys: ["todayGeneration", ...factoryGenerationDependencyKeys], pageId: "solar", requirementKey: "todayGeneration", sourceType: "derived-metric" },
  {
    dependencyKeys: ["selfConsumptionRatio", "selfConsumptionEnergy", "consumptionEnergy"],
    pageId: "solar",
    requirementKey: "selfConsumptionRatio",
    sourceType: "derived-metric"
  },
  { dependencyKeys: ["todayCo2Reduction", "todayGeneration", ...factoryGenerationDependencyKeys], pageId: "solar", requirementKey: "todayCo2Reduction", sourceType: "derived-metric" },
  { dependencyKeys: ["totalCo2Reduction", "totalGeneration", ...factoryGenerationDependencyKeys], pageId: "solar", requirementKey: "totalCo2Reduction", sourceType: "derived-metric" },
  { pageId: "solar", requirementKey: "systemEfficiency", sourceType: "mqtt-metric" },
  ...factoryCircuitMetricRequirements,
  {
    pageId: "sustainability",
    requirementKey: "accumulatedGenerationGwh",
    sourceType: "derived-metric",
    dependencyKeys: ["totalGeneration"]
  },
  {
    pageId: "sustainability",
    requirementKey: "accumulatedCarbonReductionTons",
    sourceType: "derived-metric",
    dependencyKeys: ["totalGeneration"]
  },
  {
    pageId: "sustainability",
    requirementKey: "annualEnergySavingPercent",
    sourceType: "derived-metric",
    dependencyKeys: ["selfConsumptionEnergy", "consumptionEnergy"]
  },
  {
    pageId: "sustainability",
    requirementKey: "plantedTreeEquivalent",
    sourceType: "derived-metric",
    dependencyKeys: ["totalGeneration"]
  }
];

export const displaySlotRequirements: DisplayRequirementDescriptor[] = factoryCircuitPageKeys.flatMap(
  (pageId) => resolveFactoryCircuitSlotKeys(pageId).map((slotKey) => ({
    pageId,
    requirementKey: slotKey,
    sourceType: "circuit-slot"
  }))
);

export const displayReadinessRequirements: DisplayRequirementDescriptor[] = [
  ...displayMetricRequirements,
  ...displaySlotRequirements
];

export function resolveDisplayReadinessRequirementsForSite(
  siteScope: SiteScope
): DisplayRequirementDescriptor[] {
  const factoryPageId =
    siteScope === "cl" ? "factory-circuit" : "factory-circuit-guanyin";

  return displayReadinessRequirements
    .filter(
      (requirement) =>
        (!isFactoryCircuitPageKey(requirement.pageId) ||
          requirement.pageId === factoryPageId)
    );
}
