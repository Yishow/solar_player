import assert from "node:assert/strict";
import test from "node:test";
import { resolveRetentionCutoffs } from "./metricRetentionPlan.js";

test("resolveRetentionCutoffs rejects zero and negative retention windows", () => {
  const now = new Date("2026-08-12T00:00:00.000Z");

  assert.throws(
    () => resolveRetentionCutoffs(now, { snapshotRetentionDays: -1, summaryRetentionDays: 30 }),
    /snapshotRetentionDays must be a positive integer/
  );
  assert.throws(
    () => resolveRetentionCutoffs(now, { snapshotRetentionDays: 30, summaryRetentionDays: 0 }),
    /summaryRetentionDays must be a positive integer/
  );
});

test("resolveRetentionCutoffs still computes normal positive windows", () => {
  const result = resolveRetentionCutoffs(new Date("2026-08-12T00:00:00.000Z"), {
    snapshotRetentionDays: 90,
    summaryRetentionDays: 365
  });

  assert.equal(result.snapshotCutoffIso, "2026-05-14T00:00:00.000Z");
  assert.equal(result.summaryCutoffDate, "2025-08-12");
});
