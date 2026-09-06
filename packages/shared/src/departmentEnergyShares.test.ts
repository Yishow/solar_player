import assert from "node:assert/strict";
import test from "node:test";
import { resolveDepartmentShares } from "./departmentEnergyShares.js";
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
});
