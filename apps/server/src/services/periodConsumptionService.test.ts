import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { shadowProject, activateProjection } from "./consumptionProjectionService.js";
import { saveMeterSource } from "./meterSourceCatalogService.js";
import { seedAcceptedReading, ingestMeterReading } from "./meterReadingService.js";
import { readFreshnessPolicy } from "./freshnessPolicyService.js";
import {
  loadAcceptedSamples,
  loadEffectivePeriodContext,
  monthDateKeys,
  periodSelectionFromRange,
  rangeSpanFromRange,
  rangeWindowFor,
  resolveConsumptionForRangeWindow,
  resolveDailyConsumptionPoints,
  resolveDailyPointsFromEvidence,
  resolvePeriodFromEvidence,
  resolvePersistedPeriodConsumption,
  resolveSpanFromEvidence,
  tryResolvePersistedPeriodConsumption
} from "./periodConsumptionService.js";
import { getActiveProfile, listPersistedProfiles } from "./siteEnergyProfileRepository.js";

function createDatabase(effectiveFrom = "2026-01-01T00:00:00+08:00") {
  const database = new Database(":memory:");
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/033_freshness_policy.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/040_meter_reading_contracts.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/046_meter_reading_evidence.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/041_site_energy_profiles.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/045_profile_apply_guards.sql"), "utf8"));
  database.prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES ('kn-energy', 'kn', 1, 1, 'Asia/Taipei', 'ready', ?, ?, '[]', ?, 1, ?)
  `).run(
    effectiveFrom,
    JSON.stringify({
      coverageReview: "reviewed",
      kind: "meter-set",
      label: "觀音總錶",
      memberChannelIds: ["kn-main"]
    }),
    JSON.stringify({ kind: "site-main" }),
    new Date(effectiveFrom).toISOString()
  );
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/042_consumption_projections.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/047_projection_activation_context.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/048_meter_source_lifecycle.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/049_meter_source_boundary_age.sql"), "utf8"));
  return database;
}

function source(sourceRevision: number, epochId: string): MeterSourceDefinition {
  return {
    channelId: "kn-main",
    enabled: true,
    energyFlowRole: "consumption",
    epochId,
    expectedCadenceSeconds: 60,
    inputUnit: "kWh",
    measurementKind: "cumulative-energy",
    meterId: "kn-main",
    metricKey: "consumptionEnergy",
    metricScope: "kn",
    reviewStatus: "reviewed",
    scaleDecimal: "1",
    sourceRevision,
    sourceTimestampTimeZone: "UTC",
    timestampPolicy: "source-required"
  };
}

test("accepted loader keeps source identity and does not bridge replacement epochs", () => {
  const database = createDatabase();
  seedAcceptedReading(database, source(1, "epoch-1"), "100", "2026-08-31T16:00:00Z", "2026-08-31T16:00:01Z");
  seedAcceptedReading(database, source(1, "epoch-1"), "150", "2026-09-01T04:00:00Z", "2026-09-01T04:00:01Z");
  seedAcceptedReading(database, source(2, "epoch-2"), "10", "2026-09-01T05:00:00Z", "2026-09-01T05:00:01Z");
  seedAcceptedReading(database, source(2, "epoch-2"), "200", "2026-09-01T15:59:00Z", "2026-09-01T15:59:01Z");

  const loaded = loadAcceptedSamples(database, "kn")[2]!;
  assert.equal(typeof loaded.readingId, "string");
  assert.deepEqual(loaded, {
    readingId: loaded.readingId,
    boundaryMaxAgeSeconds: 300,
    receivedAt: "2026-09-01T05:00:01Z",
    timestampQuality: "source",
    measurementKind: "cumulative-energy",
    channelId: "kn-main",
    epochId: "epoch-2",
    meterId: "kn-main",
    sourceRevision: 2,
    sourceTimestamp: "2026-09-01T05:00:00Z",
    valueKwh: "10"
  });
  const result = resolvePersistedPeriodConsumption(
    database,
    "kn",
    { day: 1, kind: "day", month: 9, year: 2026 },
    "2026-09-01T16:00:00Z"
  );
  assert.equal(result.quality, "partial");
  assert.equal(result.valueKwh, null);
  database.close();
});


test("E3 unqualified active projection cannot override the requested calendar month", () => {
  const database = createDatabase();
  seedAcceptedReading(database, source(1, "epoch-1"), "100", "2026-08-31T16:00:00Z", "2026-08-31T16:00:01Z");
  seedAcceptedReading(database, source(1, "epoch-1"), "150", "2026-09-01T04:00:00Z", "2026-09-01T04:00:01Z");
  activateProjection(database, shadowProject(database, { profileRevision: 1, quality: "exact", siteTimeZone: "Asia/Taipei", valueKwh: "9999" }, "kn", "month"));
  const result = tryResolvePersistedPeriodConsumption(database, "kn", "month", "2026-09-01T04:00:00Z");
  assert.equal(result?.valueKwh, "50");
  assert.equal(result?.periodStart, "2026-08-31T16:00:00.000Z");
  database.close();
});


test("E2 closed history keeps its effective profile and rejects an unknown requested revision", () => {
  const database = createDatabase();
  seedAcceptedReading(database, source(1, "epoch-1"), "100", "2026-08-31T16:00:00Z", "2026-08-31T16:00:01Z");
  seedAcceptedReading(database, source(1, "epoch-1"), "150", "2026-09-30T16:00:00Z", "2026-09-30T16:00:01Z");
  database.prepare("UPDATE site_energy_profiles SET active = 0").run();
  database.prepare(`INSERT INTO site_energy_profiles SELECT profile_id, metric_scope, 2, schema_version, site_time_zone, status, '2026-10-01T00:00:00+08:00', ?, departments_json, share_basis_json, 1, created_at FROM site_energy_profiles WHERE revision = 1`)
    .run(JSON.stringify({ coverageReview: "reviewed", kind: "meter-set", label: "new", memberChannelIds: ["new-channel"] }));
  const result = resolvePersistedPeriodConsumption(database, "kn", { kind: "month", month: 9, year: 2026 }, "2026-10-02T00:00:00Z");
  assert.equal(result.profileRevision, 1);
  assert.equal(result.valueKwh, "50");
  seedAcceptedReading(database, source(1, "epoch-1"), "200", "2026-10-01T04:00:00Z", "2026-10-01T04:00:01Z");
  const expired = resolvePersistedPeriodConsumption(database, "kn", { kind: "month", month: 10, year: 2026 }, "2026-10-01T04:00:00Z", { profileRevision: 1 });
  assert.equal(expired.valueKwh, null);
  assert.ok(expired.issues?.includes("PROFILE_REVISION_BOUNDARY"));
  assert.throws(() => resolvePersistedPeriodConsumption(database, "kn", { kind: "month", month: 9, year: 2026 }, "2026-10-02T00:00:00Z", { profileRevision: 99 }), /UNKNOWN_PROFILE_REVISION/);
  database.close();
});


test("E1 to E2 preserves persisted receipt-time estimates and interval semantics", () => {
  const database = createDatabase();
  const definition = { ...source(1, "epoch-1"), timestampPolicy: "allow-receive-time-estimate" as const };
  for (const [receivedAt, value] of [["2026-08-31T16:00:00Z", "100"], ["2026-09-01T16:00:00Z", "125"]]) {
    ingestMeterReading(database, definition, { dup: false, origin: "mqtt", qos: 1, rawValueDecimal: value!, receivedAt: receivedAt!, retain: false, sourceTimestamp: null });
  }
  const result = resolvePersistedPeriodConsumption(database, "kn", { day: 1, kind: "day", month: 9, year: 2026 }, "2026-09-01T16:00:00Z");
  assert.equal(result.valueKwh, "25");
  assert.equal(result.quality, "estimated-boundary");
  assert.equal(result.baselineSampleIds?.length, 1);
  assert.equal(loadAcceptedSamples(database, "kn")[0]?.sourceTimestamp, null);
  database.close();
});


test("E3 profile changes inside a month expose the effective revision boundary", () => {
  const database = createDatabase();
  database.prepare(`INSERT INTO site_energy_profiles SELECT profile_id, metric_scope, 2, schema_version, site_time_zone, status, '2026-09-15T00:00:00+08:00', site_total_json, departments_json, share_basis_json, 1, created_at FROM site_energy_profiles WHERE revision = 1`).run();
  database.prepare("UPDATE site_energy_profiles SET active = 0 WHERE revision = 1").run();
  const result = resolvePersistedPeriodConsumption(database, "kn", { kind: "month", month: 9, year: 2026 }, "2026-09-30T16:00:00Z");
  assert.equal(result.quality, "partial");
  assert.equal(result.valueKwh, null);
  assert.deepEqual(result.profileRevisionBoundaries?.map((boundary) => boundary.profileRevision), [1, 2]);
  assert.equal(result.profileRevisionBoundaries?.[1]?.effectiveFrom, "2026-09-15T00:00:00+08:00");
  database.close();
});


test("E3 newly effective profile boundaries cannot reuse an older partial projection", () => {
  const database = createDatabase();
  const addProfile = database.prepare(`INSERT INTO site_energy_profiles SELECT profile_id, metric_scope, ?, schema_version, site_time_zone, status, ?, site_total_json, departments_json, share_basis_json, 1, created_at FROM site_energy_profiles WHERE revision = 1`);
  addProfile.run(2, "2026-09-15T00:00:00+08:00");
  const asOf = "2026-09-25T00:00:00Z";
  const old = resolvePersistedPeriodConsumption(database, "kn", { kind: "month", month: 9, year: 2026 }, asOf);
  activateProjection(database, shadowProject(database, old, "kn", "month"));
  addProfile.run(3, "2026-09-20T00:00:00+08:00");
  const current = tryResolvePersistedPeriodConsumption(database, "kn", "month", asOf);
  assert.deepEqual(current?.profileRevisionBoundaries?.map((boundary) => boundary.profileRevision), [1, 2, 3]);
  database.close();
});


test("persisted period freshness follows configured policy without rewriting observations", () => {
  const database = createDatabase();
  seedAcceptedReading(database, source(1, "epoch-1"), "100", "2026-08-31T16:00:00Z", "2026-08-31T16:00:01Z");
  seedAcceptedReading(database, source(1, "epoch-1"), "150", "2026-09-01T04:00:00Z", "2026-09-01T04:00:01Z");
  const asOf = "2026-09-01T04:04:00Z";
  const old = resolvePersistedPeriodConsumption(database, "kn", { kind: "month", month: 9, year: 2026 }, asOf);
  activateProjection(database, shadowProject(database, old, "kn", "month"));
  const observations = database.prepare("SELECT * FROM meter_readings_accepted").all();
  database.prepare("UPDATE freshness_policy SET cumulative_delayed_after_ms=60000, cumulative_stale_after_ms=120000, cumulative_historical_after_ms=600000 WHERE id=1").run();
  const current = tryResolvePersistedPeriodConsumption(database, "kn", "month", asOf);
  assert.equal(current?.freshness, "stale");
  assert.equal(current?.freshnessState, "stale");
  assert.equal(current?.valueKwh, "50");
  assert.equal(current?.quality, "estimated-boundary");
  assert.deepEqual(database.prepare("SELECT * FROM meter_readings_accepted").all(), observations);
  database.close();
});


test("source boundary tolerance reaches the resolver and invalidates same-quality projections", () => {
  const database = createDatabase();
  const definition = source(1, "epoch-1");
  saveMeterSource(database, definition);
  for (const [value, instant] of [["100", "2026-08-31T15:59:00Z"], ["150", "2026-09-01T01:00:00Z"], ["200", "2026-09-01T02:00:00Z"]]) {
    seedAcceptedReading(database, definition, value!, instant!, instant!);
  }
  const period = { kind: "month" as const, month: 9, year: 2026 };
  const asOf = "2026-09-01T04:00:00Z";
  const previous = resolvePersistedPeriodConsumption(database, "kn", period, asOf);
  assert.equal(previous.quality, "partial");
  assert.equal(previous.observedDeltaKwh, "100");
  activateProjection(database, shadowProject(database, previous, "kn", "month"));
  const pending = shadowProject(database, resolvePersistedPeriodConsumption(database, "kn", period, "2026-09-01T04:01:00Z"), "kn", "month");
  const observations = database.prepare("SELECT * FROM meter_readings_accepted").all();
  database.prepare("UPDATE meter_sources SET boundary_max_age_seconds=30 WHERE metric_scope='kn'").run();
  assert.equal(loadAcceptedSamples(database, "kn")[0]?.boundaryMaxAgeSeconds, 30);
  const current = tryResolvePersistedPeriodConsumption(database, "kn", "month", asOf);
  assert.equal(current?.quality, "partial");
  assert.equal(current?.observedDeltaKwh, "50");
  assert.throws(() => activateProjection(database, pending), /PROJECTION_INPUT_CHANGED/);
  assert.deepEqual(database.prepare("SELECT * FROM meter_readings_accepted").all(), observations);
  database.close();
});


test("E3 a projection stored under an earlier calculation version is not reused", () => {
  const database = createDatabase();
  seedAcceptedReading(database, source(1, "epoch-1"), "100", "2026-08-31T16:00:00Z", "2026-08-31T16:00:00Z");
  seedAcceptedReading(database, source(1, "epoch-1"), "150", "2026-09-01T04:00:00Z", "2026-09-01T04:00:01Z");
  const asOf = "2026-09-01T04:00:01Z";
  const current = resolvePersistedPeriodConsumption(database, "kn", { kind: "month", month: 9, year: 2026 }, asOf);
  assert.equal(current.calculationVersion, "e2-v4");

  const observations = database.prepare("SELECT * FROM meter_readings_accepted").all();
  const stale = { ...current, calculationVersion: "e2-v3", valueKwh: "9999", dailyCoverage: { coveredDays: 30, isComplete: true, totalDays: 30 } };
  activateProjection(database, shadowProject(database, stale, "kn", "month"));

  const resolved = tryResolvePersistedPeriodConsumption(database, "kn", "month", asOf);
  assert.equal(resolved?.valueKwh, "50");
  assert.notEqual(resolved?.valueKwh, "9999");
  assert.deepEqual(database.prepare("SELECT * FROM meter_readings_accepted").all(), observations);
  database.close();
});


test("E3 a projection matching the current context is reused without rewriting accepted history", () => {
  const database = createDatabase();
  seedAcceptedReading(database, source(1, "epoch-1"), "100", "2026-08-31T16:00:00Z", "2026-08-31T16:00:00Z");
  seedAcceptedReading(database, source(1, "epoch-1"), "150", "2026-09-01T04:00:00Z", "2026-09-01T04:00:01Z");
  const asOf = "2026-09-01T04:00:01Z";
  const current = resolvePersistedPeriodConsumption(database, "kn", { kind: "month", month: 9, year: 2026 }, asOf);
  activateProjection(database, shadowProject(database, current, "kn", "month"));
  const observations = database.prepare("SELECT * FROM meter_readings_accepted").all();

  const reused = tryResolvePersistedPeriodConsumption(database, "kn", "month", asOf);
  assert.equal(reused?.valueKwh, current.valueKwh);
  assert.deepEqual(reused?.dailyCoverage, current.dailyCoverage);
  assert.deepEqual(database.prepare("SELECT * FROM meter_readings_accepted").all(), observations);
  database.close();
});


test("a full-year date set selects accepted samples once instead of re-scanning per day", () => {
  const database = createDatabase();
  const definition = source(1, "epoch-1");
  const dates: string[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = new Date(Date.UTC(2026, month, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      dates.push(`2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }
  seedAcceptedReading(database, definition, "0", "2025-12-31T16:00:00Z", "2025-12-31T16:00:00Z");
  seedAcceptedReading(database, definition, "5000", "2026-06-30T16:00:00Z", "2026-06-30T16:00:00Z");

  let readingQueries = 0;
  const prepare = database.prepare.bind(database);
  (database as unknown as { prepare: typeof prepare }).prepare = ((sql: string) => {
    if (sql.includes("meter_readings_accepted")) {
      readingQueries += 1;
    }
    return prepare(sql);
  }) as typeof prepare;

  const points = resolveDailyConsumptionPoints(database, "kn", dates, "2026-12-31T16:00:00Z");
  assert.equal(points?.length, 365);
  assert.equal(readingQueries, 2, "one window query and one identity-seek statement serve all 365 dates");
  assert.equal(points?.find((point) => point.date === "2026-01-01")?.valueKwh, null);
  database.close();
});

