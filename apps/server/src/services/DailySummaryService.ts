import { clearInterval, setInterval } from "node:timers";
import type Database from "better-sqlite3";
import type { DisplaySyncEvent, MetricScope } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import type { CumulativeCounters, MetricsAccumulatorService } from "./MetricsAccumulatorService.js";

type DailySummaryServiceOptions = {
  database?: Database.Database;
  emitDisplaySync?: (payload: DisplaySyncEvent) => void;
  intervalMs?: number;
  metricScope: MetricScope;
  metricsAccumulatorService: MetricsAccumulatorService;
};

type PeakSnapshot = {
  peakConsumption: number | null;
  peakConsumptionTime: string | null;
  peakGeneration: number | null;
  peakGenerationTime: string | null;
};

type DailySummaryRow = PeakSnapshot & {
  co2Total: number;
  consumptionTotal: number;
  generationTotal: number;
  selfConsumptionTotal: number;
};

function toDateKey(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function clampDelta(total: number, baseline: number) {
  return Number(Math.max(total - baseline, 0).toFixed(3));
}

export class DailySummaryService {
  private readonly database: Database.Database;
  private readonly emitDisplaySync?: (payload: DisplaySyncEvent) => void;
  private readonly intervalMs: number;
  private readonly metricsAccumulatorService: MetricsAccumulatorService;
  private readonly metricScope: MetricScope;
  private currentDateKey: string | null = null;
  private baselineCounters: CumulativeCounters | null = null;
  private peaks: PeakSnapshot = {
    peakConsumption: null,
    peakConsumptionTime: null,
    peakGeneration: null,
    peakGenerationTime: null
  };
  private timer: NodeJS.Timeout | null = null;

  constructor(options: DailySummaryServiceOptions) {
    this.database = options.database ?? getDatabase();
    this.emitDisplaySync = options.emitDisplaySync;
    this.intervalMs = options.intervalMs ?? 60_000;
    this.metricsAccumulatorService = options.metricsAccumulatorService;
    this.metricScope = options.metricScope;
  }

  start() {
    if (this.timer) {
      return;
    }

    this.initialize(new Date());
    this.timer = setInterval(() => {
      this.processAt(new Date());
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  processAt(now: Date) {
    this.initialize(now);

    const nextDateKey = toDateKey(now);
    const snapshot = this.metricsAccumulatorService.getLatestSnapshot();
    const counters = this.metricsAccumulatorService.getCounters();

    if (this.currentDateKey !== null && this.baselineCounters !== null && nextDateKey !== this.currentDateKey) {
      this.persistSummary(this.currentDateKey, counters, this.baselineCounters);
      this.currentDateKey = nextDateKey;
      this.baselineCounters = counters;
      this.peaks = {
        peakConsumption: null,
        peakConsumptionTime: null,
        peakGeneration: null,
        peakGenerationTime: null
      };
    }

    if (snapshot.capturedAt !== null && snapshot.generationPower !== null) {
      if (this.peaks.peakGeneration === null || snapshot.generationPower >= this.peaks.peakGeneration) {
        this.peaks.peakGeneration = snapshot.generationPower;
        this.peaks.peakGenerationTime = snapshot.capturedAt;
      }
    }

    if (snapshot.capturedAt !== null && snapshot.consumptionPower !== null) {
      if (this.peaks.peakConsumption === null || snapshot.consumptionPower >= this.peaks.peakConsumption) {
        this.peaks.peakConsumption = snapshot.consumptionPower;
        this.peaks.peakConsumptionTime = snapshot.capturedAt;
      }
    }

    if (this.currentDateKey !== null && this.baselineCounters !== null) {
      this.persistSummary(this.currentDateKey, counters, this.baselineCounters);
      this.emitDisplaySync?.({
        generatedAt: new Date().toISOString(),
        metricScope: this.metricScope,
        reason: "daily-summary-updated",
        scope: "monitoring-history"
      });
    }
  }

  private initialize(now: Date) {
    if (this.currentDateKey !== null && this.baselineCounters !== null) {
      return;
    }

    this.currentDateKey = toDateKey(now);
    const counters = this.metricsAccumulatorService.getCounters();
    const existing = this.database
      .prepare(
        `
          SELECT
            generation_total AS generationTotal,
            consumption_total AS consumptionTotal,
            self_consumption_total AS selfConsumptionTotal,
            co2_total AS co2Total,
            peak_generation AS peakGeneration,
            peak_generation_time AS peakGenerationTime,
            peak_consumption AS peakConsumption,
            peak_consumption_time AS peakConsumptionTime
          FROM daily_energy_summaries
          WHERE metric_scope = ? AND date = ?
        `
      )
      .get(this.metricScope, this.currentDateKey) as DailySummaryRow | undefined;

    this.baselineCounters = existing
      ? {
          co2: counters.co2 - existing.co2Total,
          consumption: counters.consumption - existing.consumptionTotal,
          generation: counters.generation - existing.generationTotal,
          selfConsumption: counters.selfConsumption - existing.selfConsumptionTotal
        }
      : counters;

    if (existing) {
      this.peaks = {
        peakConsumption: existing.peakConsumption,
        peakConsumptionTime: existing.peakConsumptionTime,
        peakGeneration: existing.peakGeneration,
        peakGenerationTime: existing.peakGenerationTime
      };
    }
  }

  private persistSummary(date: string, totals: CumulativeCounters, baseline: CumulativeCounters) {
    this.database
      .prepare(
        `
          INSERT INTO daily_energy_summaries (
            metric_scope,
            date,
            generation_total,
            consumption_total,
            self_consumption_total,
            co2_total,
            peak_generation,
            peak_generation_time,
            peak_consumption,
            peak_consumption_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(metric_scope, date) DO UPDATE SET
            generation_total = excluded.generation_total,
            consumption_total = excluded.consumption_total,
            self_consumption_total = excluded.self_consumption_total,
            co2_total = excluded.co2_total,
            peak_generation = excluded.peak_generation,
            peak_generation_time = excluded.peak_generation_time,
            peak_consumption = excluded.peak_consumption,
            peak_consumption_time = excluded.peak_consumption_time
        `
      )
      .run(
        this.metricScope,
        date,
        clampDelta(totals.generation, baseline.generation),
        clampDelta(totals.consumption, baseline.consumption),
        clampDelta(totals.selfConsumption, baseline.selfConsumption),
        clampDelta(totals.co2, baseline.co2),
        this.peaks.peakGeneration,
        this.peaks.peakGenerationTime,
        this.peaks.peakConsumption,
        this.peaks.peakConsumptionTime
      );

  }
}
