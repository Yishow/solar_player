import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import {
  acceptedSampleChecksum,
  activateProjection,
  readActiveProjection,
  rollbackProjection,
  shadowProject
} from "./consumptionProjectionService.js";

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/040_meter_reading_contracts.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/049_meter_source_boundary_age.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/046_meter_reading_evidence.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/041_site_energy_profiles.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/045_profile_apply_guards.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/042_consumption_projections.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/047_projection_activation_context.sql"), "utf8"));
  return database;
}

test("E3 shadow activation and rollback keep the previous projection", () => {
  const database = createDatabase();
  const first = shadowProject(database, {
    profileRevision: 1,
    quality: "exact",
    siteTimeZone: "Asia/Taipei",
    valueKwh: "4300"
  }, "kn", "month", undefined, "2026-09-01T00:00:00Z");
  activateProjection(database, first);
  const second = shadowProject(database, {
    profileRevision: 2,
    quality: "exact",
    siteTimeZone: "Asia/Taipei",
    valueKwh: "4500"
  }, "kn", "month", undefined, "2026-09-02T00:00:00Z");
  activateProjection(database, second);
  assert.equal(readActiveProjection(database, "kn", "month")?.valueKwh, "4500");
  const rolled = rollbackProjection(database, "kn", "month");
  assert.equal(rolled?.valueKwh, "4300");
  assert.equal(readActiveProjection(database, "kn", "month")?.valueKwh, "4300");
  database.close();
});

test("E3 restart reads the persisted active projection without MQTT", () => {
  const database = createDatabase();
  const first = shadowProject(database, {
    profileRevision: 1,
    quality: "exact",
    siteTimeZone: "Asia/Taipei",
    valueKwh: "300"
  }, "kn", "day", undefined, "2026-09-01T00:00:00Z");
  activateProjection(database, first);
  const checksum = acceptedSampleChecksum(database, "kn");
  assert.equal(typeof checksum, "string");
  assert.equal(readActiveProjection(database, "kn", "day")?.valueKwh, "300");
  database.close();
});


test("E3 a shadow built before another activation cannot overwrite it", () => {
  const database = createDatabase();
  const result = { profileRevision: 1, quality: "exact" as const, siteTimeZone: "Asia/Taipei", valueKwh: "1" };
  const older = shadowProject(database, result, "kn", "month");
  const newer = shadowProject(database, { ...result, valueKwh: "2" }, "kn", "month");
  activateProjection(database, newer);
  assert.throws(() => activateProjection(database, older), /PROJECTION_ACTIVATION_CONFLICT/);
  assert.equal(readActiveProjection(database, "kn", "month")?.valueKwh, "2");
  assert.throws(() => activateProjection(database, { ...older, projectionId: "missing" }), /PROJECTION_NOT_FOUND/);
  assert.equal(readActiveProjection(database, "kn", "month")?.valueKwh, "2");
  database.close();
});

test("E3 rollback restores activated lineage rather than an unactivated shadow", () => {
  const database = createDatabase();
  const result = { profileRevision: 1, quality: "exact" as const, siteTimeZone: "Asia/Taipei", valueKwh: "1" };
  const first = shadowProject(database, result, "kn", "month");
  activateProjection(database, first);
  shadowProject(database, { ...result, valueKwh: "999" }, "kn", "month");
  const second = shadowProject(database, { ...result, valueKwh: "2" }, "kn", "month");
  activateProjection(database, second);
  assert.equal(rollbackProjection(database, "kn", "month")?.valueKwh, "1");
  database.close();
});


test("E3 identical shadow inputs reuse the persisted revision", () => {
  const database = createDatabase();
  const result = { profileRevision: 1, quality: "exact" as const, siteTimeZone: "Asia/Taipei", valueKwh: "1" };
  const first = shadowProject(database, result, "kn", "day");
  const second = shadowProject(database, result, "kn", "day");
  assert.equal(first.projectionId, second.projectionId);
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM consumption_projections").get() as { count: number }).count, 1);
  database.close();
});


test("E3 interrupted activation rolls back the deactivation of the previous revision", () => {
  const database = createDatabase();
  const result = { profileRevision: 1, quality: "exact" as const, siteTimeZone: "Asia/Taipei", valueKwh: "1" };
  const first = shadowProject(database, result, "kn", "day");
  activateProjection(database, first);
  const second = shadowProject(database, { ...result, valueKwh: "2" }, "kn", "day");
  database.exec(`CREATE TRIGGER fail_activation BEFORE UPDATE OF active ON consumption_projections
    WHEN NEW.active = 1 BEGIN SELECT RAISE(ABORT, 'simulated interruption'); END`);
  assert.throws(() => activateProjection(database, second), /simulated interruption/);
  assert.equal(readActiveProjection(database, "kn", "day")?.projectionId, first.projectionId);
  database.close();
});

test("E3 an accepted late observation invalidates a shadow even without a newer watermark", () => {
  const database = createDatabase();
  const result = { profileRevision: 1, quality: "exact" as const, siteTimeZone: "Asia/Taipei", valueKwh: "1" };
  const candidate = shadowProject(database, result, "kn", "day");
  database.prepare(`INSERT INTO meter_readings_accepted
    (reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id, raw_value_decimal, normalized_value_kwh,
     source_timestamp, received_at, timestamp_quality, origin, payload_hash, created_at)
    VALUES ('late', 'kn', 'main', 'main', 1, 'epoch', '1', '1', '2026-01-01T00:00:00Z', '2026-09-01T00:00:00Z', 'source', 'mqtt', 'late', '2026-09-01T00:00:00Z')`).run();
  assert.throws(() => activateProjection(database, candidate), /PROJECTION_INPUT_CHANGED/);
  assert.equal(readActiveProjection(database, "kn", "day"), null);
  database.close();
});


test("E3 unrelated future readings do not invalidate a closed period and first activation rollback is safe", () => {
  const database = createDatabase();
  const result = { profileRevision: 1, quality: "exact" as const, siteTimeZone: "Asia/Taipei", valueKwh: "1",
    meterIds: ["main"], periodStart: "2026-08-31T16:00:00Z", periodEnd: "2026-09-30T16:00:00Z", calculatedThrough: "2026-09-30T16:00:00Z", calculationVersion: "e2-v2" };
  const candidate = shadowProject(database, result, "kn", "month");
  database.prepare(`INSERT INTO meter_readings_accepted
    (reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id, raw_value_decimal, normalized_value_kwh,
     source_timestamp, received_at, timestamp_quality, origin, payload_hash, created_at)
    VALUES ('future', 'kn', 'main', 'main', 1, 'epoch', '1', '1', '2026-10-15T00:00:00Z', '2026-10-15T00:00:00Z', 'source', 'mqtt', 'future', '2026-10-15T00:00:00Z')`).run();
  activateProjection(database, candidate);
  assert.equal(rollbackProjection(database, "kn", "month", candidate.projectionId)?.projectionId, candidate.projectionId);
  assert.equal(readActiveProjection(database, "kn", "month")?.projectionId, candidate.projectionId);
  database.close();
});
