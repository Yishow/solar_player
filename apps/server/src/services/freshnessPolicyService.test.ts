import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-freshness-policy-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { closeDatabaseConnection },
  { migrateDatabase },
  {
    evaluateMetricFreshness,
    readFreshnessPolicy,
    updateFreshnessPolicy
  }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("./freshnessPolicyService.js")
]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  migrateDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.DATA_DIR;
  delete process.env.DATABASE_PATH;
});

test("Freshness Policy persists one global four-category policy", () => {
  const initial = readFreshnessPolicy();
  assert.equal(initial.policy.realtime.delayedAfterMs, 30_000);
  assert.equal(initial.policy.static, null);

  const updated = updateFreshnessPolicy({
    ...initial.policy,
    realtime: {
      delayedAfterMs: 45_000,
      staleAfterMs: 120_000,
      historicalAfterMs: 2_400_000
    }
  });

  assert.ok("policy" in updated);
  if (!("policy" in updated)) return;
  assert.equal(updated.policy.realtime.delayedAfterMs, 45_000);
  assert.equal(readFreshnessPolicy().policy.realtime.delayedAfterMs, 45_000);
});

test("server evaluator returns category, state, source time, age and next transition", () => {
  const result = evaluateMetricFreshness({
    metricKey: "realTimePower",
    nowMs: Date.parse("2026-07-30T12:00:30.000Z"),
    sourceTimestamp: "2026-07-30T12:00:00.000Z"
  });

  assert.deepEqual(result, {
    ageFrozen: false,
    ageMs: 30_000,
    category: "realtime",
    nextTransitionAt: "2026-07-30T12:01:30.000Z",
    sourceTimestamp: "2026-07-30T12:00:00.000Z",
    state: "delayed"
  });
});

test("server evaluator returns unavailable for a missing timestamp", () => {
  assert.equal(evaluateMetricFreshness({
    metricKey: "totalGeneration",
    nowMs: Date.parse("2026-07-30T12:00:00.000Z"),
    sourceTimestamp: null
  }).state, "unavailable");
});
