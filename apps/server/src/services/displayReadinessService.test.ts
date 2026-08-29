import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import { updateDefaultPlaybackPageForTest } from "../testing/defaultPlaybackProfileTestSupport.js";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-readiness-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase },
  { readDisplayReadinessReport },
  { readFreshnessPolicy, updateFreshnessPolicy }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./displayReadinessService.js"),
  import("./freshnessPolicyService.js")
]);

function insertFactorySummary(
  factory: "cl" | "kn",
  summary: { month_mwh: number; timestamp: string; today_mwh: number; total_mwh?: number }
) {
  const insert = getDatabase().prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, 'MWh', ?, 'good', ?)
  `);
  const rawPayload = JSON.stringify(summary);
  insert.run(factory, "factoryGeneration.todayMwh", summary.today_mwh, summary.timestamp, rawPayload);
  insert.run(factory, "factoryGeneration.monthMwh", summary.month_mwh, summary.timestamp, rawPayload);
  if (summary.total_mwh !== undefined) {
    insert.run(factory, "factoryGeneration.totalMwh", summary.total_mwh, summary.timestamp, rawPayload);
  }
}

function findSustainabilityGeneration(siteScope: "cl" | "kn") {
  return readDisplayReadinessReport({
    now: new Date("2026-06-26T15:38:20+08:00"),
    siteScope
  })
    .findings.find(
      (finding) =>
        finding.pageId === "sustainability"
        && finding.requirementKey === "accumulatedGenerationGwh"
    );
}

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(process.env.DATABASE_PATH!, { force: true });
  rmSync(`${process.env.DATABASE_PATH!}-shm`, { force: true });
  rmSync(`${process.env.DATABASE_PATH!}-wal`, { force: true });
  migrateDatabase();
  seedDatabase();
  getDatabase().prepare("UPDATE mqtt_settings SET message_timeout = 60").run();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("readiness reports CL and KN derived coverage when both summaries are complete", () => {
  insertFactorySummary("cl", {
    month_mwh: 366.93,
    timestamp: "2026-06-26T15:38:10+08:00",
    today_mwh: 3.49,
    total_mwh: 9986.306
  });
  insertFactorySummary("kn", {
    month_mwh: 265.77,
    timestamp: "2026-06-26T15:37:55+08:00",
    today_mwh: 2.92,
    total_mwh: 3659.57
  });

  const clFinding = findSustainabilityGeneration("cl");
  const knFinding = findSustainabilityGeneration("kn");

  assert.equal(clFinding?.status, "ready");
  assert.equal(clFinding?.metricScope, "cl");
  assert.match(clFinding?.sourceId ?? "", /solar\/CL\/summary/);
  assert.doesNotMatch(clFinding?.sourceId ?? "", /solar\/KN\/summary/);
  assert.equal(knFinding?.status, "ready");
  assert.equal(knFinding?.metricScope, "kn");
  assert.match(knFinding?.sourceId ?? "", /solar\/KN\/summary/);
  assert.doesNotMatch(knFinding?.sourceId ?? "", /solar\/CL\/summary/);
});

test("readiness identifies a missing KN total_mwh instead of reporting a direct mapping gap", () => {
  insertFactorySummary("cl", {
    month_mwh: 366.93,
    timestamp: "2026-06-26T15:38:10+08:00",
    today_mwh: 3.49,
    total_mwh: 9986.306
  });
  insertFactorySummary("kn", {
    month_mwh: 265.77,
    timestamp: "2026-06-26T15:37:55+08:00",
    today_mwh: 2.92
  });

  const finding = findSustainabilityGeneration("kn");

  assert.equal(finding?.status, "warning");
  assert.match(finding?.reason ?? "", /KN total_mwh missing/);
  assert.doesNotMatch(finding?.reason ?? "", /missing MQTT mapping/);
});

test("readiness warns when a factory summary is stale", () => {
  insertFactorySummary("cl", {
    month_mwh: 366.93,
    timestamp: "2026-06-26T15:38:10+08:00",
    today_mwh: 3.49,
    total_mwh: 9986.306
  });
  insertFactorySummary("kn", {
    month_mwh: 265.77,
    timestamp: "2026-06-26T15:37:00+08:00",
    today_mwh: 2.92,
    total_mwh: 3659.57
  });

  const finding = findSustainabilityGeneration("kn");

  assert.equal(finding?.status, "warning");
  assert.match(finding?.reason ?? "", /KN summary stale/);
});

test("site readiness never substitutes a global canonical value for missing site input", () => {
  getDatabase()
    .prepare(`
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES ('global', 'totalGeneration', 14000, 'MWh', '2026-06-26T15:37:55+08:00', 'good', '{}')
    `)
    .run();
  const finding = findSustainabilityGeneration("cl");

  assert.equal(finding?.status, "warning");
  assert.equal(finding?.metricScope, "cl");
  assert.match(finding?.reason ?? "", /CL .* missing/);
});

test("CL-only Sustainability readiness ignores stale KN", () => {
  updateDefaultPlaybackPageForTest(getDatabase(), "factory-circuit-guanyin", { enabled: false });
  insertFactorySummary("cl", {
    month_mwh: 366.93,
    timestamp: "2026-06-26T15:38:10+08:00",
    today_mwh: 3.49,
    total_mwh: 9986.306
  });
  insertFactorySummary("kn", {
    month_mwh: 265.77,
    timestamp: "2026-06-26T15:37:00+08:00",
    today_mwh: 2.92,
    total_mwh: 3659.57
  });

  const finding = findSustainabilityGeneration("cl");

  assert.equal(finding?.status, "ready");
  assert.equal(finding?.reason, "CL MQTT ready");
  assert.match(finding?.sourceId ?? "", /solar\/CL\/summary/);
  assert.doesNotMatch(finding?.sourceId ?? "", /solar\/KN\/summary/);
});

test("CL Sustainability readiness remains scoped when both factory pages are disabled", () => {
  updateDefaultPlaybackPageForTest(getDatabase(), "factory-circuit", { enabled: false });
  updateDefaultPlaybackPageForTest(getDatabase(), "factory-circuit-guanyin", { enabled: false });
  insertFactorySummary("cl", {
    month_mwh: 366.93,
    timestamp: "2026-06-26T15:38:10+08:00",
    today_mwh: 3.49,
    total_mwh: 9986.306
  });

  const finding = findSustainabilityGeneration("cl");

  assert.equal(finding?.status, "ready");
  assert.equal(finding?.metricScope, "cl");
  assert.equal(finding?.reason, "CL MQTT ready");
});

test("Readiness consumes the same updated Freshness Policy boundary", () => {
  getDatabase().prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'factoryCircuit.stampingPower', 120, 'kW', '2026-07-30T11:59:20.000Z', 'good', '{}')
  `).run();
  const now = new Date("2026-07-30T12:00:00.000Z");
  const readFinding = () =>
    readDisplayReadinessReport({ now, siteScope: "cl" }).findings.find(
      (finding) =>
        finding.pageId === "factory-circuit"
        && finding.requirementKey === "factoryCircuit.stampingPower"
    );

  assert.equal(readFinding()?.freshness?.state, "delayed");
  const current = readFreshnessPolicy().policy;
  updateFreshnessPolicy({
    ...current,
    realtime: {
      delayedAfterMs: 45_000,
      staleAfterMs: current.realtime.staleAfterMs,
      historicalAfterMs: current.realtime.historicalAfterMs
    }
  });
  assert.equal(readFinding()?.freshness?.state, "live");
});
