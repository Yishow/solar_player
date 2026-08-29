import type Database from "better-sqlite3";
import type { MetricScope } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { normalizeMetricTimestamp } from "../metrics/metricTimestamp.js";
import { evaluateMetricFreshness } from "./freshnessPolicyService.js";

export type ResolvedMetric = {
  metricKey: string;
  metricScope: MetricScope;
  value: number | null;
  unit: string | null;
  timestamp: string | null;
  quality: string | null;
  freshness: ReturnType<typeof evaluateMetricFreshness> | null;
  provenance: { topic: string } | null;
  override: { displayValue: number; unit: string | null; reason: string | null } | null;
};

type ResolveMetricInput = {
  metricScope: MetricScope;
  metricKey: string;
  targetId?: string;
};

export type MetricHistoryRange = "day" | "week" | "month" | "year" | "total";

type MetricSnapshotRow = {
  captured_at: string;
  co2: number | null;
  consumption: number | null;
  efficiency: number | null;
  generation: number | null;
  ratio: number | null;
  self_consumption: number | null;
};

type DailySummaryRow = {
  co2_total: number | null;
  consumption_total: number | null;
  date: string;
  generation_total: number | null;
  peak_consumption: number | null;
  peak_consumption_time: string | null;
  peak_generation: number | null;
  peak_generation_time: string | null;
  self_consumption_total: number | null;
};

type CumulativeCounterRow = {
  last_updated: string | null;
  metric_key: string;
  reset_count: number | null;
  total_value: number | null;
};

const dailySummaryRangeToClause: Record<Exclude<MetricHistoryRange, "month" | "total">, string> = {
  day: "date >= date('now')",
  week: "date >= date('now', '-6 day')",
  year: "date >= date('now', 'start of year')"
};

function toLocalDateKey(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function resolveSnapshotRangeCutoff(range: Exclude<MetricHistoryRange, "total">, now: Date): string {
  if (range === "day") {
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    return startOfDay.toISOString();
  }

  if (range === "week") {
    return new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();
  }

  if (range === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
}

function resolveOne(database: Database.Database, input: ResolveMetricInput, nowMs: number): ResolvedMetric {
  const row = database.prepare(`
    SELECT value, unit, timestamp, quality
    FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?
  `).get(input.metricScope, input.metricKey) as { value: number | null; unit: string | null; timestamp: string | null; quality: string | null } | undefined;
  const timestamp = row?.timestamp ? normalizeMetricTimestamp(row.timestamp) : null;
  const mapping = database.prepare("SELECT topic FROM topic_mappings WHERE metric_scope = ? AND metric_key = ? LIMIT 1").get(input.metricScope, input.metricKey) as { topic: string } | undefined;
  const override = input.targetId
    ? database.prepare(`
        SELECT display_value, unit, reason FROM display_value_overrides
        WHERE metric_scope = ? AND target_id = ? AND enabled = 1
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        LIMIT 1
      `).get(input.metricScope, input.targetId) as { display_value: number; unit: string | null; reason: string | null } | undefined
    : undefined;
  return {
    metricKey: input.metricKey,
    metricScope: input.metricScope,
    value: row?.value ?? null,
    unit: row?.unit ?? null,
    timestamp,
    quality: row?.quality ?? null,
    freshness: timestamp ? evaluateMetricFreshness({ database, metricKey: input.metricKey, nowMs, sourceTimestamp: timestamp }) : null,
    provenance: mapping ? { topic: mapping.topic } : null,
    override: override ? { displayValue: override.display_value, unit: override.unit, reason: override.reason } : null
  };
}

export function resolveMetric(database: Database.Database = getDatabase(), input: ResolveMetricInput, nowMs = Date.now()) {
  return resolveOne(database, input, nowMs);
}

export function resolveSnapshot(database: Database.Database = getDatabase(), input: { siteScope: Exclude<MetricScope, "global">; metricKeys: readonly string[]; includeGlobal?: boolean }, nowMs = Date.now()) {
  const scopes: MetricScope[] = input.includeGlobal ? [input.siteScope, "global"] : [input.siteScope];
  return scopes
    .flatMap((metricScope) => input.metricKeys.map((metricKey) => resolveOne(database, { metricScope, metricKey }, nowMs)))
    .filter((metric) => metric.value !== null || metric.provenance !== null || metric.override !== null);
}

export function resolveMetricSnapshotHistory(
  database: Database.Database = getDatabase(),
  input: { metricScope: MetricScope; range: MetricHistoryRange; now?: Date }
) {
  const snapshotCutoff = input.range === "total"
    ? null
    : resolveSnapshotRangeCutoff(input.range, input.now ?? new Date());
  const filterClause = snapshotCutoff === null ? "" : "AND captured_at >= ?";
  const rows = database.prepare(`
    SELECT generation, consumption, self_consumption, co2, ratio, efficiency, captured_at
    FROM metric_snapshots
    WHERE metric_scope = ? ${filterClause}
    ORDER BY captured_at ASC
  `).all(input.metricScope, ...(snapshotCutoff === null ? [] : [snapshotCutoff])) as MetricSnapshotRow[];

  return rows.map((row) => ({
    capturedAt: row.captured_at,
    co2: row.co2,
    consumption: row.consumption,
    efficiency: row.efficiency,
    generation: row.generation,
    ratio: row.ratio,
    selfConsumption: row.self_consumption
  }));
}

export function resolveDailyEnergySummaryHistory(
  database: Database.Database = getDatabase(),
  input: { metricScope: MetricScope; range: MetricHistoryRange; now?: Date }
) {
  const now = input.now ?? new Date();
  const filterClause = input.range === "total"
    ? ""
    : input.range === "month"
      ? "AND date >= ?"
      : `AND ${dailySummaryRangeToClause[input.range]}`;
  const filterParams = input.range === "month"
    ? [toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), 1))]
    : [];
  const rows = database.prepare(`
    SELECT date, generation_total, consumption_total, self_consumption_total, co2_total,
      peak_generation, peak_generation_time, peak_consumption, peak_consumption_time
    FROM daily_energy_summaries
    WHERE metric_scope = ? ${filterClause}
    ORDER BY date DESC
  `).all(input.metricScope, ...filterParams) as DailySummaryRow[];

  return rows.map((row) => ({
    co2Total: row.co2_total,
    consumptionTotal: row.consumption_total,
    date: row.date,
    generationTotal: row.generation_total,
    peakConsumption: row.peak_consumption,
    peakConsumptionTime: row.peak_consumption_time,
    peakGeneration: row.peak_generation,
    peakGenerationTime: row.peak_generation_time,
    selfConsumptionTotal: row.self_consumption_total
  }));
}

export function resolveCumulativeCounterHistory(
  database: Database.Database = getDatabase(),
  input: { metricScope: MetricScope }
) {
  const rows = database.prepare(`
    SELECT metric_key, total_value, last_updated, reset_count
    FROM cumulative_counters
    WHERE metric_scope = ?
    ORDER BY metric_key ASC
  `).all(input.metricScope) as CumulativeCounterRow[];

  return rows.map((row) => ({
    lastUpdated: row.last_updated,
    metricKey: row.metric_key,
    resetCount: row.reset_count ?? 0,
    totalValue: row.total_value
  }));
}
