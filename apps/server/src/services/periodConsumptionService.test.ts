import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { shadowProject, activateProjection } from "./consumptionProjectionService.js";
import { saveMeterSource } from "./meterSourceCatalogService.js";
import { seedAcceptedReading, ingestMeterReading } from "./meterReadingService.js";
import { loadAcceptedSamples, resolvePersistedPeriodConsumption, tryResolvePersistedPeriodConsumption } from "./periodConsumptionService.js";

function createDatabase() {
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
    "2026-01-01T00:00:00+08:00",
    JSON.stringify({
      coverageReview: "reviewed",
      kind: "meter-set",
      label: "觀音總錶",
      memberChannelIds: ["kn-main"]
    }),
    JSON.stringify({ kind: "site-main" }),
    "2026-01-01T00:00:00.000Z"
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
