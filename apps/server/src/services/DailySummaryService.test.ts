import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { migrateScopedMetricIdentity } from "../db/scopedMetricMigration.js";
import type { DisplaySyncEvent } from "@solar-display/shared";
import { tryResolvePersistedPeriodConsumption } from "./periodConsumptionService.js";
import { readActiveProjection } from "./consumptionProjectionService.js";
import { seedAcceptedReading } from "./meterReadingService.js";
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
  for (const migration of ["033_freshness_policy.sql", "040_meter_reading_contracts.sql", "049_meter_source_boundary_age.sql", "041_site_energy_profiles.sql", "042_consumption_projections.sql", "046_meter_reading_evidence.sql", "047_projection_activation_context.sql"]) {
    database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations", migration), "utf8"));
  }
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
    consumption_total: null,
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
    consumption_total: null,
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
    consumption_total: null,
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


test("E2 daily summary restores canonical consumption from samples without clamping or poll readings", () => {
  const database = createDatabase();
  database.prepare(`INSERT INTO site_energy_profiles
    (profile_id, metric_scope, revision, schema_version, site_time_zone, status, effective_from, site_total_json, departments_json, share_basis_json, active, created_at)
    VALUES ('kn-energy', 'kn', 1, 1, 'Asia/Taipei', 'ready', '2026-01-01T00:00:00Z', ?, '[]', '{"kind":"site-main"}', 1, '2026-01-01T00:00:00Z')`)
    .run(JSON.stringify({ coverageReview: "reviewed", kind: "meter-set", label: "KN", memberChannelIds: ["main"] }));
  const source = { channelId: "main", meterId: "main", metricKey: "consumptionEnergy", metricScope: "kn" as const,
    sourceRevision: 1, epochId: "epoch", measurementKind: "cumulative-energy" as const, energyFlowRole: "consumption" as const,
    expectedCadenceSeconds: 60, sourceTimestampTimeZone: "UTC",
    inputUnit: "kWh", scaleDecimal: "1", enabled: true, reviewStatus: "reviewed" as const, timestampPolicy: "source-required" as const };
  seedAcceptedReading(database, source, "10000", "2026-08-31T16:00:00Z", "2026-08-31T16:00:01Z");
  seedAcceptedReading(database, source, "10300", "2026-09-01T04:00:00Z", "2026-09-01T04:00:01Z");
  const metricsAccumulatorService = { getCounters: () => ({ co2: 0, consumption: 99999, generation: 0, selfConsumption: 0 }),
    getLatestSnapshot: () => ({ capturedAt: null, consumptionPower: null, generationPower: null }) } as never;
  const makeService = () => new DailySummaryService({ database, metricScope: "kn", metricsAccumulatorService });
  makeService().processAt(new Date("2026-09-01T04:00:00Z"));
  assert.equal(readActiveProjection(database, "kn", "day")?.valueKwh, "300");
  assert.equal(readActiveProjection(database, "kn", "day")?.siteTimeZone, "Asia/Taipei");
  makeService().processAt(new Date("2026-09-01T04:00:00Z"));
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count, 2);
  makeService().processAt(new Date("2026-09-01T04:01:00Z"));
  const saved = readActiveProjection(database, "kn", "day");
  makeService().processAt(new Date("2026-09-01T04:02:00Z"));
  assert.equal(readActiveProjection(database, "kn", "day")?.projectionId, saved?.projectionId);
  assert.equal(tryResolvePersistedPeriodConsumption(database, "kn", "day", "2026-09-01T04:02:00Z")?.calculatedThrough, "2026-09-01T04:02:00.000Z");
  seedAcceptedReading(database, source, "10", "2026-09-01T05:00:00Z", "2026-09-01T05:00:01Z");
  makeService().processAt(new Date("2026-09-01T05:00:00Z"));
  assert.equal(readActiveProjection(database, "kn", "day")?.quality, "invalid");
  assert.equal(readActiveProjection(database, "kn", "day")?.valueKwh, null);
  const summaryRow = database.prepare("SELECT date FROM daily_energy_summaries WHERE metric_scope = 'kn'").get() as { date: string };
  assert.equal(summaryRow.date, "2026-09-01");
  database.close();
});
