import assert from "node:assert/strict";
import test from "node:test";
import {
  validateSiteEnergyProfile,
  validateSiteEnergyProfileV2,
  assertSupportedProfileVersion,
  type SiteEnergyProfileV1,
  type SiteEnergyProfileV2,
  type SiteEnergyProfile
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

  // The versioned entry point keeps the V2 shape and does not coerce it to V1.
  const versioned: SiteEnergyProfile = v2;
  assert.equal(validateSiteEnergyProfile(versioned).ok, true);

  // Consumer expecting v2 accepts v2
  assert.doesNotThrow(() => assertSupportedProfileVersion(v2, 2));

  // Legacy consumer expecting v1 MUST fail with explicit unsupported error (no silent downgrade)
  assert.throws(
    () => assertSupportedProfileVersion(v2, 1),
    /Unsupported profile schemaVersion 2/
  );
});

test("EPR-R6: V2 engineering profile rejects cumulative-energy accounting member mode", () => {
  const v2 = {
    schemaVersion: 2,
    profileId: "kn-cumulative-engineering",
    revision: 1,
    metricScope: "kn",
    providerKind: "engineering",
    effectiveFrom: "2026-09-16T00:00:00Z",
    siteTimeZone: "Asia/Taipei",
    status: "ready",
    siteTotal: {
      kind: "member-set",
      label: "KN 累計工程總量",
      coverageReview: "reviewed",
      members: [{
        kind: "engineering",
        sourceRef: "kn-eng-stamping-cumulative",
        engineeringId: "stamping",
        mode: "cumulative-energy"
      }]
    },
    departments: [],
    shareBasis: { kind: "site-main" }
  } as unknown as SiteEnergyProfileV2;

  const result = validateSiteEnergyProfileV2(v2);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) =>
    error.code === "PROFILE_PROVIDER_INVALID"
    && error.field === "siteTotal.members[0].mode"
  ));
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
  assert.ok(res.errors.some((error) => error.code === "PROFILE_PROVIDER_INVALID"));
  assert.match(
    res.errors.map((e) => e.message).join(";"),
    /Overlapping accounting inputs forbidden/
  );
});

test("EPR-R6: duplicate engineering identities in one additive set are rejected", () => {
  const v2: SiteEnergyProfileV2 = {
    schemaVersion: 2,
    profileId: "kn-duplicate-engineering",
    revision: 1,
    metricScope: "kn",
    providerKind: "engineering",
    effectiveFrom: "2026-09-16T00:00:00Z",
    siteTimeZone: "Asia/Taipei",
    status: "ready",
    siteTotal: {
      kind: "member-set",
      label: "KN 重複工程",
      coverageReview: "needs-review",
      members: [
        {
          kind: "engineering",
          sourceRef: "kn-eng-painting-energy",
          engineeringId: "painting",
          mode: "daily-report"
        },
        {
          kind: "engineering",
          sourceRef: "kn-eng-painting-energy-pub-B",
          engineeringId: "painting",
          mode: "daily-report"
        }
      ]
    },
    departments: [],
    shareBasis: { kind: "site-main" }
  };

  const result = validateSiteEnergyProfileV2(v2);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "PROFILE_OVERLAP_CONFLICT"));
  assert.ok(result.errors.some((error) => error.field.includes("siteTotal.members")));
});

test("EPR-R6: invalid engineering reference shape reports provider fields", () => {
  const v2 = {
    schemaVersion: 2,
    profileId: "kn-invalid-engineering-ref",
    revision: 1,
    metricScope: "kn",
    providerKind: "engineering",
    effectiveFrom: "2026-09-16T00:00:00Z",
    siteTimeZone: "Asia/Taipei",
    status: "ready",
    siteTotal: {
      kind: "member-set",
      label: "KN 無效工程來源",
      coverageReview: "needs-review",
      members: [
        {
          kind: "engineering",
          sourceRef: " ",
          engineeringId: "unknown",
          mode: "daily-report"
        }
      ]
    },
    departments: [],
    shareBasis: { kind: "site-main" }
  } as unknown as SiteEnergyProfileV2;

  const result = validateSiteEnergyProfileV2(v2);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "PROFILE_PROVIDER_INVALID"));
  assert.ok(result.errors.some((error) => error.field.includes("sourceRef")));
  assert.ok(result.errors.some((error) => error.field.includes("engineeringId")));
});

test("EPR-R6: unsupported profile schema returns a stable version error", () => {
  const result = validateSiteEnergyProfile({ schemaVersion: 99 });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "PROFILE_VERSION_UNSUPPORTED"));
  assert.ok(result.errors.some((error) => error.field === "schemaVersion"));

  assert.throws(
    () => assertSupportedProfileVersion({ schemaVersion: 99 }, 2),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "PROFILE_VERSION_UNSUPPORTED");
      return true;
    }
  );
});
