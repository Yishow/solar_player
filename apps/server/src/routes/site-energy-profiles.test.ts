import assert from "node:assert/strict";
import test from "node:test";
import type { MeterSourceDefinition, SiteEnergyProfileV1 } from "@solar-display/shared";
import { saveMeterSource } from "../services/meterSourceCatalogService.js";
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
