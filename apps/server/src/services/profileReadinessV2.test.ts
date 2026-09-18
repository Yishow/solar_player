import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterSourceDefinition, SiteEnergyProfileV1, SiteEnergyProfileV2 } from "@solar-display/shared";
import { applyEngineeringSource, previewEngineeringSource } from "./engineeringSourceService.js";
import { admitDailyEngineeringReport } from "./engineeringReportService.js";
import { saveMeterSource } from "./meterSourceCatalogService.js";
import { seedAcceptedReading } from "./meterReadingService.js";
import { serializeSiteEnergyProfile } from "./siteEnergyProfileRepository.js";
import { readProfileReadiness } from "./profileReadinessService.js";

function createDatabase() {
  const database = new Database(":memory:");
  for (const migration of [
    "001_init.sql",
    "033_freshness_policy.sql",
    "040_meter_reading_contracts.sql",
    "041_site_energy_profiles.sql",
    "042_consumption_projections.sql",
    "045_profile_apply_guards.sql",
    "046_meter_reading_evidence.sql",
    "047_projection_activation_context.sql",
    "048_meter_source_lifecycle.sql",
    "049_meter_source_boundary_age.sql",
    "050_profile_source_review.sql",
    "051_profile_preview_evidence.sql",
    "054_engineering_sources_and_reports.sql"
  ]) {
    database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations", migration), "utf8"));
  }
  return database;
}

