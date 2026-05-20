import { clearInterval, setInterval } from "node:timers";
import type Database from "better-sqlite3";
import type { DisplaySyncEvent } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import type { MetricsAccumulatorService } from "./MetricsAccumulatorService.js";

type SnapshotWriterServiceOptions = {
  database?: Database.Database;
  emitDisplaySync?: (payload: DisplaySyncEvent) => void;
  intervalMs?: number;
  metricsAccumulatorService: MetricsAccumulatorService;
};

export class SnapshotWriterService {
  private readonly database: Database.Database;
  private readonly emitDisplaySync?: (payload: DisplaySyncEvent) => void;
  private readonly intervalMs: number;
  private readonly metricsAccumulatorService: MetricsAccumulatorService;
  private timer: NodeJS.Timeout | null = null;

  constructor(options: SnapshotWriterServiceOptions) {
    this.database = options.database ?? getDatabase();
    this.emitDisplaySync = options.emitDisplaySync;
    this.intervalMs = options.intervalMs ?? 60_000;
    this.metricsAccumulatorService = options.metricsAccumulatorService;
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
            generation,
            consumption,
            self_consumption,
            co2,
            ratio,
            efficiency,
            captured_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        snapshot.generation,
        snapshot.consumption,
        snapshot.selfConsumption,
        snapshot.co2,
        snapshot.ratio,
        snapshot.efficiency,
        capturedAt.toISOString()
      );

    this.emitDisplaySync?.({
      generatedAt: capturedAt.toISOString(),
      reason: "metric-snapshot-written",
      scope: "monitoring-history"
    });
  }
}
