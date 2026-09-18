import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { SiteEnergyProfileV2 } from "@solar-display/shared";
import { admitDailyEngineeringReport, readEngineeringAccountingPeriodResult, computeEngineeringPeriodFingerprint } from "./engineeringReportService.js";
import { applyEngineeringSource, previewEngineeringSource } from "./engineeringSourceService.js";
import { tryResolvePersistedPeriodConsumption } from "./periodConsumptionService.js";
import { serializeSiteEnergyProfile } from "./siteEnergyProfileRepository.js";
import {
  activateProjection,
  readActiveProjection,
  shadowProject
} from "./consumptionProjectionService.js";

const PERIOD = {
  periodEnd: "2026-09-02T16:00:00Z",
  periodStart: "2026-09-01T16:00:00Z"
};

function createDatabase() {
  const database = new Database(":memory:");
  for (const migration of [
    "001_init.sql",
    "040_meter_reading_contracts.sql",
    "046_meter_reading_evidence.sql",
    "049_meter_source_boundary_age.sql",
    "041_site_energy_profiles.sql",
    "042_consumption_projections.sql",
    "045_profile_apply_guards.sql",
    "047_projection_activation_context.sql",
    "054_engineering_sources_and_reports.sql"
  ]) {
    database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations", migration), "utf8"));
  }
  return database;
}

function registerEngineeringSource(database: Database.Database) {
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
    enabled: true
  });
  applyEngineeringSource(database, {
    previewToken: preview.previewToken,
    expectedRevision: 0,
    draft: preview.canonicalDraft
  });
}

function admitReport(database: Database.Database, value: string | null, dataRevision: number, periodStatus: "final" | "withdrawn" = "final") {
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
    value,
    periodStart: PERIOD.periodStart,
    periodEnd: PERIOD.periodEnd,
    periodStatus,
    coverage: periodStatus === "withdrawn" ? "partial" : "complete",
    quality: periodStatus === "withdrawn" ? "unknown" : "valid",
    dataRevision,
    publishedAt: "2026-09-03T00:00:00Z",
    ...(dataRevision > 1 ? { reason: periodStatus === "withdrawn" ? "withdrawal" : "correction" } : {})
  }, { allowReplayWindowBypass: true, isProduction: false });
}

