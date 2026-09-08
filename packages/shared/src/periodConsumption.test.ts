import assert from "node:assert/strict";
import test from "node:test";
import { periodWindow, resolvePeriodConsumption, resolveReviewPeriodConsumption } from "./periodConsumption.js";
import { createDefaultFreshnessPolicy } from "./freshnessPolicy.js";
import type { SiteEnergyProfileV1 } from "./siteEnergyProfile.js";

const profile: SiteEnergyProfileV1 = {
  departments: [], effectiveFrom: "2026-01-01T00:00:00+08:00", metricScope: "kn",
  profileId: "kn-energy", revision: 1, schemaVersion: 1, shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei", status: "ready",
  siteTotal: { coverageReview: "reviewed", kind: "meter-set", label: "觀音總錶", memberChannelIds: ["kn-main"] }
};

test("E2-R2 Taipei September start is 2026-08-31T16:00:00Z", () => {
  const window = periodWindow({ kind: "month", month: 9, year: 2026 }, "Asia/Taipei");
  assert.equal(new Date(window.startMs).toISOString(), "2026-08-31T16:00:00.000Z");
});

test("E2-R1 day 300 / month 4300 / year 8300 from cumulative samples", () => {
  const samples = [
    { channelId: "kn-main", sourceTimestamp: "2026-01-01T00:00:00+08:00", valueKwh: "10000" },
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

test("E6 review resolver calculates an unpersisted draft without inventing a persisted revision", () => {
  const draft = { ...profile, revision: 0, siteTimeZone: "UTC" };
  const result = resolveReviewPeriodConsumption({
    asOf: "2026-09-30T12:00:00Z",
    definitionRevision: [{ channelId: "kn-main", epochId: "epoch-1", meterId: "kn-main", sourceRevision: 1 }],
    meterIds: ["kn-main"],
    period: { kind: "month", month: 9, year: 2026 },
    profile: draft,
    reviewContext: "profile-draft",
    samples: [
      { channelId: "kn-main", epochId: "epoch-1", meterId: "kn-main", sourceRevision: 1, sourceTimestamp: "2026-09-01T00:00:00Z", valueKwh: "100" },
      { channelId: "kn-main", epochId: "epoch-1", meterId: "kn-main", sourceRevision: 1, sourceTimestamp: "2026-09-30T11:59:00Z", valueKwh: "500" }
    ]
  });
  assert.equal(result.valueKwh, "400");
  assert.equal(result.profileRevision, 0);
  assert.equal(result.provenance?.reviewContext, "profile-draft");
  assert.equal(result.siteTimeZone, "UTC");
  assert.throws(
    () => resolvePeriodConsumption({
      asOf: "2026-09-30T12:00:00Z",
      meterIds: ["kn-main"],
      period: { kind: "month", month: 9, year: 2026 },
      profile: draft,
      samples: []
    }),
    (error: Error & { code?: string }) => error.code === "UNKNOWN_PROFILE_REVISION"
  );
});

test("E2 uses at-or-before period-start baseline rather than first in-period sample", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-09-01T16:00:00Z",
    meterIds: ["kn-main"],
    period: { day: 1, kind: "day", month: 9, year: 2026 },
    profile,
    samples: [
      { channelId: "kn-main", sourceTimestamp: "2026-08-31T23:59:40+08:00", valueKwh: "10000" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T00:10:00+08:00", valueKwh: "10040" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T23:59:00+08:00", valueKwh: "10300" }
    ]
  });
  assert.equal(result.valueKwh, "300");
  assert.equal(result.quality, "estimated-boundary");
});

test("E2 does not fabricate a start baseline from a post-start reading", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-09-30T16:00:00Z",
    meterIds: ["kn-main"],
    period: { kind: "month", month: 9, year: 2026 },
    profile,
    samples: [
      { channelId: "kn-main", sourceTimestamp: "2026-09-10T12:00:00+08:00", valueKwh: "11000" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-30T12:00:00+08:00", valueKwh: "14000" }
    ]
  });
  assert.equal(result.valueKwh, null);
  assert.equal(result.quality, "partial");
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

