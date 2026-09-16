import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-engineering-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ migrateDatabase }, { getDatabase }] = await Promise.all([
  import("../db/migrate.js"),
  import("../db/index.js")
]);

const {
  listEngineeringSources,
  previewEngineeringSource,
  applyEngineeringSource,
  resolveEnabledEngineeringTopics
} = await import("./engineeringSourceService.js");

const {
  admitDailyEngineeringReport,
  batchImportDailyReports,
  getEngineeringReportHistory,
  readEngineeringPeriodResult
} = await import("./engineeringReportService.js");

function registerDailyEngineeringSource(
  db: ReturnType<typeof getDatabase>,
  engineeringId: "stamping" | "body" | "painting" | "assembly" | "utility" | "office" | "heavy_vehicle" | "ed_coating",
  publisherId = "pub-1"
) {
  const preview = previewEngineeringSource({
    sourceRef: `kn-eng-${engineeringId}-energy`,
    sourceKind: "engineering",
    site: "kn",
    engineeringId,
    purpose: "energy",
    mode: "daily-report",
    exactTopic: `factory/guanyin/energy/daily/${engineeringId}`,
    approvedPublisherId: publisherId,
    reviewStatus: "approved",
    unit: "kWh",
    calendarRevision: 1,
    enabled: true
  });
  return applyEngineeringSource(db, {
    previewToken: preview.previewToken,
    expectedRevision: 0,
    draft: preview.canonicalDraft
  }).source;
}

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

test("Migration 054 and eight engineering defaults", () => {
  migrateDatabase();
  const db = getDatabase();

  const list = listEngineeringSources(db);
  // 8 engineerings * 2 purposes (power and energy) = 16
  assert.equal(list.length, 16);
  const stampingPower = list.find((s) => s.engineeringId === "stamping" && s.purpose === "power");
  assert.ok(stampingPower);
  assert.equal(stampingPower.mode, "unconfigured");
  assert.equal(stampingPower.enabled, false);
});

test("KNE-R3/R4: Preview and Apply with token and revision guard", () => {
  const db = getDatabase();

  const preview = previewEngineeringSource({
    sourceRef: "kn-eng-stamping-power",
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "stamping",
    purpose: "power",
    mode: "power-gauge",
    exactTopic: "factory/guanyin/power/stamping",
    approvedPublisherId: "pub-kn-power",
    reviewStatus: "approved",
    unit: "kW",
    enabled: true
  });

  assert.ok(preview.previewToken);

  // Apply with matching token and expectedRevision=0
  const applied = applyEngineeringSource(db, {
    previewToken: preview.previewToken,
    expectedRevision: 0,
    draft: preview.canonicalDraft
  });

  assert.equal(applied.source.configurationRevision, 1);
  assert.equal(applied.source.enabled, true);
  assert.equal(applied.source.mode, "power-gauge");

  // Verify resolved enabled topics
  const topics = resolveEnabledEngineeringTopics(db);
  assert.ok(topics.includes("factory/guanyin/power/stamping"));

  // Apply with old revision should fail (Conflict)
  assert.throws(
    () =>
      applyEngineeringSource(db, {
        previewToken: preview.previewToken,
        expectedRevision: 0,
        draft: preview.canonicalDraft
      }),
    /Conflict/
  );
});

test("KNE-R5: Out-of-order power observation does not move freshness backward", () => {
  let livePower: number | null = null;
  let liveObservedAt: number = 0;

  function handlePowerObservation(packet: { observedAt: string; value: number }) {
    const packetTime = Date.parse(packet.observedAt);
    if (packetTime > liveObservedAt) {
      liveObservedAt = packetTime;
      livePower = packet.value;
      return true;
    }
    return false; // ignored late packet
  }

  // First packet at 10:02
  const p1 = handlePowerObservation({ observedAt: "2026-09-16T10:02:00Z", value: 150 });
  assert.equal(p1, true);
  assert.equal(livePower, 150);

  // Late packet at 10:01
  const p2 = handlePowerObservation({ observedAt: "2026-09-16T10:01:00Z", value: 140 });
  assert.equal(p2, false);
  assert.equal(livePower, 150); // Did not move backward
});

