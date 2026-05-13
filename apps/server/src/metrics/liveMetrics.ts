import type Database from "better-sqlite3";
import { getDatabase } from "../db/index.js";

export type LiveMetricReading = {
  quality: string | null;
  timestamp: string;
  unit: string | null;
  value: number;
};

export type LiveMetricsSnapshot = {
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

export function readLiveMetricsSnapshot(database: Database.Database = getDatabase()): LiveMetricsSnapshot {
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

  for (const row of rows) {
    if (row.value === null || row.timestamp === null) {
      continue;
    }

    metrics[row.metric_key] = {
      quality: row.quality,
      timestamp: row.timestamp,
      unit: row.unit,
      value: row.value
    };

    if (latestTimestamp === null || row.timestamp > latestTimestamp) {
      latestTimestamp = row.timestamp;
    }
  }

  return {
    metrics,
    timestamp: latestTimestamp
  };
}
