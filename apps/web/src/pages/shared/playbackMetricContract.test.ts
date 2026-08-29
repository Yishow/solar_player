import assert from "node:assert/strict";
import test from "node:test";
import {
  factoryGenerationDependencyKeys,
  resolvePlaybackDefaultMetricBoundItems,
  resolvePlaybackDisplayMetricSourceClass,
  resolvePlaybackGateRequirements,
  resolvePlaybackMetricCatalog,
  resolvePlaybackRuntimeMetricKeys
} from "@solar-display/shared";

// Contract assertions live here (not in packages/shared) because this repo has no
// shared test runner — shared .test.ts files are excluded from build and never run.
// The web suite (apps/web) is the executing consumer, so the contract is locked here.
// Assertions are property-based (membership / forbidden / not-mqtt-live) rather than
// redeclaring the contract's literal arrays, to avoid a golden-copy that drifts.

const OVERVIEW_KPI_KEYS = ["realTimePower", "todayGeneration", "totalGeneration", "todayCo2Reduction", "totalCo2Reduction"];
const OVERVIEW_PHASE_KEYS = [
  "phaseRCurrent", "phaseRPower", "phaseRVoltage",
  "phaseSCurrent", "phaseSPower", "phaseSVoltage",
  "phaseTCurrent", "phaseTPower", "phaseTVoltage"
];
const SOLAR_KPI_KEYS = ["realTimePower", "systemEfficiency", "selfConsumptionRatio", "todayGeneration", "todayCo2Reduction", "totalCo2Reduction"];

test("playback contract owns default item bindings and authoring metric vocabulary", () => {
  const overviewDefaults = resolvePlaybackDefaultMetricBoundItems("overview");
  assert.deepEqual(
    overviewDefaults.map(({ dataBinding, itemId }) => [itemId, dataBinding.metricKey]),
    [
      ["power", "realTimePower"],
      ["today", "todayGeneration"],
      ["total", "totalGeneration"],
      ["co2Today", "todayCo2Reduction"],
      ["co2Total", "totalCo2Reduction"]
    ]
  );

  const catalog = resolvePlaybackMetricCatalog("solar");
  const ratio = catalog.find(({ metricKey }) => metricKey === "selfConsumptionRatio");
  assert.equal(ratio?.sourceClass, "derived-metric");
  assert.deepEqual(ratio?.dependencyKeys, [
    "selfConsumptionRatio",
    "selfConsumptionEnergy",
    "consumptionEnergy"
  ]);
  assert.equal(ratio?.valueType, "numeric");
});

test("effective runtime dependencies follow explicit saved bindings instead of page arrays", () => {
  const inheritedPowerBinding = [{
    dataBinding: {
      metricKey: "realTimePower",
      scope: "inherit-device",
      sourceType: "metric"
    },
    itemId: "generation"
  }] as const;
  const derivedGenerationBinding = [{
    dataBinding: {
      metricKey: "todayGeneration",
      scope: "inherit-device",
      sourceType: "metric"
    },
    itemId: "generation"
  }] as const;

  assert.deepEqual(
    resolvePlaybackRuntimeMetricKeys("solar", inheritedPowerBinding),
    ["realTimePower"]
  );
  assert.deepEqual(
    resolvePlaybackRuntimeMetricKeys("solar", derivedGenerationBinding),
    ["todayGeneration", ...factoryGenerationDependencyKeys]
  );
});

test("resolvePlaybackRuntimeMetricKeys Overview covers KPI and phase live keys", () => {
  const keys = [...resolvePlaybackRuntimeMetricKeys("overview")];
  for (const key of [...OVERVIEW_KPI_KEYS, ...OVERVIEW_PHASE_KEYS]) {
    assert.ok(keys.includes(key), `overview runtime keys missing ${key}`);
  }
  assert.equal(keys.length, OVERVIEW_KPI_KEYS.length + OVERVIEW_PHASE_KEYS.length);
});

test("resolvePlaybackRuntimeMetricKeys Solar covers value-subtree keys and omits server-only energy keys", () => {
  const keys = [...resolvePlaybackRuntimeMetricKeys("solar")];
  for (const key of SOLAR_KPI_KEYS) {
    assert.ok(keys.includes(key), `solar runtime keys missing ${key}`);
  }
  assert.equal(keys.length, SOLAR_KPI_KEYS.length);
  // Solar client reads selfConsumptionRatio from the story payload, never the live
  // snapshot energy keys, so those remain server-only dependencies and stay omitted.
  assert.equal(keys.includes("selfConsumptionEnergy"), false);
  assert.equal(keys.includes("consumptionEnergy"), false);
});

test("resolvePlaybackRuntimeMetricKeys yields empty list for unknown page without throwing", () => {
  assert.deepEqual([...resolvePlaybackRuntimeMetricKeys("images")], []);
  assert.deepEqual([...resolvePlaybackRuntimeMetricKeys("not-a-page" as never)], []);
});

test("resolvePlaybackDisplayMetricSourceClass rejects mqtt-live for derived and aggregate metrics", () => {
  const expected: Array<["overview" | "solar", string, string]> = [
    ["overview", "realTimePower", "mqtt-live"],
    ["overview", "todayGeneration", "derived-metric"],
    ["overview", "totalGeneration", "cumulative-counter"],
    ["overview", "todayCo2Reduction", "derived-metric"],
    ["overview", "totalCo2Reduction", "cumulative-counter"],
    ["solar", "realTimePower", "mqtt-live"],
    ["solar", "todayGeneration", "derived-metric"],
    ["solar", "selfConsumptionRatio", "derived-metric"],
    ["solar", "todayCo2Reduction", "derived-metric"],
    ["solar", "totalCo2Reduction", "cumulative-counter"],
    ["solar", "systemEfficiency", "mqtt-live"]
  ];

  for (const [pageKey, metricKey, sourceClass] of expected) {
    assert.equal(
      resolvePlaybackDisplayMetricSourceClass(pageKey, metricKey),
      sourceClass,
      `${pageKey}.${metricKey} sourceClass mismatch`
    );
  }

  // Hard rule: derived/aggregate metrics must never masquerade as mqtt-live.
  for (const metricKey of ["todayGeneration", "todayCo2Reduction", "selfConsumptionRatio"]) {
    assert.notEqual(resolvePlaybackDisplayMetricSourceClass("solar", metricKey), "mqtt-live");
  }
  assert.notEqual(resolvePlaybackDisplayMetricSourceClass("overview", "totalGeneration"), "mqtt-live");
});

test("todayGeneration gate keeps factory generation dependencies while runtime lists canonical only", () => {
  for (const pageKey of ["overview", "solar"] as const) {
    const gate = resolvePlaybackGateRequirements(pageKey).find(
      (requirement) => requirement.requirementKey === "todayGeneration"
    );
    assert.ok(gate, `${pageKey} gate missing todayGeneration`);
    for (const dependencyKey of factoryGenerationDependencyKeys) {
      assert.ok(
        gate!.dependencyKeys?.includes(dependencyKey),
        `${pageKey} todayGeneration gate missing dependency ${dependencyKey}`
      );
    }

    const runtime = [...resolvePlaybackRuntimeMetricKeys(pageKey)];
    assert.ok(runtime.includes("todayGeneration"));
    for (const dependencyKey of factoryGenerationDependencyKeys) {
      assert.equal(
        runtime.includes(dependencyKey),
        false,
        `${pageKey} runtime must not subscribe server-only factory key ${dependencyKey}`
      );
    }
  }
});