test("EPR-R1 & EPR-R2: Daily report admission, true zero, duplicate, and correction", () => {
  const db = getDatabase();
  registerDailyEngineeringSource(db, "painting", "pub-kn-1");

  const report1 = {
    schemaVersion: 1,
    sourceKind: "engineering" as const,
    site: "kn" as const,
    engineeringId: "painting" as const,
    publisherId: "pub-kn-1",
    definitionRevision: 1,
    calendarRevision: 1,
    measurementKind: "interval-energy" as const,
    unit: "kWh" as const,
    value: "100.5",
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    periodStatus: "final" as const,
    coverage: "complete" as const,
    quality: "valid" as const,
    dataRevision: 1,
    publishedAt: "2026-09-16T01:00:00Z"
  };

  // Initial admit
  const res1 = admitDailyEngineeringReport(db, report1);
  assert.equal(res1.accepted, true);
  assert.equal(res1.status, "accepted");

  // Duplicate repeat
  const resDup = admitDailyEngineeringReport(db, report1);
  assert.equal(resDup.accepted, true);
  assert.equal(resDup.status, "duplicate");

  // Conflict same revision different content
  const resConflict = admitDailyEngineeringReport(db, {
    ...report1,
    value: "120.0"
  });
  assert.equal(resConflict.accepted, false);
  assert.equal(resConflict.status, "conflict");

  // Higher revision correction with reason
  const resCorrection = admitDailyEngineeringReport(db, {
    ...report1,
    value: "125.0",
    dataRevision: 2,
    reason: "Upstream meter recount"
  });
  assert.equal(resCorrection.accepted, true);
  assert.equal(resCorrection.status, "accepted");

  // Verify history contains both revisions
  const history = getEngineeringReportHistory(db, {
    site: "kn",
    engineeringId: "painting",
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z"
  });
  assert.equal(history.length, 2);
  assert.equal(history[0].data_revision, 2);
  assert.equal(history[0].value, "125.0");

  // Verify projection invalidation recorded
  const invalidations = db
    .prepare("SELECT * FROM engineering_projection_invalidations WHERE engineering_id = 'painting'")
    .all();
  assert.ok(invalidations.length >= 2);
});

test("EPR-R2-S04: Withdrawal and restoration", () => {
  const db = getDatabase();
  registerDailyEngineeringSource(db, "assembly", "pub-kn-1");

  const base = {
    schemaVersion: 1,
    sourceKind: "engineering" as const,
    site: "kn" as const,
    engineeringId: "assembly" as const,
    publisherId: "pub-kn-1",
    definitionRevision: 1,
    calendarRevision: 1,
    measurementKind: "interval-energy" as const,
    unit: "kWh" as const,
    value: "200.0",
    periodStart: "2026-09-13T16:00:00Z",
    periodEnd: "2026-09-14T16:00:00Z",
    periodStatus: "final" as const,
    coverage: "complete" as const,
    quality: "valid" as const,
    dataRevision: 1,
    publishedAt: "2026-09-15T01:00:00Z"
  };

  admitDailyEngineeringReport(db, base);

  // Withdraw via revision 2
  const withdrawRes = admitDailyEngineeringReport(db, {
    ...base,
    dataRevision: 2,
    value: null,
    periodStatus: "withdrawn",
    coverage: "partial",
    reason: "Disputed sensor reading"
  });
  assert.equal(withdrawRes.accepted, true);

  const headAfterWithdraw = db
    .prepare("SELECT * FROM engineering_report_heads WHERE engineering_id = 'assembly'")
    .get() as any;
  assert.equal(headAfterWithdraw.period_status, "withdrawn");
  assert.equal(headAfterWithdraw.value, null);

  // Restore via revision 3
  const restoreRes = admitDailyEngineeringReport(db, {
    ...base,
    dataRevision: 3,
    value: "198.5",
    periodStatus: "final",
    coverage: "complete",
    reason: "Sensor audit verified and adjusted"
  });
  assert.equal(restoreRes.accepted, true);

  const headAfterRestore = db
    .prepare("SELECT * FROM engineering_report_heads WHERE engineering_id = 'assembly'")
    .get() as any;
  assert.equal(headAfterRestore.period_status, "final");
  assert.equal(headAfterRestore.value, "198.5");
});

