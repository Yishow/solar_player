import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterReadingChangeEvent, MeterSourceDefinition } from "@solar-display/shared";
import { physicalIdentityChanged } from "@solar-display/shared";
import type { PeriodConsumptionResult } from "@solar-display/shared";
import { filterProjectionFingerprintRows, selectProjectionFingerprintEvidence } from "./accountingEvidenceSelection.js";
import {
  countAcceptedReadings,
  findLatestAcceptedInstantMs,
  ingestMeterReading,
  listAcceptedReadingIdentities,
  listCalculationEligibleIdentitiesAt,
  loadAcceptedMeterReadings,
  loadAcceptedMeterReadingsForIdentityWindow,
  loadAcceptedMeterReadingsInWindow,
  readLiveState,
  seedAcceptedReading
} from "./meterReadingService.js";
import { inventoryTopicMappings, saveMeterSource } from "./meterSourceCatalogService.js";

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/040_meter_reading_contracts.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/046_meter_reading_evidence.sql"), "utf8"));
  return database;
}

const clMain: MeterSourceDefinition = {
  channelId: "main",
  enabled: true,
  energyFlowRole: "consumption",
  epochId: "epoch-1",
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

test("E1-R2-S01 repeated retained payload with source time is accepted once", () => {
  const database = createDatabase();
  const events: string[] = [];
  const sample = {
    dup: false,
    origin: "mqtt" as const,
    qos: 1,
    rawValueDecimal: "10000.125",
    receivedAt: "2026-09-01T00:00:01.000Z",
    retain: true,
    sourceTimestamp: "2026-08-31T16:00:00Z"
  };
  for (let index = 0; index < 10; index += 1) {
    ingestMeterReading(database, clMain, { ...sample, receivedAt: `2026-09-01T00:00:0${index}.000Z` }, {
      emitMeterReadingsChanged: (identity) => events.push(identity)
    });
  }
  assert.equal(countAcceptedReadings(database, clMain), 1);
  assert.equal(readLiveState(database, clMain)?.live_value_kwh, "10000.125");
  assert.equal(events.length, 1);
  database.close();
});

test("E1-R2-S02 timestamp collision quarantines the second value", () => {
  const database = createDatabase();
  ingestMeterReading(database, clMain, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10000",
    receivedAt: "2026-09-01T00:00:01.000Z",
    retain: false,
    sourceTimestamp: "2026-08-31T16:00:00Z"
  });
  const second = ingestMeterReading(database, clMain, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10100",
    receivedAt: "2026-09-01T00:00:02.000Z",
    retain: false,
    sourceTimestamp: "2026-08-31T16:00:00Z"
  });
  assert.equal(second.status, "conflict");
  assert.equal(readLiveState(database, clMain)?.live_value_kwh, "10000");
  database.close();
});

test("E1-R2 collision lookup remains authoritative when live state is absent", () => {
  const database = createDatabase();
  ingestMeterReading(database, clMain, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10000",
    receivedAt: "2026-09-01T00:00:01.000Z",
    retain: false,
    sourceTimestamp: "2026-08-31T16:00:00Z"
  });
  database.prepare("DELETE FROM meter_live_state").run();
  const second = ingestMeterReading(database, clMain, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10100",
    receivedAt: "2026-09-01T00:00:02.000Z",
    retain: false,
    sourceTimestamp: "2026-08-31T16:00:00Z"
  });
  assert.equal(second.status, "conflict");
  assert.equal(countAcceptedReadings(database, clMain), 1);
  database.close();
});

test("E1-R2-S03 restart retained replay without timestamp does not overwrite 10100", () => {
  const database = createDatabase();
  seedAcceptedReading(database, clMain, "10100", "2026-08-31T17:00:00Z", "2026-08-31T17:00:01.000Z");
  const before = readLiveState(database, clMain);
  const events: string[] = [];
  for (let index = 0; index < 10; index += 1) {
    const result = ingestMeterReading(database, clMain, {
      dup: index % 2 === 0,
      origin: "mqtt",
      qos: 1,
      rawValueDecimal: "10000",
      receivedAt: `2026-09-01T00:00:${String(index).padStart(2, "0")}.000Z`,
      retain: true,
      sourceTimestamp: null
    }, { emitMeterReadingsChanged: (identity) => events.push(identity) });
    assert.equal(result.reason, "RETAINED_SOURCE_TIME_UNKNOWN");
  }
  const after = readLiveState(database, clMain);
  assert.deepEqual(after, before);
  assert.equal(countAcceptedReadings(database, clMain), 1);
  assert.equal(events.length, 0);
  database.close();
});

