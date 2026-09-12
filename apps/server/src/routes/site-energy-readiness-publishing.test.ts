import assert from "node:assert/strict";
import test from "node:test";
import type { MeterSourceDefinition, SiteEnergyProfileV1 } from "@solar-display/shared";
import { createPairedDeviceTestContext } from "../testing/deviceContextTestSupport.js";
import { saveMeterSource } from "../services/meterSourceCatalogService.js";
import { seedAcceptedReading } from "../services/meterReadingService.js";
import { readAssignedEnergyScopes } from "../services/displayPublishEnergyScopes.js";
import { buildApp, getDatabase } from "./display-pages-asset-governance.test-support.js";

const asOf = "2026-09-08T04:00:00.000Z";
const opening = "2026-08-31T16:00:00.000Z";
const source: MeterSourceDefinition = {
  channelId: "kn-main", meterId: "kn-main", metricKey: "consumptionEnergy", metricScope: "kn",
  enabled: true, reviewStatus: "reviewed", measurementKind: "cumulative-energy", energyFlowRole: "consumption",
  inputUnit: "kWh", scaleDecimal: "1", sourceRevision: 1, epochId: "one", expectedCadenceSeconds: 60,
  sourceTimestampTimeZone: "UTC", timestampPolicy: "source-required"
};

function seedStoredProfile(effectiveFrom = opening) {
  const database = getDatabase();
  const profile: SiteEnergyProfileV1 = {
    departments: [], effectiveFrom, metricScope: "kn", profileId: "kn-energy", revision: 1,
    schemaVersion: 1, siteTimeZone: "Asia/Taipei", shareBasis: { kind: "site-main" },
    siteTotal: { kind: "meter-set", coverageReview: "reviewed", label: "觀音總錶", memberChannelIds: ["kn-main"] },
    status: "ready"
  };
  database.prepare(`INSERT INTO site_energy_profiles (
    profile_id, metric_scope, revision, schema_version, site_time_zone, status, effective_from,
    site_total_json, departments_json, share_basis_json, active, created_at
  ) VALUES (?, 'kn', 1, 1, ?, 'ready', ?, ?, '[]', ?, 1, ?)`).run(
    profile.profileId, profile.siteTimeZone, effectiveFrom,
    JSON.stringify(profile.siteTotal), JSON.stringify(profile.shareBasis), opening
  );
  saveMeterSource(database, source);
  createPairedDeviceTestContext("kn");
  assert.deepEqual(readAssignedEnergyScopes(database, "factory-circuit"), ["kn"]);
  return profile;
}

test("R10 assigned energy preflight re-evaluates evidence instead of trusting stored ready", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse(asOf) });
  seedStoredProfile();
  const database = getDatabase();
  seedAcceptedReading(database, source, "1000", opening, opening);
  const app = await buildApp();
  const preflight = async () => {
    const response = await app.inject({ method: "POST", url: "/api/display-pages/factory-circuit/validate", payload: {} });
    assert.equal(response.statusCode, 200, response.body);
    return response.json().validation.findings as Array<{ code: string }>;
  };
  try {
    const before = database.prepare("SELECT * FROM site_energy_profiles").all();
    assert.equal((await preflight()).some((finding) => finding.code === "ENERGY_PROFILE_INCOMPLETE"), true);
    seedAcceptedReading(database, source, "1400", asOf, asOf);
    assert.equal((await preflight()).some((finding) => finding.code === "ENERGY_PROFILE_INCOMPLETE"), false);
    const read = await app.inject({ method: "GET", url: "/api/data-hub/sites/kn/energy-profile" });
    assert.equal(read.json().readiness.status, "ready");
    assert.deepEqual(read.json().readiness.periodSelection, { kind: "month", month: 9, year: 2026 });
    assert.deepEqual(database.prepare("SELECT * FROM site_energy_profiles").all(), before);
    assert.deepEqual(database.prepare("SELECT * FROM profile_apply_receipts").all(), []);
    database.prepare("UPDATE site_energy_profiles SET share_basis_json = ?, departments_json = ?").run(
      JSON.stringify({ kind: "unsupported" }),
      JSON.stringify([{ departmentId: "stamping", nameZh: "沖壓", memberChannelIds: ["kn-main"], accountingIncluded: true, coverageReview: "reviewed" }])
    );
    assert.equal((await preflight()).some((finding) => finding.code === "ENERGY_PROFILE_INCOMPLETE"), true,
      "invalid persisted basis must not fall through to department-sum readiness");
  } finally {
    await app.close();
  }
});

