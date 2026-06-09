import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePageRuntimeFreshness,
  resolveLiveMetricKeysForPage
} from "./displayPageFreshness.js";

test("resolveLiveMetricKeysForPage expands solar requirements into the live metric keys the page depends on", () => {
  assert.deepEqual(resolveLiveMetricKeysForPage("solar"), [
    "realTimePower",
    "todayGeneration",
    "selfConsumptionRatio",
    "selfConsumptionEnergy",
    "consumptionEnergy",
    "todayCo2Reduction",
    "totalCo2Reduction",
    "systemEfficiency"
  ]);
  assert.deepEqual(resolveLiveMetricKeysForPage("images"), []);
});

test("evaluatePageRuntimeFreshness reports fresh only when every required metric is present and within the freshness window", () => {
  const freshResult = evaluatePageRuntimeFreshness({
    freshnessWindowMs: 30_000,
    metrics: {
      consumptionEnergy: {
        timestamp: "2026-05-23T00:00:10.000Z"
      },
      realTimePower: {
        timestamp: "2026-05-23T00:00:20.000Z"
      },
      todayGeneration: {
        timestamp: "2026-05-23T00:00:15.000Z"
      }
    },
    nowMs: Date.parse("2026-05-23T00:00:30.000Z"),
    requiredMetricKeys: ["realTimePower", "todayGeneration", "consumptionEnergy"]
  });
  assert.deepEqual(freshResult, {
    fresh: true,
    hasRequiredData: true,
    stalestMetricKey: null,
    stalestTimestamp: null
  });

  const staleResult = evaluatePageRuntimeFreshness({
    freshnessWindowMs: 30_000,
    metrics: {
      consumptionEnergy: {
        timestamp: "2026-05-23T00:00:20.000Z"
      },
      realTimePower: {
        timestamp: "2026-05-23T00:00:10.000Z"
      },
      todayGeneration: {
        timestamp: "2026-05-22T23:59:30.000Z"
      }
    },
    nowMs: Date.parse("2026-05-23T00:00:30.000Z"),
    requiredMetricKeys: ["realTimePower", "todayGeneration", "consumptionEnergy"]
  });
  assert.deepEqual(staleResult, {
    fresh: false,
    hasRequiredData: true,
    stalestMetricKey: "todayGeneration",
    stalestTimestamp: "2026-05-22T23:59:30.000Z"
  });

  const missingResult = evaluatePageRuntimeFreshness({
    freshnessWindowMs: 30_000,
    metrics: {
      realTimePower: {
        timestamp: "2026-05-23T00:00:20.000Z"
      }
    },
    nowMs: Date.parse("2026-05-23T00:00:30.000Z"),
    requiredMetricKeys: ["realTimePower", "todayGeneration"]
  });
  assert.deepEqual(missingResult, {
    fresh: false,
    hasRequiredData: false,
    stalestMetricKey: null,
    stalestTimestamp: null
  });

  const invalidTimestampResult = evaluatePageRuntimeFreshness({
    freshnessWindowMs: 30_000,
    metrics: {
      realTimePower: {
        timestamp: "not-a-date"
      }
    },
    nowMs: Date.parse("2026-05-23T00:00:30.000Z"),
    requiredMetricKeys: ["realTimePower"]
  });
  assert.deepEqual(invalidTimestampResult, {
    fresh: false,
    hasRequiredData: true,
    stalestMetricKey: "realTimePower",
    stalestTimestamp: "not-a-date"
  });
});

test("evaluatePageRuntimeFreshness reports whether every required metric has prior data", () => {
  const staleWithPriorData = evaluatePageRuntimeFreshness({
    freshnessWindowMs: 30_000,
    metrics: {
      realTimePower: {
        timestamp: "2026-05-22T23:59:50.000Z"
      },
      systemEfficiency: {
        timestamp: "2026-05-22T23:59:30.000Z"
      },
      todayGeneration: {
        timestamp: "2026-05-22T23:59:55.000Z"
      }
    },
    nowMs: Date.parse("2026-05-23T00:00:30.000Z"),
    requiredMetricKeys: ["realTimePower", "todayGeneration", "systemEfficiency"]
  });
  assert.equal(staleWithPriorData.fresh, false);
  assert.equal(staleWithPriorData.hasRequiredData, true);

  const missingRequiredData = evaluatePageRuntimeFreshness({
    freshnessWindowMs: 30_000,
    metrics: {
      realTimePower: {
        timestamp: "2026-05-23T00:00:20.000Z"
      },
      todayGeneration: {
        timestamp: "2026-05-23T00:00:15.000Z"
      }
    },
    nowMs: Date.parse("2026-05-23T00:00:30.000Z"),
    requiredMetricKeys: ["realTimePower", "todayGeneration", "systemEfficiency"]
  });
  assert.equal(missingRequiredData.fresh, false);
  assert.equal(missingRequiredData.hasRequiredData, false);
});
