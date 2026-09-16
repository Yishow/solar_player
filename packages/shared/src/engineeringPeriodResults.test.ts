import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateEngineeringPeriodResults,
  isTaipeiLocalDayInterval,
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