test("E1 does not bridge observations from different source revisions or epochs", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-09-01T16:00:00Z",
    meterIds: ["kn-main"],
    period: { day: 1, kind: "day", month: 9, year: 2026 },
    profile,
    samples: [
      { channelId: "kn-main", meterId: "kn-main", sourceRevision: 1, epochId: "epoch-1", sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "100" },
      { channelId: "kn-main", meterId: "kn-main", sourceRevision: 1, epochId: "epoch-1", sourceTimestamp: "2026-09-01T04:00:00Z", valueKwh: "150" },
      { channelId: "kn-main", meterId: "kn-main", sourceRevision: 2, epochId: "epoch-2", sourceTimestamp: "2026-09-01T05:00:00Z", valueKwh: "10" },
      { channelId: "kn-main", meterId: "kn-main", sourceRevision: 2, epochId: "epoch-2", sourceTimestamp: "2026-09-01T15:59:00Z", valueKwh: "200" }
    ]
  });
  assert.equal(result.quality, "partial");
  assert.equal(result.valueKwh, null);
});

test("E2 marks an unexplained internal decrease invalid despite positive endpoints", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-09-01T16:00:00Z",
    meterIds: ["kn-main"],
    period: { day: 1, kind: "day", month: 9, year: 2026 },
    profile,
    samples: [
      { channelId: "kn-main", sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "100" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T04:00:00Z", valueKwh: "150" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T05:00:00Z", valueKwh: "10" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T15:59:00Z", valueKwh: "200" }
    ]
  });
  assert.equal(result.quality, "invalid");
  assert.equal(result.valueKwh, null);
});

test("E2 keeps a single baseline partial instead of exact zero", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-09-01T16:00:00Z",
    meterIds: ["kn-main"],
    period: { day: 1, kind: "day", month: 9, year: 2026 },
    profile,
    samples: [
      { channelId: "kn-main", sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "100" }
    ]
  });
  assert.equal(result.quality, "partial");
  assert.equal(result.valueKwh, null);
});

test("E2 rejects an invalid asOf instead of falling back to the period end", () => {
  assert.throws(
    () => resolvePeriodConsumption({
      asOf: "not-a-timestamp",
      meterIds: ["kn-main"],
      period: { day: 1, kind: "day", month: 9, year: 2026 },
      profile,
      samples: []
    }),
    (error: Error & { code?: string }) => error.code === "INVALID_AS_OF"
  );
});

test("E2 orders source instants numerically rather than lexically", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-09-01T16:00:00Z",
    boundaryMaxAgeSeconds: 10_000,
    meterIds: ["kn-main"],
    period: { day: 1, kind: "day", month: 9, year: 2026 },
    profile,
    samples: [
      { channelId: "kn-main", sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "100" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T00:00:00-14:00", valueKwh: "200" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T00:30:00+14:00", valueKwh: "90" }
    ]
  });
  assert.equal(result.valueKwh, "100");
});

test("E2 does not call a closed period exact when its closing boundary is stale", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-09-02T00:00:00Z",
    boundaryMaxAgeSeconds: 300,
    meterIds: ["kn-main"],
    period: { day: 1, kind: "day", month: 9, year: 2026 },
    profile,
    samples: [
      { channelId: "kn-main", sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "100" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T15:50:00Z", valueKwh: "200" }
    ]
  });
  assert.equal(result.quality, "partial");
  assert.equal(result.valueKwh, null);
});

test("E2 does not fabricate zero for a future period", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-08-31T15:59:00Z",
    meterIds: ["kn-main"],
    period: { day: 1, kind: "day", month: 9, year: 2026 },
    profile,
    samples: [
      { channelId: "kn-main", sourceTimestamp: "2026-08-31T15:00:00Z", valueKwh: "100" }
    ]
  });
  assert.equal(result.valueKwh, null);
  assert.notEqual(result.quality, "exact");
});

const dayInput = {
  asOf: "2026-09-01T16:00:00Z",
  meterIds: ["kn-main"],
  period: { day: 1, kind: "day" as const, month: 9, year: 2026 },
  profile
};

test("E2 discloses actual boundary samples, offsets and stale freshness", () => {
  const result = resolvePeriodConsumption({ ...dayInput, samples: [
    { channelId: "kn-main", readingId: "start", sourceTimestamp: "2026-08-31T15:59:40Z", valueKwh: "100" },
    { channelId: "kn-main", readingId: "end", sourceTimestamp: "2026-09-01T16:00:00Z", valueKwh: "200" }
  ], asOf: "2026-09-02T16:00:00Z" });
  assert.equal(result.valueKwh, "100");
  assert.equal(result.boundaryOffsets?.[0]?.startSeconds, -20);
  assert.deepEqual(result.baselineSampleIds, ["start"]);
  assert.deepEqual(result.endSampleIds, ["end"]);
  assert.equal(result.periodStart, "2026-08-31T16:00:00.000Z");
  assert.equal(result.freshness, "stale");
});

