import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { LiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import { MetricsAccumulatorService } from "./MetricsAccumulatorService.js";

function createDatabase() {
  const database = new Database(":memory:");
  const migration001 = readFileSync(
    resolve(process.cwd(), "src/db/migrations/001_init.sql"),
    "utf8"
  );
  const migration003 = readFileSync(
    resolve(process.cwd(), "src/db/migrations/003_history.sql"),
    "utf8"
  );

  database.exec(migration001);
  database.exec(migration003);
  database
    .prepare(
      `
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ('co2_factor', '0.5', CURRENT_TIMESTAMP)
      `
    )
    .run();

  return database;
}

function buildSnapshot(
  entries: Array<[metricKey: string, value: number, unit: string]>,
  timestamp: string
): LiveMetricsSnapshot {
  return {
    metrics: Object.fromEntries(
      entries.map(([metricKey, value, unit]) => [
        metricKey,
        {
          quality: "good",
          timestamp,
          unit,
          value
        }
      ])
    ),
    timestamp
  };
}

test("MetricsAccumulatorService prefers total metrics, integrates power fallback, skips long gaps, and throttles DB writes", () => {
  const database = createDatabase();

  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES
          ('generation', 100, '2026-05-13T00:00:00.000Z', 0),
          ('co2', 50, '2026-05-13T00:00:00.000Z', 0)
      `
    )
    .run();

  const snapshots = [
    buildSnapshot(
      [
        ["totalGeneration", 120, "kWh"],
        ["consumptionEnergy", 40, "kWh"],
        ["selfConsumptionEnergy", 30, "kWh"],
        ["realTimePower", 500, "kW"],
        ["systemEfficiency", 97.2, "%"]
      ],
      "2026-05-13T09:00:00.000Z"
    ),
    buildSnapshot(
      [
        ["realTimePower", 600, "kW"],
        ["consumptionEnergy", 42, "kWh"],
        ["selfConsumptionEnergy", 31, "kWh"],
        ["systemEfficiency", 96.8, "%"]
      ],
      "2026-05-13T09:02:00.000Z"
    ),
    buildSnapshot(
      [
        ["realTimePower", 700, "kW"],
        ["systemEfficiency", 96.1, "%"]
      ],
      "2026-05-13T09:10:30.000Z"
    )
  ];
  let snapshotIndex = 0;

  const service = new MetricsAccumulatorService({
    database,
    flushIntervalMs: 30_000,
    readSnapshot: () => snapshots[snapshotIndex]!
  });

  service.initialize();
  service.processAt(new Date("2026-05-13T09:00:00.000Z"));

  assert.deepEqual(service.getCounters(), {
    co2: 60,
    consumption: 40,
    generation: 120,
    selfConsumption: 30
  });

  const afterFirstProcess = database
    .prepare("SELECT total_value FROM cumulative_counters WHERE metric_key = 'generation'")
    .get() as { total_value: number };
  assert.equal(afterFirstProcess.total_value, 100);

  snapshotIndex = 1;
  service.processAt(new Date("2026-05-13T09:02:00.000Z"));

  assert.deepEqual(service.getCounters(), {
    co2: 70,
    consumption: 42,
    generation: 140,
    selfConsumption: 31
  });

  snapshotIndex = 2;
  service.processAt(new Date("2026-05-13T09:10:30.000Z"));

  assert.deepEqual(service.getCounters(), {
    co2: 70,
    consumption: 42,
    generation: 140,
    selfConsumption: 31
  });

  service.flush(true);

  const persistedRows = database
    .prepare(
      `
        SELECT metric_key, total_value, reset_count
        FROM cumulative_counters
        ORDER BY metric_key ASC
      `
    )
    .all() as Array<{ metric_key: string; reset_count: number; total_value: number }>;

  assert.deepEqual(persistedRows, [
    { metric_key: "co2", reset_count: 0, total_value: 70 },
    { metric_key: "consumption", reset_count: 0, total_value: 42 },
    { metric_key: "generation", reset_count: 0, total_value: 140 },
    { metric_key: "selfConsumption", reset_count: 0, total_value: 31 }
  ]);

  database.close();
});