test("R10 assigned energy preflight keeps effective-profile boundaries despite complete meter endpoints", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse(asOf) });
  seedStoredProfile("2026-09-05T00:00:00.000Z");
  const database = getDatabase();
  seedAcceptedReading(database, source, "1000", opening, opening);
  seedAcceptedReading(database, source, "1400", asOf, asOf);
  const app = await buildApp();
  try {
    const response = await app.inject({ method: "POST", url: "/api/display-pages/factory-circuit/validate", payload: {} });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().validation.findings.some((finding: { code: string }) => finding.code === "ENERGY_PROFILE_INCOMPLETE"), true);
    const read = await app.inject({ method: "GET", url: "/api/data-hub/sites/kn/energy-profile" });
    assert.equal(read.json().readiness.status, "configured-awaiting-data");
    assert.ok(read.json().readiness.reasons.includes("PROFILE_REVISION_BOUNDARY"));
  } finally {
    await app.close();
  }
});

test("R10 readiness does not reuse an earlier source revision after a meter definition changes", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse(asOf) });
  seedStoredProfile();
  const database = getDatabase();
  seedAcceptedReading(database, source, "1000", opening, opening);
  seedAcceptedReading(database, source, "1400", asOf, asOf);
  saveMeterSource(database, { ...source, sourceRevision: 2, scaleDecimal: "2" }, {
    actor: "readiness-test", reason: "倍率更正"
  });
  const app = await buildApp();
  try {
    const response = await app.inject({ method: "POST", url: "/api/display-pages/factory-circuit/validate", payload: {} });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().validation.findings.some((finding: { code: string }) => finding.code === "ENERGY_PROFILE_INCOMPLETE"), true);
    const read = await app.inject({ method: "GET", url: "/api/data-hub/sites/kn/energy-profile" });
    assert.notEqual(read.json().readiness.status, "ready");
    assert.deepEqual(database.prepare("SELECT * FROM profile_apply_receipts").all(), []);
  } finally {
    await app.close();
  }
});

test("R10 a ready effective profile cannot authorize an unreviewed future draft", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse(asOf) });
  const current = seedStoredProfile();
  const database = getDatabase();
  seedAcceptedReading(database, source, "1000", opening, opening);
  seedAcceptedReading(database, source, "1400", asOf, asOf);
  const app = await buildApp();
  try {
    const draft = {
      ...current,
      effectiveFrom: "2026-09-09T00:00:00.000Z",
      siteTotal: { ...current.siteTotal, coverageReview: "needs-review" }
    };
    const before = database.prepare("SELECT * FROM site_energy_profiles").all();
    const preview = await app.inject({ method: "POST", url: "/api/data-hub/sites/kn/energy-profile/preview", payload: {
      draft, expectedRevision: 1, periodSelection: { kind: "month", year: 2026, month: 9 }
    } });
    assert.equal(preview.statusCode, 200, preview.body);
    assert.equal(preview.json().readiness.status, "incomplete");
    const apply = await app.inject({ method: "POST", url: "/api/data-hub/sites/kn/energy-profile/apply", payload: {
      draft, expectedRevision: 1, previewToken: preview.json().previewToken, idempotencyKey: "unreviewed-future"
    } });
    assert.equal(apply.statusCode, 409, apply.body);
    assert.deepEqual(database.prepare("SELECT * FROM site_energy_profiles").all(), before);
    assert.deepEqual(database.prepare("SELECT * FROM profile_apply_receipts").all(), []);
  } finally {
    await app.close();
  }
});
