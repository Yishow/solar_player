import type { DisplayPageKey } from "./displayPageConfig.js";

export const displayCircuitSlotKeys = [
  "production",
  "hvac",
  "lighting",
  "office",
  "ev",
  "infrastructure"
] as const;

export type DisplayCircuitSlotKey = (typeof displayCircuitSlotKeys)[number];
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

export const displayMetricRequirements: DisplayRequirementDescriptor[] = [
  { pageId: "overview", requirementKey: "realTimePower", sourceType: "mqtt-metric" },
  { pageId: "overview", requirementKey: "todayGeneration", sourceType: "mqtt-metric" },
  { pageId: "overview", requirementKey: "totalGeneration", sourceType: "mqtt-metric" },
  { pageId: "overview", requirementKey: "todayCo2Reduction", sourceType: "mqtt-metric" },
  { pageId: "overview", requirementKey: "totalCo2Reduction", sourceType: "mqtt-metric" },
  { pageId: "solar", requirementKey: "realTimePower", sourceType: "mqtt-metric" },
  { pageId: "solar", requirementKey: "todayGeneration", sourceType: "mqtt-metric" },
  {
    dependencyKeys: ["selfConsumptionRatio", "selfConsumptionEnergy", "consumptionEnergy"],
    pageId: "solar",
    requirementKey: "selfConsumptionRatio",
    sourceType: "derived-metric"
  },
  { pageId: "solar", requirementKey: "todayCo2Reduction", sourceType: "mqtt-metric" },
  { pageId: "solar", requirementKey: "totalCo2Reduction", sourceType: "mqtt-metric" },
  { pageId: "solar", requirementKey: "systemEfficiency", sourceType: "mqtt-metric" },
  { pageId: "factory-circuit", requirementKey: "factoryProductionPower", sourceType: "mqtt-metric" },
  { pageId: "factory-circuit", requirementKey: "factoryHvacPower", sourceType: "mqtt-metric" },
  { pageId: "factory-circuit", requirementKey: "factoryLightingPower", sourceType: "mqtt-metric" },
  { pageId: "factory-circuit", requirementKey: "factoryOfficePower", sourceType: "mqtt-metric" },
  { pageId: "factory-circuit", requirementKey: "factoryEvGreenPower", sourceType: "mqtt-metric" },
  { pageId: "factory-circuit", requirementKey: "factoryInfrastructurePower", sourceType: "mqtt-metric" },
  { pageId: "sustainability", requirementKey: "consumptionEnergy", sourceType: "mqtt-metric" },
  {
    pageId: "sustainability",
    requirementKey: "selfConsumptionEnergy",
    sourceType: "mqtt-metric"
  }
];

export const displaySlotRequirements: DisplayRequirementDescriptor[] = displayCircuitSlotKeys.map(
  (slotKey) => ({
    pageId: "factory-circuit",
    requirementKey: slotKey,
    sourceType: "circuit-slot"
  })
);

export const displayReadinessRequirements: DisplayRequirementDescriptor[] = [
  ...displayMetricRequirements,
  ...displaySlotRequirements
];
