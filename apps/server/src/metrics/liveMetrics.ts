import type Database from "better-sqlite3";
import type { MetricScope } from "@solar-display/shared";
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

function buildLiveMetricsSnapshot(rows: LiveMetricRow[]): LiveMetricsSnapshot {
  const metrics: Record<string, LiveMetricReading> = {};
  let latestTimestamp: string | null = null;
  let latestTimestampMs = Number.NEGATIVE_INFINITY;

  for (const row of rows) {
    if (row.value === null || row.timestamp === null) {
      continue;
    }

    const timestamp = normalizeMetricTimestamp(row.timestamp);
    metrics[row.metric_key] = {
      quality: row.quality,
      timestamp,
      unit: row.unit,
      value: row.value
    };

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

  return { metrics, timestamp: latestTimestamp };
}

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

  return buildLiveMetricsSnapshot(rows);
}

export function readScopedLiveMetricsSnapshot(
  metricScope: MetricScope,
  database: Database.Database = getDatabase()
): LiveMetricsSnapshot {
  const rows = database
    .prepare(
      `
        SELECT metric_key, value, unit, timestamp, quality
        FROM live_metric_values
        WHERE metric_scope = ? AND value IS NOT NULL AND timestamp IS NOT NULL
        ORDER BY timestamp DESC, metric_key ASC
      `
    )
    .all(metricScope) as LiveMetricRow[];

  return buildLiveMetricsSnapshot(rows);
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

export function readAuthoritativeScopedLiveMetricsSnapshot(
  metricScope: MetricScope,
  database: Database.Database = getDatabase(),
  nowMs = Date.now()
): LiveMetricsSnapshot {
  return applyFreshnessToLiveMetricsSnapshot(
    readScopedLiveMetricsSnapshot(metricScope, database),
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