test("E1-R2 late event is stored without rolling back live value", () => {
  const database = createDatabase();
  const events: MeterReadingChangeEvent[] = [];
  ingestMeterReading(database, clMain, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10100",
    receivedAt: "2026-09-01T01:00:00.000Z",
    retain: false,
    sourceTimestamp: "2026-09-01T01:00:00Z"
  }, { emitMeterReadingChange: (event) => events.push(event) });
  const late = ingestMeterReading(database, clMain, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10050",
    receivedAt: "2026-09-01T01:00:05.000Z",
    retain: false,
    sourceTimestamp: "2026-09-01T00:30:00Z"
  }, { emitMeterReadingChange: (event) => events.push(event) });
  assert.equal(late.status, "accepted");
  assert.equal(readLiveState(database, clMain)?.live_value_kwh, "10100");
  assert.equal(countAcceptedReadings(database, clMain), 2);
  assert.deepEqual(events.map((event) => event.late), [false, true]);
  database.close();
});

test("E1 accepted/live mutation is atomic when live write fails", () => {
  const database = createDatabase();
  database.exec(`
    CREATE TRIGGER reject_meter_live_state
    BEFORE INSERT ON meter_live_state
    BEGIN
      SELECT RAISE(ABORT, 'live write rejected');
    END;
  `);
  assert.throws(() => ingestMeterReading(database, clMain, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10100",
    receivedAt: "2026-09-01T00:00:01.000Z",
    retain: false,
    sourceTimestamp: "2026-09-01T00:00:00Z"
  }));
  assert.equal(countAcceptedReadings(database, clMain), 0);
  database.close();
});

test("E1 mixed source and receive-time samples keep an older source event out of live state", () => {
  const database = createDatabase();
  const estimatedDefinition = { ...clMain, timestampPolicy: "allow-receive-time-estimate" as const };
  const events: MeterReadingChangeEvent[] = [];
  ingestMeterReading(database, estimatedDefinition, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10100",
    receivedAt: "2026-09-01T01:00:00.000Z",
    retain: false,
    sourceTimestamp: null
  }, { emitMeterReadingChange: (event) => events.push(event) });
  const lateSource = ingestMeterReading(database, estimatedDefinition, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10050",
    receivedAt: "2026-09-01T01:01:00.000Z",
    retain: false,
    sourceTimestamp: "2026-09-01T00:30:00Z"
  }, { emitMeterReadingChange: (event) => events.push(event) });
  assert.equal(lateSource.status, "accepted");
  assert.equal(lateSource.liveUpdated, false);
  assert.equal(readLiveState(database, estimatedDefinition)?.live_value_kwh, "10100");
  assert.deepEqual(events.map((event) => event.late), [false, true]);
  database.close();
});

test("E1 preserves selector and original timestamp evidence", () => {
  const database = createDatabase();
  ingestMeterReading(database, clMain, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10100",
    receivedAt: "2026-09-01T00:00:01.000Z",
    retain: false,
    sourceTimestamp: "2026-09-01T00:00:00+08:00",
    selectorVersion: 7,
    sourceTimestampPath: "observedAt"
  });
  assert.deepEqual(
    database.prepare(`
      SELECT selector_version, selector_timestamp_path, source_timestamp_raw, measurement_kind, source_timestamp, timestamp_quality
      FROM meter_readings_accepted
    `).get(),
    {
      selector_version: 7,
      selector_timestamp_path: "observedAt",
      source_timestamp_raw: "2026-09-01T00:00:00+08:00",
      measurement_kind: "cumulative-energy",
      source_timestamp: "2026-08-31T16:00:00Z",
      timestamp_quality: "source"
    }
  );
  database.close();
});

