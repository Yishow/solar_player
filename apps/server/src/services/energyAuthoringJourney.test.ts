import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import {
  compileSelector,

  previewUnsavedBinding,
  type MeterSourceDefinition,
  type SiteEnergyProfileV1,
  unifyPublishPreflight
} from "@solar-display/shared";
import { saveMeterSource } from "./meterSourceCatalogService.js";
import { ingestMappedMeterReading } from "./mqttMeterIngest.js";
import { applyProfile, previewProfile } from "./siteEnergyProfileService.js";
import { resolvePersistedPeriodConsumption } from "./periodConsumptionService.js";
import { resolvePersistedDepartmentShares } from "./departmentSharesService.js";
import {
  acceptedSampleChecksum,
  activateProjection,
  readActiveProjection,
  rollbackProjection,
  shadowProject
} from "./consumptionProjectionService.js";
import { applyGuidedMapping, previewGuidedMapping } from "./guidedMqttMappingService.js";

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/033_freshness_policy.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8"));
  try {
    database.exec("ALTER TABLE topic_mappings ADD COLUMN metric_scope TEXT");
  } catch {
    // Column may already exist on some init paths.
  }
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/040_meter_reading_contracts.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/049_meter_source_boundary_age.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/048_meter_source_lifecycle.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/046_meter_reading_evidence.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/041_site_energy_profiles.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/045_profile_apply_guards.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/050_profile_source_review.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/051_profile_preview_evidence.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/042_consumption_projections.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/047_projection_activation_context.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/043_energy_authoring_tokens.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/044_mapping_apply_receipts.sql"), "utf8"));
  return database;
}

function meter(scope: "cl" | "kn", meterId: string, channelId = meterId): MeterSourceDefinition {
  return {
    channelId,
    enabled: true,
    energyFlowRole: "consumption",
    epochId: "epoch-1",
    expectedCadenceSeconds: 60,
    inputUnit: "kWh",
    measurementKind: "cumulative-energy",
    meterId,
    metricKey: channelId === `${scope}-main` ? "consumptionEnergy" : channelId,
    metricScope: scope,
    reviewStatus: "reviewed",
    scaleDecimal: "1",
    sourceRevision: 1,
    sourceTimestampTimeZone: "UTC",
    timestampPolicy: "source-required"
  };
}

function ingest(database: Database.Database, definition: MeterSourceDefinition, value: string, timestamp: string) {
  return ingestMappedMeterReading(
    database,
    {
      metric_key: definition.metricKey,
      metric_scope: definition.metricScope,
      selector_json: JSON.stringify(compileSelector("value")),
      value_path: "value"
    },
    JSON.stringify({ timestamp, value }),
    { dup: false, qos: 1, retain: false },
    `${timestamp.replace(/\+08:00$/, "Z")}`
  );
}

function profileFor(scope: "cl" | "kn", members: string[], departments: SiteEnergyProfileV1["departments"]): SiteEnergyProfileV1 {
  return {
    departments,
    effectiveFrom: "2026-01-01T00:00:00+08:00",
    metricScope: scope,
    profileId: `${scope}-energy`,
    revision: 0,
    schemaVersion: 1,
    shareBasis: { kind: "site-main" },
    siteTimeZone: "Asia/Taipei",
    siteTotal: {
      coverageReview: "reviewed",
      kind: "meter-set",
      label: scope,
      memberChannelIds: members
    },
    status: "ready"
  };
}

