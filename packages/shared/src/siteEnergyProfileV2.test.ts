import assert from "node:assert/strict";
import test from "node:test";
import {
  validateSiteEnergyProfile,
  validateSiteEnergyProfileV2,
  assertSupportedProfileVersion,
  type SiteEnergyProfileV1,
  type SiteEnergyProfileV2
} from "./siteEnergyProfile.js";

test("EPR-R6-S02: Existing CL profile V1 remains fully valid and compatible", () => {
  const v1: SiteEnergyProfileV1 = {
    schemaVersion: 1,
    profileId: "cl-main",
    revision: 1,
    metricScope: "cl",
    effectiveFrom: "2026-09-01T00:00:00Z",
    siteTimeZone: "Asia/Taipei",
    status: "ready",
    siteTotal: {
      kind: "meter-set",
      label: "CL 全廠總用電",
      coverageReview: "reviewed",
      memberChannelIds: ["cl-main-meter"]
    },
    departments: [
      {
        departmentId: "stamping",
        nameZh: "沖壓",
        accountingIncluded: true,
        coverageReview: "reviewed",
        memberChannelIds: ["cl-dept-stamping"]
      }
    ],
    shareBasis: {
      kind: "site-main"
    }
  };

  const res = validateSiteEnergyProfile(v1);
  assert.equal(res.ok, true);
  assert.equal(res.errors.length, 0);

  // Consumer expecting v1 accepts v1
  assert.doesNotThrow(() => assertSupportedProfileVersion(v1, 1));
});

test("EPR-R6-S01: Engineering V2 profile references engineering source without fake meterId", () => {
  const v2: SiteEnergyProfileV2 = {
    schemaVersion: 2,
    profileId: "kn-engineering",
    revision: 1,
    metricScope: "kn",
    providerKind: "engineering",
    effectiveFrom: "2026-09-16T00:00:00Z",
    siteTimeZone: "Asia/Taipei",
    status: "ready",
    siteTotal: {
      kind: "member-set",
      label: "KN 八工程合計",
      coverageReview: "reviewed",
      members: [
        {
          kind: "engineering",
          sourceRef: "kn-eng-stamping-energy",
          engineeringId: "stamping",
          mode: "daily-report"
        }
      ]
    },
    departments: [
      {
        departmentId: "stamping",
        nameZh: "沖壓工程",
        accountingIncluded: true,
        coverageReview: "reviewed",
        members: [
          {
            kind: "engineering",
            sourceRef: "kn-eng-stamping-energy",
            engineeringId: "stamping",
            mode: "daily-report"
          }
        ]
      }
    ],
    shareBasis: {
      kind: "department-sum"
    }
  };

  const res = validateSiteEnergyProfileV2(v2);
  assert.equal(res.ok, true);
  assert.equal(res.errors.length, 0);

  // Consumer expecting v2 accepts v2
  assert.doesNotThrow(() => assertSupportedProfileVersion(v2, 2));

  // Legacy consumer expecting v1 MUST fail with explicit unsupported error (no silent downgrade)
  assert.throws(
    () => assertSupportedProfileVersion(v2, 1),
    /Unsupported profile schemaVersion 2/
  );
});

test("EPR-R6-S03: Overlapping accounting inputs mix physical-meter and engineering is rejected", () => {
  const v2Mixed: SiteEnergyProfileV2 = {
    schemaVersion: 2,
    profileId: "kn-mixed",
    revision: 1,
    metricScope: "kn",
    providerKind: "engineering",
    effectiveFrom: "2026-09-16T00:00:00Z",
    siteTimeZone: "Asia/Taipei",
    status: "ready",
    siteTotal: {
      kind: "member-set",
      label: "KN 混用總表",
      coverageReview: "needs-review",
      members: [
        {
          kind: "engineering",
          sourceRef: "kn-eng-painting-energy",
          engineeringId: "painting",
          mode: "daily-report"
        },
        {
          kind: "physical-meter",
          channelId: "raw-meter-painting-1"
        }
      ]
    },
    departments: [],
    shareBasis: {
      kind: "site-main"
    }
  };

  const res = validateSiteEnergyProfileV2(v2Mixed);
  assert.equal(res.ok, false);
  assert.match(
    res.errors.map((e) => e.message).join(";"),
    /Overlapping accounting inputs forbidden/
  );
});
