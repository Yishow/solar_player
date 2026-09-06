import assert from "node:assert/strict";
import test from "node:test";
import { resolvePeriodConsumption } from "./periodConsumption.js";
import type { SiteEnergyProfileV1 } from "./siteEnergyProfile.js";

const profile: SiteEnergyProfileV1 = {
  departments: [],
  effectiveFrom: "2026-01-01T00:00:00+08:00",
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

test("E2-R1 day 300 / month 4300 / year 8300 from cumulative samples", () => {
  const samples = [
    { channelId: "kn-main", sourceTimestamp: "2026-09-01T00:00:00+08:00", valueKwh: "10000" },
    { channelId: "kn-main", sourceTimestamp: "2026-09-01T23:59:00+08:00", valueKwh: "10300" },
    { channelId: "kn-main", sourceTimestamp: "2026-09-30T23:59:00+08:00", valueKwh: "14300" },
    { channelId: "kn-main", sourceTimestamp: "2026-12-31T23:59:00+08:00", valueKwh: "18300" }
  ];
  const day = resolvePeriodConsumption({
    asOf: "2026-09-01T16:00:00Z",
    meterIds: ["kn-main"],
    period: { day: 1, kind: "day", month: 9, year: 2026 },
    profile,
    samples
  });
  assert.equal(day.valueKwh, "300");
  const month = resolvePeriodConsumption({
    asOf: "2026-09-30T16:00:00Z",
    meterIds: ["kn-main"],
    period: { kind: "month", month: 9, year: 2026 },
    profile,
    samples
  });
  assert.equal(month.valueKwh, "4300");
  const year = resolvePeriodConsumption({
    asOf: "2026-12-31T16:00:00Z",
    meterIds: ["kn-main"],
    period: { kind: "year", year: 2026 },
    profile,
    samples
  });
  assert.equal(year.valueKwh, "8300");
});

test("E2 rejects caller timezone override and meters outside the profile", () => {
  assert.throws(
    () => resolvePeriodConsumption({
      asOf: "2026-09-01T00:00:00Z",
      meterIds: ["kn-main"],
      period: { kind: "month", month: 9, year: 2026 },
      profile,
      samples: [],
      timeZone: "UTC"
    }),
    /CALENDAR_OVERRIDE_REJECTED|siteTimeZone/
  );
  assert.throws(
    () => resolvePeriodConsumption({
      asOf: "2026-09-01T00:00:00Z",
      meterIds: ["foreign"],
      period: { kind: "month", month: 9, year: 2026 },
      profile,
      samples: []
    }),
    /METER_NOT_IN_PROFILE|outside/
  );
});

test("E2 does not clamp a negative counter jump to zero", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-09-01T16:00:00Z",
    meterIds: ["kn-main"],
    period: { day: 1, kind: "day", month: 9, year: 2026 },
    profile,
    samples: [
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T00:00:00+08:00", valueKwh: "80000" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T12:00:00+08:00", valueKwh: "15" }
    ]
  });
  assert.equal(result.quality, "invalid");
  assert.equal(result.valueKwh, null);
});
