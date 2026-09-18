import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateEngineeringPeriodResults,
  isTaipeiLocalDayInterval,
  toEngineeringAccountingPeriodResult,
  type EngineeringDailyResultItem
} from "./engineeringPeriodResults.js";
import { KN_ENGINEERING_IDS } from "./engineeringSources.js";

test("EPR-R4-S01: two daily values sum to 220 kWh, not 20 kWh", () => {
  const day1: EngineeringDailyResultItem = {
    engineeringId: "stamping",
    dateStr: "2026-09-14",
    periodStart: "2026-09-13T16:00:00Z",
    periodEnd: "2026-09-14T16:00:00Z",
    value: 100,
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 1
  };
  const day2: EngineeringDailyResultItem = {
    engineeringId: "stamping",
    dateStr: "2026-09-15",
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    value: 120,
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 1
  };

  const res = aggregateEngineeringPeriodResults([day1, day2], {
    expectedEngineeringIds: ["stamping"]
  });

  assert.equal(res.totalKWh, 220);
  assert.equal(res.isComplete, true);
  assert.equal(res.itemsByEngineering.stamping, 220);
});

test("EPR-R4-S02: seven received, one missing yields partial with missing ID", () => {
  const items: EngineeringDailyResultItem[] = KN_ENGINEERING_IDS.filter(
    (id) => id !== "ed_coating"
  ).map((id) => ({
    engineeringId: id,
    dateStr: "2026-09-15",
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    value: 100,
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 1
  }));

  const res = aggregateEngineeringPeriodResults(items);

  assert.equal(res.isComplete, false);
  assert.equal(res.coverage, "partial");
  assert.deepEqual(res.missingEngineeringIds, ["ed_coating"]);
  assert.equal(res.totalKWh, 700);
});

test("EPR-R4-S04: all valid results are zero yields unavailable ratios with zeroBasis", () => {
  const items: EngineeringDailyResultItem[] = KN_ENGINEERING_IDS.map((id) => ({
    engineeringId: id,
    dateStr: "2026-09-15",
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    value: 0,
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 1
  }));

  const res = aggregateEngineeringPeriodResults(items);
  assert.equal(res.isComplete, true);
  assert.equal(res.totalKWh, 0);
  assert.equal(res.zeroBasis, true);
  for (const id of KN_ENGINEERING_IDS) {
    assert.equal(res.sharesByEngineering[id], null);
  }
});

test("EPR-R1: daily intervals use half-open Taipei local-midnight boundaries", () => {
  assert.equal(
    isTaipeiLocalDayInterval("2026-09-14T16:00:00Z", "2026-09-15T16:00:00Z"),
    true
  );
  assert.equal(
    isTaipeiLocalDayInterval("2026-09-15T00:00:00Z", "2026-09-16T00:00:00Z"),
    false
  );
});

test("EPR-R4: a later revision replaces an earlier daily value", () => {
  const results: EngineeringDailyResultItem[] = [
    {
      engineeringId: "utility",
      dateStr: "2026-09-15",
      periodStart: "2026-09-14T16:00:00Z",
      periodEnd: "2026-09-15T16:00:00Z",
      value: 100,
      periodStatus: "final",
      coverage: "complete",
      quality: "valid",
      dataRevision: 1
    },
    {
      engineeringId: "utility",
      dateStr: "2026-09-15",
      periodStart: "2026-09-14T16:00:00Z",
      periodEnd: "2026-09-15T16:00:00Z",
      value: 125,
      periodStatus: "final",
      coverage: "complete",
      quality: "valid",
      dataRevision: 2
    }
  ];

  const summary = aggregateEngineeringPeriodResults(results, { expectedEngineeringIds: ["utility"] });
  assert.equal(summary.totalKWh, 125);
  assert.equal(summary.itemsByEngineering.utility, 125);
});

test("EPR-R4: no received daily result stays unavailable instead of becoming zero", () => {
  const summary = aggregateEngineeringPeriodResults([], { expectedEngineeringIds: ["utility"] });
  assert.equal(summary.totalKWh, null);
  assert.equal(summary.itemsByEngineering.utility, null);
  assert.equal(summary.zeroBasis, false);
});

test("EPR-R6: string values preserve exact decimal totals and engineering evidence", () => {
  const summary = aggregateEngineeringPeriodResults([
    {
      engineeringId: "painting",
      dateStr: "2026-09-14",
      periodStart: "2026-09-13T16:00:00Z",
      periodEnd: "2026-09-14T16:00:00Z",
      value: "0.1",
      periodStatus: "final",
      coverage: "complete",
      quality: "valid",
      dataRevision: 1
    },
    {
      engineeringId: "painting",
      dateStr: "2026-09-15",
      periodStart: "2026-09-14T16:00:00Z",
      periodEnd: "2026-09-15T16:00:00Z",
      value: "0.2",
      periodStatus: "final",
      coverage: "complete",
      quality: "valid",
      dataRevision: 1
    }
  ], { expectedEngineeringIds: ["painting"] });

  assert.equal(summary.totalKWhDecimal, "0.3");
  assert.deepEqual(summary.itemsByEngineeringDecimal, { painting: "0.3" });
  assert.equal(summary.totalKWh, 0.3);
  assert.equal(summary.itemsByEngineering.painting, 0.3);

  const result = toEngineeringAccountingPeriodResult({
    periodStart: "2026-09-13T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    siteTimeZone: "Asia/Taipei",
    profileRevision: 7,
    revisionFingerprint: "decimal-fingerprint",
    summary
  });
  assert.equal(result.valueKwh, "0.3");
  assert.deepEqual(result.engineeringValuesKwh, { painting: "0.3" });
  assert.deepEqual(result.engineeringShares, { painting: 1 });
  assert.notEqual(result.valueKwh, "0.30000000000000004");
});

