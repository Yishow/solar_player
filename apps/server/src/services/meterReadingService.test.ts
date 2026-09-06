import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { physicalIdentityChanged } from "@solar-display/shared";
import { countAcceptedReadings, ingestMeterReading, readLiveState, seedAcceptedReading } from "./meterReadingService.js";
import { inventoryTopicMappings, saveMeterSource } from "./meterSourceCatalogService.js";

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/040_meter_reading_contracts.sql"), "utf8"));
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
  ingestMeterReading(database, clMain, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10100",
    receivedAt: "2026-09-01T01:00:00.000Z",
    retain: false,
    sourceTimestamp: "2026-09-01T01:00:00Z"
  });
  const late = ingestMeterReading(database, clMain, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10050",
    receivedAt: "2026-09-01T01:00:05.000Z",
    retain: false,
    sourceTimestamp: "2026-09-01T00:30:00Z"
  });
  assert.equal(late.status, "accepted");
  assert.equal(readLiveState(database, clMain)?.live_value_kwh, "10100");
  assert.equal(countAcceptedReadings(database, clMain), 2);
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
