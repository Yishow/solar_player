import assert from "node:assert/strict";
import test from "node:test";
import type { MeterSourceDefinition, SiteEnergyProfileV1 } from "@solar-display/shared";
import { saveMeterSource } from "../services/meterSourceCatalogService.js";
import { seedAcceptedReading } from "../services/meterReadingService.js";
import { buildApp, getDatabase } from "./display-pages-asset-governance.test-support.js";

const source: MeterSourceDefinition = {
  channelId: "kn-main", meterId: "meter-1", metricKey: "consumptionEnergy", metricScope: "kn",
  enabled: true, reviewStatus: "reviewed", measurementKind: "cumulative-energy", energyFlowRole: "consumption",
  inputUnit: "kWh", scaleDecimal: "1", sourceRevision: 1, epochId: "one", expectedCadenceSeconds: 60,
  sourceTimestampTimeZone: "UTC", timestampPolicy: "source-required"
};
const draft: SiteEnergyProfileV1 = {
  departments: [], effectiveFrom: "2026-09-01T00:00:00Z", metricScope: "kn", profileId: "kn-energy",
  revision: 0, schemaVersion: 1, siteTimeZone: "Asia/Taipei", shareBasis: { kind: "site-main" },
  siteTotal: { kind: "meter-set", coverageReview: "reviewed", label: "總錶", memberChannelIds: ["kn-main"] },
  status: "ready"
};
const url = "/api/data-hub/sites/kn/energy-profile";
const previewRequest = { draft, expectedRevision: 0, periodSelection: { kind: "month", year: 2026, month: 9 } };

test("R9 normal preview route returns server-calculated totals, basis and department ratios", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-08T04:00:00.000Z") });
  const database = getDatabase();
  const departmentSource = { ...source, channelId: "kn-department", meterId: "meter-2", metricKey: "departmentEnergy" };
  saveMeterSource(database, source);
  saveMeterSource(database, departmentSource);
  const now = new Date(Date.now() - 1_000).toISOString();
  seedAcceptedReading(database, source, "100", "2026-08-31T16:00:00Z", "2026-08-31T16:00:01Z");
  seedAcceptedReading(database, source, "500", now, now);
  seedAcceptedReading(database, departmentSource, "0", "2026-08-31T16:00:00Z", "2026-08-31T16:00:01Z");
  seedAcceptedReading(database, departmentSource, "100", now, now);
  const app = await buildApp();
  const publish = t.mock.method(app.mqttClientService, "publish", () => { throw new Error("preview must not publish"); });
  const productionSnapshot = () => Object.fromEntries([
    "site_energy_profiles", "meter_sources", "meter_readings_accepted", "meter_live_state",
    "consumption_projections", "daily_energy_summaries", "display_page_stage_configs"
  ].map((table) => [table, database.prepare(`SELECT * FROM ${table}`).all()]));
  const before = productionSnapshot();
  try {
    const response = await app.inject({
      method: "POST",
      url: `${url}/preview`,
      payload: {
        ...previewRequest,
        draft: {
          ...draft,
          departments: [{
            accountingIncluded: true,
            coverageReview: "reviewed",
            departmentId: "assembly",
            memberChannelIds: ["kn-department"],
            nameZh: "組裝"
          }]
        }
      }
    });
    assert.equal(response.statusCode, 200, response.body);
    const body = response.json() as {
      asOf: string;
      calculator: {
        basis: { memberChannelIds: string[]; result: { valueKwh: string | null } };
        departments: Array<{ ratio: number | null; result: { valueKwh: string | null } }>;
        period: { valueKwh: string | null };
      };
      expectedRevision: number;
      profile: SiteEnergyProfileV1;
      readiness: { status: string };
      reviewContext: string;
    };
    assert.equal(body.calculator.period.valueKwh, "400");
    assert.equal(body.calculator.basis.result.valueKwh, "400");
    assert.deepEqual(body.calculator.basis.memberChannelIds, ["kn-main"]);
    assert.equal(body.calculator.departments[0]?.result.valueKwh, "100");
    assert.equal(body.calculator.departments[0]?.ratio, 0.25);
    assert.equal(body.reviewContext, "profile-draft");
    assert.equal(body.expectedRevision, 0);
    assert.equal(body.profile.revision, 0);
    assert.equal(typeof body.asOf, "string");
    assert.equal(body.readiness.status, "ready");
    assert.deepEqual(productionSnapshot(), before);
    assert.equal(publish.mock.callCount(), 0);
  } finally {
    await app.close();
  }
});