test("E1-R1-S04 saveMeterSource rejects accounting fields", () => {
  const database = createDatabase();
  assert.throws(
    () => saveMeterSource(database, { ...clMain, meterRole: "site-main" } as MeterSourceDefinition & { meterRole: string }),
    (error: Error & { fields?: string[] }) => error.fields?.includes("meterRole") === true
  );
  assert.deepEqual(
    database.prepare("SELECT COUNT(*) AS count FROM meter_sources").get() as { count: number },
    { count: 0 }
  );
  database.close();
});

test("E1-R4-S01 replacing a meter starts a new epoch instead of a negative delta", () => {
  const replacement = { ...clMain, meterId: "cl-main-2", epochId: "epoch-2", sourceRevision: 2 };
  assert.equal(physicalIdentityChanged(clMain, replacement), true);
  const database = createDatabase();
  seedAcceptedReading(database, clMain, "80000", "2026-08-31T16:00:00Z", "2026-08-31T16:00:01.000Z");
  seedAcceptedReading(database, replacement, "15", "2026-09-01T00:00:00Z", "2026-09-01T00:00:01.000Z");
  assert.equal(readLiveState(database, clMain)?.live_value_kwh, "80000");
  assert.equal(readLiveState(database, replacement)?.live_value_kwh, "15");
  database.close();
});

test("E1-R6 inventory marks unverified mappings needs-review without deleting them", () => {
  const database = createDatabase();
  database.prepare(`
    INSERT INTO topic_mappings (id, topic, metric_key, unit, value_path, enabled)
    VALUES (1, 'factory/cl/consumption', 'consumptionEnergy', 'kWh', '$.value', 1)
  `).run();
  const inventory = inventoryTopicMappings(database);
  assert.equal(inventory[0]?.preserved, true);
  assert.equal(inventory[0]?.reviewStatus, "needs-review");
  assert.equal(
    (database.prepare("SELECT COUNT(*) AS count FROM topic_mappings").get() as { count: number }).count,
    1
  );
  database.close();
});


// Accounting read-capacity fixture. The generator is seeded so every run builds
// the identical dataset; only the amount of unrelated history varies between
// the two sizes being compared.
const CAPACITY_SEED = 20260910;
const CAPACITY_OTHER_CHANNEL_ROWS = 1_000;
const CAPACITY_OTHER_SCOPE_ROWS = 1_000;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createCapacityDatabase() {
  const database = createDatabase();
  for (const name of ["048_meter_source_lifecycle", "049_meter_source_boundary_age"]) {
    database.exec(readFileSync(resolve(process.cwd(), `src/db/migrations/${name}.sql`), "utf8"));
  }
  return database;
}

/**
 * The requested evidence is a handful of `main` readings around September
 * 2026. Everything else is unrelated to that request: `history` older readings
 * on the same channel between 2019 and 2024, plus a fixed number of readings on
 * another channel and in another scope.
 */
function seedCapacityFixture(database: Database.Database, history: number) {
  const random = seededRandom(CAPACITY_SEED);
  const insert = database.prepare(`
    INSERT INTO meter_readings_accepted (
      reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id, raw_value_decimal,
      normalized_value_kwh, source_timestamp, received_at, timestamp_quality, origin, payload_hash, created_at
    ) VALUES (?, ?, ?, ?, 1, 'epoch-1', ?, ?, ?, ?, 'source', 'mqtt', ?, ?)
  `);
  const historyStartMs = Date.parse("2019-01-01T00:00:00Z");
  const historySpanMs = Date.parse("2024-12-31T00:00:00Z") - historyStartMs;
  const row = (id: string, scope: string, channel: string, value: number, instantMs: number) => {
    const instant = new Date(instantMs).toISOString();
    insert.run(id, scope, channel, channel, String(value), String(value), instant, instant, id, instant);
  };
  database.transaction(() => {
    for (let index = 0; index < history; index += 1) {
      row(`history-${index}`, "cl", "main", index, historyStartMs + Math.floor(random() * historySpanMs));
    }
    for (let index = 0; index < CAPACITY_OTHER_CHANNEL_ROWS; index += 1) {
      row(`other-channel-${index}`, "cl", "other", index, historyStartMs + Math.floor(random() * historySpanMs));
    }
    for (let index = 0; index < CAPACITY_OTHER_SCOPE_ROWS; index += 1) {
      row(`other-scope-${index}`, "kn", "main", index, historyStartMs + Math.floor(random() * historySpanMs));
    }
    row("requested-opening", "cl", "main", 1_000_000, Date.parse("2026-08-31T16:00:00Z"));
    row("requested-middle", "cl", "main", 1_000_050, Date.parse("2026-09-10T00:00:00Z"));
    row("requested-closing", "cl", "main", 1_000_075, Date.parse("2026-09-14T23:59:00Z"));
  })();
}

