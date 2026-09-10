import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { filterProjectionFingerprintRows, selectProjectionFingerprintEvidence } from "./accountingEvidenceSelection.js";
import {
  acceptedSampleChecksum,
  acceptedWatermark,
  activateProjection,
  readActiveProjection,
  rollbackProjection,
  shadowProject
} from "./consumptionProjectionService.js";
import { loadAcceptedMeterReadings } from "./meterReadingService.js";

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


function insertAccepted(database: Database.Database, id: string, sourceTimestamp: string, options: { channel?: string; received?: string } = {}) {
  database.prepare(`INSERT INTO meter_readings_accepted
    (reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id, raw_value_decimal, normalized_value_kwh,
     source_timestamp, received_at, timestamp_quality, origin, payload_hash, created_at)
    VALUES (?, 'kn', ?, ?, 1, 'epoch', '1', '1', ?, ?, 'source', 'mqtt', ?, ?)`)
    .run(id, options.channel ?? "main", options.channel ?? "main", sourceTimestamp, options.received ?? sourceTimestamp, id, options.received ?? sourceTimestamp);
}

const WINDOW_RESULT = {
  calculatedThrough: "2026-09-15T00:00:00Z",
  calculationVersion: "e2-v4",
  meterIds: ["main"],
  periodEnd: "2026-09-30T16:00:00Z",
  periodStart: "2026-08-31T16:00:00Z",
  profileRevision: 1,
  quality: "exact" as const,
  siteTimeZone: "Asia/Taipei",
  valueKwh: "1"
};

function seedWindowEvidence(database: Database.Database) {
  database.transaction(() => {
    for (let index = 0; index < 300; index += 1) {
      insertAccepted(database, `history-${index}`, new Date(Date.parse("2025-01-01T00:00:00Z") + index * 3_600_000).toISOString());
    }
  })();
  insertAccepted(database, "baseline", "2026-08-31T15:00:00Z");
  insertAccepted(database, "inside-1", "2026-09-05T00:00:00Z");
  insertAccepted(database, "inside-2", "2026-09-14T23:00:00Z");
  insertAccepted(database, "elsewhere", "2026-09-05T00:00:00Z", { channel: "other" });
}

function recordStatements(database: Database.Database, fragment: string) {
  const statements: string[] = [];
  const prepare = database.prepare.bind(database);
  database.prepare = ((sql: string) => {
    if (sql.includes(fragment)) statements.push(sql);
    return prepare(sql);
  }) as typeof database.prepare;
  return statements;
}

test("a shadow takes its checksum, watermark and input checksum from one fingerprint selection", () => {
  const database = createDatabase();
  seedWindowEvidence(database);
  const expectedRows = filterProjectionFingerprintRows("kn", loadAcceptedMeterReadings(database, "kn"), WINDOW_RESULT);
  const statements = recordStatements(database, "meter_readings_accepted");
  selectProjectionFingerprintEvidence(database, "kn", WINDOW_RESULT);
  const perSelection = statements.splice(0).length;

  const shadow = shadowProject(database, WINDOW_RESULT, "kn", "month");

  assert.equal(statements.length, perSelection, "one selection serves checksum, watermark and the input check");
  assert.ok(statements.every((sql) => sql.includes("channel_id")), "no full-scope read");
  assert.equal(shadow.sampleChecksum, createHash("sha256").update(JSON.stringify(expectedRows)).digest("hex"));
  const latest = Math.max(...expectedRows.map((row) => Date.parse(row.source_timestamp ?? row.received_at)));
  assert.equal(shadow.watermark, new Date(latest).toISOString());
  assert.equal(acceptedSampleChecksum(database, "kn", WINDOW_RESULT), shadow.sampleChecksum);
  assert.equal(acceptedWatermark(database, "kn", WINDOW_RESULT), shadow.watermark);
  database.close();
});

test("a shadow checks a caller-supplied checksum against freshly selected evidence", () => {
  const database = createDatabase();
  seedWindowEvidence(database);
  const checksum = acceptedSampleChecksum(database, "kn", WINDOW_RESULT);
  insertAccepted(database, "arrived-meanwhile", "2026-09-06T00:00:00Z");

  assert.throws(() => shadowProject(database, WINDOW_RESULT, "kn", "month", checksum), /PROJECTION_INPUT_CHANGED/);
  database.close();
});