test("R9 calculator failure returns an explicit error without issuing a token", async () => {
  const database = getDatabase();
  saveMeterSource(database, source);
  const app = await buildApp();
  try {
    database.exec("DROP TABLE freshness_policy");
    const response = await app.inject({ method: "POST", url: `${url}/preview`, payload: previewRequest });
    assert.equal(response.statusCode, 500, response.body);
    assert.equal(response.json().error, "PROFILE_CALCULATOR_FAILED");
    assert.equal(response.json().previewToken, undefined);
    assert.deepEqual(database.prepare("SELECT * FROM profile_preview_tokens").all(), []);
    assert.deepEqual(database.prepare("SELECT * FROM site_energy_profiles").all(), []);
  } finally {
    await app.close();
  }
});

test("R10 forged ready waits for evidence and apply re-evaluates newly arrived readings", async (t) => {
  const asOf = "2026-09-08T04:00:00.000Z";
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse(asOf) });
  const database = getDatabase();
  saveMeterSource(database, source);
  seedAcceptedReading(database, source, "1000", "2026-08-31T16:00:00Z", "2026-08-31T16:00:00Z");
  const app = await buildApp();
  try {
    const reviewed = { ...previewRequest, draft: { ...draft, effectiveFrom: "2026-08-31T16:00:00Z" } };
    const preview = await app.inject({ method: "POST", url: `${url}/preview`, payload: reviewed });
    assert.equal(preview.statusCode, 200, preview.body);
    assert.equal(preview.json().readiness.status, "configured-awaiting-data");
    const later = "2026-09-08T04:01:00.000Z";
    t.mock.timers.setTime(Date.parse(later));
    seedAcceptedReading(database, source, "1400", later, later);
    const payload = { draft: reviewed.draft, expectedRevision: 0, previewToken: preview.json().previewToken, idempotencyKey: "fresh-arrivals" };
    const applied = await app.inject({ method: "POST", url: `${url}/apply`, payload });
    assert.equal(applied.statusCode, 200, applied.body);
    assert.equal(applied.json().status, "ready");
    assert.equal(applied.json().reviewAsOf, asOf);
    assert.equal(applied.json().activationAsOf, later);
    t.mock.timers.setTime(Date.parse(later) + 60_000);
    const retry = await app.inject({ method: "POST", url: `${url}/apply`, payload });
    assert.deepEqual(retry.json(), applied.json());
  } finally {
    await app.close();
  }
});

test("R9 preview distinguishes a missing period baseline from a calculator result", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-08T04:00:00.000Z") });
  const database = getDatabase();
  saveMeterSource(database, source);
  const now = new Date(Date.now() - 1_000).toISOString();
  seedAcceptedReading(database, source, "500", now, now);
  const app = await buildApp();
  try {
    const response = await app.inject({ method: "POST", url: `${url}/preview`, payload: previewRequest });
    assert.equal(response.statusCode, 200, response.body);
    const body = response.json() as {
      calculator: { period: { issues?: string[]; quality: string; valueKwh: string | null } };
      readiness: { reasons: string[]; status: string };
    };
    assert.equal(body.calculator.period.valueKwh, null);
    assert.equal(body.calculator.period.quality, "partial");
    assert.ok(body.calculator.period.issues?.includes("MISSING_BASELINE:kn-main"));
    assert.equal(body.readiness.status, "configured-awaiting-data");
    assert.ok(body.readiness.reasons.some((reason) => reason.includes("MISSING_BASELINE")));
  } finally {
    await app.close();
  }
});