/**
 * N4 evidence: one continuous KN register across a year boundary. The accounting span starts on
 * 2025-01-01 Asia/Taipei with a supported opening baseline, so `total` must describe that span
 * instead of borrowing the current calendar year's start.
 */
function seedCrossYearRegister(database: ReturnType<typeof createDatabase>, options: { openingBaseline?: boolean } = {}) {
  const definition = source(1, "epoch-1");
  if (options.openingBaseline !== false) {
    seedAcceptedReading(database, definition, "1000", "2024-12-31T16:00:00Z", "2024-12-31T16:00:00Z");
  }
  seedAcceptedReading(database, definition, "1600", "2025-12-31T16:00:00Z", "2025-12-31T16:00:00Z");
  seedAcceptedReading(database, definition, "1900", "2026-09-01T16:00:00Z", "2026-09-01T16:00:00Z");
}

const N4_AS_OF = "2026-09-01T16:00:00Z";

test("N4 total spans the supported accounting range instead of the current year", () => {
  const database = createDatabase("2025-01-01T00:00:00+08:00");
  seedCrossYearRegister(database);

  const year = tryResolvePersistedPeriodConsumption(database, "kn", "year", N4_AS_OF);
  const total = tryResolvePersistedPeriodConsumption(database, "kn", "total", N4_AS_OF);

  assert.equal(year?.valueKwh, "300");
  assert.equal(total?.valueKwh, "900");
  assert.equal(year?.periodStart, "2025-12-31T16:00:00.000Z");
  assert.equal(total?.periodStart, "2024-12-31T16:00:00.000Z");
  assert.equal(total?.calculatedThrough, year?.calculatedThrough);
  assert.equal(total?.quality, "exact");
  database.close();
});

