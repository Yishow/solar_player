import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-readiness-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase },
  { readDisplayReadinessReport }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./displayReadinessService.js")
]);

function insertFactorySummary(
  factory: "cl" | "kn",
  summary: { month_mwh: number; timestamp: string; today_mwh: number; total_mwh?: number }
) {
  const insert = getDatabase().prepare(`
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, 'MWh', ?, 'good', ?)
  `);
  const rawPayload = JSON.stringify(summary);
  insert.run(`factoryGeneration.${factory}.todayMwh`, summary.today_mwh, summary.timestamp, rawPayload);
  insert.run(`factoryGeneration.${factory}.monthMwh`, summary.month_mwh, summary.timestamp, rawPayload);
  if (summary.total_mwh !== undefined) {
    insert.run(`factoryGeneration.${factory}.totalMwh`, summary.total_mwh, summary.timestamp, rawPayload);
  }
}

function findSustainabilityGeneration() {
  return readDisplayReadinessReport({ now: new Date("2026-06-26T15:38:20+08:00") })
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

  const finding = findSustainabilityGeneration();

  assert.equal(finding?.status, "ready");
  assert.match(finding?.sourceId ?? "", /solar\/CL\/summary/);
  assert.match(finding?.sourceId ?? "", /solar\/KN\/summary/);
  assert.match(finding?.reason ?? "", /CL \+ KN MQTT aggregate/);
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

  const finding = findSustainabilityGeneration();

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

  const finding = findSustainabilityGeneration();

  assert.equal(finding?.status, "warning");
  assert.match(finding?.reason ?? "", /KN summary stale/);
});

test("readiness warns when the CL and KN cumulative aggregate regresses", () => {
  getDatabase()
    .prepare(`
      INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES ('totalGeneration', 14000, 'MWh', '2026-06-26T15:37:55+08:00', 'good', '{}')
    `)
    .run();
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

  const finding = findSustainabilityGeneration();

  assert.equal(finding?.status, "warning");
  assert.match(finding?.reason ?? "", /CL\+KN total_mwh regression/);
});

test("CL-only Sustainability readiness ignores stale KN", () => {
  getDatabase()
    .prepare("UPDATE display_page_registry SET enabled = 0 WHERE page_key = 'factory-circuit-guanyin'")
    .run();
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

  const finding = findSustainabilityGeneration();

  assert.equal(finding?.status, "ready");
  assert.equal(finding?.reason, "CL MQTT ready");
  assert.match(finding?.sourceId ?? "", /solar\/CL\/summary/);
  assert.doesNotMatch(finding?.sourceId ?? "", /solar\/KN\/summary/);
});

test("Sustainability readiness reports no factory selected when both factory pages are disabled", () => {
  getDatabase()
    .prepare("UPDATE display_page_registry SET enabled = 0 WHERE page_key IN ('factory-circuit', 'factory-circuit-guanyin')")
    .run();

  const finding = findSustainabilityGeneration();

  assert.equal(finding?.status, "blocking");
  assert.equal(finding?.reason, "no factory selected in playback settings");
  assert.equal(finding?.sourceId, null);
});