test("R9 review uses the draft calendar while retaining an active profile with another timezone", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-08T04:00:00.000Z") });
  const database = getDatabase();
  saveMeterSource(database, source);
  const active = { ...draft, revision: 1, siteTimeZone: "Asia/Taipei", effectiveFrom: "2026-01-01T00:00:00Z" };
  database.prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status, effective_from,
      site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    active.profileId, active.metricScope, active.revision, active.siteTimeZone, active.status, active.effectiveFrom,
    JSON.stringify(active.siteTotal), JSON.stringify(active.departments), JSON.stringify(active.shareBasis), new Date().toISOString()
  );
  const now = new Date(Date.now() - 1_000).toISOString();
  seedAcceptedReading(database, source, "100", "2026-09-01T00:00:00Z", "2026-09-01T00:00:01Z");
  seedAcceptedReading(database, source, "500", now, now);
  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "POST",
      url: `${url}/preview`,
      payload: {
        ...previewRequest,
        expectedRevision: 1,
        draft: { ...draft, siteTimeZone: "UTC" }
      }
    });
    assert.equal(response.statusCode, 200, response.body);
    const body = response.json();
    assert.equal(body.profile.siteTimeZone, "UTC");
    assert.equal(body.calculator.period.siteTimeZone, "UTC");
    assert.equal(body.calculator.period.periodStart, "2026-09-01T00:00:00.000Z");
    assert.equal(body.calculator.period.valueKwh, "400");
    assert.equal(body.reviewContext, "profile-draft");
    assert.equal((database.prepare("SELECT revision FROM site_energy_profiles WHERE active = 1").get() as { revision: number }).revision, 1);
  } finally {
    await app.close();
  }
});

test("R9 preview rejects an unknown share basis kind without writes", async () => {
  const database = getDatabase();
  saveMeterSource(database, source);
  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "POST",
      url: `${url}/preview`,
      payload: {
        ...previewRequest,
        draft: { ...draft, shareBasis: { kind: "unexpected-basis" } }
      }
    });
    assert.equal(response.statusCode, 422, response.body);
    assert.equal(response.json().error, "PROFILE_INVALID");
    assert.deepEqual(database.prepare("SELECT * FROM site_energy_profiles").all(), []);
    assert.deepEqual(database.prepare("SELECT * FROM profile_preview_tokens").all(), []);
    assert.deepEqual(database.prepare("SELECT * FROM profile_apply_receipts").all(), []);
  } finally {
    await app.close();
  }
});

test("E6 API binds sources without version input and rejects a stale preview atomically", async () => {
  const database = getDatabase();
  saveMeterSource(database, source);
  const app = await buildApp();
  try {
    const preview = await app.inject({ method: "POST", url: `${url}/preview`, payload: previewRequest });
    assert.equal(preview.statusCode, 200, preview.body);
    assert.deepEqual(database.prepare("SELECT * FROM site_energy_profiles").all(), []);
    const token = preview.json().previewToken;
    saveMeterSource(database, { ...source, sourceRevision: 2, scaleDecimal: "2" }, { actor: "test", reason: "倍率更正" });
    const payload = { draft, expectedRevision: 0, previewToken: token, idempotencyKey: "source-review" };
    const rejected = await app.inject({ method: "POST", url: `${url}/apply`, payload });
    assert.equal(rejected.statusCode, 409, rejected.body);
    assert.equal(rejected.json().error, "PROFILE_SOURCE_CONFLICT");
    assert.deepEqual(database.prepare("SELECT * FROM site_energy_profiles").all(), []);
    assert.deepEqual(database.prepare("SELECT * FROM profile_apply_receipts").all(), []);
    const fresh = await app.inject({ method: "POST", url: `${url}/preview`, payload: previewRequest });
    assert.equal(fresh.statusCode, 200, fresh.body);
    const freshPayload = { ...payload, previewToken: fresh.json().previewToken };
    const applied = await app.inject({ method: "POST", url: `${url}/apply`, payload: freshPayload });
    assert.equal(applied.statusCode, 200, applied.body);
    assert.equal(applied.json().revision, 1);
    saveMeterSource(database, { ...source, sourceRevision: 3, scaleDecimal: "3" }, { actor: "test", reason: "再次更正" });
    const retry = await app.inject({ method: "POST", url: `${url}/apply`, payload: freshPayload });
    assert.equal(retry.statusCode, 200, retry.body);
    assert.deepEqual(retry.json(), applied.json());
    assert.equal((database.prepare("SELECT COUNT(*) AS n FROM site_energy_profiles").get() as { n: number }).n, 1);
  } finally {
    await app.close();
  }
});