test("E2 keeps observed energy separate from an unproven full period", () => {
  const result = resolvePeriodConsumption({ ...dayInput, samples: [
    { channelId: "kn-main", sourceTimestamp: "2026-09-01T01:00:00Z", valueKwh: "100" },
    { channelId: "kn-main", sourceTimestamp: "2026-09-01T16:00:00Z", valueKwh: "200" }
  ] });
  assert.equal(result.valueKwh, null);
  assert.equal(result.observedDeltaKwh, "100");
  assert.ok(result.issues?.includes("MISSING_BASELINE:kn-main"));
});

test("E2 uses approved receipt-time estimates without calling exact boundaries exact", () => {
  const result = resolvePeriodConsumption({ ...dayInput, samples: [
    { channelId: "kn-main", sourceTimestamp: null, receivedAt: "2026-08-31T16:00:00Z", timestampQuality: "receive-time-estimated" as const, valueKwh: "100" },
    { channelId: "kn-main", sourceTimestamp: null, receivedAt: "2026-09-01T16:00:00Z", timestampQuality: "receive-time-estimated" as const, valueKwh: "125" }
  ] });
  assert.equal(result.valueKwh, "25");
  assert.equal(result.quality, "estimated-boundary");
});

test("E2 duplicate member selection cannot double count consumption", () => {
  assert.throws(() => resolvePeriodConsumption({ ...dayInput, meterIds: ["kn-main", "kn-main"], samples: [] }), /DUPLICATE_METER/);
});

test("E2 interval energy is counted once without inventing interval coverage", () => {
  const result = resolvePeriodConsumption({ ...dayInput, samples: [
    { channelId: "kn-main", sourceTimestamp: "2026-09-01T01:00:00Z", measurementKind: "interval-energy", valueKwh: "100" }
  ] });
  assert.equal(result.observedDeltaKwh, "100");
  assert.equal(result.valueKwh, null);
  assert.ok(result.issues?.includes("INTERVAL_COVERAGE_UNPROVEN:kn-main"));
});
test("E2 gauges cannot masquerade as period energy", () => {
  const result = resolvePeriodConsumption({ ...dayInput, samples: [
    { channelId: "kn-main", sourceTimestamp: "2026-08-31T16:00:00Z", measurementKind: "power-gauge", valueKwh: "100" },
    { channelId: "kn-main", sourceTimestamp: "2026-09-01T16:00:00Z", measurementKind: "power-gauge", valueKwh: "200" }
  ] });
  assert.equal(result.quality, "invalid");
  assert.equal(result.valueKwh, null);
});

test("E2 observed partial does not include energy before a stale start baseline", () => {
  const result = resolvePeriodConsumption({ ...dayInput, samples: [
    { channelId: "kn-main", sourceTimestamp: "2026-08-01T00:00:00Z", valueKwh: "100" },
    { channelId: "kn-main", sourceTimestamp: "2026-09-01T01:00:00Z", valueKwh: "200" },
    { channelId: "kn-main", sourceTimestamp: "2026-09-01T16:00:00Z", valueKwh: "250" }
  ] });
  assert.equal(result.valueKwh, null);
  assert.equal(result.observedDeltaKwh, "50");
});

test("E2 boundary tolerance and existing freshness thresholds are independent", () => {
  const samples = [
    { channelId: "kn-main", sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "100", boundaryMaxAgeSeconds: 7200 },
    { channelId: "kn-main", sourceTimestamp: "2026-09-01T15:00:00Z", valueKwh: "200", boundaryMaxAgeSeconds: 7200 }
  ];
  const result = resolvePeriodConsumption({ ...dayInput, samples });
  assert.equal(result.valueKwh, "100");
  assert.equal(result.quality, "estimated-boundary");
  assert.equal(result.freshness, "stale");
  assert.equal(result.freshnessState, "stale");
  const policy = createDefaultFreshnessPolicy();
  policy.cumulative = { delayedAfterMs: 7200000, staleAfterMs: 10800000, historicalAfterMs: 14400000 };
  const relaxed = resolvePeriodConsumption({ ...dayInput, samples, freshnessPolicy: policy });
  assert.equal(relaxed.freshnessState, "live");
  assert.equal(relaxed.quality, result.quality);
  assert.equal(relaxed.valueKwh, result.valueKwh);
});

