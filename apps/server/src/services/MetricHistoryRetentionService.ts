import { clearInterval, setInterval } from "node:timers";
import type Database from "better-sqlite3";
import { getDatabase } from "../db/index.js";
import { normalizeMetricSnapshotCapturedAt } from "../db/normalizeMetricSnapshotCapturedAt.js";
import {
  DEFAULT_RETENTION_SWEEP_INTERVAL_MS,
  DEFAULT_RETENTION_VACUUM_INTERVAL_MS,
  resolveRetentionCutoffs,
  shouldRunVacuum
} from "./metricRetentionPlan.js";

type LoggerLike = {
  warn: (...args: unknown[]) => void;
};

type MetricHistoryRetentionServiceOptions = {
  clearScheduledInterval?: (handle: unknown) => void;
  database?: Database.Database;
  logger: LoggerLike;
  scheduleInterval?: (callback: () => void, intervalMs: number) => unknown;
  snapshotRetentionDays: number;
  summaryRetentionDays: number;
  sweepIntervalMs?: number;
  vacuumEnabled: boolean;
  vacuumIntervalMs?: number;
};

export class MetricHistoryRetentionService {
  private readonly clearScheduledInterval: (handle: unknown) => void;
  private readonly database: Database.Database;
  private readonly logger: LoggerLike;
  private readonly scheduleInterval: (callback: () => void, intervalMs: number) => unknown;
  private readonly snapshotRetentionDays: number;
  private readonly summaryRetentionDays: number;
  private readonly sweepIntervalMs: number;
  private readonly vacuumEnabled: boolean;
  private readonly vacuumIntervalMs: number;
  private lastVacuumAt: number | null = null;
  private timer: unknown = null;

  constructor(options: MetricHistoryRetentionServiceOptions) {
    this.clearScheduledInterval =
      options.clearScheduledInterval
      ?? ((handle) => {
        clearInterval(handle as ReturnType<typeof setInterval>);
      });
    this.database = options.database ?? getDatabase();
    this.logger = options.logger;
    this.scheduleInterval = options.scheduleInterval ?? setInterval;
    this.snapshotRetentionDays = options.snapshotRetentionDays;
    this.summaryRetentionDays = options.summaryRetentionDays;
    this.sweepIntervalMs =
      options.sweepIntervalMs ?? DEFAULT_RETENTION_SWEEP_INTERVAL_MS;
    this.vacuumEnabled = options.vacuumEnabled;
    this.vacuumIntervalMs =
      options.vacuumIntervalMs ?? DEFAULT_RETENTION_VACUUM_INTERVAL_MS;
  }

  start() {
    if (this.timer) {
      return;
    }

    this.timer = this.scheduleInterval(() => {
      this.sweep(new Date());
    }, this.sweepIntervalMs);
  }

  stop() {
    if (!this.timer) {
      return;
    }

    this.clearScheduledInterval(this.timer);
    this.timer = null;
  }

  sweep(now: Date) {
    try {
      normalizeMetricSnapshotCapturedAt(this.database);
      const { snapshotCutoffIso, summaryCutoffDate } = resolveRetentionCutoffs(now, {
        snapshotRetentionDays: this.snapshotRetentionDays,
        summaryRetentionDays: this.summaryRetentionDays
      });

      const deletedSnapshots = this.database
        .prepare("DELETE FROM metric_snapshots WHERE datetime(captured_at) < datetime(?)")
        .run(snapshotCutoffIso).changes;
      const deletedSummaries = this.database
        .prepare("DELETE FROM daily_energy_summaries WHERE date < ?")
        .run(summaryCutoffDate).changes;
      const deletedRows = deletedSnapshots + deletedSummaries;

      const vacuumed = shouldRunVacuum({
        deletedRows,
        lastVacuumAt: this.lastVacuumAt,
        now: now.getTime(),
        vacuumEnabled: this.vacuumEnabled,
        vacuumIntervalMs: this.vacuumIntervalMs
      });

      if (vacuumed) {
        this.database.exec("VACUUM");
        this.lastVacuumAt = now.getTime();
      }

      return {
        deletedSnapshots,
        deletedSummaries,
        vacuumed
      };
    } catch (error) {
      this.logger.warn({ error }, "Metric history retention sweep failed");

      return {
        deletedSnapshots: 0,
        deletedSummaries: 0,
        vacuumed: false
      };
    }
  }
}