test("Q1 CL+KN ingest→E2→E3→shares isolate 300/4300/8300 and 50/30/20", () => {
  const database = createDatabase();
  const knMain = meter("kn", "kn-main");
  const clMain = meter("cl", "cl-main");
  const stamping = meter("kn", "stamping");
  const body = meter("kn", "body");
  const painting = meter("kn", "painting");
  for (const source of [clMain, stamping, body, painting]) {
    saveMeterSource(database, source);
  }

  const preview = previewGuidedMapping(database, {
    channelId: "kn-main",
    energyFlowRole: "consumption",
    measurementKind: "cumulative-energy",
    metricScope: "kn",
    selector: compileSelector("value"),
    source: knMain,
    topic: "factory/kn/main",
    timestampPolicy: "source-required"
  });
  applyGuidedMapping(database, {
    canonicalDraft: preview.canonicalDraft,
    idempotencyKey: "q1-kn",
    meterId: "kn-main",
    previewToken: preview.previewToken,
    source: knMain
  });

  ingest(database, knMain, "10000", "2026-01-01T00:00:00+08:00");
  ingest(database, knMain, "10000", "2026-09-01T00:00:00+08:00");
  ingest(database, knMain, "10300", "2026-09-01T23:59:00+08:00");
  ingest(database, knMain, "14300", "2026-09-30T23:59:00+08:00");
  ingest(database, knMain, "18300", "2026-12-31T23:59:00+08:00");
  ingest(database, clMain, "20000", "2026-09-01T00:00:00+08:00");
  ingest(database, clMain, "20100", "2026-09-01T23:59:00+08:00");
  ingest(database, stamping, "0", "2026-09-01T00:00:00+08:00");
  ingest(database, stamping, "150", "2026-09-01T23:59:00+08:00");
  ingest(database, body, "0", "2026-09-01T00:00:00+08:00");
  ingest(database, body, "90", "2026-09-01T23:59:00+08:00");
  ingest(database, painting, "0", "2026-09-01T00:00:00+08:00");
  ingest(database, painting, "60", "2026-09-01T23:59:00+08:00");

  const knDraft = profileFor("kn", ["kn-main"], [
    { accountingIncluded: true, coverageReview: "reviewed", departmentId: "stamping", memberChannelIds: ["stamping"], nameZh: "沖壓" },
    { accountingIncluded: true, coverageReview: "reviewed", departmentId: "body", memberChannelIds: ["body"], nameZh: "車身" },
    { accountingIncluded: true, coverageReview: "reviewed", departmentId: "painting", memberChannelIds: ["painting"], nameZh: "塗裝" }
  ]);
  const clDraft = profileFor("cl", ["cl-main"], []);
  const knPreview = previewProfile(database, "kn", {
    draft: knDraft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  applyProfile(database, "kn", {
    draft: knDraft,
    expectedRevision: 0,
    idempotencyKey: "q1-kn-profile",
    previewToken: knPreview.previewToken
  });
  const clPreview = previewProfile(database, "cl", {
    draft: clDraft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  applyProfile(database, "cl", {
    draft: clDraft,
    expectedRevision: 0,
    idempotencyKey: "q1-cl-profile",
    previewToken: clPreview.previewToken
  });

  const knDay = resolvePersistedPeriodConsumption(database, "kn", { day: 1, kind: "day", month: 9, year: 2026 }, "2026-09-01T16:00:00Z");
  const knMonth = resolvePersistedPeriodConsumption(database, "kn", { kind: "month", month: 9, year: 2026 }, "2026-09-30T16:00:00Z");
  const knYear = resolvePersistedPeriodConsumption(database, "kn", { kind: "year", year: 2026 }, "2026-12-31T16:00:00Z");
  assert.equal(knDay.valueKwh, "300");
  assert.equal(knMonth.valueKwh, "4300");
  assert.equal(knYear.valueKwh, "8300");
  const clDay = resolvePersistedPeriodConsumption(database, "cl", { day: 1, kind: "day", month: 9, year: 2026 }, "2026-09-01T16:00:00Z");
  assert.equal(clDay.valueKwh, "100");
  assert.notEqual(clDay.valueKwh, knDay.valueKwh);

  const checksumBefore = acceptedSampleChecksum(database, "kn");
  const shadow = shadowProject(database, knMonth, "kn", "month");
  activateProjection(database, shadow);
  assert.equal(readActiveProjection(database, "kn", "month")?.valueKwh, "4300");
  rollbackProjection(database, "kn", "month");
  assert.equal(acceptedSampleChecksum(database, "kn"), checksumBefore);

  const shares = resolvePersistedDepartmentShares(database, "kn", { day: 1, kind: "day", month: 9, year: 2026 }, "2026-09-01T16:00:00Z");
  assert.deepEqual(shares?.shares.map((share) => Math.round((share.ratio ?? 0) * 100)), [50, 30, 20]);

  const bindingPreview = previewUnsavedBinding(
    { metricKey: "consumptionEnergy", metricScope: "kn" },
    { metricKey: "factoryCircuit.stampingPower", metricScope: "kn" }
  );
  assert.equal(bindingPreview.applied, false);
  const preflight = unifyPublishPreflight({
    bindingErrors: [],
    energyProfileReady: true,
    unsavedBindings: true
  });
  assert.equal(preflight.canPublish, false);
  database.close();
});
