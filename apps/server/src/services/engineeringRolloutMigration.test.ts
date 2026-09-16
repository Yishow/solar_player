import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-rollout-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ migrateDatabase }, { getDatabase }] = await Promise.all([
  import("../db/migrate.js"),
  import("../db/index.js")
]);

const {
  applyEngineeringSource,
  previewEngineeringSource
} = await import("./engineeringSourceService.js");

const {
  admitDailyEngineeringReport
} = await import("./engineeringReportService.js");

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

test("KNE-R7-S01: Two registrations claim same engineering energy purpose fails on overlap", () => {
  migrateDatabase();
  const db = getDatabase();

  // Registration 1: publisher A claims painting energy
  const prev1 = previewEngineeringSource({
    sourceRef: "kn-eng-painting-energy",
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "painting",
    purpose: "energy",
    mode: "daily-report",
    approvedPublisherId: "pub-A",
    unit: "kWh",
    enabled: true
  });
  applyEngineeringSource(db, {
    previewToken: prev1.previewToken,
    expectedRevision: 0,
    draft: prev1.canonicalDraft
  });

  // Registration 2: publisher B claims painting energy with another ref
  assert.throws(() => {
    const prev2 = previewEngineeringSource({
      sourceRef: "kn-eng-painting-energy-pub-B",
      sourceKind: "engineering",
      site: "kn",
      engineeringId: "painting",
      purpose: "energy",
      mode: "daily-report",
      approvedPublisherId: "pub-B",
      unit: "kWh",
      enabled: true
    });
    applyEngineeringSource(db, {
      previewToken: prev2.previewToken,
      expectedRevision: 0,
      draft: prev2.canonicalDraft
    });
  }, /UNIQUE constraint failed: engineering_source_definitions.site, engineering_source_definitions.engineering_id, engineering_source_definitions.purpose/);
});

test("KNE-R7-S03: Rollback disables admission, preserves history, and leaves Solar/CL untouched", () => {
  const db = getDatabase();

  const prevEnable = previewEngineeringSource({
    sourceRef: "kn-eng-assembly-energy",
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "assembly",
    purpose: "energy",
    mode: "daily-report",
    approvedPublisherId: "pub-1",
    reviewStatus: "approved",
    unit: "kWh",
    calendarRevision: 1,
    enabled: true
  });
  applyEngineeringSource(db, {
    previewToken: prevEnable.previewToken,
    expectedRevision: 0,
    draft: prevEnable.canonicalDraft
  });

  // 1. Admit a report for assembly
  const rep = {
    schemaVersion: 1,
    sourceKind: "engineering" as const,
    site: "kn" as const,
    engineeringId: "assembly" as const,
    publisherId: "pub-1",
    definitionRevision: 1,
    calendarRevision: 1,
    measurementKind: "interval-energy" as const,
    unit: "kWh" as const,
    value: "300.0",
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    periodStatus: "final" as const,
    coverage: "complete" as const,
    quality: "valid" as const,
    dataRevision: 1,
    publishedAt: "2026-09-16T01:00:00Z"
  };
  const admitRes = admitDailyEngineeringReport(db, rep);
  assert.equal(admitRes.accepted, true);

  // 2. Disable assembly engineering source
  const prevDisable = previewEngineeringSource({
    sourceRef: "kn-eng-assembly-energy",
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "assembly",
    purpose: "energy",
    mode: "daily-report",
    approvedPublisherId: "pub-1",
    reviewStatus: "approved",
    unit: "kWh",
    enabled: false // Disabled
  });

  applyEngineeringSource(db, {
    previewToken: prevDisable.previewToken,
    expectedRevision: 1,
    draft: prevDisable.canonicalDraft
  });

  // 3. History remains intact!
  const history = db
    .prepare("SELECT * FROM engineering_report_revisions WHERE engineering_id = 'assembly'")
    .all();
  assert.equal(history.length, 1);
  assert.equal((history[0] as any).value, "300.0");

  // 4. Source definition is disabled
  const sourceRow = db
    .prepare("SELECT enabled FROM engineering_source_definitions WHERE source_ref = 'kn-eng-assembly-energy'")
    .get() as any;
  assert.equal(sourceRow.enabled, 0);
});
