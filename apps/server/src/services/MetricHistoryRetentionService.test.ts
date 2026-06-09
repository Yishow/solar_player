import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import {
  DEFAULT_RETENTION_SWEEP_INTERVAL_MS,
  DEFAULT_RETENTION_VACUUM_INTERVAL_MS
} from "./metricRetentionPlan.js";
import { MetricHistoryRetentionService } from "./MetricHistoryRetentionService.js";

function createDatabase() {
  const database = new Database(":memory:");
  const migration001 = readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8");
  const migration003 = readFileSync(resolve(process.cwd(), "src/db/migrations/003_history.sql"), "utf8");
  database.exec(migration001);
  database.exec(migration003);
  return database;
}

function seedHistoryRows(database: Database.Database) {
  database
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
    .run(1, 1, 1, 1, 0.5, 90, "2026-02-20T23:59:59.000Z");
  database
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
    .run(2, 2, 2, 2, 0.5, 91, "2026-02-21T00:00:01.000Z");

  database
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
      `
    )
    .run("2021-05-22", 1, 1, 1, 1, 1, "2021-05-22T12:00:00.000Z", 1, "2021-05-22T12:00:00.000Z");
  database
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
      `
    )
    .run("2021-05-23", 2, 2, 2, 2, 2, "2021-05-23T12:00:00.000Z", 2, "2021-05-23T12:00:00.000Z");

  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES
          ('generation', 100, '2026-05-22T00:00:00.000Z', 0),
          ('consumption', 80, '2026-05-22T00:00:00.000Z', 0)
      `
    )
    .run();
}

test("MetricHistoryRetentionService prunes only out-of-window snapshots and summaries while preserving cumulative counters", () => {
  const database = createDatabase();
  seedHistoryRows(database);

  const service = new MetricHistoryRetentionService({
    database,
    logger: {
      warn: () => undefined
    },
    snapshotRetentionDays: 90,
    summaryRetentionDays: 1_825,
    vacuumEnabled: false
  });

  const result = service.sweep(new Date("2026-05-22T00:00:00.000Z"));

  assert.deepEqual(result, {
    deletedSnapshots: 1,
    deletedSummaries: 1,
    vacuumed: false
  });

  const remainingSnapshots = database
    .prepare("SELECT captured_at FROM metric_snapshots ORDER BY captured_at ASC")
    .all() as Array<{ captured_at: string }>;
  const remainingSummaries = database
    .prepare("SELECT date FROM daily_energy_summaries ORDER BY date ASC")
    .all() as Array<{ date: string }>;
  const counters = database
    .prepare(
      "SELECT metric_key, total_value, last_updated, reset_count FROM cumulative_counters ORDER BY metric_key ASC"
    )
    .all() as Array<{
      last_updated: string;
      metric_key: string;
      reset_count: number;
      total_value: number;
    }>;

  assert.deepEqual(remainingSnapshots, [{ captured_at: "2026-02-21T00:00:01.000Z" }]);
  assert.deepEqual(remainingSummaries, [{ date: "2021-05-23" }]);
  assert.deepEqual(counters, [
    {
      last_updated: "2026-05-22T00:00:00.000Z",
      metric_key: "consumption",
      reset_count: 0,
      total_value: 80
    },
    {
      last_updated: "2026-05-22T00:00:00.000Z",
      metric_key: "generation",
      reset_count: 0,
      total_value: 100
    }
  ]);

  database.close();
});

test("MetricHistoryRetentionService compares mixed timestamp formats by actual time", () => {
  const database = createDatabase();
  database
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
    .run(1, 1, 1, 1, 0.5, 90, "2026-02-20 23:59:59");
  database
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
    .run(2, 2, 2, 2, 0.5, 91, "2026-02-21T00:00:01.000Z");

  const service = new MetricHistoryRetentionService({
    database,
    logger: {
      warn: () => undefined
    },
    snapshotRetentionDays: 90,
    summaryRetentionDays: 1_825,
    vacuumEnabled: false
  });

  const result = service.sweep(new Date("2026-05-22T00:00:00.000Z"));
  assert.equal(result.deletedSnapshots, 1);

  const remainingSnapshots = database
    .prepare("SELECT captured_at FROM metric_snapshots ORDER BY datetime(captured_at) ASC, captured_at ASC")
    .all() as Array<{ captured_at: string }>;
  assert.deepEqual(remainingSnapshots, [{ captured_at: "2026-02-21T00:00:01.000Z" }]);

  database.close();
});

test("MetricHistoryRetentionService runs VACUUM only after a prune and only once per vacuum interval", () => {
  const database = createDatabase();
  seedHistoryRows(database);
  let vacuumCalls = 0;

  const observedDatabase = {
    exec(sql: string) {
      if (sql === "VACUUM") {
        vacuumCalls += 1;
      }

      return database.exec(sql);
    },
    prepare: database.prepare.bind(database)
  } as unknown as Database.Database;

  const service = new MetricHistoryRetentionService({
    database: observedDatabase,
    logger: {
      warn: () => undefined
    },
    snapshotRetentionDays: 90,
    summaryRetentionDays: 1_825,
    vacuumEnabled: true,
    vacuumIntervalMs: DEFAULT_RETENTION_VACUUM_INTERVAL_MS
  });

  const firstSweep = service.sweep(new Date("2026-05-22T00:00:00.000Z"));
  assert.equal(firstSweep.vacuumed, true);
  assert.equal(vacuumCalls, 1);

  database
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
    .run(3, 3, 3, 3, 0.5, 92, "2026-02-19T00:00:00.000Z");

  const secondSweep = service.sweep(new Date("2026-05-22T00:00:01.000Z"));
  assert.deepEqual(secondSweep, {
    deletedSnapshots: 1,
    deletedSummaries: 0,
    vacuumed: false
  });
  assert.equal(vacuumCalls, 1);

  database.close();
});

test("MetricHistoryRetentionService isolates sweep failures, logs them, and schedules background sweeps with start/stop", async () => {
  const warnings: unknown[][] = [];
  const scheduled: Array<{ callback: () => void; intervalMs: number }> = [];
  const cleared: unknown[] = [];
  const timer = Symbol("retention-timer");

  const service = new MetricHistoryRetentionService({
    clearScheduledInterval: (handle) => {
      cleared.push(handle);
    },
    database: {
      prepare() {
        throw new Error("delete failed");
      }
    } as unknown as Database.Database,
    logger: {
      warn: (...args: unknown[]) => {
        warnings.push(args);
      }
    },
    scheduleInterval: (callback, intervalMs) => {
      scheduled.push({ callback, intervalMs });
      return timer;
    },
    snapshotRetentionDays: 90,
    summaryRetentionDays: 1_825,
    sweepIntervalMs: DEFAULT_RETENTION_SWEEP_INTERVAL_MS,
    vacuumEnabled: true
  });

  const result = service.sweep(new Date("2026-05-22T00:00:00.000Z"));
  assert.deepEqual(result, {
    deletedSnapshots: 0,
    deletedSummaries: 0,
    vacuumed: false
  });
  assert.equal(warnings.length, 1);

  service.start();
  service.start();
  assert.deepEqual(
    scheduled.map((entry) => entry.intervalMs),
    [DEFAULT_RETENTION_SWEEP_INTERVAL_MS]
  );

  service.stop();
  service.stop();
  assert.deepEqual(cleared, [timer]);

  await Promise.resolve();
});