test("N4 an unknown cumulative beginning stays explicit instead of a year-to-date substitute", () => {
  const database = createDatabase("2025-01-01T00:00:00+08:00");
  seedCrossYearRegister(database, { openingBaseline: false });

  const year = tryResolvePersistedPeriodConsumption(database, "kn", "year", N4_AS_OF);
  const total = tryResolvePersistedPeriodConsumption(database, "kn", "total", N4_AS_OF);

  assert.equal(year?.valueKwh, "300");
  assert.equal(total?.valueKwh, null);
  assert.ok(total?.quality === "partial" || total?.quality === "unavailable", `expected partial/unavailable, got ${total?.quality}`);
  assert.ok(total?.issues?.some((issue) => issue.startsWith("MISSING_BASELINE")), JSON.stringify(total?.issues));
  assert.equal(total?.periodStart, "2024-12-31T16:00:00.000Z");
  database.close();
});

test("N4 a week keeps the recent seven dates across a month boundary", () => {
  const database = createDatabase("2025-01-01T00:00:00+08:00");
  const definition = source(1, "epoch-1");
  seedAcceptedReading(database, definition, "100", "2026-08-26T16:00:00Z", "2026-08-26T16:00:00Z");
  seedAcceptedReading(database, definition, "175", N4_AS_OF, N4_AS_OF);

  const week = tryResolvePersistedPeriodConsumption(database, "kn", "week", N4_AS_OF);
  const month = tryResolvePersistedPeriodConsumption(database, "kn", "month", N4_AS_OF);

  assert.equal(week?.valueKwh, "75");
  assert.equal(week?.quality, "exact");
  assert.equal(week?.periodStart, "2026-08-26T16:00:00.000Z", "the week starts six dates before today, not at the month start");
  assert.equal(month?.periodStart, "2026-08-31T16:00:00.000Z");
  assert.equal(week?.calculatedThrough, N4_AS_OF.replace("Z", ".000Z"));
  database.close();
});

