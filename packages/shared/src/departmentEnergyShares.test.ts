import assert from "node:assert/strict";
import test from "node:test";
import { findOverlappingDepartmentChannels, resolveDepartmentShares } from "./departmentEnergyShares.js";
import type { SiteEnergyProfileV1 } from "./siteEnergyProfile.js";

const profile: SiteEnergyProfileV1 = {
  departments: [
    { accountingIncluded: true, coverageReview: "reviewed", departmentId: "a", memberChannelIds: ["a"], nameZh: "A" },
    { accountingIncluded: true, coverageReview: "reviewed", departmentId: "b", memberChannelIds: ["b"], nameZh: "B" },
    { accountingIncluded: true, coverageReview: "reviewed", departmentId: "c", memberChannelIds: ["c"], nameZh: "C" }
  ],
  effectiveFrom: "2026-09-01T00:00:00+08:00",
  metricScope: "kn",
  profileId: "kn-energy",
  revision: 1,
  schemaVersion: 1,
  shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei",
  siteTotal: { coverageReview: "reviewed", kind: "meter-set", label: "總錶", memberChannelIds: ["main"] },
  status: "ready"
};

test("E5-R1 250/150/100 against site-main 500 becomes 50/30/20", () => {
  const result = resolveDepartmentShares({
    periodDeltas: { a: "250", b: "150", c: "100", main: "500" },
    profile
  });
  assert.deepEqual(result.shares.map((share) => Math.round((share.ratio ?? 0) * 100)), [50, 30, 20]);
  assert.equal(result.unallocatedKwh, "0");
  assert.equal(result.quality, "exact");
});

test("E5-R2 missing site-main baseline does not switch to department sum", () => {
  const result = resolveDepartmentShares({
    periodDeltas: { a: "250", b: "150", c: "100" },
    profile
  });
  assert.equal(result.quality, "unavailable");
  assert.equal(result.shares.every((share) => share.ratio === null), true);
});

test("E5-R3 zero total stays unavailable rather than NaN percentages", () => {
  const result = resolveDepartmentShares({
    periodDeltas: { a: "0", b: "0", c: "0", main: "0" },
    profile
  });
  assert.equal(result.shares.every((share) => share.ratio === null), true);
  assert.equal(result.quality, "unavailable");
});

test("E5-R4 duplicate department membership is rejected", () => {
  const overlapping: SiteEnergyProfileV1 = {
    ...profile,
    departments: [
      { ...profile.departments[0]!, memberChannelIds: ["shared"], nameZh: "沖壓" },
      { ...profile.departments[1]!, memberChannelIds: ["shared"], nameZh: "塗裝" }
    ]
  };
  const conflicts = findOverlappingDepartmentChannels(overlapping);
  assert.equal(conflicts[0]?.channelId, "shared");
  assert.deepEqual(conflicts[0]?.departmentNames, ["沖壓", "塗裝"]);
  const result = resolveDepartmentShares({ periodDeltas: { shared: "10", main: "10" }, profile: overlapping });
  assert.equal(result.quality, "unavailable");
});
