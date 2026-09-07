import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { compileSelector, type MeterSourceDefinition } from "@solar-display/shared";
import { countAcceptedReadings } from "./meterReadingService.js";
import { saveMeterSource } from "./meterSourceCatalogService.js";
import { ingestMappedMeterReading, lookupEnabledMeterSource } from "./mqttMeterIngest.js";
import { applyGuidedMapping, previewGuidedMapping } from "./guidedMqttMappingService.js";

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/040_meter_reading_contracts.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/048_meter_source_lifecycle.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/049_meter_source_boundary_age.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/046_meter_reading_evidence.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/043_energy_authoring_tokens.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/044_mapping_apply_receipts.sql"), "utf8"));
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

test("M2 source lookup preserves the configured boundary age", () => {
  const database = createDatabase();
  saveMeterSource(database, { ...knMain, boundaryMaxAgeSeconds: 720 });
  assert.equal(lookupEnabledMeterSource(database, "kn", "consumptionEnergy")?.boundaryMaxAgeSeconds, 720);
  database.close();
});

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

test("M2 apply persists selector then tagged MAIN ingest updates only that meter", () => {
  const database = createDatabase();
  try {
    database.exec("ALTER TABLE topic_mappings ADD COLUMN metric_scope TEXT");
  } catch {
    // already present
  }
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/042_consumption_projections.sql"), "utf8"));
  const draft = {
    channelId: "kn-main",
    energyFlowRole: "consumption" as const,
    measurementKind: "cumulative-energy" as const,
    metricScope: "kn" as const,
    selector: compileSelector("value", "MAIN"),
    source: knMain,
    topic: "factory/kn/main",
    timestampPolicy: "source-required" as const
  };
  const preview = previewGuidedMapping(database, draft);
  const storedToken = database.prepare("SELECT canonical_draft_json FROM mapping_preview_tokens WHERE preview_token = ?").get(preview.previewToken) as { canonical_draft_json: string };
  assert.equal(JSON.parse(storedToken.canonical_draft_json).channelId, "kn-main");
  applyGuidedMapping(database, {
    canonicalDraft: draft,
    idempotencyKey: "m2-tag",
    meterId: "kn-main",
    previewToken: preview.previewToken,
    source: knMain
  });
  const mapping = database.prepare("SELECT value_path, selector_json FROM topic_mappings WHERE metric_key = ?").get("consumptionEnergy") as { selector_json: string; value_path: string };
  assert.match(mapping.selector_json, /MAIN/);
  const accepted = ingestMappedMeterReading(
    database,
    { metric_key: "consumptionEnergy", metric_scope: "kn", selector_json: mapping.selector_json, value_path: mapping.value_path },
    JSON.stringify({ tag: "MAIN", timestamp: "2026-08-31T16:00:00Z", value: "10000.125" }),
    { dup: false, qos: 1, retain: false },
    "2026-08-31T16:00:01.000Z"
  );
  assert.equal(accepted?.status, "accepted");
  const ignored = ingestMappedMeterReading(
    database,
    { metric_key: "consumptionEnergy", metric_scope: "kn", selector_json: mapping.selector_json, value_path: mapping.value_path },
    JSON.stringify({ tag: "STAMP", timestamp: "2026-08-31T16:01:00Z", value: "99999" }),
    { dup: false, qos: 1, retain: false },
    "2026-08-31T16:01:01.000Z"
  );
  assert.equal(ignored?.status, "quarantined");
  assert.equal(countAcceptedReadings(database, knMain), 1);
});

test("E1 preserves selected record timestamp path and selector version", () => {
  const database = createDatabase();
  saveMeterSource(database, knMain);
  const selected = ingestMappedMeterReading(
    database,
    {
      metric_key: "consumptionEnergy",
      metric_scope: "kn",
      value_path: "value",
      selector_json: JSON.stringify({
        path: ["value"],
        tagEquals: "MAIN",
        selectorVersion: 7,
        timestampPath: ["observedAt"]
      })
    },
    JSON.stringify({ tag: "MAIN", value: "10000.125", observedAt: "2026-08-31T16:00:00Z" }),
    { dup: false, qos: 1, retain: true },
    "2026-09-01T00:00:01.000Z"
  );
  assert.equal(selected?.status, "accepted");
  assert.equal(selected?.selectorVersion, 7);
  assert.equal(selected?.sourceTimestampPath, "observedAt");
  assert.equal(selected?.sourceTimestampRaw, "2026-08-31T16:00:00Z");
  assert.equal(selected?.sourceTimestamp, "2026-08-31T16:00:00Z");
  assert.deepEqual(
    database.prepare(`
      SELECT selector_version, selector_timestamp_path, source_timestamp_raw,
        retain, dup, qos, received_at
      FROM meter_readings_accepted
    `).get(),
    {
      selector_version: 7,
      selector_timestamp_path: "observedAt",
      source_timestamp_raw: "2026-08-31T16:00:00Z",
      retain: 1,
      dup: 0,
      qos: 1,
      received_at: "2026-09-01T00:00:01.000Z"
    }
  );
  database.close();
});