test("N4 a week crossing an unproven source replacement cannot be declared exact", () => {
  const database = createDatabase("2025-01-01T00:00:00+08:00");
  seedAcceptedReading(database, source(1, "epoch-1"), "100", "2026-08-26T16:00:00Z", "2026-08-26T16:00:00Z");
  seedAcceptedReading(database, source(2, "epoch-2"), "10", "2026-08-30T00:00:00Z", "2026-08-30T00:00:00Z");
  seedAcceptedReading(database, source(2, "epoch-2"), "175", N4_AS_OF, N4_AS_OF);

  const week = tryResolvePersistedPeriodConsumption(database, "kn", "week", N4_AS_OF);

  assert.equal(week?.valueKwh, null);
  assert.equal(week?.quality, "partial");
  assert.ok(week?.issues?.some((issue) => issue.startsWith("UNPROVEN_CONTINUITY") || issue.startsWith("MISSING_BASELINE")), JSON.stringify(week?.issues));
  database.close();
});

function activateSecondProfileRevision(database: ReturnType<typeof createDatabase>, effectiveFrom: string) {
  database.prepare("UPDATE site_energy_profiles SET active = 0").run();
  database.prepare(`INSERT INTO site_energy_profiles SELECT profile_id, metric_scope, 2, schema_version, site_time_zone, status, ?, site_total_json, departments_json, share_basis_json, 1, created_at FROM site_energy_profiles WHERE revision = 1`)
    .run(effectiveFrom);
}