test("E2 does not use receipt time as trustworthy freshness and preserves closed history", () => {
  const samples = [
    { channelId: "kn-main", sourceTimestamp: null, receivedAt: "2026-08-31T16:00:00Z", timestampQuality: "receive-time-estimated", valueKwh: "100" },
    { channelId: "kn-main", sourceTimestamp: null, receivedAt: "2026-09-01T16:00:00Z", timestampQuality: "receive-time-estimated", valueKwh: "200" }
  ];
  const estimated = resolvePeriodConsumption({ ...dayInput, samples });
  assert.equal(estimated.valueKwh, "100");
  assert.equal(estimated.quality, "estimated-boundary");
  assert.equal(estimated.freshnessState, "unavailable");
  const historical = resolvePeriodConsumption({ ...dayInput, asOf: "2027-01-01T00:00:00Z", samples: samples.map(s => ({ ...s, sourceTimestamp: s.receivedAt, timestampQuality: "source" })) });
  assert.equal(historical.quality, "exact");
  assert.equal(historical.valueKwh, "100");
  assert.equal(historical.freshnessState, "historical");
});

test("E2 exact source observations outrank receipt estimates at the same boundary instant", () => {
  const result = resolvePeriodConsumption({ ...dayInput, samples: [
    { channelId: "kn-main", readingId: "source-start", sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "100" },
    { channelId: "kn-main", readingId: "estimate-start", sourceTimestamp: null, receivedAt: "2026-08-31T16:00:00Z", timestampQuality: "receive-time-estimated", valueKwh: "120" },
    { channelId: "kn-main", readingId: "end", sourceTimestamp: "2026-09-01T16:00:00Z", valueKwh: "200" }
  ] });
  assert.equal(result.quality, "exact");
  assert.equal(result.valueKwh, "100");
  assert.deepEqual(result.baselineSampleIds, ["source-start"]);
});

test("E2-R5-S02 verified rollover calculates 30 kWh with rollover provenance", () => {
  const result = resolvePeriodConsumption({
    ...dayInput,
    rolloverModulus: 100000,
    samples: [
      { channelId: "kn-main", sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "99990" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T16:00:00Z", valueKwh: "20" }
    ]
  });
  assert.equal(result.valueKwh, "30");
  assert.equal(result.quality, "exact");
  assert.ok(result.issues?.includes("ROLLOVER:kn-main"));
  assert.equal(result.provenance?.rollover, true);
});

test("E2-R5-S03 replacement with missing closing read remains partial", () => {
  const result = resolvePeriodConsumption({
    ...dayInput,
    samples: [
      { channelId: "kn-main", epochId: "epoch-old", sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "500" },
      { channelId: "kn-main", epochId: "epoch-new", sourceTimestamp: "2026-09-01T08:00:00Z", valueKwh: "10" },
      { channelId: "kn-main", epochId: "epoch-new", sourceTimestamp: "2026-09-01T16:00:00Z", valueKwh: "60" }
    ]
  });
  assert.equal(result.quality, "partial");
  assert.equal(result.valueKwh, null);
  assert.equal(result.observedDeltaKwh, "50");
  assert.ok(result.issues?.includes("UNPROVEN_CONTINUITY:kn-main"));
});

test("E2-R7-S01 known month endpoints and daily gap resolves 6000 kWh and dailyCoverage", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-09-30T16:00:00Z",
    meterIds: ["kn-main"],
    period: { kind: "month", month: 9, year: 2026 },
    profile,
    samples: [
      { channelId: "kn-main", sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "10000" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-01T16:00:00Z", valueKwh: "10200" },
      { channelId: "kn-main", sourceTimestamp: "2026-09-30T16:00:00Z", valueKwh: "16000" }
    ]
  });
  assert.equal(result.valueKwh, "6000");
  assert.equal(result.quality, "exact");
  assert.equal(result.dailyCoverage?.totalDays, 30);
  assert.equal(result.dailyCoverage?.coveredDays, 1);
  assert.equal(result.dailyCoverage?.isComplete, false);
});

test("E2-R2-S04 rejects definition revision channel mismatch", () => {
  assert.throws(() => resolvePeriodConsumption({
    ...dayInput,
    definitionRevision: [{ channelId: "kn-other", epochId: "e1", meterId: "kn-other", sourceRevision: 1 }],
    samples: []
  }), /DEFINITION_REVISION_MISMATCH/);
});

const SEPTEMBER_MONTH = { kind: "month" as const, month: 9, year: 2026 };
const SEPTEMBER_START_MS = Date.parse("2026-08-31T16:00:00Z");
const DAY_MS = 86_400_000;

function dayBoundary(dayIndex: number) {
  return new Date(SEPTEMBER_START_MS + dayIndex * DAY_MS).toISOString();
}

