import assert from "node:assert/strict";
import test from "node:test";
import { periodWindow, resolvePeriodConsumption } from "./periodConsumption.js";
import { createDefaultFreshnessPolicy } from "./freshnessPolicy.js";
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
