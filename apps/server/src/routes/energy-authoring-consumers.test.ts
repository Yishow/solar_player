import assert from "node:assert/strict";
import test from "node:test";
import {
  compileSelector,
  type MeterSourceDefinition,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { createPairedDeviceTestContext } from "../testing/deviceContextTestSupport.js";
import { saveMeterSource } from "../services/meterSourceCatalogService.js";
import { ingestMappedMeterReading } from "../services/mqttMeterIngest.js";
import { applyProfile, previewProfile } from "../services/siteEnergyProfileService.js";
import { resolvePersistedPeriodConsumption } from "../services/periodConsumptionService.js";
import {
  activateProjection,
  shadowProject
} from "../services/consumptionProjectionService.js";
import { applyGuidedMapping, previewGuidedMapping } from "../services/guidedMqttMappingService.js";
import { buildApp, getDatabase } from "./display-pages-asset-governance.test-support.js";

function meter(scope: "cl" | "kn", meterId: string): MeterSourceDefinition {
  return {
    channelId: meterId,
    enabled: true,
    energyFlowRole: "consumption",
    epochId: "epoch-1",
    expectedCadenceSeconds: 60,
    inputUnit: "kWh",
    measurementKind: "cumulative-energy",
    meterId,
    metricKey: meterId.endsWith("-main") ? "consumptionEnergy" : meterId,
    metricScope: scope,
    reviewStatus: "reviewed",
    scaleDecimal: "1",
    sourceRevision: 1,
    sourceTimestampTimeZone: "UTC",
    timestampPolicy: "source-required"
  };
}

function ingest(definition: MeterSourceDefinition, value: string, timestamp: string) {
  ingestMappedMeterReading(
    getDatabase(),
    {
      metric_key: definition.metricKey,
      metric_scope: definition.metricScope,
      selector_json: JSON.stringify(compileSelector("value")),
      value_path: "value"
    },
    JSON.stringify({ timestamp, value }),
    { dup: false, qos: 1, retain: false },
    timestamp
  );
}

function seedReadyProfile(scope: "cl" | "kn", members: string[], departments: SiteEnergyProfileV1["departments"] = []) {
  const database = getDatabase();
  const draft: SiteEnergyProfileV1 = {
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
  const preview = previewProfile(database, scope, {
    draft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  applyProfile(database, scope, {
    draft,
    expectedRevision: 0,
    idempotencyKey: `consumer-${scope}`,
    previewToken: preview.previewToken
  });
}

test("Q1 consumers: history periodSummary, overview daily gaps stay null, unsaved preview, token publish", async (t) => {
  const database = getDatabase();
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
    idempotencyKey: "consumer-kn",
    meterId: "kn-main",
    previewToken: preview.previewToken,
    source: knMain
  });
  ingest(knMain, "10000", "2026-01-01T00:00:00+08:00");
  ingest(knMain, "10000", "2026-09-01T00:00:00+08:00");
  ingest(knMain, "10300", "2026-09-01T23:59:00+08:00");
  ingest(knMain, "14300", "2026-09-30T23:59:00+08:00");
  ingest(knMain, "18300", "2026-12-31T23:59:00+08:00");
  ingest(clMain, "20000", "2026-09-01T00:00:00+08:00");
  ingest(clMain, "20100", "2026-09-01T23:59:00+08:00");
  ingest(stamping, "0", "2026-09-01T00:00:00+08:00");
  ingest(stamping, "150", "2026-09-01T23:59:00+08:00");
  ingest(body, "0", "2026-09-01T00:00:00+08:00");
  ingest(body, "90", "2026-09-01T23:59:00+08:00");
  ingest(painting, "0", "2026-09-01T00:00:00+08:00");
  ingest(painting, "60", "2026-09-01T23:59:00+08:00");
  seedReadyProfile("kn", ["kn-main"], [
    { accountingIncluded: true, coverageReview: "reviewed", departmentId: "stamping", memberChannelIds: ["stamping"], nameZh: "沖壓" },
    { accountingIncluded: true, coverageReview: "reviewed", departmentId: "body", memberChannelIds: ["body"], nameZh: "車身" },
    { accountingIncluded: true, coverageReview: "reviewed", departmentId: "painting", memberChannelIds: ["painting"], nameZh: "塗裝" }
  ]);
  seedReadyProfile("cl", ["cl-main"]);
  const knMonth = resolvePersistedPeriodConsumption(database, "kn", { kind: "month", month: 9, year: 2026 }, "2026-09-30T16:00:00Z");
  assert.equal(knMonth.valueKwh, "4300");
  activateProjection(database, shadowProject(database, knMonth, "kn", "month"));

  database.prepare(`
    INSERT INTO daily_energy_summaries (metric_scope, date, generation_total, consumption_total, self_consumption_total, co2_total)
    VALUES ('kn', '2026-09-10', 0, 9999, 0, 0)
  `).run();

  t.mock.timers.enable({
    apis: ["Date"],
    now: Date.parse("2026-09-01T15:59:00.000Z")
  });

  const knPair = createPairedDeviceTestContext("kn");
  const clPair = createPairedDeviceTestContext("cl");
  const app = await buildApp();
  try {
    const knHistory = await app.inject({
      cookies: { solar_device_credential: knPair.credential },
      method: "GET",
      url: "/api/metrics/history?range=month"
    });
    assert.equal(knHistory.statusCode, 200);
    assert.equal(knHistory.json().periodSummary?.valueKwh, "300");

    const knHub = await app.inject({
      method: "GET",
      url: "/api/data-hub/energy-history?metricScope=kn&range=month"
    });
    assert.equal(knHub.statusCode, 200);
    assert.equal(knHub.json().periodSummary?.valueKwh, "300");
    t.mock.timers.setTime(Date.parse("2026-09-30T15:59:00.000Z"));
    const monthEnd = await app.inject({ method: "GET", url: "/api/data-hub/energy-history?metricScope=kn&range=month" });
    assert.equal(monthEnd.json().periodSummary?.valueKwh, "4300");
    t.mock.timers.setTime(Date.parse("2026-09-01T15:59:00.000Z"));

    const clHistory = await app.inject({
      cookies: { solar_device_credential: clPair.credential },
      method: "GET",
      url: "/api/metrics/history?range=month"
    });
    assert.equal(clHistory.statusCode, 200);
    assert.notEqual(clHistory.json().periodSummary?.valueKwh, "4300");

    const clHub = await app.inject({
      method: "GET",
      url: "/api/data-hub/energy-history?metricScope=cl&range=month"
    });
    assert.equal(clHub.statusCode, 200);
    assert.notEqual(clHub.json().periodSummary?.valueKwh, "4300");

    const daily = await app.inject({
      cookies: { solar_device_credential: knPair.credential },
      method: "GET",
      url: "/api/metrics/daily-summary?range=month"
    });
    assert.equal(daily.statusCode, 200);
    const gap = daily.json().summaries.find((row: { date: string }) => row.date === "2026-09-10");
    assert.equal(gap?.consumptionTotal, null);
    assert.equal(gap?.valueKwh, null);

    const shares = await app.inject({
      cookies: { solar_device_credential: knPair.credential },
      method: "GET",
      url: "/api/metrics/department-shares?range=day"
    });
    assert.equal(shares.statusCode, 200);
    assert.deepEqual(
      shares.json().shares.map((share: { ratio: number | null }) => Math.round((share.ratio ?? 0) * 100)),
      [50, 30, 20]
    );

    const draftBefore = database.prepare(
      "SELECT version, config_json FROM display_page_stage_configs WHERE page_key = 'overview' AND stage = 'draft'"
    ).get();
    const previewResponse = await app.inject({
      method: "POST",
      payload: {
        context: { kind: "site", siteScope: "kn" },
        stage: "draft",
        unsavedRegions: { heroCopyLayout: { left: 42 } }
      },
      url: "/api/display-pages/overview/data-preview"
    });
    assert.notEqual(previewResponse.statusCode, 500);
    assert.equal(previewResponse.json().preview?.applied ?? false, false);
    const draftAfter = database.prepare(
      "SELECT version, config_json FROM display_page_stage_configs WHERE page_key = 'overview' AND stage = 'draft'"
    ).get();
    assert.deepEqual(draftAfter, draftBefore);

    const withoutToken = await app.inject({
      method: "POST",
      payload: { publishedBy: "q1" },
      url: "/api/display-pages/overview/publish"
    });
    assert.equal(withoutToken.statusCode, 422);
    assert.equal(
      withoutToken.json().validation.findings.some((finding: { code: string }) => finding.code === "PREFLIGHT_TOKEN_REQUIRED"),
      true
    );

    const unsaved = await app.inject({
      method: "POST",
      payload: { publishedBy: "q1", unsavedBindings: true },
      url: "/api/display-pages/overview/publish"
    });
    assert.equal(
      unsaved.json().validation.findings.some((finding: { code: string }) => finding.code === "UNSAVED_BINDINGS"),
      true
    );

    const preflight = await app.inject({
      method: "POST",
      payload: { unsavedBindings: false },
      url: "/api/display-pages/overview/validate"
    });
    const preflightBody = preflight.json() as { expectedVersion: number; preflightToken: string };
    assert.equal(typeof preflightBody.expectedVersion, "number");
    assert.equal(typeof preflightBody.preflightToken, "string");
    const published = await app.inject({
      method: "POST",
      payload: {
        expectedVersion: preflightBody.expectedVersion,
        preflightToken: preflightBody.preflightToken,
        publishedBy: "q1"
      },
      url: "/api/display-pages/overview/publish"
    });
    assert.equal(published.statusCode, 200);
    assert.equal(published.json().validation.canPublish, true);
  } finally {
    await app.close();
  }
});