test("E1 rejects a malformed reviewed selector instead of falling through to value_path", () => {
  const database = createDatabase();
  saveMeterSource(database, knMain);
  const rejected = ingestMappedMeterReading(
    database,
    {
      metric_key: "consumptionEnergy",
      metric_scope: "kn",
      value_path: "value",
      selector_json: "{malformed"
    },
    JSON.stringify({ value: "10000", timestamp: "2026-09-01T00:00:00Z" }),
    { dup: false, qos: 1, retain: false },
    "2026-09-01T00:00:01.000Z"
  );
  assert.equal(rejected?.status, "quarantined");
  assert.equal(rejected?.reason, "SELECTOR_INVALID");
  assert.equal(countAcceptedReadings(database, knMain), 0);
  database.close();
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

test("M2 preserves numeric JSON decimal lexemes before E1 normalization", () => {
  const database = createDatabase();
  saveMeterSource(database, knMain);
  for (const [index, value] of ["10000.125", "9007199254740992.000", "9007199254740992.125"].entries()) {
    const result = ingestMappedMeterReading(database,
      { metric_key: "consumptionEnergy", metric_scope: "kn", value_path: "measurements.value" },
      `{"measurements":{"value":${value}},"timestamp":"2026-09-01T00:00:0${index}Z"}`,
      { dup: false, qos: 1, retain: false });
    assert.equal(result?.status, "accepted");
  }
  const rows = database.prepare("SELECT raw_value_decimal, normalized_value_kwh FROM meter_readings_accepted ORDER BY source_timestamp").all();
  assert.deepEqual(rows, [
    { raw_value_decimal: "10000.125", normalized_value_kwh: "10000.125" },
    { raw_value_decimal: "9007199254740992.000", normalized_value_kwh: "9007199254740992" },
    { raw_value_decimal: "9007199254740992.125", normalized_value_kwh: "9007199254740992.125" }
  ]);
  database.close();
});


test("E1 an explicit tagged selector cannot borrow a timestamp from another record or accept a raw scalar", () => {
  const database = createDatabase();
  saveMeterSource(database, knMain);
  const mapping = { metric_key: "consumptionEnergy", metric_scope: "kn", value_path: "value",
    selector_json: JSON.stringify({ path: ["value"], tagEquals: "MAIN", timestampPath: ["0", "timestamp"], selectorVersion: 2 }) };
  const packet = { dup: false, qos: 1, retain: false };
  const wrongTime = ingestMappedMeterReading(database, mapping, JSON.stringify([
    { tag: "OTHER", timestamp: "2026-09-01T00:00:00Z", value: "10" }, { tag: "MAIN", value: "100" }
  ]), packet);
  assert.equal(wrongTime?.status, "quarantined");
  assert.equal(ingestMappedMeterReading(database, mapping, "123", packet)?.status, "quarantined");
  assert.equal(countAcceptedReadings(database, knMain), 0);
  database.exec("DROP TABLE meter_sources");
  assert.throws(() => ingestMappedMeterReading(database, mapping, "123", packet), /meter_sources/);
  database.close();
});


test("disabled registered meters never fall through to legacy ingestion", () => {
  const database = createDatabase();
  saveMeterSource(database, { ...knMain, enabled: false });
  const result = ingestMappedMeterReading(database,
    { metric_key: "consumptionEnergy", metric_scope: "kn", value_path: "value" },
    '{"value":"100","timestamp":"2026-09-01T00:00:00Z"}', { dup: false, qos: 1, retain: false });
  assert.equal(result?.reason, "SOURCE_NOT_ACTIVE");
  assert.equal(result?.liveUpdated, false);
  assert.equal(countAcceptedReadings(database, knMain), 0);
  database.close();
});