test("EPR-R6: engineering summary adapts to the typed accounting result", () => {
  const summary = aggregateEngineeringPeriodResults([
    {
      engineeringId: "stamping",
      dateStr: "2026-09-14",
      periodStart: "2026-09-13T16:00:00Z",
      periodEnd: "2026-09-14T16:00:00Z",
      value: 100,
      periodStatus: "final",
      coverage: "complete",
      quality: "valid",
      dataRevision: 1
    },
    {
      engineeringId: "stamping",
      dateStr: "2026-09-15",
      periodStart: "2026-09-14T16:00:00Z",
      periodEnd: "2026-09-15T16:00:00Z",
      value: 120,
      periodStatus: "final",
      coverage: "complete",
      quality: "valid",
      dataRevision: 1
    }
  ], { expectedEngineeringIds: ["stamping"] });

  assert.deepEqual(
    toEngineeringAccountingPeriodResult({
      periodStart: "2026-09-13T16:00:00Z",
      periodEnd: "2026-09-15T16:00:00Z",
      siteTimeZone: "Asia/Taipei",
      profileRevision: 7,
      revisionFingerprint: "fingerprint-1",
      summary
    }),
    {
      providerKind: "engineering",
      periodStart: "2026-09-13T16:00:00Z",
      periodEnd: "2026-09-15T16:00:00Z",
      siteTimeZone: "Asia/Taipei",
      profileRevision: 7,
      valueKwh: "220",
      quality: "valid",
      coverage: "complete",
      missingIdentities: [],
      revisionFingerprint: "fingerprint-1",
      engineeringValuesKwh: { stamping: "220" },
      engineeringShares: { stamping: 1 }
    }
  );
});

test("EPR-R6: typed engineering result keeps partial subtotal and distinguishes missing from zero", () => {
  const partial = aggregateEngineeringPeriodResults([{
    engineeringId: "stamping",
    dateStr: "2026-09-15",
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    value: 25,
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 1
  }], { expectedEngineeringIds: ["stamping", "body"] });
  const partialResult = toEngineeringAccountingPeriodResult({
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    siteTimeZone: "Asia/Taipei",
    profileRevision: 1,
    revisionFingerprint: "partial",
    summary: partial
  });
  assert.equal(partialResult.valueKwh, "25");
  assert.equal(partialResult.quality, "partial");
  assert.equal(partialResult.coverage, "partial");
  assert.deepEqual(partialResult.missingIdentities, ["body"]);

  const zero = aggregateEngineeringPeriodResults([{
    engineeringId: "stamping",
    dateStr: "2026-09-15",
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    value: 0,
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 1
  }], { expectedEngineeringIds: ["stamping"] });
  assert.equal(toEngineeringAccountingPeriodResult({
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    siteTimeZone: "Asia/Taipei",
    profileRevision: 1,
    revisionFingerprint: "zero",
    summary: zero
  }).valueKwh, "0");

  const missing = aggregateEngineeringPeriodResults([], { expectedEngineeringIds: ["stamping"] });
  const missingResult = toEngineeringAccountingPeriodResult({
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    siteTimeZone: "Asia/Taipei",
    profileRevision: 1,
    revisionFingerprint: "missing",
    summary: missing
  });
  assert.equal(missingResult.valueKwh, null);
  assert.equal(missingResult.quality, "unavailable");
  assert.equal(missingResult.coverage, "unknown");
});

test("EPR-R6: an expected date missing for an otherwise present identity is partial", () => {
  const summary = aggregateEngineeringPeriodResults([{
    engineeringId: "stamping",
    dateStr: "2026-09-14",
    periodStart: "2026-09-13T16:00:00Z",
    periodEnd: "2026-09-14T16:00:00Z",
    value: 25,
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 1
  }], {
    expectedEngineeringIds: ["stamping"],
    expectedDateStrs: ["2026-09-14", "2026-09-15"]
  });
  const result = toEngineeringAccountingPeriodResult({
    periodStart: "2026-09-13T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    siteTimeZone: "Asia/Taipei",
    profileRevision: 1,
    revisionFingerprint: "missing-day",
    summary
  });
  assert.equal(summary.periodDays, 2);
  assert.equal(result.valueKwh, "25");
  assert.equal(result.quality, "partial");
  assert.equal(result.coverage, "partial");
  assert.deepEqual(result.missingIdentities, ["stamping"]);
});
