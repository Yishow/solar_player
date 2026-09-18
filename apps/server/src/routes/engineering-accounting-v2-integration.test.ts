import assert from "node:assert/strict";
import test from "node:test";
import type {
  MeterSourceDefinition,
  SiteEnergyProfileV1,
  SiteEnergyProfileV2
} from "@solar-display/shared";
import { applyEngineeringSource, previewEngineeringSource } from "../services/engineeringSourceService.js";
import { admitDailyEngineeringReport } from "../services/engineeringReportService.js";
import { saveMeterSource } from "../services/meterSourceCatalogService.js";
import { seedAcceptedReading } from "../services/meterReadingService.js";
import { tryResolvePersistedPeriodConsumption } from "../services/periodConsumptionService.js";
import { serializeSiteEnergyProfile } from "../services/siteEnergyProfileRepository.js";
import {
  buildApp,
  closeDatabaseConnection,
  getDatabase
} from "./display-pages-asset-governance.test-support.js";

function physicalProfile(scope: "cl" | "kn", channelId: string): SiteEnergyProfileV1 {
  return {
    departments: [],
    effectiveFrom: "2026-01-01T00:00:00+08:00",
    metricScope: scope,
    profileId: `${scope}-physical`,
    revision: 1,
    schemaVersion: 1,
    shareBasis: { kind: "site-main" },
    siteTimeZone: "Asia/Taipei",
    siteTotal: {
      coverageReview: "reviewed",
      kind: "meter-set",
      label: `${scope} physical`,
      memberChannelIds: [channelId]
    },
    status: "ready"
  };
}

function insertActiveProfile(profile: SiteEnergyProfileV1 | SiteEnergyProfileV2) {
  const serialized = serializeSiteEnergyProfile(profile);
  getDatabase().prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    profile.profileId,
    profile.metricScope,
    profile.revision,
    serialized.schemaVersion,
    profile.siteTimeZone,
    profile.status,
    profile.effectiveFrom,
    serialized.siteTotalJson,
    serialized.departmentsJson,
    serialized.shareBasisJson,
    "2026-01-01T00:00:00.000Z"
  );
}

function physicalSource(scope: "cl" | "kn", channelId: string): MeterSourceDefinition {
  return {
    channelId,
    enabled: true,
    energyFlowRole: "consumption",
    epochId: "epoch-1",
    expectedCadenceSeconds: 60,
    inputUnit: "kWh",
    measurementKind: "cumulative-energy",
    meterId: channelId,
    metricKey: "consumptionEnergy",
    metricScope: scope,
    reviewStatus: "reviewed",
    scaleDecimal: "1",
    sourceRevision: 1,
    sourceTimestampTimeZone: "UTC",
    timestampPolicy: "source-required"
  };
}

function seedPhysicalMonth(scope: "cl" | "kn", channelId: string, start: string, end: string) {
  const database = getDatabase();
  const source = physicalSource(scope, channelId);
  saveMeterSource(database, source);
  seedAcceptedReading(database, source, start, "2026-08-31T16:00:00.000Z", "2026-08-31T16:00:00.000Z");
  seedAcceptedReading(database, source, end, "2026-09-15T03:59:00.000Z", "2026-09-15T03:59:00.000Z");
}

function registerEngineeringSource() {
  const database = getDatabase();
  const preview = previewEngineeringSource({
    approvedPublisherId: "publisher-1",
    calendarRevision: 1,
    enabled: true,
    engineeringId: "stamping",
    exactTopic: "factory/guanyin/energy/daily/stamping",
    mode: "daily-report",
    purpose: "energy",
    reviewStatus: "approved",
    site: "kn",
    sourceKind: "engineering",
    sourceRef: "kn-eng-stamping-energy",
    unit: "kWh"
  });
  applyEngineeringSource(database, {
    draft: preview.canonicalDraft,
    expectedRevision: 0,
    previewToken: preview.previewToken
  });
}

function seedSeptemberEngineeringReports() {
  const database = getDatabase();
  const firstStart = Date.UTC(2026, 7, 31, 16);
  const dayMs = 24 * 60 * 60 * 1000;
  for (let day = 0; day < 14; day += 1) {
    const periodStart = new Date(firstStart + day * dayMs).toISOString();
    const periodEnd = new Date(firstStart + (day + 1) * dayMs).toISOString();
    const admitted = admitDailyEngineeringReport(database, {
      calendarRevision: 1,
      coverage: "complete",
      dataRevision: 1,
      definitionRevision: 1,
      engineeringId: "stamping",
      measurementKind: "interval-energy",
      periodEnd,
      periodStart,
      periodStatus: "final",
      publishedAt: new Date(Date.parse(periodEnd) + 60_000).toISOString(),
      publisherId: "publisher-1",
      quality: "valid",
      schemaVersion: 1,
      site: "kn",
      sourceKind: "engineering",
      unit: "kWh",
      value: "10"
    }, { allowReplayWindowBypass: true, isProduction: false });
    assert.equal(admitted.accepted, true, JSON.stringify(admitted));
  }
}