function recordAcceptedReadingQueries(database: Database.Database) {
  const statements: string[] = [];
  const prepare = database.prepare.bind(database);
  database.prepare = ((sql: string) => {
    if (sql.includes("meter_readings_accepted")) {
      statements.push(sql);
    }
    return prepare(sql);
  }) as typeof database.prepare;
  return statements;
}

test("the full-scope accepted loader materializes every unrelated reading of the site", () => {
  const measure = (history: number) => {
    const database = createCapacityDatabase();
    seedCapacityFixture(database, history);
    const statements = recordAcceptedReadingQueries(database);
    const rows = loadAcceptedMeterReadings(database, "cl");
    const queries = statements.length;
    const plan = (database.prepare(`EXPLAIN QUERY PLAN ${statements[0]}`).all("cl") as Array<{ detail: string }>)
      .map((step) => step.detail);
    database.close();
    return { plan, queries, rows: rows.length };
  };

  const small = measure(10_000);
  const large = measure(100_000);

  assert.equal(small.queries, 1);
  assert.equal(large.queries, 1);
  assert.equal(small.rows, 10_000 + CAPACITY_OTHER_CHANNEL_ROWS + 3);
  assert.equal(large.rows - small.rows, 90_000, "every additional unrelated reading is materialized");
  for (const plan of [small.plan, large.plan]) {
    const acceptedAccess = plan.filter((detail) => /\b(SCAN|SEARCH) a\b/.test(detail));
    assert.equal(acceptedAccess.length, 1, plan.join("\n"));
    assert.doesNotMatch(acceptedAccess[0]!, /channel_id|<expr>/, "the baseline read is bounded by scope only");
  }
});

type RawReading = {
  channel?: string;
  epoch?: string;
  id: string;
  meter?: string;
  quality?: string;
  received?: string;
  revision?: number;
  scope?: string;
  source: string | null;
};

function insertRawReading(database: Database.Database, reading: RawReading) {
  database.prepare(`
    INSERT INTO meter_readings_accepted (
      reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id, raw_value_decimal,
      normalized_value_kwh, source_timestamp, received_at, timestamp_quality, origin, payload_hash, created_at, measurement_kind
    ) VALUES (?, ?, ?, ?, ?, ?, '1', '1', ?, ?, ?, 'mqtt', ?, ?, 'cumulative-energy')
  `).run(
    reading.id,
    reading.scope ?? "kn",
    reading.meter ?? "kn-main",
    reading.channel ?? "kn-main",
    reading.revision ?? 1,
    reading.epoch ?? "epoch-1",
    reading.source,
    reading.received ?? reading.source ?? "2026-01-01T00:00:00Z",
    reading.quality ?? "source",
    reading.id,
    reading.received ?? reading.source ?? "2026-01-01T00:00:00Z"
  );
}

const WINDOW_FROM_MS = Date.parse("2026-08-31T16:00:00Z");
const WINDOW_THROUGH_MS = Date.parse("2026-09-15T00:00:00Z");

