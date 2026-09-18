import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type {
  MeterSourceDefinition,
  SiteEnergyProfileV1,
  SiteEnergyProfileV2
} from "@solar-display/shared";
import {
  captureProfileProviderSnapshot,
  captureProfileSourceSnapshot
} from "./profileSourceSnapshot.js";
import { previewEngineeringSource, applyEngineeringSource } from "./engineeringSourceService.js";
import { saveMeterSource } from "./meterSourceCatalogService.js";

function createDatabase(migrations: string[]) {
  const database = new Database(":memory:");
  for (const migration of migrations) {
    database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations", migration), "utf8"));
  }
  return database;
}

const physicalSource: MeterSourceDefinition = {
  channelId: "kn-main",
  enabled: true,
  energyFlowRole: "consumption",
  epochId: "epoch-1",
  expectedCadenceSeconds: 60,
  inputUnit: "kWh",
  measurementKind: "cumulative-energy",
  meterId: "meter-1",
  metricKey: "consumptionEnergy",
  metricScope: "kn",
  reviewStatus: "reviewed",
  scaleDecimal: "1",
  sourceRevision: 1,
  sourceTimestampTimeZone: "UTC",
  timestampPolicy: "source-required"
};

const physicalProfile: SiteEnergyProfileV1 = {
  departments: [],
  effectiveFrom: "2026-09-16T00:00:00Z",
  metricScope: "kn",
  profileId: "kn-v1",
  revision: 3,
  schemaVersion: 1,
  shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei",
  siteTotal: {
    coverageReview: "reviewed",
    kind: "meter-set",
    label: "KN",
    memberChannelIds: ["kn-main"]
  },
  status: "ready"
};

function registerEngineeringSource(database: Database.Database) {
  const preview = previewEngineeringSource({
    sourceRef: "kn-eng-painting-energy",
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "painting",
    purpose: "energy",
    mode: "daily-report",
    exactTopic: "factory/guanyin/energy/daily/painting",
    approvedPublisherId: "publisher-a",
    definitionRevision: 4,
    calendarRevision: 6,
    reviewStatus: "approved",
    unit: "kWh",
    enabled: true
  });
  return applyEngineeringSource(database, {
    previewToken: preview.previewToken,
    expectedRevision: 0,
    draft: preview.canonicalDraft
  }).source;
}

const engineeringProfile: SiteEnergyProfileV2 = {
  departments: [],
  effectiveFrom: "2026-09-16T00:00:00Z",
  metricScope: "kn",
  profileId: "kn-v2",
  providerKind: "engineering",
  revision: 7,
  schemaVersion: 2,
  shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei",
  siteTotal: {
    coverageReview: "reviewed",
    kind: "member-set",
    label: "KN 工程總量",
    members: [{
      kind: "engineering",
      sourceRef: "kn-eng-painting-energy",
      engineeringId: "painting",
      mode: "daily-report"
    }]
  },
  status: "ready"
};

test("physical profile source snapshots retain the existing canonical shape", () => {
  const database = createDatabase([
    "001_init.sql",
    "040_meter_reading_contracts.sql",
    "046_meter_reading_evidence.sql",
    "048_meter_source_lifecycle.sql",
    "049_meter_source_boundary_age.sql"
  ]);
  saveMeterSource(database, physicalSource);

  const sources = captureProfileSourceSnapshot(database, physicalProfile);
  assert.deepEqual(sources, [{
    ...physicalSource,
    boundaryMaxAgeSeconds: 300
  }]);
  assert.deepEqual(captureProfileProviderSnapshot(database, physicalProfile), {
    providerKind: "physical",
    sources
  });
  database.close();
});

test("engineering provider snapshots retain registration authority and fail closed", () => {
  const database = createDatabase(["054_engineering_sources_and_reports.sql"]);
  const source = registerEngineeringSource(database);

  assert.deepEqual(captureProfileProviderSnapshot(database, engineeringProfile), {
    providerKind: "engineering",
    members: [{
      sourceRef: source.sourceRef,
      engineeringId: source.engineeringId,
      mode: source.mode,
      configurationRevision: source.configurationRevision,
      definitionRevision: source.definitionRevision,
      calendarRevision: source.calendarRevision,
      approvedPublisherId: source.approvedPublisherId,
      enabled: source.enabled,
      reviewStatus: source.reviewStatus
    }]
  });

  const disabled = previewEngineeringSource({
    ...source,
    enabled: false,
    configurationRevision: undefined
  });
  applyEngineeringSource(database, {
    previewToken: disabled.previewToken,
    expectedRevision: source.configurationRevision,
    draft: disabled.canonicalDraft
  });

  assert.throws(
    () => captureProfileProviderSnapshot(database, engineeringProfile),
    (error: unknown) => (error as { code?: string }).code === "PROFILE_ENGINEERING_SOURCE_UNAVAILABLE"
  );
  database.close();
});
