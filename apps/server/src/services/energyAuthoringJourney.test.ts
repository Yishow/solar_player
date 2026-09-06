import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterSourceDefinition, SiteEnergyProfileV1 } from "@solar-display/shared";
import { unifyPublishPreflight } from "@solar-display/shared";
import { saveMeterSource } from "./meterSourceCatalogService.js";
import { ingestMappedMeterReading } from "./mqttMeterIngest.js";
import { applyProfile, previewProfile } from "./siteEnergyProfileService.js";
import { resolvePersistedPeriodConsumption } from "./periodConsumptionService.js";
import { resolvePersistedDepartmentShares } from "./departmentSharesService.js";
import { activateProjection, rollbackProjection, shadowProject } from "./consumptionProjectionService.js";

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/040_meter_reading_contracts.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/041_site_energy_profiles.sql"), "utf8"));
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

const draft: SiteEnergyProfileV1 = {
  departments: [
    { accountingIncluded: true, coverageReview: "reviewed", departmentId: "a", memberChannelIds: ["a"], nameZh: "A" }
  ],
  effectiveFrom: "2026-09-01T00:00:00+08:00",
  metricScope: "kn",
  profileId: "kn-energy",
  revision: 0,
  schemaVersion: 1,
  shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei",
  siteTotal: {
    coverageReview: "reviewed",
    kind: "meter-set",
    label: "觀音總錶",
    memberChannelIds: ["kn-main"]
  },
  status: "ready"
};

test("Q1 isolated KN fixture flows ingest → period 300 → share 0.5 and blocks unsaved publish", () => {
  const database = createDatabase();
  saveMeterSource(database, knMain);
  ingestMappedMeterReading(
    database,
    { metric_key: "consumptionEnergy", metric_scope: "kn", value_path: "$.value" },
    JSON.stringify({ value: "10000", timestamp: "2026-09-01T00:00:00+08:00" }),
    { dup: false, qos: 1, retain: false },
    "2026-09-01T00:00:01.000Z"
  );
  ingestMappedMeterReading(
    database,
    { metric_key: "consumptionEnergy", metric_scope: "kn", value_path: "$.value" },
    JSON.stringify({ value: "10300", timestamp: "2026-09-01T23:59:00+08:00" }),
    { dup: false, qos: 1, retain: false },
    "2026-09-01T16:00:01.000Z"
  );
  const preview = previewProfile(database, "kn", {
    draft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  applyProfile(database, "kn", {
    draft,
    expectedRevision: 0,
    idempotencyKey: "q1",
    previewToken: preview.previewToken
  });
  const period = resolvePersistedPeriodConsumption(database, "kn", {
    day: 1,
    kind: "day",
    month: 9,
    year: 2026
  }, "2026-09-01T16:00:00Z");
  assert.equal(period.valueKwh, "300");
  const shadow = shadowProject(period, "kn", "day");
  activateProjection(shadow);
  assert.equal(rollbackProjection("kn", "day"), null);
  database.exec(`
    INSERT INTO meter_readings_accepted (
      reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id,
      raw_value_decimal, normalized_value_kwh, source_timestamp, received_at,
      timestamp_quality, origin, retain, dup, qos, payload_hash, created_at
    ) VALUES
      ('a-start', 'kn', 'a', 'a', 1, 'epoch-1', '0', '0', '2026-09-01T00:00:00+08:00', '2026-09-01T00:00:01.000Z', 'source', 'mqtt', 0, 0, 1, 'a-start', '2026-09-01T00:00:01.000Z'),
      ('a-end', 'kn', 'a', 'a', 1, 'epoch-1', '150', '150', '2026-09-01T23:59:00+08:00', '2026-09-01T16:00:01.000Z', 'source', 'mqtt', 0, 0, 1, 'a-end', '2026-09-01T16:00:01.000Z')
  `);
  const shares = resolvePersistedDepartmentShares(database, "kn", {
    day: 1,
    kind: "day",
    month: 9,
    year: 2026
  }, "2026-09-01T16:00:00Z");
  assert.equal(shares?.shares[0]?.ratio, 0.5);
  const preflight = unifyPublishPreflight({
    bindingErrors: [],
    energyProfileReady: true,
    unsavedBindings: true
  });
  assert.equal(preflight.canPublish, false);
  database.close();
});
