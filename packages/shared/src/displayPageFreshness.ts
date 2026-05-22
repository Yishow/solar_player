import type { DisplayPageTemplateKey } from "./displayPageConfig.js";
import { displayMetricRequirements } from "./displayReadiness.js";

export function resolveLiveMetricKeysForPage(templateKey: DisplayPageTemplateKey) {
  const metricKeys: string[] = [];

  for (const requirement of displayMetricRequirements) {
    if (requirement.pageId !== templateKey) {
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

  if (presentMetrics.length === 0) {
    return {
      fresh: false,
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
      stalestMetricKey: null,
      stalestTimestamp: null
    };
  }

  return {
    fresh: false,
    stalestMetricKey: staleMetric.metricKey,
    stalestTimestamp: staleMetric.timestamp
  };
}
