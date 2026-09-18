import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { SiteEnergyProfileV2 } from "@solar-display/shared";
import { applyEngineeringSource, previewEngineeringSource } from "./engineeringSourceService.js";
import { admitDailyEngineeringReport } from "./engineeringReportService.js";
import { serializeSiteEnergyProfile } from "./siteEnergyProfileRepository.js";
import { applyProfile, getActiveProfile, previewProfile } from "./siteEnergyProfileService.js";

function createDatabase(databasePath = ":memory:") {
  const database = new Database(databasePath);
  for (const migration of [
    "001_init.sql",
    "040_meter_reading_contracts.sql",
    "041_site_energy_profiles.sql",
    "042_consumption_projections.sql",
    "045_profile_apply_guards.sql",
    "047_projection_activation_context.sql",
    "050_profile_source_review.sql",
    "051_profile_preview_evidence.sql",
    "054_engineering_sources_and_reports.sql"
  ]) {
    database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations", migration), "utf8"));
  }
  return database;
}

function registerEngineeringSource(database: Database.Database, overrides: Record<string, unknown> = {}) {
  const preview = previewEngineeringSource({
    sourceRef: "kn-eng-stamping-energy",
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "stamping",
    purpose: "energy",
    mode: "daily-report",
    exactTopic: "factory/guanyin/energy/daily/stamping",
    approvedPublisherId: "publisher-1",
    reviewStatus: "approved",
    unit: "kWh",
    calendarRevision: 1,
    enabled: true,
    ...overrides
  });
  return applyEngineeringSource(database, {
    previewToken: preview.previewToken,
    expectedRevision: 0,
    draft: preview.canonicalDraft
  }).source;
}

function admitReport(database: Database.Database, overrides: Record<string, unknown> = {}) {
  return admitDailyEngineeringReport(database, {
    schemaVersion: 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "stamping",
    publisherId: "publisher-1",
    definitionRevision: 1,
    calendarRevision: 1,
    measurementKind: "interval-energy",
    unit: "kWh",
    value: "42",
    periodStart: "2026-09-01T16:00:00Z",
    periodEnd: "2026-09-02T16:00:00Z",
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 1,
    publishedAt: "2026-09-03T00:00:00Z",
    ...overrides
  });
}

const engineeringDraft: SiteEnergyProfileV2 = {
  departments: [],
  effectiveFrom: "2026-09-01T00:00:00+08:00",
  metricScope: "kn",
  profileId: "kn-engineering",
  providerKind: "engineering",
  revision: 0,
  schemaVersion: 2,
  shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei",
  siteTotal: {
    coverageReview: "reviewed",
    kind: "member-set",
    label: "觀音工程總量",
    members: [{
      kind: "engineering",
      sourceRef: "kn-eng-stamping-energy",
      engineeringId: "stamping",
      mode: "daily-report"
    }]
  },
  status: "ready"
};