test("R8 a replacement epoch inside a day does not prove that day is covered", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-09-30T16:00:00Z",
    meterIds: ["kn-main"],
    period: SEPTEMBER_MONTH,
    profile,
    samples: [
      { channelId: "kn-main", epochId: "epoch-1", meterId: "m1", sourceRevision: 1, sourceTimestamp: dayBoundary(0), valueKwh: "100" },
      { channelId: "kn-main", epochId: "epoch-2", meterId: "m2", sourceRevision: 2, sourceTimestamp: "2026-09-01T15:59:00Z", valueKwh: "0" }
    ]
  });
  assert.equal(result.dailyCoverage?.totalDays, 30);
  assert.equal(result.dailyCoverage?.coveredDays, 0);
  assert.equal(result.dailyCoverage?.isComplete, false);
});

test("R8 later stored samples cannot inflate coverage of an earlier asOf", () => {
  const samples = Array.from({ length: 31 }, (_, index) => ({
    channelId: "kn-main",
    epochId: "epoch-1",
    meterId: "m1",
    sourceRevision: 1,
    sourceTimestamp: dayBoundary(index),
    valueKwh: String(index * 100)
  }));
  const asOfTenth = resolvePeriodConsumption({
    asOf: dayBoundary(9),
    meterIds: ["kn-main"],
    period: SEPTEMBER_MONTH,
    profile,
    samples
  });
  assert.equal(asOfTenth.dailyCoverage?.totalDays, 30);
  assert.equal(asOfTenth.dailyCoverage?.coveredDays, 9);
  assert.equal(asOfTenth.dailyCoverage?.isComplete, false);

  const asOfMonthEnd = resolvePeriodConsumption({
    asOf: dayBoundary(30),
    meterIds: ["kn-main"],
    period: SEPTEMBER_MONTH,
    profile,
    samples
  });
  assert.equal(asOfMonthEnd.dailyCoverage?.coveredDays, 30);
  assert.equal(asOfMonthEnd.dailyCoverage?.isComplete, true);
});

test("R8 input ordering does not change coverage and invalid resets stay uncovered", () => {
  const samples = [
    { channelId: "kn-main", epochId: "epoch-1", meterId: "m1", sourceRevision: 1, sourceTimestamp: dayBoundary(0), valueKwh: "100" },
    { channelId: "kn-main", epochId: "epoch-1", meterId: "m1", sourceRevision: 1, sourceTimestamp: dayBoundary(1), valueKwh: "200" },
    { channelId: "kn-main", epochId: "epoch-1", meterId: "m1", sourceRevision: 1, sourceTimestamp: dayBoundary(2), valueKwh: "150" },
    { channelId: "kn-main", epochId: "epoch-1", meterId: "m1", sourceRevision: 1, sourceTimestamp: dayBoundary(3), valueKwh: "400" }
  ];
  const ascending = resolvePeriodConsumption({
    asOf: "2026-09-30T16:00:00Z", meterIds: ["kn-main"], period: SEPTEMBER_MONTH, profile, samples
  });
  const descending = resolvePeriodConsumption({
    asOf: "2026-09-30T16:00:00Z", meterIds: ["kn-main"], period: SEPTEMBER_MONTH, profile, samples: [...samples].reverse()
  });
  assert.equal(ascending.dailyCoverage?.coveredDays, 2);
  assert.deepEqual(descending.dailyCoverage, ascending.dailyCoverage);
});

test("R8 non-energy measurement kinds cannot raise coverage", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-09-30T16:00:00Z",
    meterIds: ["kn-main"],
    period: SEPTEMBER_MONTH,
    profile,
    samples: Array.from({ length: 31 }, (_, index) => ({
      channelId: "kn-main",
      epochId: "epoch-1",
      measurementKind: "power-gauge" as const,
      meterId: "m1",
      sourceRevision: 1,
      sourceTimestamp: dayBoundary(index),
      valueKwh: String(index * 100)
    }))
  });
  assert.equal(result.dailyCoverage?.coveredDays, 0);
  assert.equal(result.dailyCoverage?.totalDays, 30);
});

test("R8 known month endpoints coexist with incomplete daily coverage", () => {
  const result = resolvePeriodConsumption({
    asOf: "2026-09-30T16:00:00Z",
    meterIds: ["kn-main"],
    period: SEPTEMBER_MONTH,
    profile,
    samples: [
      { channelId: "kn-main", epochId: "epoch-1", meterId: "m1", sourceRevision: 1, sourceTimestamp: dayBoundary(0), valueKwh: "0" },
      { channelId: "kn-main", epochId: "epoch-1", meterId: "m1", sourceRevision: 1, sourceTimestamp: dayBoundary(30), valueKwh: "1000" }
    ]
  });
  assert.equal(result.valueKwh, "1000");
  assert.equal(result.quality, "exact");
  assert.equal(result.dailyCoverage?.coveredDays, 0);
  assert.equal(result.dailyCoverage?.totalDays, 30);
  assert.equal(result.dailyCoverage?.isComplete, false);
});

