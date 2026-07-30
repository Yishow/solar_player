import type { DisplayPageKey } from "./displayPageConfig.js";
import type { SiteScope } from "./deviceIdentity.js";
import {
  displayMetricRequirements,
  resolveDisplayReadinessRequirementsForSite,
  type DisplayRequirementDescriptor
} from "./displayReadiness.js";

export type LiveMetricRuntimeRequirement = {
  alternatives: string[][];
  requirementKey: string;
};

type MetricFreshnessState = {
  fresh: boolean;
  metricKey: string;
  parsedTimestamp: number;
  timestamp: string;
};

export function resolveLiveMetricKeysForPage(
  pageKey: DisplayPageKey,
  siteScope?: SiteScope
) {
  const metricKeys: string[] = [];
  const requirements = siteScope
    ? resolveDisplayReadinessRequirementsForSite(siteScope)
    : displayMetricRequirements;

  for (const requirement of requirements) {
    if (requirement.pageId !== pageKey) {
      continue;
    }

    const requirementMetricKeys =
      requirement.sourceType === "derived-metric"
        ? (requirement.dependencyKeys ?? [requirement.requirementKey])
        : [requirement.requirementKey];

    for (const metricKey of requirementMetricKeys) {
      if (!metricKeys.includes(metricKey)) {
        metricKeys.push(metricKey);
      }
    }
  }

  return metricKeys;
}

function resolveRequirementAlternatives(requirement: DisplayRequirementDescriptor) {
  if (requirement.sourceType !== "derived-metric") {
    return [[requirement.requirementKey]];
  }

  const dependencyKeys = requirement.dependencyKeys ?? [requirement.requirementKey];
  const derivedDependencyKeys = dependencyKeys.filter(
    (metricKey) => metricKey !== requirement.requirementKey
  );
  const factoryDependencyKeys = derivedDependencyKeys.filter((metricKey) =>
    metricKey.startsWith("factoryGeneration.")
  );
  if (factoryDependencyKeys.length > 0) {
    const canonicalDependencyKeys = derivedDependencyKeys.filter(
      (metricKey) => !metricKey.startsWith("factoryGeneration.")
    );
    return [
      ...(dependencyKeys.includes(requirement.requirementKey)
        ? [[requirement.requirementKey]]
        : []),
      ...canonicalDependencyKeys.map((metricKey) => [metricKey]),
      factoryDependencyKeys
    ];
  }

  if (derivedDependencyKeys.length === 0) {
    return [[requirement.requirementKey]];
  }

  if (!dependencyKeys.includes(requirement.requirementKey)) {
    return [derivedDependencyKeys];
  }

  return [[requirement.requirementKey], derivedDependencyKeys];
}

export function resolveLiveMetricRequirementsForPage(
  pageKey: DisplayPageKey,
  siteScope?: SiteScope
): LiveMetricRuntimeRequirement[] {
  const requirements = siteScope
    ? resolveDisplayReadinessRequirementsForSite(siteScope)
    : displayMetricRequirements;

  return requirements
    .filter((requirement) => requirement.pageId === pageKey)
    .map((requirement) => ({
      alternatives: resolveRequirementAlternatives(requirement),
      requirementKey: requirement.requirementKey
    }));
}

export function hasLiveMetricRequirementsData(input: {
  metrics: Record<string, { timestamp: string }>;
  requirements: LiveMetricRuntimeRequirement[];
}) {
  return input.requirements.length > 0 && input.requirements.every((requirement) =>
    requirement.alternatives.some((alternative) =>
      alternative.every((metricKey) => input.metrics[metricKey] !== undefined)
    )
  );
}