function count(database: Database.Database, table: string) {
  return (database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
}

function domainCounts(database: Database.Database) {
  return {
    meterReadings: count(database, "meter_readings_accepted"),
    meterSources: count(database, "meter_sources"),
    projections: count(database, "consumption_projections"),
    profiles: count(database, "site_energy_profiles"),
    receipts: count(database, "profile_apply_receipts"),
    sources: count(database, "engineering_source_definitions"),
    engineeringHeads: count(database, "engineering_report_heads"),
    engineeringRevisions: count(database, "engineering_report_revisions")
  };
}

test("E6 V2 preview returns typed engineering evidence and canonical token without domain writes", () => {
  const database = createDatabase();
  registerEngineeringSource(database);
  assert.equal(admitReport(database).accepted, true);
  const before = {
    engineeringHeads: count(database, "engineering_report_heads"),
    engineeringRevisions: count(database, "engineering_report_revisions"),
    meterReadings: count(database, "meter_readings_accepted"),
    meterSources: count(database, "meter_sources"),
    projections: count(database, "consumption_projections"),
    profiles: count(database, "site_energy_profiles"),
    receipts: count(database, "profile_apply_receipts"),
    sources: count(database, "engineering_source_definitions")
  };

  const response = previewProfile(database, "kn", {
    draft: engineeringDraft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });

  assert.equal(response.profile.schemaVersion, 2);
  assert.equal(response.profile.providerKind, "engineering");
  assert.deepEqual(response.calculator.period, {
    providerKind: "engineering",
    periodStart: "2026-08-31T16:00:00.000Z",
    periodEnd: "2026-09-30T16:00:00.000Z",
    siteTimeZone: "Asia/Taipei",
    profileRevision: 0,
    valueKwh: "42",
    quality: "partial",
    coverage: "partial",
    missingIdentities: ["stamping"],
    revisionFingerprint: response.calculator.period.revisionFingerprint,
    engineeringValuesKwh: { stamping: "42" },
    engineeringShares: { stamping: null },
    issues: ["MISSING_ENGINEERING_IDENTITY:stamping"]
  });
  assert.equal(response.sources.length, 0);

  const token = database.prepare(`
    SELECT draft_json, source_snapshot_json, period_selection_json
    FROM profile_preview_tokens WHERE preview_token = ?
  `).get(response.previewToken) as {
    draft_json: string;
    source_snapshot_json: string;
    period_selection_json: string;
  };
  assert.deepEqual(JSON.parse(token.draft_json), engineeringDraft);
  assert.deepEqual(JSON.parse(token.source_snapshot_json), {
    providerKind: "engineering",
    members: [{
      sourceRef: "kn-eng-stamping-energy",
      engineeringId: "stamping",
      mode: "daily-report",
      configurationRevision: 1,
      definitionRevision: 1,
      calendarRevision: 1,
      approvedPublisherId: "publisher-1",
      enabled: true,
      reviewStatus: "approved"
    }]
  });
  assert.deepEqual(JSON.parse(token.period_selection_json), {
    selection: { kind: "month", month: 9, year: 2026 },
    revisionFingerprint: response.calculator.period.revisionFingerprint
  });
  assert.deepEqual({
    engineeringHeads: count(database, "engineering_report_heads"),
    engineeringRevisions: count(database, "engineering_report_revisions"),
    meterReadings: count(database, "meter_readings_accepted"),
    meterSources: count(database, "meter_sources"),
    projections: count(database, "consumption_projections"),
    profiles: count(database, "site_energy_profiles"),
    receipts: count(database, "profile_apply_receipts"),
    sources: count(database, "engineering_source_definitions")
  }, before);
  assert.equal(count(database, "profile_preview_tokens"), 1);
  database.close();
});

test("E6 V2 preview exposes department engineering values and binds their report evidence", () => {
  const database = createDatabase();
  registerEngineeringSource(database);
  registerEngineeringSource(database, {
    approvedPublisherId: "publisher-2",
    engineeringId: "body",
    exactTopic: "factory/guanyin/energy/daily/body",
    sourceRef: "kn-eng-body-energy"
  });
  assert.equal(admitReport(database).accepted, true);
  assert.equal(admitReport(database, {
    engineeringId: "body",
    publisherId: "publisher-2",
    value: "10"
  }).accepted, true);
  const draft: SiteEnergyProfileV2 = {
    ...structuredClone(engineeringDraft),
    departments: [{
      accountingIncluded: true,
      coverageReview: "reviewed",
      departmentId: "body",
      members: [{
        engineeringId: "body",
        kind: "engineering",
        mode: "daily-report",
        sourceRef: "kn-eng-body-energy"
      }],
      nameZh: "車體工程"
    }]
  };

  const preview = previewProfile(database, "kn", {
    draft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });

  assert.equal(preview.calculator.departments.length, 1);
  assert.equal(preview.calculator.departments[0]?.departmentId, "body");
  assert.equal(preview.calculator.departments[0]?.result.valueKwh, "10");
  assert.deepEqual(
    "engineeringValuesKwh" in preview.calculator.departments[0]!.result
      ? preview.calculator.departments[0]!.result.engineeringValuesKwh
      : undefined,
    { body: "10" }
  );

  assert.equal(admitReport(database, {
    dataRevision: 2,
    engineeringId: "body",
    publisherId: "publisher-2",
    reason: "Department correction",
    value: "11"
  }).accepted, true);
  const before = domainCounts(database);
  assert.throws(
    () => applyProfile(database, "kn", {
      draft,
      expectedRevision: 0,
      idempotencyKey: "v2-stale-department-report",
      previewToken: preview.previewToken
    }),
    (error: Error & { code?: string; statusCode?: number }) =>
      error.code === "PROFILE_SOURCE_CONFLICT" && error.statusCode === 409
  );
  assert.deepEqual(domainCounts(database), before);
  database.close();
});

test("E6 V2 preview reports missing engineering evidence as typed unavailable", () => {
  const database = createDatabase();
  registerEngineeringSource(database);
  const response = previewProfile(database, "kn", {
    draft: engineeringDraft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  assert.equal(response.calculator.period.providerKind, "engineering");
  assert.equal(response.calculator.period.valueKwh, null);
  assert.equal(response.calculator.period.quality, "unavailable");
  assert.equal(response.calculator.period.coverage, "unknown");
  assert.deepEqual(response.calculator.period.missingIdentities, ["stamping"]);
  assert.equal(count(database, "profile_preview_tokens"), 1);
  database.close();
});

test("E6 V2 preview rejects invalid engineering registration without a token", () => {
  const database = createDatabase();
  const invalidDraft = structuredClone(engineeringDraft);
  invalidDraft.siteTotal.members[0]!.sourceRef = "kn-eng-missing-energy";
  assert.throws(
    () => previewProfile(database, "kn", {
      draft: invalidDraft,
      expectedRevision: 0,
      periodSelection: { kind: "month", month: 9, year: 2026 }
    }),
    (error: Error & { code?: string; statusCode?: number }) =>
      error.code === "PROFILE_ENGINEERING_SOURCE_UNAVAILABLE" && error.statusCode === 422
  );
  assert.equal(count(database, "profile_preview_tokens"), 0);
  database.close();
});

test("E6 V2 preview rejects invalid mode and member references without a token", () => {
  for (const mutate of [
    (draft: SiteEnergyProfileV2) => {
      (draft.siteTotal.members[0] as { mode: string }).mode = "unsupported-mode";
    },
    (draft: SiteEnergyProfileV2) => {
      (draft.siteTotal.members[0] as { engineeringId: string }).engineeringId = "not-an-engineering-id";
    }
  ]) {
    const database = createDatabase();
    registerEngineeringSource(database);
    const invalidDraft = structuredClone(engineeringDraft);
    mutate(invalidDraft);
    assert.throws(
      () => previewProfile(database, "kn", {
        draft: invalidDraft,
        expectedRevision: 0,
        periodSelection: { kind: "month", month: 9, year: 2026 }
      }),
      (error: Error & { code?: string; statusCode?: number }) =>
        error.code === "PROFILE_PROVIDER_INVALID" && error.statusCode === 422
    );
    assert.equal(count(database, "profile_preview_tokens"), 0);
    database.close();
  }
});

test("E6 V2 apply persists provider profile and survives repository readback", () => {
  const directory = mkdtempSync(join(tmpdir(), "solar-profile-v2-"));
  const databasePath = join(directory, "database.sqlite");
  const database = createDatabase(databasePath);
  registerEngineeringSource(database);
  const preview = previewProfile(database, "kn", {
    draft: engineeringDraft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  const applied = applyProfile(database, "kn", {
    draft: engineeringDraft,
    expectedRevision: 0,
    idempotencyKey: "v2-apply-success",
    previewToken: preview.previewToken
  });
  assert.equal(applied.schemaVersion, 2);
  assert.equal(applied.providerKind, "engineering");
  assert.equal(applied.revision, 1);
  assert.equal(applied.status, "configured-awaiting-data");
  assert.equal(applied.reviewAsOf, preview.asOf);
  assert.equal(typeof applied.activationAsOf, "string");
  database.close();

  const reopened = new Database(databasePath);
  const persisted = getActiveProfile(reopened, "kn");
  assert.equal(persisted?.schemaVersion, 2);
  assert.equal(persisted?.providerKind, "engineering");
  assert.equal(persisted?.revision, 1);
  assert.deepEqual(persisted?.siteTotal, engineeringDraft.siteTotal);
  assert.equal(persisted?.effectiveFrom, engineeringDraft.effectiveFrom);
  reopened.close();
  rmSync(directory, { force: true, recursive: true });
});

test("E6 V2 apply retries the exact request from the receipt before stale evidence checks", () => {
  const database = createDatabase();
  const source = registerEngineeringSource(database);
  const preview = previewProfile(database, "kn", {
    draft: engineeringDraft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  const input = {
    draft: engineeringDraft,
    expectedRevision: 0,
    idempotencyKey: "v2-idempotent-retry",
    previewToken: preview.previewToken
  };
  const first = applyProfile(database, "kn", input);
  const update = previewEngineeringSource({ ...source, definitionRevision: 2 });
  applyEngineeringSource(database, {
    previewToken: update.previewToken,
    expectedRevision: source.configurationRevision,
    draft: update.canonicalDraft
  });
  assert.deepEqual(applyProfile(database, "kn", input), first);
  assert.equal(count(database, "site_energy_profiles"), 1);
  assert.equal(count(database, "profile_apply_receipts"), 1);
  database.close();
});

test("E6 V2 apply rejects stale registration, report correction, and withdrawal without writes", () => {
  const changes = [
    {
      name: "registration",
      mutate: (database: Database.Database, source: ReturnType<typeof registerEngineeringSource>) => {
        const update = previewEngineeringSource({ ...source, definitionRevision: 2 });
        applyEngineeringSource(database, {
          previewToken: update.previewToken,
          expectedRevision: source.configurationRevision,
          draft: update.canonicalDraft
        });
      }
    },
    {
      name: "correction",
      mutate: (database: Database.Database) => {
        assert.equal(admitReport(database, {
          dataRevision: 2,
          reason: "Correction",
          value: "43"
        }).accepted, true);
      }
    },
    {
      name: "withdrawal",
      mutate: (database: Database.Database) => {
        assert.equal(admitReport(database, {
          dataRevision: 2,
          periodStatus: "withdrawn",
          coverage: "partial",
          quality: "invalid",
          reason: "Withdrawal",
          value: null
        }).accepted, true);
      }
    }
  ];

  for (const change of changes) {
    const database = createDatabase();
    const source = registerEngineeringSource(database);
    assert.equal(admitReport(database).accepted, true);
    const preview = previewProfile(database, "kn", {
      draft: engineeringDraft,
      expectedRevision: 0,
      periodSelection: { kind: "month", month: 9, year: 2026 }
    });
    change.mutate(database, source);
    const before = domainCounts(database);
    assert.throws(
      () => applyProfile(database, "kn", {
        draft: engineeringDraft,
        expectedRevision: 0,
        idempotencyKey: `v2-stale-${change.name}`,
        previewToken: preview.previewToken
      }),
      (error: Error & { code?: string; statusCode?: number }) =>
        error.code === "PROFILE_SOURCE_CONFLICT" && error.statusCode === 409,
      change.name
    );
    assert.deepEqual(domainCounts(database), before, change.name);
    database.close();
  }
});

test("E6 V2 apply rejects stale active revision and malformed period fingerprints", () => {
  const staleDatabase = createDatabase();
  registerEngineeringSource(staleDatabase);
  const stalePreview = previewProfile(staleDatabase, "kn", {
    draft: engineeringDraft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  applyProfile(staleDatabase, "kn", {
    draft: engineeringDraft,
    expectedRevision: 0,
    idempotencyKey: "v2-first-revision",
    previewToken: stalePreview.previewToken
  });
  const before = domainCounts(staleDatabase);
  assert.throws(
    () => applyProfile(staleDatabase, "kn", {
      draft: engineeringDraft,
      expectedRevision: 0,
      idempotencyKey: "v2-stale-active",
      previewToken: stalePreview.previewToken
    }),
    (error: Error & { code?: string; statusCode?: number }) =>
      error.code === "PROFILE_REVISION_CONFLICT" && error.statusCode === 409
  );
  assert.deepEqual(domainCounts(staleDatabase), before);
  staleDatabase.close();

  for (const periodSelectionJson of [
    JSON.stringify({ selection: { kind: "month", month: 9, year: 2026 } }),
    JSON.stringify({ selection: { kind: "month", month: 9, year: 2026 }, revisionFingerprint: "malformed" })
  ]) {
    const database = createDatabase();
    registerEngineeringSource(database);
    const preview = previewProfile(database, "kn", {
      draft: engineeringDraft,
      expectedRevision: 0,
      periodSelection: { kind: "month", month: 9, year: 2026 }
    });
    database.prepare("UPDATE profile_preview_tokens SET period_selection_json = ? WHERE preview_token = ?")
      .run(periodSelectionJson, preview.previewToken);
    const before = domainCounts(database);
    assert.throws(
      () => applyProfile(database, "kn", {
        draft: engineeringDraft,
        expectedRevision: 0,
        idempotencyKey: "v2-malformed-period",
        previewToken: preview.previewToken
      }),
      (error: Error & { code?: string; statusCode?: number }) =>
        error.code === "PROFILE_SOURCE_REVIEW_REQUIRED" && error.statusCode === 409
    );
    assert.deepEqual(domainCounts(database), before);
    database.close();
  }
});

test("E6 V2 apply rolls back active state and receipt when profile insert fails", () => {
  const database = createDatabase();
  registerEngineeringSource(database);
  const serialized = serializeSiteEnergyProfile(engineeringDraft);
  database.prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    engineeringDraft.profileId,
    engineeringDraft.metricScope,
    engineeringDraft.revision,
    serialized.schemaVersion,
    engineeringDraft.siteTimeZone,
    engineeringDraft.status,
    engineeringDraft.effectiveFrom,
    serialized.siteTotalJson,
    serialized.departmentsJson,
    serialized.shareBasisJson,
    new Date().toISOString()
  );
  const preview = previewProfile(database, "kn", {
    draft: engineeringDraft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  database.exec("CREATE TRIGGER fail_v2_profile_insert BEFORE INSERT ON site_energy_profiles BEGIN SELECT RAISE(ABORT, 'injected v2 failure'); END");
  const before = domainCounts(database);
  assert.throws(
    () => applyProfile(database, "kn", {
      draft: engineeringDraft,
      expectedRevision: 0,
      idempotencyKey: "v2-insert-failure",
      previewToken: preview.previewToken
    }),
    /injected v2 failure/
  );
  assert.deepEqual(domainCounts(database), before);
  assert.deepEqual(getActiveProfile(database, "kn"), engineeringDraft);
  database.close();
});

test("E6 V2 preview and apply reject unreviewed draft as not ready", () => {
  const database = createDatabase();
  registerEngineeringSource(database);
  const unreviewedDraft: SiteEnergyProfileV2 = {
    ...engineeringDraft,
    siteTotal: {
      ...engineeringDraft.siteTotal,
      coverageReview: "needs-review"
    }
  };
  const preview = previewProfile(database, "kn", {
    draft: unreviewedDraft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  assert.equal(preview.readiness.status, "incomplete");
  assert.ok(preview.readiness.reasons.includes("SITE_TOTAL_COVERAGE_REVIEW_REQUIRED"));

  assert.throws(
    () => applyProfile(database, "kn", {
      draft: unreviewedDraft,
      expectedRevision: 0,
      idempotencyKey: "v2-unreviewed-apply",
      previewToken: preview.previewToken
    }),
    (error: Error & { code?: string; statusCode?: number }) =>
      error.code === "PROFILE_NOT_READY" && error.statusCode === 409
  );
  database.close();
});