test("a reused sample array gives the same result as a fresh one for every window it is asked about", () => {
  const rows = Array.from({ length: 120 }, (_, index) => ({
    channelId: "kn-main",
    sourceTimestamp: new Date(Date.parse("2026-08-31T16:00:00Z") + index * 6 * 3_600_000).toISOString(),
    valueKwh: `${10_000 + index * 25}`
  }));
  const asOf = "2026-09-30T16:00:00Z";
  const periods = [
    { day: 1, kind: "day" as const, month: 9, year: 2026 },
    { day: 15, kind: "day" as const, month: 9, year: 2026 },
    { kind: "month" as const, month: 9, year: 2026 },
    { kind: "year" as const, year: 2026 }
  ];

  // The channel index is memoised against the sample array, so a shared array must never leak one
  // window's view into another, and a second meter set on the same array must be indexed on its own.
  const shared = rows.map((row) => ({ ...row }));
  for (const period of periods) {
    const reused = resolvePeriodConsumption({ asOf, meterIds: ["kn-main"], period, profile, samples: shared });
    const isolated = resolvePeriodConsumption({
      asOf, meterIds: ["kn-main"], period, profile, samples: rows.map((row) => ({ ...row }))
    });
    assert.deepEqual(reused, isolated, `${period.kind}${period.day ?? ""}`);
  }

  const otherMeters = resolvePeriodConsumption({
    asOf, meterIds: [], period: periods[2]!, profile, samples: shared
  });
  assert.equal(otherMeters.quality, "unavailable");
  assert.equal(
    resolvePeriodConsumption({ asOf, meterIds: ["kn-main"], period: periods[2]!, profile, samples: shared }).valueKwh,
    resolvePeriodConsumption({ asOf, meterIds: ["kn-main"], period: periods[2]!, profile, samples: rows.map((row) => ({ ...row })) }).valueKwh
  );
});

/**
 * Counts how often the evaluator asks a sample for its instant. Reading through a getter is the
 * only way to observe scan volume without a wall-clock threshold, which would swing with the
 * machine rather than with the algorithm.
 */
function instantCountingSamples(rows: PeriodSample[], counter: { reads: number }): PeriodSample[] {
  return rows.map((row) => ({
    ...row,
    get sourceTimestamp() {
      counter.reads += 1;
      return row.sourceTimestamp;
    }
  }));
}

test("resolving more dates over one sample set does not re-scan the whole history for each date", () => {
  const sampleCount = 400;
  const start = Date.parse("2026-08-31T16:00:00Z");
  const rows: PeriodSample[] = Array.from({ length: sampleCount }, (_, index) => ({
    channelId: "kn-main",
    sourceTimestamp: new Date(start + index * 3_600_000).toISOString(),
    valueKwh: `${10_000 + index * 7}`
  }));
  const counter = { reads: 0 };
  const samples = instantCountingSamples(rows, counter);
  const asOf = "2026-09-30T16:00:00Z";
  const dayOf = (day: number) => ({ day, kind: "day" as const, month: 9, year: 2026 });

  // The first call also builds and memoises the channel index, so only the calls after it show
  // what one additional date actually costs.
  resolvePeriodConsumption({ asOf, meterIds: ["kn-main"], period: dayOf(1), profile, samples });
  const afterIndexBuilt = counter.reads;
  const measuredDates = 20;
  for (let day = 2; day <= measuredDates + 1; day += 1) {
    resolvePeriodConsumption({ asOf, meterIds: ["kn-main"], period: dayOf(day), profile, samples });
  }
  const perDate = (counter.reads - afterIndexBuilt) / measuredDates;

  assert.ok(
    perDate < sampleCount / 4,
    `each further date must cost the evidence in its own window, not the whole history: ${perDate.toFixed(0)} instant reads for ${sampleCount} samples`
  );
});

