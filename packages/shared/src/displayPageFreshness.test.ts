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

test("evaluatePageRuntimeFreshness reports fresh only when every present required metric stays within the freshness window", () => {
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
    stalestMetricKey: "todayGeneration",
    stalestTimestamp: "2026-05-22T23:59:30.000Z"
  });

  const missingResult = evaluatePageRuntimeFreshness({
    freshnessWindowMs: 30_000,
    metrics: {},
    nowMs: Date.parse("2026-05-23T00:00:30.000Z"),
    requiredMetricKeys: ["realTimePower", "todayGeneration"]
  });
  assert.deepEqual(missingResult, {
    fresh: false,
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
    stalestMetricKey: "realTimePower",
    stalestTimestamp: "not-a-date"
  });
});
