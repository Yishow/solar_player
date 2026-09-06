import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { countAcceptedReadings } from "./meterReadingService.js";
import { saveMeterSource } from "./meterSourceCatalogService.js";
import { ingestMappedMeterReading } from "./mqttMeterIngest.js";

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/040_meter_reading_contracts.sql"), "utf8"));
  return database;
}

const knMain: MeterSourceDefinition = {
  channelId: "kn-main",
  enabled: true,
  energyFlowRole: "consumption",
  epochId: "epoch-1",
  expectedCadenceSeconds: 60,
  inputUnit: "kWh",
  measurementKind: "cumulative-energy",
  meterId: "kn-main",
  metricKey: "consumptionEnergy",
  metricScope: "kn",
  reviewStatus: "reviewed",
  scaleDecimal: "1",
  sourceRevision: 1,
  sourceTimestampTimeZone: "UTC",
  timestampPolicy: "source-required"
};

test("E1-R7 production MQTT callback uses M2 extractor then E1 admission", () => {
  const database = createDatabase();
  saveMeterSource(database, knMain);
  const accepted = ingestMappedMeterReading(
    database,
    { metric_key: "consumptionEnergy", metric_scope: "kn", value_path: "$.value" },
    JSON.stringify({ tag: "MAIN", value: "10000.125", timestamp: "2026-08-31T16:00:00Z" }),
    { dup: false, qos: 1, retain: false },
    "2026-08-31T16:00:01.000Z"
  );
  assert.equal(accepted?.status, "accepted");
  assert.equal(countAcceptedReadings(database, knMain), 1);
});

test("E1-R7 catalog-like retained packet without source time does not write accepted history", () => {
  const database = createDatabase();
  saveMeterSource(database, knMain);
  const rejected = ingestMappedMeterReading(
    database,
    { metric_key: "consumptionEnergy", metric_scope: "kn", value_path: "$.value" },
    JSON.stringify({ value: "10000" }),
    { dup: false, qos: 1, retain: true },
    "2026-08-31T16:00:01.000Z"
  );
  assert.equal(rejected?.status, "quarantined");
  assert.equal(countAcceptedReadings(database, knMain), 0);
});