test("window boundaries keep their half-open meaning at the exact start and end instants", () => {
  const startMs = Date.parse("2026-09-01T00:00:00+08:00");
  const endMs = Date.parse("2026-09-02T00:00:00+08:00");
  const at = (ms: number, valueKwh: string): PeriodSample => ({
    channelId: "kn-main",
    sourceTimestamp: new Date(ms).toISOString(),
    valueKwh
  });
  const samples = [
    at(startMs - 1, "900"),
    at(startMs, "1000"),
    at(startMs + 1, "1001"),
    at(endMs - 1, "1299"),
    at(endMs, "1300"),
    at(endMs + 1, "1301")
  ];

  const day = resolvePeriodConsumption({
    asOf: "2026-09-30T16:00:00Z",
    meterIds: ["kn-main"],
    period: { day: 1, kind: "day", month: 9, year: 2026 },
    profile,
    samples
  });

  // The window is [start, end): the sample on the end instant closes the day, and the opening is
  // the one exactly on the start instant rather than the one a millisecond before it.
  assert.equal(day.periodStart, new Date(startMs).toISOString());
  assert.equal(day.periodEnd, new Date(endMs).toISOString());
  assert.equal(day.valueKwh, "300");
  assert.equal(day.quality, "exact");
  assert.deepEqual(day.boundaryOffsets, [{
    channelId: "kn-main",
    endSeconds: 0,
    endTimestamp: new Date(endMs).toISOString(),
    startSeconds: 0,
    startTimestamp: new Date(startMs).toISOString()
  }]);
});

/**
 * Characterisation of the evidence shapes whose handling is easiest to break when the evaluator's
 * scanning changes: rollover, interval energy, a source replacement mid-window, receipt-time
 * estimates, an unexplained decrease and a stale boundary. The expectations below were captured
 * from the evaluator before its scanning was reworked; any of them changing means the rework
 * changed what the system reports, not just how it got there.
 */
const EVIDENCE_SHAPES: Record<string, PeriodSample[]> = {
  intervalEnergy: [
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "interval-energy", meterId: "kn-main", sourceRevision: 1, sourceTimestamp: "2026-09-01T02:00:00Z", valueKwh: "12" },
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "interval-energy", meterId: "kn-main", sourceRevision: 1, sourceTimestamp: "2026-09-01T08:00:00Z", valueKwh: "18" },
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "interval-energy", meterId: "kn-main", sourceRevision: 1, sourceTimestamp: "2026-09-01T14:00:00Z", valueKwh: "25" }
  ],
  receiveTimeEstimated: [
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "cumulative-energy", meterId: "kn-main", receivedAt: "2026-08-31T16:00:00Z", sourceRevision: 1, sourceTimestamp: null, timestampQuality: "receive-time-estimated", valueKwh: "700" },
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "cumulative-energy", meterId: "kn-main", receivedAt: "2026-09-01T15:00:00Z", sourceRevision: 1, sourceTimestamp: null, timestampQuality: "receive-time-estimated", valueKwh: "790" }
  ],
  rollover: [
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "cumulative-energy", meterId: "kn-main", rolloverModulus: "1000", sourceRevision: 1, sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "980" },
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "cumulative-energy", meterId: "kn-main", rolloverModulus: "1000", sourceRevision: 1, sourceTimestamp: "2026-09-01T04:00:00Z", valueKwh: "995" },
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "cumulative-energy", meterId: "kn-main", rolloverModulus: "1000", sourceRevision: 1, sourceTimestamp: "2026-09-01T10:00:00Z", valueKwh: "20" },
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "cumulative-energy", meterId: "kn-main", rolloverModulus: "1000", sourceRevision: 1, sourceTimestamp: "2026-09-01T15:59:00Z", valueKwh: "60" }
  ],
  sourceReplacement: [
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "cumulative-energy", meterId: "kn-main", sourceRevision: 1, sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "500" },
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "cumulative-energy", meterId: "kn-main", sourceRevision: 1, sourceTimestamp: "2026-09-01T06:00:00Z", valueKwh: "560" },
    { channelId: "kn-main", epochId: "epoch-2", measurementKind: "cumulative-energy", meterId: "kn-main", sourceRevision: 2, sourceTimestamp: "2026-09-01T07:00:00Z", valueKwh: "5" },
    { channelId: "kn-main", epochId: "epoch-2", measurementKind: "cumulative-energy", meterId: "kn-main", sourceRevision: 2, sourceTimestamp: "2026-09-01T15:59:00Z", valueKwh: "95" }
  ],
  staleBoundary: [
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "cumulative-energy", meterId: "kn-main", sourceRevision: 1, sourceTimestamp: "2026-08-20T00:00:00Z", valueKwh: "100" },
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "cumulative-energy", meterId: "kn-main", sourceRevision: 1, sourceTimestamp: "2026-09-01T15:59:00Z", valueKwh: "400" }
  ],
  unexplainedDecrease: [
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "cumulative-energy", meterId: "kn-main", sourceRevision: 1, sourceTimestamp: "2026-08-31T16:00:00Z", valueKwh: "800" },
    { channelId: "kn-main", epochId: "epoch-1", measurementKind: "cumulative-energy", meterId: "kn-main", sourceRevision: 1, sourceTimestamp: "2026-09-01T08:00:00Z", valueKwh: "300" }
  ]
};

