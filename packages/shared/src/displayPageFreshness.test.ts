import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePageRuntimeFreshnessForRequirements,
  resolveLiveMetricRequirementsForPage,
  evaluatePageRuntimeFreshness,
  resolveLiveMetricKeysForPage
} from "./displayPageFreshness.js";

test("resolveLiveMetricKeysForPage expands solar requirements into the live metric keys the page depends on", () => {
  assert.deepEqual(resolveLiveMetricKeysForPage("solar"), [
    "realTimePower",
    "todayGeneration",
    "factoryGeneration.todayMwh",
    "factoryGeneration.monthMwh",
    "factoryGeneration.totalMwh",
    "selfConsumptionRatio",
    "selfConsumptionEnergy",
    "consumptionEnergy",
    "todayCo2Reduction",
    "totalCo2Reduction",
    "totalGeneration",
    "systemEfficiency"
  ]);
  assert.deepEqual(resolveLiveMetricKeysForPage("images"), []);
});

test("resolveLiveMetricRequirementsForPage allows solar derived metrics to use runtime alternatives", () => {
  assert.deepEqual(resolveLiveMetricRequirementsForPage("solar"), [
    { alternatives: [["realTimePower"]], requirementKey: "realTimePower" },
    {
      alternatives: [
        ["todayGeneration"],
        [
          "factoryGeneration.todayMwh",
          "factoryGeneration.monthMwh",
          "factoryGeneration.totalMwh"
        ]
      ],
      requirementKey: "todayGeneration"
    },
    {
      alternatives: [
        ["selfConsumptionRatio"],
        ["selfConsumptionEnergy", "consumptionEnergy"]
      ],
      requirementKey: "selfConsumptionRatio"
    },
    {
      alternatives: [
        ["todayCo2Reduction"],
        ["todayGeneration"],
        [
          "factoryGeneration.todayMwh",
          "factoryGeneration.monthMwh",
          "factoryGeneration.totalMwh"
        ]
      ],
      requirementKey: "todayCo2Reduction"
    },
    {
      alternatives: [
        ["totalCo2Reduction"],
        ["totalGeneration"],
        [
          "factoryGeneration.todayMwh",
          "factoryGeneration.monthMwh",
          "factoryGeneration.totalMwh"
        ]
      ],
      requirementKey: "totalCo2Reduction"
    },
    { alternatives: [["systemEfficiency"]], requirementKey: "systemEfficiency" }
  ]);
});

test("Site-scoped freshness uses semantic keys against an already scoped snapshot", () => {
  assert.deepEqual(resolveLiveMetricRequirementsForPage("overview", "cl"), [
    { alternatives: [["realTimePower"]], requirementKey: "realTimePower" },
    {
      alternatives: [
        ["todayGeneration"],
        ["factoryGeneration.todayMwh", "factoryGeneration.monthMwh", "factoryGeneration.totalMwh"]
      ],
      requirementKey: "todayGeneration"
    },
    {
      alternatives: [
        ["totalGeneration"],
        ["factoryGeneration.todayMwh", "factoryGeneration.monthMwh", "factoryGeneration.totalMwh"]
      ],
      requirementKey: "totalGeneration"
    },
    {
      alternatives: [
        ["todayCo2Reduction"],
        ["todayGeneration"],
        ["factoryGeneration.todayMwh", "factoryGeneration.monthMwh", "factoryGeneration.totalMwh"]
      ],
      requirementKey: "todayCo2Reduction"
    },
    {
      alternatives: [
        ["totalCo2Reduction"],
        ["totalGeneration"],
        ["factoryGeneration.todayMwh", "factoryGeneration.monthMwh", "factoryGeneration.totalMwh"]
      ],
      requirementKey: "totalCo2Reduction"
    }
  ]);
  assert.equal(
    resolveLiveMetricKeysForPage("solar", "kn").some((metricKey) =>
      [
        "consumptionEnergy",
        "realTimePower",
        "selfConsumptionEnergy",
        "selfConsumptionRatio",
        "systemEfficiency"
      ].includes(metricKey)
    ),
    true
  );
  assert.deepEqual(
    resolveLiveMetricRequirementsForPage("sustainability", "kn"),
    [
      {
        alternatives: [["totalGeneration"]],
        requirementKey: "accumulatedGenerationGwh"
      },
      {
        alternatives: [["totalGeneration"]],
        requirementKey: "accumulatedCarbonReductionTons"
      },
      {
        alternatives: [["selfConsumptionEnergy", "consumptionEnergy"]],
        requirementKey: "annualEnergySavingPercent"
      },
      {
        alternatives: [["totalGeneration"]],
        requirementKey: "plantedTreeEquivalent"
      }
    ]
  );
});

test("Factory Circuit page instances share semantic slot metric keys", () => {
  assert.deepEqual(resolveLiveMetricRequirementsForPage("factory-circuit-guanyin"), [
    { alternatives: [["factoryCircuit.stampingPower"]], requirementKey: "factoryCircuit.stampingPower" },
    { alternatives: [["factoryCircuit.bodyPower"]], requirementKey: "factoryCircuit.bodyPower" },
    { alternatives: [["factoryCircuit.paintingPower"]], requirementKey: "factoryCircuit.paintingPower" },
    { alternatives: [["factoryCircuit.assemblyPower"]], requirementKey: "factoryCircuit.assemblyPower" },
    { alternatives: [["factoryCircuit.utilityPower"]], requirementKey: "factoryCircuit.utilityPower" },
    { alternatives: [["factoryCircuit.officePower"]], requirementKey: "factoryCircuit.officePower" },
    { alternatives: [["factoryCircuit.heavyVehiclePower"]], requirementKey: "factoryCircuit.heavyVehiclePower" },
    { alternatives: [["factoryCircuit.edCoatingPower"]], requirementKey: "factoryCircuit.edCoatingPower" }
  ]);
});

test("resolveLiveMetricRequirementsForPage limits Jungli Factory Circuit to six visible metric keys", () => {
  assert.deepEqual(resolveLiveMetricRequirementsForPage("factory-circuit"), [
    { alternatives: [["factoryCircuit.stampingPower"]], requirementKey: "factoryCircuit.stampingPower" },
    { alternatives: [["factoryCircuit.bodyPower"]], requirementKey: "factoryCircuit.bodyPower" },
    { alternatives: [["factoryCircuit.paintingPower"]], requirementKey: "factoryCircuit.paintingPower" },
    { alternatives: [["factoryCircuit.assemblyPower"]], requirementKey: "factoryCircuit.assemblyPower" },
    { alternatives: [["factoryCircuit.utilityPower"]], requirementKey: "factoryCircuit.utilityPower" },
    { alternatives: [["factoryCircuit.officePower"]], requirementKey: "factoryCircuit.officePower" }
  ]);
});

test("evaluatePageRuntimeFreshnessForRequirements accepts a complete derived alternative", () => {
  const timestamp = "2026-05-23T00:00:20.000Z";
  const result = evaluatePageRuntimeFreshnessForRequirements({
    freshnessWindowMs: 30_000,
    metrics: {
      consumptionEnergy: { timestamp },
      realTimePower: { timestamp },
      selfConsumptionEnergy: { timestamp },
      systemEfficiency: { timestamp },
      todayGeneration: { timestamp },
      totalGeneration: { timestamp }
    },
    nowMs: Date.parse("2026-05-23T00:00:30.000Z"),
    requirements: resolveLiveMetricRequirementsForPage("solar")
  });

  assert.deepEqual(result, {
    fresh: true,
    hasRequiredData: true,
    stalestMetricKey: null,
    stalestTimestamp: null
  });
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
