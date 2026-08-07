import type Database from "better-sqlite3";
import {
  evaluateFreshness,
  resolveFreshnessCategoryForMetric,
  type FreshnessPolicy,
  type FreshnessResult
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readFreshnessPolicy } from "../services/freshnessPolicyService.js";
import { normalizeMetricTimestamp } from "./metricTimestamp.js";

export type LiveMetricReading = {
  freshness?: FreshnessResult;
  quality: string | null;
  timestamp: string;
  unit: string | null;
  value: number;
};

export type LiveMetricsSnapshot = {
  freshnessPolicy?: FreshnessPolicy;
  metrics: Record<string, LiveMetricReading>;
  timestamp: string | null;
};

type LiveMetricRow = {
  metric_key: string;
  quality: string | null;
  timestamp: string | null;
  unit: string | null;
  value: number | null;
};

export function readLiveMetricsSnapshot(
  database: Database.Database = getDatabase()
): LiveMetricsSnapshot {
  const rows = database
    .prepare(
      `
        SELECT
          metric_key,
          value,
          unit,
          timestamp,
          quality
        FROM live_metric_values
        WHERE value IS NOT NULL AND timestamp IS NOT NULL
        ORDER BY timestamp DESC, metric_key ASC
      `
    )
    .all() as LiveMetricRow[];

  const metrics: Record<string, LiveMetricReading> = {};
  let latestTimestamp: string | null = null;
  let latestTimestampMs = Number.NEGATIVE_INFINITY;

  for (const row of rows) {
    if (row.value === null || row.timestamp === null) {
      continue;
    }

    // Normalize at the storage read boundary so every downstream freshness
    // consumer receives a timestamp carrying an explicit zone designator.
    const timestamp = normalizeMetricTimestamp(row.timestamp);

    metrics[row.metric_key] = {
      quality: row.quality,
      timestamp,
      unit: row.unit,
      value: row.value
    };

    // Compare instants rather than strings: normalization leaves the column
    // holding a mix of `Z` and numeric-offset forms, which do not order
    // lexicographically. An unparseable row only seeds the value when nothing
    // else has been seen, and any parseable row later replaces it.
    const timestampMs = Date.parse(timestamp);
    if (Number.isNaN(timestampMs)) {
      if (latestTimestamp === null) {
        latestTimestamp = timestamp;
      }
      continue;
    }

    if (timestampMs > latestTimestampMs) {
      latestTimestampMs = timestampMs;
      latestTimestamp = timestamp;
    }
  }

  return {
    metrics,
    timestamp: latestTimestamp
  };
}

export function readAuthoritativeLiveMetricsSnapshot(
  database: Database.Database = getDatabase(),
  nowMs = Date.now()
): LiveMetricsSnapshot {
  return applyFreshnessToLiveMetricsSnapshot(
    readLiveMetricsSnapshot(database),
    database,
    nowMs
  );
}

export function applyFreshnessToLiveMetricsSnapshot(
  snapshot: LiveMetricsSnapshot,
  database: Database.Database = getDatabase(),
  nowMs = Date.now()
): LiveMetricsSnapshot {
  const policy = readFreshnessPolicy(database).policy;
  return {
    freshnessPolicy: policy,
    metrics: Object.fromEntries(
      Object.entries(snapshot.metrics).map(([metricKey, reading]) => [
        metricKey,
        {
          ...reading,
          freshness: evaluateFreshness({
            category: resolveFreshnessCategoryForMetric(metricKey),
            nowMs,
            policy,
            sourceTimestamp: reading.timestamp
          })
        }
      ])
    ),
    timestamp: snapshot.timestamp
  };
}
