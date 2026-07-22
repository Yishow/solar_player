import type { DisplayPageKey } from "./displayPageConfig.js";
import {
  displayMetricRequirements,
  type DisplayRequirementDescriptor
} from "./displayReadiness.js";
import type { MonitoringMetricSourceClass } from "./displayStory.js";

export type PlaybackDisplayMetricBinding = {
  dependencyKeys: string[];
  metricKey: string;
  sourceClass: MonitoringMetricSourceClass;
};

// Client audit (task 1.1): Overview value subtree reads KPI + phase live keys only.
// Factory generation upstream keys are server-materialized into canonical metrics.
const overviewRuntimeMetricKeys = [
  "phaseRCurrent",
  "phaseRPower",
  "phaseRVoltage",
  "phaseSCurrent",
  "phaseSPower",
  "phaseSVoltage",
  "phaseTCurrent",
  "phaseTPower",
  "phaseTVoltage",
  "realTimePower",
  "todayCo2Reduction",
  "todayGeneration",
  "totalCo2Reduction",
  "totalGeneration"
] as const;

// Client audit (task 1.1): Solar client reads only binding metricKeys + power/efficiency.
// selfConsumptionEnergy / consumptionEnergy remain server-only dependencies for story derivation.
const solarRuntimeMetricKeys = [
  "realTimePower",
  "systemEfficiency",
  "selfConsumptionRatio",
  "todayGeneration",
  "todayCo2Reduction",
  "totalCo2Reduction"
] as const;

const overviewDisplayMetricBindings: readonly PlaybackDisplayMetricBinding[] = [
  { dependencyKeys: ["realTimePower"], metricKey: "realTimePower", sourceClass: "mqtt-live" },
  {
    dependencyKeys: ["todayGeneration"],
    metricKey: "todayGeneration",
    sourceClass: "derived-metric"
  },
  {
    dependencyKeys: ["totalGeneration"],
    metricKey: "totalGeneration",
    sourceClass: "cumulative-counter"
  },
  {
    dependencyKeys: ["todayCo2Reduction"],
    metricKey: "todayCo2Reduction",
    sourceClass: "derived-metric"
  },
  {
    dependencyKeys: ["totalCo2Reduction"],
    metricKey: "totalCo2Reduction",
    sourceClass: "cumulative-counter"
  }
];

const solarDisplayMetricBindings: readonly PlaybackDisplayMetricBinding[] = [
  { dependencyKeys: ["realTimePower"], metricKey: "realTimePower", sourceClass: "mqtt-live" },
  {
    dependencyKeys: ["todayGeneration"],
    metricKey: "todayGeneration",
    sourceClass: "derived-metric"
  },
  {
    dependencyKeys: ["selfConsumptionRatio", "selfConsumptionEnergy", "consumptionEnergy"],
    metricKey: "selfConsumptionRatio",
    sourceClass: "derived-metric"
  },
  {
    dependencyKeys: ["todayCo2Reduction"],
    metricKey: "todayCo2Reduction",
    sourceClass: "derived-metric"
  },
  {
    dependencyKeys: ["totalCo2Reduction"],
    metricKey: "totalCo2Reduction",
    sourceClass: "cumulative-counter"
  },
  {
    dependencyKeys: ["systemEfficiency"],
    metricKey: "systemEfficiency",
    sourceClass: "mqtt-live"
  }
];

const runtimeMetricKeysByPage: Partial<Record<DisplayPageKey, readonly string[]>> = {
  overview: overviewRuntimeMetricKeys,
  solar: solarRuntimeMetricKeys
};

const displayBindingsByPage: Partial<Record<DisplayPageKey, readonly PlaybackDisplayMetricBinding[]>> = {
  overview: overviewDisplayMetricBindings,
  solar: solarDisplayMetricBindings
};

export function resolvePlaybackGateRequirements(
  pageKey: string
): DisplayRequirementDescriptor[] {
  return displayMetricRequirements.filter((requirement) => requirement.pageId === pageKey);
}

export function resolvePlaybackRuntimeMetricKeys(pageKey: string): readonly string[] {
  return runtimeMetricKeysByPage[pageKey as DisplayPageKey] ?? [];
}

export function resolvePlaybackDisplayMetricBindings(
  pageKey: string
): readonly PlaybackDisplayMetricBinding[] {
  return displayBindingsByPage[pageKey as DisplayPageKey] ?? [];
}

export function resolvePlaybackDisplayMetricSourceClass(
  pageKey: string,
  metricKey: string
): MonitoringMetricSourceClass | null {
  const binding = resolvePlaybackDisplayMetricBindings(pageKey).find(
    (entry) => entry.metricKey === metricKey
  );
  return binding?.sourceClass ?? null;
}
