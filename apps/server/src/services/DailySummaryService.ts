import { clearInterval, setInterval } from "node:timers";
import type Database from "better-sqlite3";
import { getDatabase } from "../db/index.js";
import type { CumulativeCounters, MetricsAccumulatorService } from "./MetricsAccumulatorService.js";

type DailySummaryServiceOptions = {
  database?: Database.Database;
  intervalMs?: number;
  metricsAccumulatorService: MetricsAccumulatorService;
};

type PeakSnapshot = {
  peakConsumption: number | null;
  peakConsumptionTime: string | null;
  peakGeneration: number | null;
  peakGenerationTime: string | null;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function clampDelta(total: number, baseline: number) {
  return Number(Math.max(total - baseline, 0).toFixed(3));
}

export class DailySummaryService {
  private readonly database: Database.Database;
  private readonly intervalMs: number;
  private readonly metricsAccumulatorService: MetricsAccumulatorService;
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
    this.intervalMs = options.intervalMs ?? 60_000;
    this.metricsAccumulatorService = options.metricsAccumulatorService;
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
  }

  private initialize(now: Date) {
    if (this.currentDateKey !== null && this.baselineCounters !== null) {
      return;
    }

    this.currentDateKey = toDateKey(now);
    this.baselineCounters = this.metricsAccumulatorService.getCounters();
  }

  private persistSummary(date: string, totals: CumulativeCounters, baseline: CumulativeCounters) {
    this.database
      .prepare(
        `
          INSERT INTO daily_energy_summaries (
            date,
            generation_total,
            consumption_total,
            self_consumption_total,
            co2_total,
            peak_generation,
            peak_generation_time,
            peak_consumption,
            peak_consumption_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(date) DO UPDATE SET
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
