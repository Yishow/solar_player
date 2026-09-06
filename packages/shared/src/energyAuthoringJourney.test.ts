import assert from "node:assert/strict";
import test from "node:test";
import { admitMeterReading, normalizeEnergyToKwhDecimal } from "./meterReading.js";
import { resolvePeriodConsumption } from "./periodConsumption.js";
import { resolveDepartmentShares } from "./departmentEnergyShares.js";
import { previewMapping, applyMapping, compileSelector, extractBySelector, extractDecimalLexeme } from "./guidedMqttMapping.js";
import { unifyPublishPreflight } from "./displayPublishPreflight.js";
import { previewUnsavedBinding } from "./unsavedBindingPreview.js";
import { siteEnergySetupHref } from "./guidedSiteEnergySetup.js";
import { nextOnboardingStep } from "./guidedOnboarding.js";
import { buildMonthlyConsumptionSeries } from "./monthlyConsumptionSeries.js";
import type { MeterSourceDefinition } from "./meterReading.js";
import type { SiteEnergyProfileV1 } from "./siteEnergyProfile.js";

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
  sourceRevision: 1,
  sourceTimestampTimeZone: "UTC",
  timestampPolicy: "source-required"
};

const profile: SiteEnergyProfileV1 = {
  departments: [
    { accountingIncluded: true, coverageReview: "reviewed", departmentId: "a", memberChannelIds: ["a"], nameZh: "A" }
  ],
  effectiveFrom: "2026-09-01T00:00:00+08:00",
  metricScope: "kn",
  profileId: "kn-energy",
  revision: 1,
  schemaVersion: 1,
  shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei",
  siteTotal: { coverageReview: "reviewed", kind: "meter-set", label: "總錶", memberChannelIds: ["kn-main"] },
  status: "ready"
};

test("Q1 journey: mapping preview, ingest, period delta, department share, preflight", () => {
  assert.equal(nextOnboardingStep("connection"), "site");
  assert.equal(siteEnergySetupHref("kn"), "/settings/data-hub?scope=kn&task=energy");
  const selector = compileSelector("value", "MAIN");
  assert.equal(extractDecimalLexeme(extractBySelector({ tag: "MAIN", value: "10000" }, selector)), "10000");
  const preview = previewMapping({
    channelId: "kn-main",
    energyFlowRole: "consumption",
    measurementKind: "cumulative-energy",
    metricScope: "kn",
    selector,
    timestampPolicy: "source-required"
  });
  assert.equal(applyMapping({ canonicalDraft: preview.canonicalDraft, idempotencyKey: "q1", previewToken: preview.previewToken }).applied, true);
  const admitted = admitMeterReading(source, {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: normalizeEnergyToKwhDecimal("10000", "kWh"),
    receivedAt: "2026-09-01T00:00:01.000Z",
    retain: false,
    sourceTimestamp: "2026-08-31T16:00:00Z"
  });
  assert.equal(admitted.status, "accepted");
  const period = resolvePeriodConsumption({
    asOf: "2026-09-01T16:00:00Z",
    meterIds: ["kn-main"],
    period: { day: 1, kind: "day", month: 9, year: 2026 },
    profile,
    samples: [
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T00:00:00+08:00", valueKwh: "10000" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T23:59:00+08:00", valueKwh: "10300" }
    ]
  });
  assert.equal(period.valueKwh, "300");
  const monthSeries = buildMonthlyConsumptionSeries([
    { date: "2026-09-01", valueKwh: period.valueKwh }
  ], "2026-09");
  assert.equal(monthSeries.points[0]?.valueKwh, "300");
  const shares = resolveDepartmentShares({ periodDeltas: { a: "150", "kn-main": "300" }, profile });
  assert.equal(shares.shares[0]?.ratio, 0.5);
  const bindingPreview = previewUnsavedBinding(
    { metricKey: "consumptionEnergy", metricScope: "kn" },
    { metricKey: "factoryCircuit.stampingPower", metricScope: "kn" }
  );
  assert.equal(bindingPreview.applied, false);
  const preflight = unifyPublishPreflight({
    bindingErrors: [],
    energyProfileReady: true,
    unsavedBindings: bindingPreview.applied === false && bindingPreview.preview.metricKey !== bindingPreview.published.metricKey
  });
  assert.equal(preflight.canPublish, false);
  assert.equal(preflight.findings[0]?.code, "UNSAVED_BINDINGS");
});