test("N4 total re-anchors on the accounting basis in force after a profile revision", () => {
  const database = createDatabase("2025-01-01T00:00:00+08:00");
  seedCrossYearRegister(database);
  seedAcceptedReading(database, source(1, "epoch-1"), "1800", "2026-05-31T16:00:00Z", "2026-05-31T16:00:00Z");
  activateSecondProfileRevision(database, "2026-06-01T00:00:00+08:00");

  const total = tryResolvePersistedPeriodConsumption(database, "kn", "total", N4_AS_OF);
  const year = tryResolvePersistedPeriodConsumption(database, "kn", "year", N4_AS_OF);

  // The span the site can actually prove is "since the current accounting basis took effect", and
  // it reports that start rather than going permanently unavailable or borrowing the year.
  assert.equal(total?.valueKwh, "100");
  assert.equal(total?.periodStart, "2026-05-31T16:00:00.000Z");
  assert.equal(total?.profileRevision, 2);
  assert.notEqual(total?.periodStart, year?.periodStart);
  database.close();
});

test("N4 a span crossing an accounting-profile boundary reports the boundary instead of a value", () => {
  const database = createDatabase("2025-01-01T00:00:00+08:00");
  seedAcceptedReading(database, source(1, "epoch-1"), "100", "2026-08-26T16:00:00Z", "2026-08-26T16:00:00Z");
  seedAcceptedReading(database, source(1, "epoch-1"), "175", N4_AS_OF, N4_AS_OF);
  activateSecondProfileRevision(database, "2026-08-30T08:00:00+08:00");

  const week = tryResolvePersistedPeriodConsumption(database, "kn", "week", N4_AS_OF);

  assert.equal(week?.valueKwh, null);
  assert.equal(week?.quality, "partial");
  assert.ok(week?.issues?.includes("PROFILE_REVISION_BOUNDARY"), JSON.stringify(week?.issues));
  database.close();
});

test("N4 a measured zero week stays a supported result", () => {
  const database = createDatabase("2025-01-01T00:00:00+08:00");
  const definition = source(1, "epoch-1");
  seedAcceptedReading(database, definition, "500", "2026-08-26T16:00:00Z", "2026-08-26T16:00:00Z");
  seedAcceptedReading(database, definition, "500", N4_AS_OF, N4_AS_OF);

  const week = tryResolvePersistedPeriodConsumption(database, "kn", "week", N4_AS_OF);

  assert.equal(week?.valueKwh, "0");
  assert.equal(week?.quality, "exact");
  database.close();
});

test("N4 day and month keep their calendar resolution while week and total gain spans", () => {
  const database = createDatabase("2025-01-01T00:00:00+08:00");
  seedCrossYearRegister(database);
  seedAcceptedReading(database, source(1, "epoch-1"), "1750", "2026-08-31T16:00:00Z", "2026-08-31T16:00:00Z");

  const results = (["day", "week", "month", "year", "total"] as const).map((range) =>
    [range, tryResolvePersistedPeriodConsumption(database, "kn", range, N4_AS_OF)] as const
  );
  const starts = new Map(results.map(([range, result]) => [range, result?.periodStart]));

  assert.equal(starts.get("day"), "2026-09-01T16:00:00.000Z");
  assert.equal(starts.get("month"), "2026-08-31T16:00:00.000Z");
  assert.equal(starts.get("year"), "2025-12-31T16:00:00.000Z");
  assert.equal(starts.get("week"), "2026-08-26T16:00:00.000Z");
  assert.equal(starts.get("total"), "2024-12-31T16:00:00.000Z");
  for (const [range, result] of results) {
    assert.ok(result !== null, `${range} must stay a canonical result for a configured profile`);
  }
  database.close();
});

test("N4 a configured profile without usable evidence still returns a canonical unavailable result", () => {
  const database = createDatabase("2025-01-01T00:00:00+08:00");

  for (const range of ["week", "total"] as const) {
    const result = tryResolvePersistedPeriodConsumption(database, "kn", range, N4_AS_OF);
    assert.ok(result !== null, `${range} must not collapse into the no-profile shape`);
    assert.equal(result?.valueKwh, null);
    assert.ok(result?.quality === "partial" || result?.quality === "unavailable");
  }
  assert.equal(tryResolvePersistedPeriodConsumption(database, "global" as unknown as "kn", "total", N4_AS_OF), null);
  database.close();
});

