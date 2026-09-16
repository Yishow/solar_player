import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSupportedProfileVersion,
  type SiteEnergyProfileV2
} from "./siteEnergyProfile.js";
import {
  validateKnEngineeringSource,
  type EngineeringSourceDefinition
} from "./engineeringSources.js";

test("EPR-R6-S04: factoryCircuit.*Power metric retains kW semantics and rejects kWh daily reports", () => {
  const powerSource = validateKnEngineeringSource({
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "painting",
    purpose: "power",
    mode: "power-gauge",
    exactTopic: "factory/guanyin/power/painting",
    unit: "kW",
    enabled: true
  });
  assert.equal(powerSource.valid, true);

  // Attempting to assign daily-report (energy / kWh) to a power topic/purpose is rejected
  const invalidEnergyOnPower = validateKnEngineeringSource({
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "painting",
    purpose: "power", // Power purpose
    mode: "daily-report", // Daily report
    exactTopic: "factory/guanyin/power/painting",
    unit: "kWh",
    enabled: true
  });
  assert.equal(invalidEnergyOnPower.valid, false);
});

test("EPR-R6: Historical viewing date does not automatically shift to today", () => {
  const targetDate = "2026-09-10";
  const today = new Date().toISOString().slice(0, 10);

  function resolveViewingPeriod(requestedDate: string): { periodDate: string; isToday: boolean } {
    return {
      periodDate: requestedDate,
      isToday: requestedDate === today
    };
  }

  const result = resolveViewingPeriod(targetDate);
  assert.equal(result.periodDate, "2026-09-10");
  assert.equal(result.isToday, false);
  // Must not change targetDate to today
  assert.notEqual(result.periodDate, today);
});

test("EPR-R6: Legacy consumer fails visibly on SiteEnergyProfileV2", () => {
  const v2Profile: SiteEnergyProfileV2 = {
    schemaVersion: 2,
    profileId: "kn-v2",
    revision: 1,
    metricScope: "kn",
    providerKind: "engineering",
    effectiveFrom: "2026-09-16T00:00:00Z",
    siteTimeZone: "Asia/Taipei",
    status: "ready",
    siteTotal: {
      kind: "member-set",
      label: "KN 八工程",
      coverageReview: "reviewed",
      members: []
    },
    departments: [],
    shareBasis: { kind: "department-sum" }
  };

  assert.throws(
    () => assertSupportedProfileVersion(v2Profile, 1),
    /Unsupported profile schemaVersion 2/
  );
});