const engineeringDraft: SiteEnergyProfileV2 = {
  departments: [],
  effectiveFrom: "2026-09-01T00:00:00+08:00",
  metricScope: "kn",
  profileId: "kn-engineering",
  providerKind: "engineering",
  revision: 1,
  schemaVersion: 2,
  shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei",
  siteTotal: {
    coverageReview: "reviewed",
    kind: "member-set",
    label: "觀音工程總量",
    members: [{
      engineeringId: "stamping",
      kind: "engineering",
      mode: "daily-report",
      sourceRef: "kn-eng-stamping-energy"
    }]
  },
  status: "ready"
};

test("KN V2 survives preview, apply and restart without changing CL V1, then isolates V1 rollback", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-15T04:00:00.000Z") });
  insertActiveProfile(physicalProfile("cl", "cl-main"));
  insertActiveProfile(physicalProfile("kn", "kn-main"));
  seedPhysicalMonth("cl", "cl-main", "100", "150");
  seedPhysicalMonth("kn", "kn-main", "200", "260");
  registerEngineeringSource();
  seedSeptemberEngineeringReports();

  const beforeClRow = getDatabase().prepare(
    "SELECT * FROM site_energy_profiles WHERE metric_scope = 'cl' AND revision = 1"
  ).get();
  const beforeClResult = tryResolvePersistedPeriodConsumption(
    getDatabase(),
    "cl",
    "month",
    "2026-09-15T04:00:00.000Z"
  );
  const meterRowsBefore = (getDatabase().prepare(
    "SELECT COUNT(*) AS count FROM meter_readings_accepted"
  ).get() as { count: number }).count;

  const firstApp = await buildApp();
  const preview = await firstApp.inject({
    method: "POST",
    payload: {
      draft: engineeringDraft,
      expectedRevision: 1,
      periodSelection: { kind: "month", month: 9, year: 2026 }
    },
    url: "/api/data-hub/sites/kn/energy-profile/preview"
  });
  assert.equal(preview.statusCode, 200, preview.body);
  const previewBody = preview.json() as {
    calculator: { period: { providerKind: string; valueKwh: string } };
    previewToken: string;
  };
  assert.equal(previewBody.calculator.period.providerKind, "engineering");
  assert.equal(previewBody.calculator.period.valueKwh, "140");

  const applied = await firstApp.inject({
    method: "POST",
    payload: {
      draft: engineeringDraft,
      expectedRevision: 1,
      idempotencyKey: "integration-v2-apply",
      previewToken: previewBody.previewToken
    },
    url: "/api/data-hub/sites/kn/energy-profile/apply"
  });
  assert.equal(applied.statusCode, 200, applied.body);
  assert.equal(applied.json().schemaVersion, 2);
  assert.equal(applied.json().revision, 2);
  await firstApp.close();

  closeDatabaseConnection();
  const reopened = getDatabase();
  assert.equal((reopened.prepare(
    "SELECT COUNT(*) AS count FROM meter_readings_accepted"
  ).get() as { count: number }).count, meterRowsBefore);
  assert.deepEqual(reopened.prepare(
    "SELECT * FROM site_energy_profiles WHERE metric_scope = 'cl' AND revision = 1"
  ).get(), beforeClRow);

  const secondApp = await buildApp();
  try {
    const [history, profile, clHistory] = await Promise.all([
      secondApp.inject({ method: "GET", url: "/api/data-hub/energy-history?metricScope=kn&range=month" }),
      secondApp.inject({ method: "GET", url: "/api/data-hub/sites/kn/energy-profile" }),
      secondApp.inject({ method: "GET", url: "/api/data-hub/energy-history?metricScope=cl&range=month" })
    ]);
    assert.equal(history.statusCode, 200);
    assert.equal(history.json().periodSummary.providerKind, "engineering");
    assert.equal(history.json().periodSummary.valueKwh, "140");
    assert.deepEqual(history.json().snapshots, []);
    assert.deepEqual(history.json().summaries, []);
    assert.deepEqual(history.json().counters, []);
    assert.equal(profile.statusCode, 200);
    assert.equal(profile.json().profile.schemaVersion, 2);
    assert.equal(profile.json().profile.revision, 2);
    assert.equal(profile.json().readiness.status, "configured-awaiting-data");
    assert.equal(clHistory.statusCode, 200);
    assert.notEqual(clHistory.json().periodSummary?.valueKwh, "140");
    assert.deepEqual(
      tryResolvePersistedPeriodConsumption(reopened, "cl", "month", "2026-09-15T04:00:00.000Z"),
      beforeClResult
    );

    reopened.prepare("UPDATE site_energy_profiles SET active = 0 WHERE metric_scope = 'kn'").run();
    reopened.prepare(
      "UPDATE site_energy_profiles SET active = 1 WHERE metric_scope = 'kn' AND schema_version = 1 AND revision = 1"
    ).run();
    const rolledBack = await secondApp.inject({
      method: "GET",
      url: "/api/data-hub/energy-history?metricScope=kn&range=month"
    });
    assert.equal(rolledBack.statusCode, 200);
    assert.notEqual(rolledBack.json().periodSummary?.providerKind, "engineering");
    assert.notEqual(rolledBack.json().periodSummary?.valueKwh, "140");
    assert.equal((reopened.prepare(
      "SELECT COUNT(*) AS count FROM site_energy_profiles WHERE metric_scope = 'kn' AND schema_version = 2"
    ).get() as { count: number }).count, 1);
  } finally {
    await secondApp.close();
  }
});