// Counts the queries and rows read from accepted readings, so a test can require
// that unrelated history is never materialized.
function recordAcceptedRowReads(database: Database.Database) {
  const reads = { queries: 0, rows: 0 };
  const prepare = database.prepare.bind(database);
  database.prepare = ((sql: string) => {
    const statement = prepare(sql);
    if (!sql.includes("meter_readings_accepted")) {
      return statement;
    }
    reads.queries += 1;
    const all = statement.all.bind(statement);
    const get = statement.get.bind(statement);
    statement.all = ((...parameters: unknown[]) => {
      const rows = all(...parameters);
      reads.rows += rows.length;
      return rows;
    }) as typeof statement.all;
    statement.get = ((...parameters: unknown[]) => {
      const row = get(...parameters);
      if (row !== undefined) reads.rows += 1;
      return row;
    }) as typeof statement.get;
    return statement;
  }) as typeof database.prepare;
  return reads;
}

// Older readings of the same register, all before every window these tests resolve.
function seedOldHistory(database: Database.Database, count: number) {
  const insert = database.prepare(`
    INSERT INTO meter_readings_accepted (
      reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id, raw_value_decimal,
      normalized_value_kwh, source_timestamp, received_at, timestamp_quality, origin, payload_hash, created_at, measurement_kind
    ) VALUES (?, 'kn', 'kn-main', 'kn-main', 1, 'epoch-1', ?, ?, ?, ?, 'source', 'mqtt', ?, ?, 'cumulative-energy')
  `);
  database.transaction(() => {
    for (let index = 0; index < count; index += 1) {
      const instant = new Date(Date.parse("2023-01-01T00:00:00Z") + index * 3_600_000).toISOString();
      insert.run(`old-${index}`, String(index), String(index), instant, instant, `old-${index}`, instant);
    }
  })();
}

test("persisted ranges resolve from bounded evidence exactly as from the full-load oracle", (t) => {
  const database = createDatabase("2025-01-01T00:00:00+08:00");
  t.after(() => database.close());
  seedOldHistory(database, 500);
  seedCrossYearRegister(database);
  seedAcceptedReading(database, source(1, "epoch-1"), "1750", "2026-08-31T16:00:00Z", "2026-08-31T16:00:00Z");
  seedAcceptedReading(database, source(2, "epoch-2"), "5", "2026-09-01T08:00:00Z", "2026-09-01T08:00:00Z");
  const profiles = listPersistedProfiles(database, "kn");
  const active = getActiveProfile(database, "kn")!;
  const freshnessPolicy = readFreshnessPolicy(database).policy;
  const full = loadAcceptedSamples(database, "kn");
  const reads = recordAcceptedRowReads(database);

  for (const range of ["day", "month", "year"] as const) {
    const period = periodSelectionFromRange(range, N4_AS_OF, active.siteTimeZone)!;
    assert.deepStrictEqual(
      resolvePersistedPeriodConsumption(database, "kn", period, N4_AS_OF),
      resolvePeriodFromEvidence(profiles, full, period, N4_AS_OF, freshnessPolicy),
      range
    );
  }
  for (const range of ["week", "total"] as const) {
    const span = rangeSpanFromRange(range, N4_AS_OF, active, active.siteTimeZone)!;
    assert.deepStrictEqual(
      tryResolvePersistedPeriodConsumption(database, "kn", range, N4_AS_OF),
      resolveSpanFromEvidence(profiles, full, span, N4_AS_OF, freshnessPolicy),
      range
    );
  }
  assert.ok(reads.rows < 500, `five ranges read ${reads.rows} accepted rows; the 500 older readings must stay unread`);
});

test("profile selection, revision boundaries and the effective context are unchanged under bounded reads", (t) => {
  const database = createDatabase("2025-01-01T00:00:00+08:00");
  t.after(() => database.close());
  seedOldHistory(database, 300);
  seedCrossYearRegister(database);
  seedAcceptedReading(database, source(1, "epoch-1"), "1800", "2026-05-31T16:00:00Z", "2026-05-31T16:00:00Z");
  activateSecondProfileRevision(database, "2026-06-15T00:00:00+08:00");
  const profiles = listPersistedProfiles(database, "kn");
  const freshnessPolicy = readFreshnessPolicy(database).policy;
  const full = loadAcceptedSamples(database, "kn");
  const june = { kind: "month" as const, month: 6, year: 2026 };

  for (const [period, options] of [[june, {}], [june, { profileRevision: 1 }], [{ kind: "year" as const, year: 2026 }, {}]] as const) {
    assert.deepStrictEqual(
      resolvePersistedPeriodConsumption(database, "kn", period, N4_AS_OF, options),
      resolvePeriodFromEvidence(profiles, full, period, N4_AS_OF, freshnessPolicy, options),
      JSON.stringify([period, options])
    );
  }
  assert.throws(() => resolvePersistedPeriodConsumption(database, "kn", june, N4_AS_OF, { profileRevision: 99 }), /UNKNOWN_PROFILE_REVISION/);

  const rangeWindow = rangeWindowFor("month", N4_AS_OF, getActiveProfile(database, "kn")!)!;
  const context = loadEffectivePeriodContext(database, "kn", rangeWindow, N4_AS_OF);
  assert.ok(context.samples.every((sample) => !sample.readingId?.startsWith("old-")), "the context carries no unrelated history");
  const resolveChannel = (samples: typeof full) => resolveConsumptionForRangeWindow(rangeWindow, {
    asOf: N4_AS_OF,
    freshnessPolicy: context.freshnessPolicy,
    meterIds: ["kn-main"],
    profile: context.profile,
    samples
  });
  assert.deepStrictEqual(resolveChannel(context.samples), resolveChannel(full));
});