test("a bounded shadow rejects a caller-supplied watermark that does not match fresh evidence", () => {
  const database = createDatabase();
  seedWindowEvidence(database);
  const checksum = acceptedSampleChecksum(database, "kn", WINDOW_RESULT);

  assert.throws(
    () => shadowProject(database, WINDOW_RESULT, "kn", "month", checksum, "2099-01-01T00:00:00.000Z"),
    /PROJECTION_INPUT_CHANGED/
  );
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM consumption_projections").get() as { count: number }).count, 0);
  database.close();
});

test("activation re-reads fingerprint evidence and rejects a relevant late observation without touching pointers", () => {
  const database = createDatabase();
  seedWindowEvidence(database);
  const candidate = shadowProject(database, WINDOW_RESULT, "kn", "month");
  insertAccepted(database, "late-inside", "2026-09-10T00:00:00Z", { received: "2026-09-20T00:00:00Z" });
  const reads = recordStatements(database, "meter_readings_accepted");
  const updates = recordStatements(database, "UPDATE consumption_projections");

  assert.throws(() => activateProjection(database, candidate), /PROJECTION_INPUT_CHANGED/);
  assert.ok(reads.length > 0, "activation selects fresh evidence itself");
  assert.equal(updates.length, 0);
  assert.equal(readActiveProjection(database, "kn", "month", candidate.contextKey), null);
  database.close();
});

test("re-activating an already-active projection still rejects changed fingerprint evidence", () => {
  const database = createDatabase();
  seedWindowEvidence(database);
  const candidate = shadowProject(database, WINDOW_RESULT, "kn", "month");
  activateProjection(database, candidate);
  insertAccepted(database, "late-after-activation", "2026-09-10T12:00:00Z", { received: "2026-09-20T00:00:00Z" });
  const updates = recordStatements(database, "UPDATE consumption_projections");

  assert.throws(() => activateProjection(database, candidate), /PROJECTION_INPUT_CHANGED/);
  assert.equal(updates.length, 0);
  assert.equal(readActiveProjection(database, "kn", "month", candidate.contextKey)?.projectionId, candidate.projectionId);
  database.close();
});

test("activation rejects a bounded candidate whose stored watermark is not the fresh fingerprint watermark", () => {
  const database = createDatabase();
  seedWindowEvidence(database);
  const candidate = shadowProject(database, WINDOW_RESULT, "kn", "month");
  database.prepare("UPDATE consumption_projections SET watermark = ? WHERE projection_id = ?")
    .run("2099-01-01T00:00:00.000Z", candidate.projectionId);
  const updates = recordStatements(database, "UPDATE consumption_projections");

  assert.throws(() => activateProjection(database, candidate), /PROJECTION_INPUT_CHANGED/);
  assert.equal(updates.length, 0);
  assert.equal(readActiveProjection(database, "kn", "month", candidate.contextKey), null);
  database.close();
});

test("a newer baseline before the window blocks activation while a later observation does not", () => {
  const blocked = createDatabase();
  seedWindowEvidence(blocked);
  const stale = shadowProject(blocked, WINDOW_RESULT, "kn", "month");
  insertAccepted(blocked, "newer-baseline", "2026-08-31T15:30:00Z");
  assert.throws(() => activateProjection(blocked, stale), /PROJECTION_INPUT_CHANGED/);
  assert.equal(readActiveProjection(blocked, "kn", "month", stale.contextKey), null);
  blocked.close();

  const allowed = createDatabase();
  seedWindowEvidence(allowed);
  const candidate = shadowProject(allowed, WINDOW_RESULT, "kn", "month");
  insertAccepted(allowed, "after-through", "2026-09-20T00:00:00Z");
  assert.equal(activateProjection(allowed, candidate)?.projectionId, candidate.projectionId);
  allowed.close();
});

test("a stale expected active projection is rejected with its conflict code and no pointer update", () => {
  const database = createDatabase();
  seedWindowEvidence(database);
  const older = shadowProject(database, WINDOW_RESULT, "kn", "month");
  const newer = shadowProject(database, { ...WINDOW_RESULT, valueKwh: "2" }, "kn", "month");
  activateProjection(database, newer);
  const updates = recordStatements(database, "UPDATE consumption_projections");

  assert.throws(() => activateProjection(database, older), /PROJECTION_ACTIVATION_CONFLICT/);
  assert.equal(updates.length, 0);
  assert.equal(readActiveProjection(database, "kn", "month", newer.contextKey)?.projectionId, newer.projectionId);
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
