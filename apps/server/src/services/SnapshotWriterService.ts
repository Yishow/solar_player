import { clearInterval, setInterval } from "node:timers";
import type Database from "better-sqlite3";
import type { DisplaySyncEvent, MetricScope } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import type { MetricsAccumulatorService } from "./MetricsAccumulatorService.js";

type SnapshotWriterServiceOptions = {
  database?: Database.Database;
  emitDisplaySync?: (payload: DisplaySyncEvent) => void;
  intervalMs?: number;
  metricScope: MetricScope;
  metricsAccumulatorService: MetricsAccumulatorService;
};

export class SnapshotWriterService {
  private readonly database: Database.Database;
  private readonly emitDisplaySync?: (payload: DisplaySyncEvent) => void;
  private readonly intervalMs: number;
  private readonly metricsAccumulatorService: MetricsAccumulatorService;
  private readonly metricScope: MetricScope;
  private timer: NodeJS.Timeout | null = null;

  constructor(options: SnapshotWriterServiceOptions) {
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

    this.timer = setInterval(() => {
      this.writeSnapshot(new Date());
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  writeSnapshot(capturedAt: Date) {
    const snapshot = this.metricsAccumulatorService.getLatestSnapshot();

    if (snapshot.capturedAt === null) {
      return;
    }

    this.database
      .prepare(
        `
          INSERT INTO metric_snapshots (
            metric_scope,
            generation,
            generation_power,
            consumption,
            self_consumption,
            co2,
            ratio,
            efficiency,
            captured_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        this.metricScope,
        snapshot.generation,
        snapshot.generationPower,
        snapshot.consumption,
        snapshot.selfConsumption,
        snapshot.co2,
        snapshot.ratio,
        snapshot.efficiency,
        capturedAt.toISOString()
      );

    this.emitDisplaySync?.({
      generatedAt: capturedAt.toISOString(),
      metricScope: this.metricScope,
      reason: "metric-snapshot-written",
      scope: "monitoring-history"
    });
  }
}