test("E6 API reports the unavailable source field and keeps management authorization", async () => {
  const database = getDatabase();
  const app = await buildApp();
  try {
    const denied = await app.inject({ method: "POST", url: `${url}/preview`, payload: previewRequest, remoteAddress: "198.51.100.2" });
    assert.equal(denied.statusCode, 403);
    const missing = await app.inject({ method: "POST", url: `${url}/preview`, payload: previewRequest });
    assert.equal(missing.statusCode, 422, missing.body);
    assert.equal(missing.json().error, "PROFILE_SOURCE_UNAVAILABLE");
    assert.match(missing.json().fields[0].field, /^siteTotal\.memberChannelIds/);
    assert.deepEqual(database.prepare("SELECT * FROM profile_preview_tokens").all(), []);
  } finally {
    await app.close();
  }
});

test("U2-R5 the source-impact read reports resolvable dependencies and structural expectations separately", async () => {
  const database = getDatabase();
  const app = await buildApp();
  const impactUrl = "/api/data-hub/source-impact";
  try {
    // A destination only the display code registers. `todayGeneration` is chosen because it stays
    // registered-only after the derived-metric registry bootstraps at app start, unlike destinations
    // that gain a real derived input there.
    const registeredOnly = await app.inject({
      method: "GET", url: `${impactUrl}?metricKey=todayGeneration&metricScope=kn`
    });
    assert.equal(registeredOnly.statusCode, 200, registeredOnly.body);
    const disclosed = registeredOnly.json();
    assert.equal(typeof disclosed.canMutate, "boolean");
    assert.equal(typeof disclosed.unknown, "boolean");
    assert.ok(Array.isArray(disclosed.consumers), "the existing consumers field keeps its name and type");
    assert.deepEqual(
      { canMutate: disclosed.canMutate, unknown: disclosed.unknown, consumers: disclosed.consumers },
      { canMutate: true, unknown: false, consumers: [] },
      "a registered expectation is not a blocking dependency"
    );
    assert.ok(disclosed.registeredExpectations.length > 0, "the expectation is still disclosed");
    for (const expectation of disclosed.registeredExpectations) {
      assert.equal(expectation.metricKey, "todayGeneration");
      assert.ok(["story", "readiness"].includes(expectation.consumerType), expectation.consumerType);
      assert.ok(typeof expectation.pageId === "string" && expectation.pageId.length > 0);
    }

    database.prepare(`
      INSERT INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at)
      VALUES ('overview', 'draft', ?, 2, ?)
      ON CONFLICT(page_key, stage) DO UPDATE SET config_json = excluded.config_json
    `).run(JSON.stringify({
      regions: { dataBindings: { power: { itemId: "power", dataBinding: { metricKey: "todayGeneration", scope: "kn", sourceType: "metric" } } } }
    }), new Date().toISOString());

    const blocked = (await app.inject({
      method: "GET", url: `${impactUrl}?metricKey=todayGeneration&metricScope=kn`
    })).json();
    assert.equal(blocked.canMutate, false, "a resolvable draft reference still blocks");
    assert.deepEqual(blocked.consumers.map((row: { kind: string }) => row.kind), ["draft"]);
    assert.ok(
      blocked.registeredExpectations.length > 0,
      "the structural expectations stay in their own set rather than joining the blocking set"
    );

    const unreferenced = (await app.inject({
      method: "GET", url: `${impactUrl}?metricKey=unreferencedPlantEnergy&metricScope=kn`
    })).json();
    assert.deepEqual(
      { consumers: unreferenced.consumers, registeredExpectations: unreferenced.registeredExpectations },
      { consumers: [], registeredExpectations: [] },
      "both sets are reported as empty arrays rather than omitted"
    );
  } finally {
    await app.close();
  }
});