function registerEngineeringSource(
  database: Database.Database,
  engineeringId = "stamping",
  overrides: Record<string, unknown> = {}
) {
  const preview = previewEngineeringSource({
    sourceRef: `kn-eng-${engineeringId}-energy`,
    sourceKind: "engineering",
    site: "kn",
    engineeringId,
    purpose: "energy",
    mode: "daily-report",
    exactTopic: `factory/guanyin/energy/daily/${engineeringId}`,
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

function admitReport(
  database: Database.Database,
  engineeringId = "stamping",
  value: string | null = "1",
  overrides: Record<string, unknown> = {}
) {
  return admitDailyEngineeringReport(database, {
    schemaVersion: 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId,
    publisherId: "publisher-1",
    definitionRevision: 1,
    calendarRevision: 1,
    measurementKind: "interval-energy",
    unit: "kWh",
    value,
    periodStart: "2026-09-01T16:00:00Z",
    periodEnd: "2026-09-02T16:00:00Z",
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 1,
    publishedAt: "2026-09-03T00:00:00Z",
    ...overrides
  }, { allowReplayWindowBypass: true, isProduction: false });
}

function admitAugust(database: Database.Database, engineeringId = "stamping", value = "1") {
  const dayMs = 24 * 60 * 60 * 1000;
  const firstStart = Date.UTC(2026, 6, 31, 16);
  for (let day = 0; day < 31; day += 1) {
    const periodStart = new Date(firstStart + day * dayMs).toISOString();
    const periodEnd = new Date(firstStart + (day + 1) * dayMs).toISOString();
    const outcome = admitReport(database, engineeringId, value, {
      periodStart,
      periodEnd,
      publishedAt: new Date(firstStart + (day + 1) * dayMs + 60_000).toISOString()
    });
    assert.equal(outcome.accepted, true, JSON.stringify(outcome));
  }
}

function insertActiveProfile(database: Database.Database, profile: SiteEnergyProfileV2) {
  const serialized = serializeSiteEnergyProfile(profile);
  database.prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    profile.profileId,
    profile.metricScope,
    profile.revision,
    serialized.schemaVersion,
    profile.siteTimeZone,
    profile.status,
    profile.effectiveFrom,
    serialized.siteTotalJson,
    serialized.departmentsJson,
    serialized.shareBasisJson,
    "2026-09-03T00:00:00.000Z"
  );
}

const engineeringProfile: SiteEnergyProfileV2 = {
  departments: [],
  effectiveFrom: "2026-09-01T00:00:00+08:00",
  metricScope: "kn",
  profileId: "kn-engineering",
  providerKind: "engineering",
  revision: 1,
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
  status: "incomplete"
};

test("V2 engineering readiness requires complete reviewed period evidence", () => {
  const database = createDatabase();
  registerEngineeringSource(database);
  admitReport(database);
  insertActiveProfile(database, engineeringProfile);

  const readiness = readProfileReadiness(database, "kn", "2026-09-03T04:00:00Z");

  assert.equal(readiness.status, "configured-awaiting-data");
  assert.ok(readiness.reasons.some((reason) => reason.includes("MISSING_ENGINEERING_IDENTITY")));
  database.close();
});

test("V2 engineering readiness accepts complete evidence, correction, and true zero", () => {
  for (const value of ["1", "0"]) {
    const database = createDatabase();
    registerEngineeringSource(database);
    admitAugust(database, "stamping", value);
    insertActiveProfile(database, { ...engineeringProfile, effectiveFrom: "2026-08-01T00:00:00+08:00" });

    const initial = readProfileReadiness(database, "kn", "2026-08-15T04:00:00Z");
    assert.equal(initial.status, "ready", value);
    assert.deepEqual(initial.reasons, [], value);

    if (value === "1") {
      assert.equal(admitReport(database, "stamping", "2", {
        dataRevision: 2,
        periodStart: "2026-08-01T16:00:00.000Z",
        periodEnd: "2026-08-02T16:00:00.000Z",
        publishedAt: "2026-08-03T01:00:00.000Z",
        reason: "Correction"
      }).accepted, true);
      assert.equal(readProfileReadiness(database, "kn", "2026-08-15T04:00:00Z").status, "ready");
    }
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count, 0);
    database.close();
  }
});

test("V2 engineering readiness degrades for withdrawal and missing identity", () => {
  const withdrawnDatabase = createDatabase();
  registerEngineeringSource(withdrawnDatabase);
  admitAugust(withdrawnDatabase);
  insertActiveProfile(withdrawnDatabase, { ...engineeringProfile, effectiveFrom: "2026-08-01T00:00:00+08:00" });
  assert.equal(admitReport(withdrawnDatabase, "stamping", null, {
    coverage: "partial",
    dataRevision: 2,
    periodEnd: "2026-08-02T16:00:00.000Z",
    periodStart: "2026-08-01T16:00:00.000Z",
    periodStatus: "withdrawn",
    publishedAt: "2026-08-03T02:00:00.000Z",
    quality: "invalid",
    reason: "Withdrawal"
  }).accepted, true);
  const withdrawn = readProfileReadiness(withdrawnDatabase, "kn", "2026-08-15T04:00:00Z");
  assert.equal(withdrawn.status, "configured-awaiting-data");
  assert.ok(withdrawn.reasons.some((reason) => reason.includes("WITHDRAWN_ENGINEERING_IDENTITY")));
  withdrawnDatabase.close();

  const missingDatabase = createDatabase();
  registerEngineeringSource(missingDatabase);
  registerEngineeringSource(missingDatabase, "body");
  admitAugust(missingDatabase);
  const missingProfile = structuredClone(engineeringProfile);
  missingProfile.effectiveFrom = "2026-08-01T00:00:00+08:00";
  missingProfile.siteTotal.members.push({
    kind: "engineering",
    sourceRef: "kn-eng-body-energy",
    engineeringId: "body",
    mode: "daily-report"
  });
  insertActiveProfile(missingDatabase, missingProfile);
  const missing = readProfileReadiness(missingDatabase, "kn", "2026-08-15T04:00:00Z");
  assert.equal(missing.status, "configured-awaiting-data");
  assert.ok(missing.reasons.includes("MISSING_ENGINEERING_IDENTITY:body"));
  missingDatabase.close();
});

test("V2 engineering readiness rejects disabled registration and unreviewed membership", () => {
  for (const testCase of [
    {
      expectedReason: "PROFILE_ENGINEERING_SOURCE_UNAVAILABLE",
      profileMutator: (_profile: SiteEnergyProfileV2) => undefined,
      sourceOverrides: { enabled: false }
    },
    {
      expectedReason: "SITE_TOTAL_COVERAGE_REVIEW_REQUIRED",
      profileMutator: (profile: SiteEnergyProfileV2) => { profile.siteTotal.coverageReview = "needs-review" as const; },
      sourceOverrides: {}
    }
  ]) {
    const database = createDatabase();
    registerEngineeringSource(database, "stamping", testCase.sourceOverrides);
    const profile = structuredClone(engineeringProfile);
    testCase.profileMutator(profile);
    insertActiveProfile(database, profile);
    const readiness = readProfileReadiness(database, "kn", "2026-09-15T04:00:00Z");
    assert.equal(readiness.status, "incomplete");
    assert.ok(readiness.reasons.includes(testCase.expectedReason));
    database.close();
  }
});

test("CL V1 readiness keeps the physical accounting result", () => {
  const database = createDatabase();
  const source: MeterSourceDefinition = {
    channelId: "cl-main",
    enabled: true,
    energyFlowRole: "consumption",
    epochId: "cl-epoch",
    expectedCadenceSeconds: 60,
    inputUnit: "kWh",
    measurementKind: "cumulative-energy",
    meterId: "cl-main",
    metricKey: "consumptionEnergy",
    metricScope: "cl",
    reviewStatus: "reviewed",
    scaleDecimal: "1",
    sourceRevision: 1,
    sourceTimestampTimeZone: "UTC",
    timestampPolicy: "source-required"
  };
  const profile: SiteEnergyProfileV1 = {
    departments: [],
    effectiveFrom: "2026-09-01T00:00:00+08:00",
    metricScope: "cl",
    profileId: "cl-energy",
    revision: 1,
    schemaVersion: 1,
    shareBasis: { kind: "site-main" },
    siteTimeZone: "Asia/Taipei",
    siteTotal: { coverageReview: "reviewed", kind: "meter-set", label: "CL 總錶", memberChannelIds: ["cl-main"] },
    status: "incomplete"
  };
  const serialized = serializeSiteEnergyProfile(profile);
  database.prepare(`INSERT INTO site_energy_profiles (
    profile_id, metric_scope, revision, schema_version, site_time_zone, status, effective_from,
    site_total_json, departments_json, share_basis_json, active, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`).run(
    profile.profileId, profile.metricScope, profile.revision, serialized.schemaVersion, profile.siteTimeZone,
    profile.status, profile.effectiveFrom, serialized.siteTotalJson, serialized.departmentsJson,
    serialized.shareBasisJson, "2026-09-01T00:00:00.000Z"
  );
  saveMeterSource(database, source);
  seedAcceptedReading(database, source, "100", "2026-08-31T16:00:00.000Z", "2026-08-31T16:00:00.000Z");
  seedAcceptedReading(database, source, "150", "2026-09-15T04:00:00.000Z", "2026-09-15T04:00:00.000Z");
  assert.equal(readProfileReadiness(database, "cl", "2026-09-15T04:00:00.000Z").status, "ready");
  database.close();
});
