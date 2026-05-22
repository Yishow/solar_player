import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_RETENTION_SWEEP_INTERVAL_MS,
  DEFAULT_RETENTION_VACUUM_INTERVAL_MS,
  DEFAULT_SNAPSHOT_RETENTION_DAYS,
  DEFAULT_SUMMARY_RETENTION_DAYS,
  resolveRetentionCutoffs,
  shouldRunVacuum
} from "./metricRetentionPlan.js";

test("resolveRetentionCutoffs computes the snapshot and summary cutoffs from the retention windows", () => {
  assert.equal(DEFAULT_SNAPSHOT_RETENTION_DAYS, 90);
  assert.equal(DEFAULT_SUMMARY_RETENTION_DAYS, 1_825);
  assert.equal(DEFAULT_RETENTION_SWEEP_INTERVAL_MS, 21_600_000);
  assert.equal(DEFAULT_RETENTION_VACUUM_INTERVAL_MS, 604_800_000);

  const cutoffs = resolveRetentionCutoffs(new Date("2026-05-22T00:00:00.000Z"), {
    snapshotRetentionDays: 90,
    summaryRetentionDays: 1_825
  });

  assert.deepEqual(cutoffs, {
    snapshotCutoffIso: "2026-02-21T00:00:00.000Z",
    summaryCutoffDate: "2021-05-23"
  });
});

test("shouldRunVacuum follows the VACUUM decision Example table and allows the first eligible run", () => {
  assert.equal(
    shouldRunVacuum({
      deletedRows: 120,
      lastVacuumAt: 0,
      now: 700_000_000,
      vacuumEnabled: true,
      vacuumIntervalMs: 604_800_000
    }),
    true
  );
  assert.equal(
    shouldRunVacuum({
      deletedRows: 120,
      lastVacuumAt: 699_999_000,
      now: 700_000_000,
      vacuumEnabled: true,
      vacuumIntervalMs: 604_800_000
    }),
    false
  );
  assert.equal(
    shouldRunVacuum({
      deletedRows: 0,
      lastVacuumAt: 0,
      now: 700_000_000,
      vacuumEnabled: true,
      vacuumIntervalMs: 604_800_000
    }),
    false
  );
  assert.equal(
    shouldRunVacuum({
      deletedRows: 120,
      lastVacuumAt: 0,
      now: 700_000_000,
      vacuumEnabled: false,
      vacuumIntervalMs: 604_800_000
    }),
    false
  );
  assert.equal(
    shouldRunVacuum({
      deletedRows: 1,
      lastVacuumAt: null,
      now: 1_000,
      vacuumEnabled: true,
      vacuumIntervalMs: 604_800_000
    }),
    true
  );
});