const EVIDENCE_EXPECTATIONS: Record<string, { issues: string[]; observedDeltaKwh: string | null; quality: string; valueKwh: string | null }> = {
  "intervalEnergy.day": { issues: ["INTERVAL_COVERAGE_UNPROVEN:kn-main"], observedDeltaKwh: "55", quality: "partial", valueKwh: null },
  "intervalEnergy.month": { issues: ["INTERVAL_COVERAGE_UNPROVEN:kn-main"], observedDeltaKwh: "55", quality: "partial", valueKwh: null },
  "intervalEnergy.year": { issues: ["INTERVAL_COVERAGE_UNPROVEN:kn-main"], observedDeltaKwh: "55", quality: "partial", valueKwh: null },
  "receiveTimeEstimated.day": { issues: ["STALE_BOUNDARY:kn-main"], observedDeltaKwh: "90", quality: "partial", valueKwh: null },
  "receiveTimeEstimated.month": { issues: ["STALE_BOUNDARY:kn-main"], observedDeltaKwh: "90", quality: "partial", valueKwh: null },
  "receiveTimeEstimated.year": { issues: ["MISSING_BASELINE:kn-main"], observedDeltaKwh: "90", quality: "partial", valueKwh: null },
  "rollover.day": { issues: ["ROLLOVER:kn-main", "ESTIMATED_BOUNDARY:kn-main"], observedDeltaKwh: "80", quality: "estimated-boundary", valueKwh: "80" },
  "rollover.month": { issues: ["ROLLOVER:kn-main", "ESTIMATED_BOUNDARY:kn-main"], observedDeltaKwh: "80", quality: "estimated-boundary", valueKwh: "80" },
  "rollover.year": { issues: ["ROLLOVER:kn-main", "MISSING_BASELINE:kn-main"], observedDeltaKwh: "80", quality: "partial", valueKwh: null },
  "sourceReplacement.day": { issues: ["UNPROVEN_CONTINUITY:kn-main"], observedDeltaKwh: "150", quality: "partial", valueKwh: null },
  "sourceReplacement.month": { issues: ["UNPROVEN_CONTINUITY:kn-main"], observedDeltaKwh: "150", quality: "partial", valueKwh: null },
  "sourceReplacement.year": { issues: ["MISSING_BASELINE:kn-main"], observedDeltaKwh: "150", quality: "partial", valueKwh: null },
  "staleBoundary.day": { issues: ["STALE_BOUNDARY:kn-main"], observedDeltaKwh: null, quality: "partial", valueKwh: null },
  "staleBoundary.month": { issues: ["STALE_BOUNDARY:kn-main"], observedDeltaKwh: null, quality: "partial", valueKwh: null },
  "staleBoundary.year": { issues: ["MISSING_BASELINE:kn-main"], observedDeltaKwh: "300", quality: "partial", valueKwh: null },
  "unexplainedDecrease.day": { issues: ["UNEXPLAINED_DECREASE:kn-main", "STALE_BOUNDARY:kn-main"], observedDeltaKwh: null, quality: "invalid", valueKwh: null },
  "unexplainedDecrease.month": { issues: ["UNEXPLAINED_DECREASE:kn-main", "STALE_BOUNDARY:kn-main"], observedDeltaKwh: null, quality: "invalid", valueKwh: null },
  "unexplainedDecrease.year": { issues: ["UNEXPLAINED_DECREASE:kn-main", "MISSING_BASELINE:kn-main"], observedDeltaKwh: null, quality: "invalid", valueKwh: null }
};

test("difficult evidence shapes report exactly what they reported before", () => {
  const periods = {
    day: { day: 1, kind: "day" as const, month: 9, year: 2026 },
    month: { kind: "month" as const, month: 9, year: 2026 },
    year: { kind: "year" as const, year: 2026 }
  };

  for (const [shape, samples] of Object.entries(EVIDENCE_SHAPES)) {
    for (const [periodName, period] of Object.entries(periods)) {
      const result = resolvePeriodConsumption({
        asOf: "2026-09-01T16:00:00Z",
        meterIds: ["kn-main"],
        period,
        profile,
        samples,
        ...(shape === "rollover" ? { rolloverModulus: "1000" } : {})
      });
      const key = `${shape}.${periodName}`;
      assert.deepEqual(
        {
          issues: result.issues,
          observedDeltaKwh: result.observedDeltaKwh ?? null,
          quality: result.quality,
          valueKwh: result.valueKwh
        },
        EVIDENCE_EXPECTATIONS[key],
        key
      );
    }
  }
});
