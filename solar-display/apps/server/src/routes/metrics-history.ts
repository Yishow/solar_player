import type { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/index.js";

type HistoryRange = "day" | "week" | "month" | "total";

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

const rangeToClause: Record<Exclude<HistoryRange, "total">, string> = {
  day: "captured_at >= datetime('now', '-1 day')",
  month: "captured_at >= datetime('now', '-1 month')",
  week: "captured_at >= datetime('now', '-7 day')"
};

function isHistoryRange(value: string): value is HistoryRange {
  return value === "day" || value === "week" || value === "month" || value === "total";
}

const metricsHistoryRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/metrics/history", async (request, reply) => {
    const rangeParam = (request.query as { range?: string }).range ?? "day";

    if (!isHistoryRange(rangeParam)) {
      reply.status(400).send({
        error: "Invalid range. Expected day, week, month, or total.",
        success: false,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const database = getDatabase();
    const filterClause = rangeParam === "total" ? "" : `WHERE ${rangeToClause[rangeParam]}`;
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
      .all() as MetricSnapshotRow[];

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

  app.get("/api/metrics/daily-summary", async () => {
    const database = getDatabase();
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