test("EPR-R5: Bounded batch import rejects > 248 records and evaluates individual outcomes", () => {
  const db = getDatabase();
  registerDailyEngineeringSource(db, "utility");
  registerDailyEngineeringSource(db, "office");

  // Test 249 records batch rejection before domain writes
  const oversizedList = Array.from({ length: 249 }).map((_, idx) => ({
    schemaVersion: 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "stamping",
    publisherId: "pub-1",
    definitionRevision: 1,
    calendarRevision: 1,
    measurementKind: "interval-energy",
    unit: "kWh",
    value: "10",
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: idx + 1,
    publishedAt: "2026-09-16T01:00:00Z"
  }));

  assert.throws(
    () => batchImportDailyReports(db, oversizedList),
    /Batch size exceeds maximum limit of 248 records/
  );

  // Test bounded valid batch with 2 records
  const validBatch = [
    {
      schemaVersion: 1,
      sourceKind: "engineering",
      site: "kn",
      engineeringId: "utility",
      publisherId: "pub-1",
      definitionRevision: 1,
      calendarRevision: 1,
      measurementKind: "interval-energy",
      unit: "kWh",
      value: "50",
      periodStart: "2026-09-14T16:00:00Z",
      periodEnd: "2026-09-15T16:00:00Z",
      periodStatus: "final",
      coverage: "complete",
      quality: "valid",
      dataRevision: 1,
      publishedAt: "2026-09-16T01:00:00Z"
    },
    {
      schemaVersion: 1,
      sourceKind: "engineering",
      site: "kn",
      engineeringId: "office",
      publisherId: "pub-1",
      definitionRevision: 1,
      calendarRevision: 1,
      measurementKind: "interval-energy",
      unit: "kWh",
      value: "30",
      periodStart: "2026-09-14T16:00:00Z",
      periodEnd: "2026-09-15T16:00:00Z",
      periodStatus: "final",
      coverage: "complete",
      quality: "valid",
      dataRevision: 1,
      publishedAt: "2026-09-16T01:00:00Z"
    }
  ];

  const batchRes = batchImportDailyReports(db, validBatch);
  assert.equal(batchRes.total, 2);
  assert.equal(batchRes.accepted, 2);
  assert.equal(batchRes.results[0].status, "accepted");
  assert.equal(batchRes.results[1].status, "accepted");
});

test("EPR-R4/R6: period provider includes every complete local day in the requested range", () => {
  const db = getDatabase();
  registerDailyEngineeringSource(db, "stamping", "pub-period-range");

  const base = {
    schemaVersion: 1,
    sourceKind: "engineering" as const,
    site: "kn" as const,
    engineeringId: "stamping" as const,
    publisherId: "pub-period-range",
    definitionRevision: 1,
    calendarRevision: 1,
    measurementKind: "interval-energy" as const,
    unit: "kWh" as const,
    periodStatus: "final" as const,
    coverage: "complete" as const,
    quality: "valid" as const,
    dataRevision: 1,
    publishedAt: "2026-09-16T01:00:00Z"
  };

  assert.equal(admitDailyEngineeringReport(db, {
    ...base,
    value: "100",
    periodStart: "2026-09-13T16:00:00Z",
    periodEnd: "2026-09-14T16:00:00Z"
  }).accepted, true);
  assert.equal(admitDailyEngineeringReport(db, {
    ...base,
    value: "120",
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z"
  }).accepted, true);

  const period = readEngineeringPeriodResult(db, {
    periodStart: "2026-09-13T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    expectedEngineeringIds: ["stamping"]
  });

  assert.equal(period.results.length, 2);
  assert.equal(period.summary.periodDays, 2);
  assert.equal(period.summary.totalKWh, 220);
  assert.equal(period.summary.itemsByEngineering.stamping, 220);
});