test("a window read keeps inclusive millisecond endpoints, offsets and every identity column", () => {
  const database = createCapacityDatabase();
  const iso = (ms: number) => new Date(ms).toISOString();
  insertRawReading(database, { id: "before-from", source: iso(WINDOW_FROM_MS - 1) });
  insertRawReading(database, { id: "at-from", source: iso(WINDOW_FROM_MS) });
  insertRawReading(database, { id: "at-from-offset", source: "2026-09-01T00:00:00+08:00", revision: 2, epoch: "epoch-2" });
  insertRawReading(database, { id: "estimated", source: null, quality: "receive-time-estimated", received: iso(WINDOW_FROM_MS + 5) });
  insertRawReading(database, { id: "at-through", source: iso(WINDOW_THROUGH_MS) });
  insertRawReading(database, { id: "after-through", source: iso(WINDOW_THROUGH_MS + 1) });
  insertRawReading(database, { id: "other-channel", channel: "kn-other", source: iso(WINDOW_FROM_MS) });
  insertRawReading(database, { id: "other-scope", scope: "cl", source: iso(WINDOW_FROM_MS) });

  const rows = loadAcceptedMeterReadingsInWindow(database, "kn", ["kn-main"], WINDOW_FROM_MS, WINDOW_THROUGH_MS);
  const expected = loadAcceptedMeterReadings(database, "kn")
    .filter((row) => ["at-from", "at-from-offset", "estimated", "at-through"].includes(row.reading_id));

  assert.deepStrictEqual(rows, expected, "same row shape and identity columns as the full-scope loader");
  database.close();
});

test("the latest instant before a bound honours ties, identity and calculation eligibility", () => {
  const database = createCapacityDatabase();
  insertRawReading(database, { id: "a-old", source: "2026-08-01T00:00:00Z" });
  insertRawReading(database, { id: "a-tie-1", source: "2026-08-20T00:00:00Z" });
  insertRawReading(database, { id: "a-tie-2", source: "2026-08-20T00:00:00.000+00:00" });
  insertRawReading(database, { id: "b-newer", revision: 2, epoch: "epoch-2", source: "2026-08-25T00:00:00Z" });
  insertRawReading(database, { id: "unsourced", source: null, quality: "source", received: "2026-08-28T00:00:00Z" });
  insertRawReading(database, { id: "after-bound", source: "2026-09-02T00:00:00Z" });
  const bound = Date.parse("2026-09-01T00:00:00Z");
  const identityA = { epochId: "epoch-1", meterId: "kn-main", sourceRevision: 1 };

  assert.equal(findLatestAcceptedInstantMs(database, "kn", "kn-main", bound, { calculationEligible: false }), Date.parse("2026-08-28T00:00:00Z"));
  assert.equal(findLatestAcceptedInstantMs(database, "kn", "kn-main", bound, { calculationEligible: true }), Date.parse("2026-08-25T00:00:00Z"));
  assert.equal(findLatestAcceptedInstantMs(database, "kn", "kn-main", bound, { calculationEligible: true, identity: identityA }), Date.parse("2026-08-20T00:00:00Z"));
  assert.equal(findLatestAcceptedInstantMs(database, "kn", "kn-main", Date.parse("2026-07-01T00:00:00Z"), { calculationEligible: true }), null);
  // The identity read is keyed on the evidence instant alone; it applies no calculation eligibility.
  assert.deepStrictEqual(
    loadAcceptedMeterReadingsForIdentityWindow(database, "kn", "kn-main", identityA, Date.parse("2026-08-20T00:00:00Z"), Date.parse("2026-08-21T00:00:00Z"))
      .map((row) => row.reading_id).sort(),
    ["a-tie-1", "a-tie-2"]
  );
  assert.ok(
    loadAcceptedMeterReadingsForIdentityWindow(database, "kn", "kn-main", identityA, Date.parse("2026-08-20T00:00:00Z"), bound)
      .some((row) => row.reading_id === "unsourced")
  );
  database.close();
});

