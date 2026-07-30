import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultFreshnessPolicy,
  evaluateFreshness,
  resolveFreshnessCategoryForMetric,
  validateFreshnessPolicy,
  advanceFreshnessWhileOffline
} from "./freshnessPolicy.js";
import { displayMetricRequirements } from "./displayReadiness.js";

test("default Freshness Policy exposes the four canonical categories", () => {
  assert.deepEqual(createDefaultFreshnessPolicy(), {
    cumulative: {
      delayedAfterMs: 600_000,
      historicalAfterMs: 86_400_000,
      staleAfterMs: 3_600_000
    },
    daily: {
      delayedAfterMs: 93_600_000,
      historicalAfterMs: 604_800_000,
      staleAfterMs: 172_800_000
    },
    realtime: {
      delayedAfterMs: 30_000,
      historicalAfterMs: 1_800_000,
      staleAfterMs: 90_000
    },
    static: null
  });
});

test("Freshness Policy validation rejects non-positive and non-increasing boundaries", () => {
  const policy = createDefaultFreshnessPolicy();
  assert.equal(validateFreshnessPolicy(policy).valid, true);
  assert.equal(validateFreshnessPolicy({
    ...policy,
    realtime: { delayedAfterMs: 0, staleAfterMs: 90_000, historicalAfterMs: 1_800_000 }
  }).valid, false);
  assert.equal(validateFreshnessPolicy({
    ...policy,
    daily: {
      delayedAfterMs: 93_600_000,
      staleAfterMs: 93_600_000,
      historicalAfterMs: 604_800_000
    }
  }).valid, false);
});

test("evaluator uses exact category boundaries and never ages static data", () => {
  const policy = createDefaultFreshnessPolicy();
  const nowMs = Date.parse("2026-07-30T12:00:00.000Z");
  const evaluateAge = (ageMs: number) =>
    evaluateFreshness({
      category: "realtime",
      nowMs,
      policy,
      sourceTimestamp: new Date(nowMs - ageMs).toISOString()
    });

  assert.equal(evaluateAge(29_999).state, "live");
  assert.equal(evaluateAge(30_000).state, "delayed");
  assert.equal(evaluateAge(90_000).state, "stale");
  assert.equal(evaluateAge(1_800_000).state, "historical");
  assert.equal(evaluateFreshness({
    category: "static",
    nowMs,
    policy,
    sourceTimestamp: "2020-01-01T00:00:00.000Z"
  }).state, "live");
});

test("missing or invalid source timestamps are unavailable without fabricated time", () => {
  const policy = createDefaultFreshnessPolicy();
  for (const sourceTimestamp of [null, "not-a-date"]) {
    assert.deepEqual(evaluateFreshness({
      category: "realtime",
      nowMs: Date.parse("2026-07-30T12:00:00.000Z"),
      policy,
      sourceTimestamp
    }), {
      ageFrozen: false,
      ageMs: null,
      category: "realtime",
      nextTransitionAt: null,
      sourceTimestamp: null,
      state: "unavailable"
    });
  }
});

test("every display runtime metric resolves to exactly one policy category", () => {
  const expectedCategories = {
    accumulatedCarbonReductionTons: "cumulative",
    accumulatedGenerationGwh: "cumulative",
    annualEnergySavingPercent: "daily",
    consumptionEnergy: "cumulative",
    factoryAssemblyPower: "realtime",
    factoryBodyPower: "realtime",
    "factoryCircuit.guanyin.assemblyPower": "realtime",
    "factoryCircuit.guanyin.bodyPower": "realtime",
    "factoryCircuit.guanyin.edCoatingPower": "realtime",
    "factoryCircuit.guanyin.heavyVehiclePower": "realtime",
    "factoryCircuit.guanyin.officePower": "realtime",
    "factoryCircuit.guanyin.paintingPower": "realtime",
    "factoryCircuit.guanyin.stampingPower": "realtime",
    "factoryCircuit.guanyin.utilityPower": "realtime",
    "factoryGeneration.cl.monthMwh": "cumulative",
    "factoryGeneration.cl.todayMwh": "daily",
    "factoryGeneration.cl.totalMwh": "cumulative",
    "factoryGeneration.kn.monthMwh": "cumulative",
    "factoryGeneration.kn.todayMwh": "daily",
    "factoryGeneration.kn.totalMwh": "cumulative",
    factoryOfficePower: "realtime",
    factoryPaintingPower: "realtime",
    factoryStampingPower: "realtime",
    factoryUtilityPower: "realtime",
    plantedTreeEquivalent: "cumulative",
    realTimePower: "realtime",
    selfConsumptionEnergy: "cumulative",
    selfConsumptionRatio: "realtime",
    systemEfficiency: "realtime",
    todayCo2Reduction: "daily",
    todayGeneration: "daily",
    totalCo2Reduction: "cumulative",
    totalGeneration: "cumulative"
  } as const;
  const runtimeMetricKeys = [
    ...new Set(
      displayMetricRequirements.flatMap((requirement) => [
        requirement.requirementKey,
        ...(requirement.dependencyKeys ?? [])
      ])
    )
  ].sort();

  assert.deepEqual(runtimeMetricKeys, Object.keys(expectedCategories).sort());
  assert.deepEqual(
    Object.fromEntries(
      runtimeMetricKeys.map((metricKey) => [
        metricKey,
        resolveFreshnessCategoryForMetric(metricKey)
      ])
    ),
    expectedCategories
  );
});

test("offline aging advances with trusted App Time and freezes when time is untrusted", () => {
  const policy = createDefaultFreshnessPolicy();
  const sourceTimestamp = "2026-07-30T11:59:40.000Z";
  const snapshot = evaluateFreshness({
    category: "realtime",
    nowMs: Date.parse("2026-07-30T12:00:00.000Z"),
    policy,
    sourceTimestamp
  });

  const advanced = advanceFreshnessWhileOffline({
    elapsedMs: 75_000,
    policy,
    snapshot,
    timeTrusted: true
  });
  assert.equal(advanced.ageMs, 95_000);
  assert.equal(advanced.state, "stale");
  assert.equal(advanced.ageFrozen, false);

  const frozen = advanceFreshnessWhileOffline({
    elapsedMs: 1_800_000,
    policy,
    snapshot: advanced,
    timeTrusted: false
  });
  assert.equal(frozen.ageMs, 95_000);
  assert.equal(frozen.state, "stale");
  assert.equal(frozen.ageFrozen, true);
});