export function evaluatePageRuntimeFreshness(input: {
  requiredMetricKeys: string[];
  metrics: Record<string, { timestamp: string }>;
  nowMs: number;
  freshnessWindowMs: number;
}) {
  const presentMetrics = input.requiredMetricKeys
    .map((metricKey) => {
      const metric = input.metrics[metricKey];
      return metric
        ? {
            metricKey,
            timestamp: metric.timestamp
          }
        : null;
    })
    .filter((metric): metric is { metricKey: string; timestamp: string } => metric !== null);
  const hasRequiredData = presentMetrics.length === input.requiredMetricKeys.length;

  if (!hasRequiredData) {
    return {
      fresh: false,
      hasRequiredData,
      stalestMetricKey: null,
      stalestTimestamp: null
    };
  }

  let staleMetric:
    | {
        metricKey: string;
        parsedTimestamp: number;
        timestamp: string;
      }
    | null = null;

  for (const metric of presentMetrics) {
    const parsedTimestamp = Date.parse(metric.timestamp);
    const ageMs = Number.isNaN(parsedTimestamp)
      ? Number.POSITIVE_INFINITY
      : input.nowMs - parsedTimestamp;

    if (ageMs <= input.freshnessWindowMs) {
      continue;
    }

    if (
      staleMetric === null
      || parsedTimestamp < staleMetric.parsedTimestamp
    ) {
      staleMetric = {
        metricKey: metric.metricKey,
        parsedTimestamp,
        timestamp: metric.timestamp
      };
    }
  }

  if (staleMetric === null) {
    return {
      fresh: true,
      hasRequiredData,
      stalestMetricKey: null,
      stalestTimestamp: null
    };
  }

  return {
    fresh: false,
    hasRequiredData,
    stalestMetricKey: staleMetric.metricKey,
    stalestTimestamp: staleMetric.timestamp
  };
}

function evaluateMetricFreshness(input: {
  metricKey: string;
  metrics: Record<string, { timestamp: string }>;
  nowMs: number;
  freshnessWindowMs: number;
}): MetricFreshnessState | null {
  const metric = input.metrics[input.metricKey];
  if (!metric) {
    return null;
  }

  const parsedTimestamp = Date.parse(metric.timestamp);
  const ageMs = Number.isNaN(parsedTimestamp)
    ? Number.POSITIVE_INFINITY
    : input.nowMs - parsedTimestamp;

  return {
    fresh: ageMs <= input.freshnessWindowMs,
    metricKey: input.metricKey,
    parsedTimestamp: Number.isNaN(parsedTimestamp)
      ? Number.NEGATIVE_INFINITY
      : parsedTimestamp,
    timestamp: metric.timestamp
  };
}

function isStaleMetricState(
  metricState: MetricFreshnessState | null
): metricState is MetricFreshnessState {
  return metricState !== null && !metricState.fresh;
}

function evaluateAlternativeFreshness(input: {
  alternative: string[];
  metrics: Record<string, { timestamp: string }>;
  nowMs: number;
  freshnessWindowMs: number;
}) {
  const metricStates = input.alternative.map((metricKey) =>
    evaluateMetricFreshness({
      freshnessWindowMs: input.freshnessWindowMs,
      metricKey,
      metrics: input.metrics,
      nowMs: input.nowMs
    })
  );

  if (metricStates.some((metricState) => metricState === null)) {
    return {
      fresh: false,
      hasRequiredData: false,
      staleMetric: null
    };
  }

  const staleMetric = metricStates
    .filter(isStaleMetricState)
    .sort((a, b) => a.parsedTimestamp - b.parsedTimestamp)[0] ?? null;

  return {
    fresh: staleMetric === null,
    hasRequiredData: true,
    staleMetric
  };
}

export function evaluatePageRuntimeFreshnessForRequirements(input: {
  freshnessWindowMs: number;
  metrics: Record<string, { timestamp: string }>;
  nowMs: number;
  requirements: LiveMetricRuntimeRequirement[];
}) {
  let staleMetric:
    | {
        metricKey: string;
        parsedTimestamp: number;
        timestamp: string;
      }
    | null = null;

  for (const requirement of input.requirements) {
    const alternativeStates = requirement.alternatives.map((alternative) =>
      evaluateAlternativeFreshness({
        alternative,
        freshnessWindowMs: input.freshnessWindowMs,
        metrics: input.metrics,
        nowMs: input.nowMs
      })
    );

    if (alternativeStates.some((alternativeState) => alternativeState.fresh)) {
      continue;
    }

    const presentAlternative = alternativeStates.find(
      (alternativeState) => alternativeState.hasRequiredData
    );
    if (!presentAlternative) {
      return {
        fresh: false,
        hasRequiredData: false,
        stalestMetricKey: null,
        stalestTimestamp: null
      };
    }

    if (
      presentAlternative.staleMetric
      && (staleMetric === null || presentAlternative.staleMetric.parsedTimestamp < staleMetric.parsedTimestamp)
    ) {
      staleMetric = presentAlternative.staleMetric;
    }
  }

  if (staleMetric === null) {
    return {
      fresh: true,
      hasRequiredData: true,
      stalestMetricKey: null,
      stalestTimestamp: null
    };
  }

  return {
    fresh: false,
    hasRequiredData: true,
    stalestMetricKey: staleMetric.metricKey,
    stalestTimestamp: staleMetric.timestamp
  };
}
