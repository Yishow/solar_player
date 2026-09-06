import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { reassignmentDoesNotTouchSource, type SiteEnergyProfileV1 } from "@solar-display/shared";
import { applyProfile, getActiveProfile, previewProfile } from "./siteEnergyProfileService.js";
import { readLiveState, seedAcceptedReading } from "./meterReadingService.js";
import type { MeterSourceDefinition } from "@solar-display/shared";

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/040_meter_reading_contracts.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/041_site_energy_profiles.sql"), "utf8"));
  return database;
}

const draft: SiteEnergyProfileV1 = {
  departments: [],
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

const source: MeterSourceDefinition = {
  channelId: "main",
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
  sourceRevision: 2,
  sourceTimestampTimeZone: "UTC",
  timestampPolicy: "source-required"
};

test("E6 apply creates a new profile revision without touching E1 source state", () => {
  const database = createDatabase();
  seedAcceptedReading(database, source, "10100", "2026-08-31T16:00:00Z", "2026-08-31T16:00:01.000Z");
  const before = readLiveState(database, source);
  const preview = previewProfile(database, "kn", {
    draft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  const applied = applyProfile(database, "kn", {
    draft,
    expectedRevision: 0,
    idempotencyKey: "k1",
    previewToken: preview.previewToken
  });
  assert.equal(applied.revision, 1);
  assert.equal(getActiveProfile(database, "kn")?.siteTimeZone, "Asia/Taipei");
  const after = readLiveState(database, source);
  assert.deepEqual(after, before);
  assert.equal(reassignmentDoesNotTouchSource(
    { baseline: before?.baseline_kwh ?? "", epochId: source.epochId, sourceRevision: source.sourceRevision },
    { baseline: after?.baseline_kwh ?? "", epochId: source.epochId, sourceRevision: source.sourceRevision }
  ), true);
  database.close();
});

test("E6 preview rejects caller timezone override", () => {
  const database = createDatabase();
  assert.throws(
    () => previewProfile(database, "kn", {
      draft,
      expectedRevision: 0,
      periodSelection: { kind: "month", month: 9, year: 2026 },
      timeZone: "UTC"
    } as never),
    /CALENDAR_OVERRIDE_REJECTED|期間邊界/
  );
  database.close();
});
