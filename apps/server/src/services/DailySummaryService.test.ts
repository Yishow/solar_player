import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { migrateScopedMetricIdentity } from "../db/scopedMetricMigration.js";
import type { DisplaySyncEvent } from "@solar-display/shared";
import { DailySummaryService } from "./DailySummaryService.js";

function createDatabase() {
  const database = new Database(":memory:");
  const migration001 = readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8");
  const migration003 = readFileSync(resolve(process.cwd(), "src/db/migrations/003_history.sql"), "utf8");
  const migration018 = readFileSync(resolve(process.cwd(), "src/db/migrations/018_display_value_overrides.sql"), "utf8");
  database.exec(migration001);
  database.exec(migration003);
  database.exec(migration018);
  migrateScopedMetricIdentity(database, { legacySiteScope: "cl" });
  return database;
}

test("DailySummaryService emits monitoring-history invalidation when a daily summary is persisted", () => {
  const database = createDatabase();
  const emitted: DisplaySyncEvent[] = [];
  let counters = {
    co2: 8,
    consumption: 4,
    generation: 12,
    selfConsumption: 7
  };
  const beforeMidnight = new Date(2026, 4, 13, 23, 59);
  const afterMidnight = new Date(2026, 4, 14, 0, 1);
  let latestSnapshot = {
    capturedAt: beforeMidnight.toISOString(),
    co2: 8,
    consumption: 4,
    consumptionPower: 8,
    efficiency: 97.2,
    generation: 12,
    generationPower: 12,
    ratio: 0.8,
    selfConsumption: 7
  };

  const service = new DailySummaryService({
    database,
    metricScope: "cl",
    emitDisplaySync: (payload) => {
      emitted.push(payload);
    },
    metricsAccumulatorService: {
      getCounters: () => counters,
      getLatestSnapshot: () => latestSnapshot
    } as never
  });

  service.processAt(beforeMidnight);

  counters = {
    co2: 9,
    consumption: 5,
    generation: 15,
    selfConsumption: 8
  };
  latestSnapshot = {
    ...latestSnapshot,
    capturedAt: afterMidnight.toISOString(),
    consumptionPower: 10,
    generation: 15,
    generationPower: 16,
    selfConsumption: 8
  };

  service.processAt(afterMidnight);

  const row = database
    .prepare("SELECT generation_total, consumption_total, self_consumption_total FROM daily_energy_summaries WHERE date = ?")
    .get("2026-05-13") as {
      consumption_total: number;
      generation_total: number;
      self_consumption_total: number;
    };

  assert.deepEqual(row, {
    consumption_total: 1,
    generation_total: 3,
    self_consumption_total: 1
  });
  assert.deepEqual(
    emitted.map((payload) => ({ metricScope: payload.metricScope, reason: payload.reason, scope: payload.scope })),
    [
      { metricScope: "cl", reason: "daily-summary-updated", scope: "monitoring-history" },
      { metricScope: "cl", reason: "daily-summary-updated", scope: "monitoring-history" }
    ]
  );

  database.close();
});

test("DailySummaryService persists the current day and resumes its baseline after restart", () => {
  const database = createDatabase();
  let counters = {
    co2: 8,
    consumption: 4,
    generation: 12,
    selfConsumption: 7
  };
  const metricsAccumulatorService = {
    getCounters: () => counters,
    getLatestSnapshot: () => ({
      capturedAt: "2026-05-13T12:00:00.000Z",
      consumptionPower: 8,
      generationPower: 12
    })
  } as never;
  const readSummary = () =>
    database
      .prepare(
        "SELECT generation_total, consumption_total, self_consumption_total FROM daily_energy_summaries WHERE date = ?"
      )
      .get("2026-05-13") as {
        consumption_total: number;
        generation_total: number;
        self_consumption_total: number;
      };

  const firstService = new DailySummaryService({ database, metricScope: "cl", metricsAccumulatorService });
  firstService.processAt(new Date("2026-05-13T12:00:00.000Z"));
  counters = {
    co2: 9,
    consumption: 5,
    generation: 15,
    selfConsumption: 8
  };
  firstService.processAt(new Date("2026-05-13T13:00:00.000Z"));

  assert.deepEqual(readSummary(), {
    consumption_total: 1,
    generation_total: 3,
    self_consumption_total: 1
  });

  const restartedService = new DailySummaryService({ database, metricScope: "cl", metricsAccumulatorService });
  restartedService.processAt(new Date("2026-05-13T13:01:00.000Z"));
  counters = {
    co2: 10,
    consumption: 7,
    generation: 17,
    selfConsumption: 10
  };
  restartedService.processAt(new Date("2026-05-13T14:00:00.000Z"));

  assert.deepEqual(readSummary(), {
    consumption_total: 3,
    generation_total: 5,
    self_consumption_total: 3
  });

  database.close();
});

test("DailySummaryService rolls the local-day baseline for one metric scope without resetting another", () => {
  const database = createDatabase();
  const beforeMidnight = new Date(2026, 7, 29, 23, 59);
  const afterMidnight = new Date(2026, 7, 30, 0, 1);
  let clGeneration = 100;
  let knGeneration = 200;
  const accumulator = (scope: "cl" | "kn") => ({
    getCounters: () => ({
      co2: 0,
      consumption: 0,
      generation: scope === "cl" ? clGeneration : knGeneration,
      selfConsumption: 0
    }),
    getLatestSnapshot: () => ({ capturedAt: beforeMidnight.toISOString(), consumptionPower: null, generationPower: null })
  }) as never;
  const cl = new DailySummaryService({ database, metricScope: "cl", metricsAccumulatorService: accumulator("cl") });
  const kn = new DailySummaryService({ database, metricScope: "kn", metricsAccumulatorService: accumulator("kn") });

  cl.processAt(beforeMidnight);
  kn.processAt(beforeMidnight);
  clGeneration = 110;
  knGeneration = 220;
  cl.processAt(afterMidnight);

  const rows = database.prepare(`
    SELECT metric_scope, date, generation_total
    FROM daily_energy_summaries
    ORDER BY metric_scope, date
  `).all();
  assert.deepEqual(rows, [
    { date: "2026-08-29", generation_total: 10, metric_scope: "cl" },
    { date: "2026-08-30", generation_total: 0, metric_scope: "cl" },
    { date: "2026-08-29", generation_total: 0, metric_scope: "kn" }
  ]);

  database.close();
});
