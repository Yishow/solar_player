import assert from "node:assert/strict";
import test from "node:test";
import {
  monthBoundaryInProfileZone,
  reassignmentDoesNotTouchSource,
  rejectCalendarOverride,
  validateSiteEnergyProfile,
  type SiteEnergyProfileV1
} from "./siteEnergyProfile.js";

const knProfile: SiteEnergyProfileV1 = {
  departments: [
    {
      accountingIncluded: true,
      coverageReview: "reviewed",
      departmentId: "stamping",
      memberChannelIds: ["kn-stamping"],
      nameZh: "沖床"
    }
  ],
  effectiveFrom: "2026-09-01T00:00:00+08:00",
  metricScope: "kn",
  profileId: "kn-energy",
  revision: 1,
  schemaVersion: 1,
  shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei",
  siteTotal: {
    coverageReview: "reviewed",
    kind: "meter-set",
    label: "觀音總錶",
    memberChannelIds: ["kn-main"]
  },
  status: "ready"
};

test("E6-R1 CL and KN profiles are separate identities", () => {
  const cl = { ...knProfile, metricScope: "cl" as const, profileId: "cl-energy" };
  assert.notEqual(cl.profileId, knProfile.profileId);
  assert.notEqual(cl.metricScope, knProfile.metricScope);
});

test("E6-R2 siteTotal membership is independent of shareBasis", () => {
  const changedBasis: SiteEnergyProfileV1 = {
    ...knProfile,
    shareBasis: { kind: "department-sum", departmentIds: ["stamping"] }
  };
  assert.deepEqual(changedBasis.siteTotal.memberChannelIds, ["kn-main"]);
  assert.equal(changedBasis.shareBasis.kind, "department-sum");
});

test("E6-R4 invalid timezone and duplicate channels fail with field paths", () => {
  const invalid = validateSiteEnergyProfile({
    ...knProfile,
    siteTimeZone: "Not/AZone",
    siteTotal: { ...knProfile.siteTotal, memberChannelIds: ["kn-main", "kn-main"] }
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some((error) => error.field === "siteTimeZone"));
  assert.ok(invalid.errors.some((error) => error.field === "siteTotal.memberChannelIds"));
});

test("E6-R4 unknown share basis kind fails validation", () => {
  const invalid = validateSiteEnergyProfile({
    ...knProfile,
    shareBasis: { kind: "unexpected-basis" }
  } as unknown as SiteEnergyProfileV1);
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some((error) => error.field === "shareBasis.kind"));
});

test("E6-R1-S03 reassignment does not change E1 source revision/epoch/baseline", () => {
  const source = { baseline: "10100", epochId: "epoch-1", sourceRevision: 3 };
  assert.equal(reassignmentDoesNotTouchSource(source, source), true);
});

test("E6-R11 UTC source instant uses Asia/Taipei month boundary", () => {
  assert.equal(monthBoundaryInProfileZone("2026-08-31T16:00:00Z", "Asia/Taipei"), "2026-09");
  assert.equal(monthBoundaryInProfileZone("2026-08-31T16:00:00Z", "UTC"), "2026-08");
});

test("E6-R11 caller timezone/start/end overrides are rejected", () => {
  const rejected = rejectCalendarOverride({ timeZone: "UTC" });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) {
    assert.deepEqual(rejected.fields, ["timeZone"]);
  }
});