test("daily points resolve from one bounded read and equal the full-load oracle on every date", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  seedOldHistory(database, 400);
  const definition = source(1, "epoch-1");
  seedAcceptedReading(database, definition, "100", "2026-07-31T16:00:00Z", "2026-07-31T16:00:00Z");
  for (let day = 1; day <= 30; day += 3) {
    const instant = new Date(Date.parse("2026-07-31T16:00:00Z") + day * 86_400_000).toISOString();
    seedAcceptedReading(database, definition, String(100 + day * 10), instant, instant);
  }
  seedAcceptedReading(database, source(2, "epoch-2"), "1", "2026-09-05T00:00:00Z", "2026-09-05T00:00:00Z");
  seedAcceptedReading(database, source(2, "epoch-2"), "40", "2026-09-10T00:00:00Z", "2026-09-10T00:00:00Z");
  const asOf = "2026-09-12T00:00:00Z";
  const dates = [...monthDateKeys("2026-08"), ...monthDateKeys("2026-09"), "2026-02-30", "not-a-date"];
  const profiles = listPersistedProfiles(database, "kn");
  const freshnessPolicy = readFreshnessPolicy(database).policy;
  const oracle = resolveDailyPointsFromEvidence(profiles, loadAcceptedSamples(database, "kn"), freshnessPolicy, dates, asOf);
  const reads = recordAcceptedRowReads(database);

  const oneDate = resolveDailyConsumptionPoints(database, "kn", ["2026-08-15"], asOf);
  const oneDateReads = { ...reads };
  resolveDailyConsumptionPoints(database, "kn", Array.from({ length: 365 }, () => "2026-08-15"), asOf);
  const repeatedDateReads = {
    queries: reads.queries - oneDateReads.queries,
    rows: reads.rows - oneDateReads.rows
  };
  const beforeWideClosure = { ...reads };
  const points = resolveDailyConsumptionPoints(database, "kn", dates, asOf);
  const wideClosureReads = {
    queries: reads.queries - beforeWideClosure.queries,
    rows: reads.rows - beforeWideClosure.rows
  };

  assert.deepStrictEqual(points, oracle);
  assert.deepStrictEqual(oneDate, oracle.filter((point) => point.date === "2026-08-15"));
  assert.deepStrictEqual(repeatedDateReads, oneDateReads, "the query and row counts do not grow with the number of dates in one closure");
  assert.ok(wideClosureReads.queries < dates.length, "a wider multi-profile closure remains independent of the date count");
  assert.ok(wideClosureReads.rows < 400, "the 400 older readings stay unread");
});

test("an as-of before the requested window resolves from the evidence before that as-of", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  seedOldHistory(database, 100);
  seedAcceptedReading(database, source(1, "epoch-1"), "100", "2026-06-01T00:00:00Z", "2026-06-01T00:00:00Z");
  seedAcceptedReading(database, source(1, "epoch-1"), "150", "2026-08-20T00:00:00Z", "2026-08-20T00:00:00Z");
  const september = { kind: "month" as const, month: 9, year: 2026 };
  const asOf = "2026-08-15T00:00:00Z";

  assert.deepStrictEqual(
    resolvePersistedPeriodConsumption(database, "kn", september, asOf),
    resolvePeriodFromEvidence(listPersistedProfiles(database, "kn"), loadAcceptedSamples(database, "kn"), september, asOf, readFreshnessPolicy(database).policy)
  );
});

function failCalendarRead(database: Database.Database, table: string, error: unknown) {
  const prepare = database.prepare.bind(database);
  const reads = { failures: 0, afterFailure: 0 };
  database.prepare = ((sql: string) => {
    if (reads.failures > 0) reads.afterFailure += 1;
    if (sql.includes(table)) {
      reads.failures += 1;
      throw error;
    }
    return prepare(sql);
  }) as typeof database.prepare;
  return reads;
}

const CALENDAR_AS_OF = "2026-09-01T04:00:00Z";

for (const range of ["day", "month", "year"] as const) {
  for (const [failure, table] of [
    ["calculation", "meter_readings_accepted"],
    ["projection", "consumption_projections"]
  ] as const) {
    test(`configured ${range} ${failure} failure remains unavailable without catch-time reads`, (t) => {
      const database = createDatabase();
      t.after(() => database.close());
      const opening = range === "year" ? "2025-12-31T16:00:00Z" : "2026-08-31T16:00:00Z";
      seedAcceptedReading(database, source(1, "epoch-1"), "100", opening, opening);
      seedAcceptedReading(database, source(1, "epoch-1"), "150", CALENDAR_AS_OF, CALENDAR_AS_OF);
      assert.equal(tryResolvePersistedPeriodConsumption(database, "kn", range, CALENDAR_AS_OF)?.valueKwh, "50");
      const reads = failCalendarRead(database, table, new Error("SELECT secret FROM private_table; raw-stack-sentinel"));

      const result = tryResolvePersistedPeriodConsumption(database, "kn", range, CALENDAR_AS_OF);

      assert.deepEqual(result, {
        calculatedThrough: CALENDAR_AS_OF,
        issues: [`UNRESOLVED_ACCOUNTING_PERIOD:${range}`, "PERIOD_CONSUMPTION_RESOLUTION_FAILED"],
        profileRevision: 1,
        quality: "unavailable",
        siteTimeZone: "Asia/Taipei",
        valueKwh: null
      }, "only known metadata is returned, without invented boundaries, coverage, or exception details");
      assert.deepEqual(reads, { failures: 1, afterFailure: 0 });
    });
  }

  for (const closingValue of ["100", "150"]) {
    test(`configured ${range} retains the measured ${closingValue === "100" ? "zero" : "positive"} result`, (t) => {
      const database = createDatabase();
      t.after(() => database.close());
      const opening = range === "year" ? "2025-12-31T16:00:00Z" : "2026-08-31T16:00:00Z";
      seedAcceptedReading(database, source(1, "epoch-1"), "100", opening, opening);
      seedAcceptedReading(database, source(1, "epoch-1"), closingValue, CALENDAR_AS_OF, CALENDAR_AS_OF);

      const result = tryResolvePersistedPeriodConsumption(database, "kn", range, CALENDAR_AS_OF);

      assert.equal(result?.quality, "exact");
      assert.equal(result?.valueKwh, closingValue === "100" ? "0" : "50");
    });
  }
}

