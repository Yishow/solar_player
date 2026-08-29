import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { migrateScopedMetricIdentity } from "../db/scopedMetricMigration.js";
import type { DisplaySyncEvent } from "@solar-display/shared";
import { SnapshotWriterService } from "./SnapshotWriterService.js";

function createDatabase() {
  const database = new Database(":memory:");
  const migration001 = readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8");
  const migration003 = readFileSync(resolve(process.cwd(), "src/db/migrations/003_history.sql"), "utf8");
  const migration013 = readFileSync(resolve(process.cwd(), "src/db/migrations/013_generation_power.sql"), "utf8");
  const migration018 = readFileSync(resolve(process.cwd(), "src/db/migrations/018_display_value_overrides.sql"), "utf8");
  database.exec(migration001);
  database.exec(migration003);
  database.exec(migration013);
  database.exec(migration018);
  migrateScopedMetricIdentity(database, { legacySiteScope: "cl" });
  return database;
}

test("SnapshotWriterService emits monitoring-history invalidation when a new snapshot is persisted", () => {
  const database = createDatabase();
  const emitted: DisplaySyncEvent[] = [];
  const service = new SnapshotWriterService({
    database,
    metricScope: "cl",
    emitDisplaySync: (payload) => {
      emitted.push(payload);
    },
    metricsAccumulatorService: {
      getLatestSnapshot: () => ({
        capturedAt: "2026-05-13T09:00:00.000Z",
        co2: 5,
        consumption: 4,
        consumptionPower: 2,
        efficiency: 97.2,
        generation: 12,
        generationPower: 3,
        ratio: 0.8,
        selfConsumption: 7
      })
    } as never
  });

  service.writeSnapshot(new Date("2026-05-13T09:01:00.000Z"));

  const rowCount = database.prepare("SELECT COUNT(*) as count FROM metric_snapshots").get() as { count: number };
  assert.equal(rowCount.count, 1);

  const row = database
    .prepare("SELECT metric_scope, generation, generation_power FROM metric_snapshots LIMIT 1")
    .get() as { metric_scope: string; generation: number; generation_power: number };
  assert.equal(row.metric_scope, "cl");
  assert.equal(row.generation, 12);
  assert.equal(row.generation_power, 3);
  assert.deepEqual(
    emitted.map((payload) => ({ metricScope: payload.metricScope, reason: payload.reason, scope: payload.scope })),
    [{ metricScope: "cl", reason: "metric-snapshot-written", scope: "monitoring-history" }]
  );

  database.close();
});

test("SnapshotWriterService identifies global history refreshes explicitly", () => {
  const database = createDatabase();
  const emitted: DisplaySyncEvent[] = [];
  const service = new SnapshotWriterService({
    database,
    emitDisplaySync: (payload) => emitted.push(payload),
    metricScope: "global",
    metricsAccumulatorService: {
      getLatestSnapshot: () => ({
        capturedAt: "2026-08-29T01:00:00.000Z",
        co2: 0,
        consumption: 0,
        consumptionPower: null,
        efficiency: null,
        generation: 30,
        generationPower: 3,
        ratio: null,
        selfConsumption: 0
      })
    } as never
  });

  service.writeSnapshot(new Date("2026-08-29T01:01:00.000Z"));
  assert.equal(emitted[0]?.metricScope, "global");
  assert.equal(database.prepare("SELECT metric_scope FROM metric_snapshots").pluck().get(), "global");
  database.close();
});
