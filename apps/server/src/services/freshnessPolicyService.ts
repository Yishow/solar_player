import {
  aggregateFreshnessResults,
  evaluateFreshness,
  resolveFreshnessCategoryForMetric,
  validateFreshnessPolicy,
  type FreshnessPolicy,
  type LiveMetricRuntimeRequirement
} from "@solar-display/shared";
import type Database from "better-sqlite3";
import { getDatabase } from "../db/index.js";

type FreshnessPolicyRow = {
  cumulative_delayed_after_ms: number;
  cumulative_historical_after_ms: number;
  cumulative_stale_after_ms: number;
  daily_delayed_after_ms: number;
  daily_historical_after_ms: number;
  daily_stale_after_ms: number;
  realtime_delayed_after_ms: number;
  realtime_historical_after_ms: number;
  realtime_stale_after_ms: number;
  updated_at: string;
};

function rowToPolicy(row: FreshnessPolicyRow): FreshnessPolicy {
  return {
    cumulative: {
      delayedAfterMs: row.cumulative_delayed_after_ms,
      historicalAfterMs: row.cumulative_historical_after_ms,
      staleAfterMs: row.cumulative_stale_after_ms
    },
    daily: {
      delayedAfterMs: row.daily_delayed_after_ms,
      historicalAfterMs: row.daily_historical_after_ms,
      staleAfterMs: row.daily_stale_after_ms
    },
    realtime: {
      delayedAfterMs: row.realtime_delayed_after_ms,
      historicalAfterMs: row.realtime_historical_after_ms,
      staleAfterMs: row.realtime_stale_after_ms
    },
    static: null
  };
}

export function readFreshnessPolicy(database: Database.Database = getDatabase()) {
  const row = database
    .prepare("SELECT * FROM freshness_policy WHERE id = 1")
    .get() as FreshnessPolicyRow;
  return {
    policy: rowToPolicy(row),
    updatedAt: row.updated_at
  };
}

export function updateFreshnessPolicy(value: unknown) {
  const validation = validateFreshnessPolicy(value);
  if (!validation.valid) {
    return validation;
  }
  const policy = validation.policy;
  getDatabase().prepare(`
    UPDATE freshness_policy
    SET
      realtime_delayed_after_ms = @realtimeDelayed,
      realtime_stale_after_ms = @realtimeStale,
      realtime_historical_after_ms = @realtimeHistorical,
      daily_delayed_after_ms = @dailyDelayed,
      daily_stale_after_ms = @dailyStale,
      daily_historical_after_ms = @dailyHistorical,
      cumulative_delayed_after_ms = @cumulativeDelayed,
      cumulative_stale_after_ms = @cumulativeStale,
      cumulative_historical_after_ms = @cumulativeHistorical,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = 1
  `).run({
    cumulativeDelayed: policy.cumulative.delayedAfterMs,
    cumulativeHistorical: policy.cumulative.historicalAfterMs,
    cumulativeStale: policy.cumulative.staleAfterMs,
    dailyDelayed: policy.daily.delayedAfterMs,
    dailyHistorical: policy.daily.historicalAfterMs,
    dailyStale: policy.daily.staleAfterMs,
    realtimeDelayed: policy.realtime.delayedAfterMs,
    realtimeHistorical: policy.realtime.historicalAfterMs,
    realtimeStale: policy.realtime.staleAfterMs
  });
  return readFreshnessPolicy();
}

export function evaluateMetricFreshness(input: {
  database?: Database.Database;
  metricKey: string;
  nowMs: number;
  sourceTimestamp: string | null;
}) {
  const category = resolveFreshnessCategoryForMetric(input.metricKey);
  return evaluateFreshness({
    category,
    nowMs: input.nowMs,
    policy: readFreshnessPolicy(input.database).policy,
    sourceTimestamp: input.sourceTimestamp
  });
}

export function evaluatePageFreshnessForRequirements(input: {
  database?: Database.Database;
  metrics: Record<string, { timestamp: string }>;
  nowMs: number;
  requirements: LiveMetricRuntimeRequirement[];
}) {
  const policy = readFreshnessPolicy(input.database).policy;
  const evaluatedRequirements = input.requirements.map((requirement) => {
    const alternatives = requirement.alternatives
      .map((alternative) => {
        const results = alternative.map((metricKey) => ({
          freshness: evaluateFreshness({
            category: resolveFreshnessCategoryForMetric(metricKey),
            nowMs: input.nowMs,
            policy,
            sourceTimestamp: input.metrics[metricKey]?.timestamp ?? null
          }),
          metricKey
        }));
        return {
          aggregate: aggregateFreshnessResults(results),
          complete: results.every(({ freshness }) => freshness.state !== "unavailable"),
          results
        };
      });
    return alternatives.find((alternative) => alternative.aggregate.state === "live")
      ?? alternatives.find((alternative) => alternative.complete)
      ?? alternatives[0]!;
  });
  const results = evaluatedRequirements.flatMap((requirement) => requirement.results);
  const aggregate = aggregateFreshnessResults(results);
  const dominantFreshness = results.find(
    (result) => result.metricKey === aggregate.metricKey
  )?.freshness;
  const hasRequiredData = evaluatedRequirements.every(
    (requirement) => requirement.complete
  );

  return {
    fresh: hasRequiredData && aggregate.state === "live",
    freshness: dominantFreshness,
    hasRequiredData,
    metricKey: aggregate.metricKey,
    sourceTimestamp: aggregate.sourceTimestamp,
    state: aggregate.state
  };
}