for (const [label, code, expected] of [
  ["missing", undefined, "PERIOD_CONSUMPTION_RESOLUTION_FAILED"],
  ["valid", "SQLITE_BUSY", "SQLITE_BUSY"],
  ["one character", "0", "0"],
  ["maximum length", "A".repeat(64), "A".repeat(64)],
  ["empty", "", "PERIOD_CONSUMPTION_RESOLUTION_FAILED"],
  ["lowercase", "sqlite_busy", "PERIOD_CONSUMPTION_RESOLUTION_FAILED"],
  ["SQL", "SELECT * FROM secrets", "PERIOD_CONSUMPTION_RESOLUTION_FAILED"],
  ["newline", "SQLITE_BUSY\n", "PERIOD_CONSUMPTION_RESOLUTION_FAILED"],
  ["too long", "A".repeat(65), "PERIOD_CONSUMPTION_RESOLUTION_FAILED"],
  ["numeric", 42, "PERIOD_CONSUMPTION_RESOLUTION_FAILED"],
  ["object", { private: "sentinel" }, "PERIOD_CONSUMPTION_RESOLUTION_FAILED"]
] as const) {
  test(`calendar diagnostics sanitize ${label} error codes`, (t) => {
    const database = createDatabase();
    t.after(() => database.close());
    const error = Object.assign(new Error("private SQL message sentinel"), { code });
    error.stack = "private stack sentinel";
    const reads = failCalendarRead(database, "meter_readings_accepted", error);

    const result = tryResolvePersistedPeriodConsumption(database, "kn", "month", CALENDAR_AS_OF);

    assert.deepEqual(result?.issues, ["UNRESOLVED_ACCOUNTING_PERIOD:month", expected]);
    assert.doesNotMatch(JSON.stringify(result), /private|sentinel|SELECT/);
    assert.deepEqual(reads, { failures: 1, afterFailure: 0 });
  });
}

test("calendar parsing failures after profile lookup remain unavailable", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  database.prepare("UPDATE site_energy_profiles SET site_time_zone = 'invalid-zone'").run();

  for (const range of ["day", "month", "year"] as const) {
    const result = tryResolvePersistedPeriodConsumption(database, "kn", range, CALENDAR_AS_OF);
    assert.equal(result?.quality, "unavailable");
    assert.equal(result?.valueKwh, null);
    assert.equal(result?.siteTimeZone, "invalid-zone");
    assert.deepEqual(result?.issues, [`UNRESOLVED_ACCOUNTING_PERIOD:${range}`, "PERIOD_CONSUMPTION_RESOLUTION_FAILED"]);
  }
});

test("global and absent profiles retain null but unreadable profiles still throw", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  for (const range of ["day", "week", "month", "year", "total"] as const) {
    assert.equal(tryResolvePersistedPeriodConsumption(database, "cl", range, CALENDAR_AS_OF), null);
  }
  const error = new Error("profile read unavailable");
  const reads = failCalendarRead(database, "site_energy_profiles", error);
  for (const range of ["day", "week", "month", "year", "total"] as const) {
    assert.equal(tryResolvePersistedPeriodConsumption(database, "global", range, CALENDAR_AS_OF), null);
  }
  assert.equal(reads.failures, 0, "global compatibility must not query a site profile");
  assert.throws(() => tryResolvePersistedPeriodConsumption(database, "kn", "day", CALENDAR_AS_OF), (caught) => caught === error);
});

for (const range of ["week", "total"] as const) {
  test(`${range} calculation failures retain their existing span diagnostics`, (t) => {
    const database = createDatabase();
    t.after(() => database.close());
    failCalendarRead(database, "meter_readings_accepted", Object.assign(new Error("unavailable"), { code: "SQLITE_BUSY" }));

    const result = tryResolvePersistedPeriodConsumption(database, "kn", range, CALENDAR_AS_OF);

    assert.equal(result?.quality, "unavailable");
    assert.equal(result?.valueKwh, null);
    assert.deepEqual(result?.issues, [`UNRESOLVED_ACCOUNTING_SPAN:${range}`, "SQLITE_BUSY"]);
  });
}
