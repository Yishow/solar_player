import type { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/index.js";

type HistoryRange = "day" | "week" | "month" | "year" | "total";

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

function isHistoryRange(value: string): value is HistoryRange {
  return value === "day" || value === "week" || value === "month" || value === "year" || value === "total";
}

const dailySummaryRangeToClause: Record<Exclude<HistoryRange, "total">, string> = {
  day: "date >= date('now')",
  month: "date >= date('now', '-29 day')",
  week: "date >= date('now', '-6 day')",
  year: "date >= date('now', 'start of year')"
};

const historyRangeError = "Invalid range. Expected day, week, month, year, or total.";

function resolveSnapshotRangeCutoff(range: Exclude<HistoryRange, "total">): string {
  const now = new Date();

  if (range === "day") {
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    return startOfDay.toISOString();
  }

  if (range === "week") {
    return new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();
  }

  if (range === "month") {
    return new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString();
  }

  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return startOfYear.toISOString();
}

const metricsHistoryRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/metrics/history", async (request, reply) => {
    const rangeParam = (request.query as { range?: string }).range ?? "day";

    if (!isHistoryRange(rangeParam)) {
      reply.status(400).send({
        error: historyRangeError,
        success: false,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const database = getDatabase();
    const snapshotCutoff = rangeParam === "total" ? null : resolveSnapshotRangeCutoff(rangeParam);
    const filterClause = snapshotCutoff === null ? "" : "WHERE captured_at >= ?";
    const rows = database
      .prepare(
        `
          SELECT
            generation,
            consumption,
            self_consumption,
            co2,
            ratio,
            efficiency,
            captured_at
          FROM metric_snapshots
          ${filterClause}
          ORDER BY captured_at ASC
        `
      )
      .all(...(snapshotCutoff === null ? [] : [snapshotCutoff])) as MetricSnapshotRow[];

    return {
      range: rangeParam,
      snapshots: rows.map((row) => ({
        capturedAt: row.captured_at,
        co2: row.co2,
        consumption: row.consumption,
        efficiency: row.efficiency,
        generation: row.generation,
        ratio: row.ratio,
        selfConsumption: row.self_consumption
      }))
    };
  });

  app.get("/api/metrics/daily-summary", async (request, reply) => {
    const rangeParam = (request.query as { range?: string }).range ?? "total";
    if (!isHistoryRange(rangeParam)) {
      reply.status(400).send({
        error: historyRangeError,
        success: false,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const database = getDatabase();
    const filterClause = rangeParam === "total" ? "" : `WHERE ${dailySummaryRangeToClause[rangeParam]}`;
    const rows = database
      .prepare(
        `
          SELECT
            date,
            generation_total,
            consumption_total,
            self_consumption_total,
            co2_total,
            peak_generation,
            peak_generation_time,
            peak_consumption,
            peak_consumption_time
          FROM daily_energy_summaries
          ${filterClause}
          ORDER BY date DESC
        `
      )
      .all() as DailySummaryRow[];

    return {
      summaries: rows.map((row) => ({
        co2Total: row.co2_total,
        consumptionTotal: row.consumption_total,
        date: row.date,
        generationTotal: row.generation_total,
        peakConsumption: row.peak_consumption,
        peakConsumptionTime: row.peak_consumption_time,
        peakGeneration: row.peak_generation,
        peakGenerationTime: row.peak_generation_time,
        selfConsumptionTotal: row.self_consumption_total
      }))
    };
  });

  app.get("/api/metrics/cumulative", async () => {
    const database = getDatabase();
    const rows = database
      .prepare(
        `
          SELECT
            metric_key,
            total_value,
            last_updated,
            reset_count
          FROM cumulative_counters
          ORDER BY metric_key ASC
        `
      )
      .all() as CumulativeCounterRow[];

    return {
      counters: rows.map((row) => ({
        lastUpdated: row.last_updated,
        metricKey: row.metric_key,
        resetCount: row.reset_count ?? 0,
        totalValue: row.total_value
      }))
    };
  });
};

export default metricsHistoryRoute;
