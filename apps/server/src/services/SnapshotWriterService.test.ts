import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { DisplaySyncEvent } from "@solar-display/shared";
import { SnapshotWriterService } from "./SnapshotWriterService.js";

function createDatabase() {
  const database = new Database(":memory:");
  const migration001 = readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8");
  const migration003 = readFileSync(resolve(process.cwd(), "src/db/migrations/003_history.sql"), "utf8");
  database.exec(migration001);
  database.exec(migration003);
  return database;
}

test("SnapshotWriterService emits monitoring-history invalidation when a new snapshot is persisted", () => {
  const database = createDatabase();
  const emitted: DisplaySyncEvent[] = [];
  const service = new SnapshotWriterService({
    database,
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
  assert.deepEqual(
    emitted.map((payload) => ({ reason: payload.reason, scope: payload.scope })),
    [{ reason: "metric-snapshot-written", scope: "monitoring-history" }]
  );

  database.close();
});