function engineeringProfile(): SiteEnergyProfileV2 {
  return {
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
    status: "ready"
  };
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

function setupEngineeringDatabase() {
  const database = createDatabase();
  registerEngineeringSource(database);
  assert.equal(admitReport(database, "42", 1).accepted, true);
  insertActiveProfile(database, engineeringProfile());
  return database;
}

function readEngineeringResult(database: Database.Database) {
  return readEngineeringAccountingPeriodResult(database, {
    ...PERIOD,
    expectedEngineeringIds: ["stamping"],
    profileRevision: 1,
    siteTimeZone: "Asia/Taipei"
  });
}

test("E3 V2 engineering projection round-trips its typed result and key without meter reads", () => {
  const database = setupEngineeringDatabase();
  const result = readEngineeringResult(database);
  const prepare = database.prepare.bind(database);
  const statements: string[] = [];
  database.prepare = ((sql: string) => {
    statements.push(sql);
    return prepare(sql);
  }) as typeof database.prepare;

  const candidate = shadowProject(database, result, "kn", "day");
  const context = JSON.parse(candidate.contextKey) as unknown[];
  assert.deepEqual(context, [
    "engineering",
    PERIOD.periodStart,
    PERIOD.periodEnd,
    "Asia/Taipei",
    1,
    result.revisionFingerprint
  ]);
  assert.equal(candidate.sampleChecksum, result.revisionFingerprint);
  assert.equal(candidate.watermark, null);
  assert.equal(statements.some((sql) => sql.includes("meter_readings_accepted")), false);

  activateProjection(database, candidate);
  const active = readActiveProjection(database, "kn", "day", candidate.contextKey);
  assert.equal(active?.providerKind, "engineering");
  assert.equal(active?.valueKwh, result.valueKwh);
  assert.equal(active?.quality, result.quality);
  assert.equal(active?.coverage, result.coverage);
  assert.deepEqual(active?.missingIdentities, result.missingIdentities);
  assert.equal(active?.revisionFingerprint, result.revisionFingerprint);
  assert.equal(active?.watermark, null);
  assert.equal(statements.some((sql) => sql.includes("meter_readings_accepted")), false);
  database.close();
});

test("E3 identical engineering evidence reuses one projection and correction activates a new immutable row", () => {
  const database = setupEngineeringDatabase();
  const firstResult = readEngineeringResult(database);
  const first = shadowProject(database, firstResult, "kn", "month");
  assert.equal(shadowProject(database, firstResult, "kn", "month").projectionId, first.projectionId);
  activateProjection(database, first);

  const correction = admitReport(database, "50", 2);
  assert.equal(correction.accepted, true, JSON.stringify(correction));
  const correctedResult = readEngineeringResult(database);
  const corrected = shadowProject(database, correctedResult, "kn", "month");
  assert.notEqual(corrected.projectionId, first.projectionId);
  assert.notEqual(corrected.contextKey, first.contextKey);
  activateProjection(database, corrected);

  assert.equal(readActiveProjection(database, "kn", "month", corrected.contextKey)?.valueKwh, "50");
  assert.equal(readActiveProjection(database, "kn", "month", first.contextKey)?.projectionId, first.projectionId);
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM consumption_projections").get() as { count: number }).count, 2);
  assert.equal((database.prepare("SELECT active FROM consumption_projections WHERE projection_id = ?").get(first.projectionId) as { active: number }).active, 1);
  assert.equal((database.prepare("SELECT active FROM consumption_projections WHERE projection_id = ?").get(corrected.projectionId) as { active: number }).active, 1);
  assert.equal((database.prepare("SELECT result_json FROM consumption_projections WHERE projection_id = ?").get(first.projectionId) as { result_json: string }).result_json, JSON.stringify(firstResult));
  database.close();
});

test("E3 engineering activation rechecks fresh fingerprint before any pointer update, including an active candidate", () => {
  const database = setupEngineeringDatabase();
  const candidate = shadowProject(database, readEngineeringResult(database), "kn", "day");
  const correction = admitReport(database, "51", 2);
  assert.equal(correction.accepted, true, JSON.stringify(correction));
  const updates: string[] = [];
  const prepare = database.prepare.bind(database);
  database.prepare = ((sql: string) => {
    if (sql.includes("UPDATE consumption_projections")) updates.push(sql);
    return prepare(sql);
  }) as typeof database.prepare;
  assert.throws(() => activateProjection(database, candidate), /PROJECTION_INPUT_CHANGED/);
  assert.equal(updates.length, 0);
  assert.equal(readActiveProjection(database, "kn", "day", candidate.contextKey), null);

  database.prepare = prepare as typeof database.prepare;
  const activeCandidate = shadowProject(database, readEngineeringResult(database), "kn", "day");
  activateProjection(database, activeCandidate);
  const laterCorrection = admitReport(database, "52", 3);
  assert.equal(laterCorrection.accepted, true, JSON.stringify(laterCorrection));
  const activeUpdates: string[] = [];
  database.prepare = ((sql: string) => {
    if (sql.includes("UPDATE consumption_projections")) activeUpdates.push(sql);
    return prepare(sql);
  }) as typeof database.prepare;
  assert.throws(() => activateProjection(database, activeCandidate), /PROJECTION_INPUT_CHANGED/);
  assert.equal(activeUpdates.length, 0);
  assert.equal(readActiveProjection(database, "kn", "day", activeCandidate.contextKey)?.projectionId, activeCandidate.projectionId);
  database.close();
});

test("E3 withdrawal degrades and activates a distinct engineering projection while preserving history", () => {
  const database = setupEngineeringDatabase();
  const firstResult = readEngineeringResult(database);
  const first = shadowProject(database, firstResult, "kn", "year");
  activateProjection(database, first);
  const withdrawal = admitReport(database, null, 2, "withdrawn");
  assert.equal(withdrawal.accepted, true, JSON.stringify(withdrawal));
  const withdrawnResult = readEngineeringResult(database);
  assert.equal(withdrawnResult.valueKwh, null);
  assert.equal(withdrawnResult.quality, "unavailable");
  assert.equal(withdrawnResult.coverage, "unknown");
  const withdrawn = shadowProject(database, withdrawnResult, "kn", "year");
  assert.notEqual(withdrawn.projectionId, first.projectionId);
  activateProjection(database, withdrawn);
  assert.equal(readActiveProjection(database, "kn", "year", withdrawn.contextKey)?.valueKwh, null);
  assert.equal(readActiveProjection(database, "kn", "year", first.contextKey)?.projectionId, first.projectionId);
  assert.equal((database.prepare("SELECT active FROM consumption_projections WHERE projection_id = ?").get(first.projectionId) as { active: number }).active, 1);
  assert.equal((database.prepare("SELECT result_json FROM consumption_projections WHERE projection_id = ?").get(first.projectionId) as { result_json: string }).result_json, JSON.stringify(firstResult));
  database.close();
});

test("E3 projection activation isolates a physical result from historical engineering rows", () => {
  const database = setupEngineeringDatabase();
  const engineering = shadowProject(database, readEngineeringResult(database), "kn", "month");
  activateProjection(database, engineering);
  const physical = shadowProject(database, {
    profileRevision: 2,
    quality: "exact",
    siteTimeZone: "Asia/Taipei",
    valueKwh: "7"
  }, "kn", "month");
  activateProjection(database, physical);
  assert.equal(readActiveProjection(database, "kn", "month", physical.contextKey)?.valueKwh, "7");
  assert.equal(readActiveProjection(database, "kn", "month", engineering.contextKey)?.projectionId, engineering.projectionId);
  assert.equal((database.prepare("SELECT active FROM consumption_projections WHERE projection_id = ?").get(engineering.projectionId) as { active: number }).active, 1);
  database.close();
});

test("E3 rolling the active profile back to V1 cannot reuse a historical engineering projection", () => {
  const database = setupEngineeringDatabase();
  const engineering = shadowProject(database, readEngineeringResult(database), "kn", "day");
  activateProjection(database, engineering);
  database.prepare("UPDATE site_energy_profiles SET active = 0 WHERE metric_scope = 'kn'").run();
  database.prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES ('kn-physical', 'kn', 2, 1, 'Asia/Taipei', 'ready', ?, ?, '[]', ?, 1, ?)
  `).run(
    "2026-09-01T00:00:00+08:00",
    JSON.stringify({
      coverageReview: "reviewed",
      kind: "meter-set",
      label: "觀音總錶",
      memberChannelIds: ["kn-main"]
    }),
    JSON.stringify({ kind: "site-main" }),
    "2026-09-01T00:00:00.000Z"
  );
  const insertReading = database.prepare(`
    INSERT INTO meter_readings_accepted (
      reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id,
      raw_value_decimal, normalized_value_kwh, source_timestamp, received_at,
      timestamp_quality, origin, payload_hash, created_at
    ) VALUES (?, 'kn', 'kn-main', 'kn-main', 1, 'epoch-1', ?, ?, ?, ?, 'source', 'mqtt', ?, ?)
  `);
  insertReading.run("baseline", "100", "100", "2026-08-31T16:00:00Z", "2026-08-31T16:00:00Z", "baseline", "2026-08-31T16:00:00Z");
  insertReading.run("closing", "150", "150", "2026-09-01T15:59:00Z", "2026-09-01T15:59:00Z", "closing", "2026-09-01T15:59:00Z");

  const result = tryResolvePersistedPeriodConsumption(database, "kn", "day", "2026-09-01T15:59:00Z");
  assert.equal(result?.profileRevision, 2);
  assert.notEqual(result?.valueKwh, "42");
  assert.equal("providerKind" in (result ?? {}), false);
  assert.equal(readActiveProjection(database, "kn", "day", engineering.contextKey)?.projectionId, engineering.projectionId);
  database.close();
});

test("E3 engineering projection fingerprint includes the current report evidence", () => {
  const database = setupEngineeringDatabase();
  const before = computeEngineeringPeriodFingerprint(database, {
    ...PERIOD,
    expectedEngineeringIds: ["stamping"],
    profileRevision: 1
  });
  const correction = admitReport(database, "43", 2);
  assert.equal(correction.accepted, true, JSON.stringify(correction));
  const after = computeEngineeringPeriodFingerprint(database, {
    ...PERIOD,
    expectedEngineeringIds: ["stamping"],
    profileRevision: 1
  });
  assert.notEqual(after, before);
  database.close();
});