test("identities tied at one instant are exactly the calculation-eligible identities at that instant", () => {
  const database = createCapacityDatabase();
  const tieMs = Date.parse("2026-08-31T15:58:00Z");
  insertRawReading(database, { id: "a-source", source: "2026-08-31T15:58:00Z" });
  insertRawReading(database, { id: "a-offset-duplicate", source: "2026-08-31T23:58:00+08:00" });
  insertRawReading(database, { id: "b-estimated", revision: 2, epoch: "epoch-2", source: null, quality: "receive-time-estimated", received: "2026-08-31T15:58:00Z" });
  insertRawReading(database, { id: "c-unplaceable", revision: 3, epoch: "epoch-3", source: null, quality: "source", received: "2026-08-31T15:58:00Z" });
  insertRawReading(database, { id: "d-replacement", meter: "kn-main-2", revision: 4, epoch: "epoch-4", source: "2026-08-31T15:58:00.000Z" });
  insertRawReading(database, { id: "e-one-ms-earlier", revision: 5, epoch: "epoch-5", source: "2026-08-31T15:57:59.999Z" });
  insertRawReading(database, { id: "f-in-span", revision: 6, epoch: "epoch-6", source: "2026-08-31T16:00:00Z" });
  insertRawReading(database, { id: "other-channel", channel: "kn-other", source: "2026-08-31T15:58:00Z" });
  insertRawReading(database, { id: "other-scope", scope: "cl", source: "2026-08-31T15:58:00Z" });

  // The newest calculation-eligible instant strictly before a span opening at 16:00.
  assert.equal(
    findLatestAcceptedInstantMs(database, "kn", "kn-main", Date.parse("2026-08-31T16:00:00Z") - 1, { calculationEligible: true }),
    tieMs
  );
  assert.deepStrictEqual(listCalculationEligibleIdentitiesAt(database, "kn", "kn-main", tieMs), [
    { epochId: "epoch-1", meterId: "kn-main", sourceRevision: 1 },
    { epochId: "epoch-2", meterId: "kn-main", sourceRevision: 2 },
    { epochId: "epoch-4", meterId: "kn-main-2", sourceRevision: 4 }
  ], "every eligible tie once, offsets included; an unplaceable reading at the same receive time is not a tie");
  assert.deepStrictEqual(listCalculationEligibleIdentitiesAt(database, "kn", "kn-main", tieMs - 1), [
    { epochId: "epoch-5", meterId: "kn-main", sourceRevision: 5 }
  ]);
  assert.deepStrictEqual(listCalculationEligibleIdentitiesAt(database, "kn", "kn-main", Date.parse("2026-08-01T00:00:00Z")), []);
  database.close();
});

test("identity listing enumerates every identity of a channel once, retired ones included", () => {
  const database = createCapacityDatabase();
  insertRawReading(database, { id: "retired", revision: 0, epoch: "epoch-0", source: "2024-01-01T00:00:00Z" });
  insertRawReading(database, { id: "current-1", source: "2026-09-01T00:00:00Z" });
  insertRawReading(database, { id: "current-2", source: "2026-09-02T00:00:00Z" });
  insertRawReading(database, { id: "replacement", meter: "kn-main-2", revision: 2, epoch: "epoch-2", source: "2026-09-03T00:00:00Z" });
  insertRawReading(database, { id: "elsewhere", channel: "kn-other", source: "2026-09-03T00:00:00Z" });

  assert.deepStrictEqual(listAcceptedReadingIdentities(database, "kn", "kn-main"), [
    { epochId: "epoch-0", meterId: "kn-main", sourceRevision: 0 },
    { epochId: "epoch-1", meterId: "kn-main", sourceRevision: 1 },
    { epochId: "epoch-2", meterId: "kn-main-2", sourceRevision: 2 }
  ]);
  database.close();
});

test("the bounded projection fingerprint equals the original row set across revisions, endpoints and prior ties", () => {
  const database = createCapacityDatabase();
  const iso = (ms: number) => new Date(ms).toISOString();
  const history = database.transaction(() => {
    for (let index = 0; index < 400; index += 1) {
      insertRawReading(database, { id: `history-${String(index).padStart(3, "0")}`, source: iso(Date.parse("2025-01-01T00:00:00Z") + index * 3_600_000) });
    }
  });
  history();
  insertRawReading(database, { id: "retired-last", revision: 0, epoch: "epoch-0", source: "2024-06-01T00:00:00Z" });
  insertRawReading(database, { id: "a-prior-10d", source: iso(WINDOW_FROM_MS - 10 * 86_400_000) });
  insertRawReading(database, { id: "a-tie-2", source: iso(WINDOW_FROM_MS - 3_600_000) });
  insertRawReading(database, { id: "a-tie-1", source: iso(WINDOW_FROM_MS - 3_600_000) });
  insertRawReading(database, { id: "b-prior", revision: 2, epoch: "epoch-2", source: iso(WINDOW_FROM_MS - 2 * 86_400_000) });
  insertRawReading(database, { id: "a-at-start", source: iso(WINDOW_FROM_MS) });
  insertRawReading(database, { id: "b-inside", revision: 2, epoch: "epoch-2", source: iso(WINDOW_FROM_MS + 86_400_000) });
  insertRawReading(database, { id: "estimated-inside", source: null, quality: "receive-time-estimated", received: iso(WINDOW_FROM_MS + 2 * 86_400_000) });
  insertRawReading(database, { id: "a-at-through", source: iso(WINDOW_THROUGH_MS) });
  insertRawReading(database, { id: "a-after-through", source: iso(WINDOW_THROUGH_MS + 1) });
  insertRawReading(database, { id: "other-channel", channel: "kn-other", source: iso(WINDOW_FROM_MS - 3_600_000) });
  insertRawReading(database, { id: "other-scope", scope: "cl", source: iso(WINDOW_FROM_MS - 3_600_000) });
  const result: PeriodConsumptionResult = {
    calculatedThrough: iso(WINDOW_THROUGH_MS),
    meterIds: ["kn-main"],
    periodEnd: "2026-09-30T16:00:00.000Z",
    periodStart: iso(WINDOW_FROM_MS),
    profileRevision: 1,
    quality: "exact",
    siteTimeZone: "Asia/Taipei",
    valueKwh: "1"
  };

  const selection = selectProjectionFingerprintEvidence(database, "kn", result);
  const original = filterProjectionFingerprintRows("kn", loadAcceptedMeterReadings(database, "kn"), result);

  assert.deepStrictEqual(selection.rows, original);
  assert.deepEqual(original.map((row) => row.reading_id), [
    "a-at-start", "a-at-through", "a-tie-1", "b-inside", "b-prior", "estimated-inside", "retired-last"
  ]);
  assert.equal(selection.fullLoad, false);
  assert.ok(selection.materializedRowCount < 50, `materialized ${selection.materializedRowCount} rows`);
  database.close();
});

test("a fingerprint without projection metadata keeps the explicit full-scope semantics", () => {
  const database = createCapacityDatabase();
  insertRawReading(database, { id: "one", source: "2026-09-01T00:00:00Z" });
  insertRawReading(database, { id: "two", channel: "kn-other", source: "2026-09-02T00:00:00Z" });
  const bare: PeriodConsumptionResult = { profileRevision: 1, quality: "exact", siteTimeZone: "Asia/Taipei", valueKwh: "1" };

  assert.deepStrictEqual(selectProjectionFingerprintEvidence(database, "kn", bare).rows, loadAcceptedMeterReadings(database, "kn"));
  assert.deepStrictEqual(selectProjectionFingerprintEvidence(database, "kn").rows, loadAcceptedMeterReadings(database, "kn"));
  database.close();
});

test("E1 quarantines negative consumption readings before accepted state or events", () => {
  const database = createDatabase();
  let events = 0;
  const result = ingestMeterReading(database, clMain, { dup: false, origin: "mqtt", qos: 1, rawValueDecimal: "-1",
    receivedAt: "2026-09-01T00:00:01Z", retain: false, sourceTimestamp: "2026-09-01T00:00:00Z" },
    { emitMeterReadingChange: () => { events += 1; } });
  assert.equal(result.status, "quarantined");
  assert.equal(result.reason, "NEGATIVE_CONSUMPTION_READING");
  assert.equal(countAcceptedReadings(database, clMain), 0);
  assert.equal(readLiveState(database, clMain), null);
  assert.equal(events, 0);
  database.close();
});
