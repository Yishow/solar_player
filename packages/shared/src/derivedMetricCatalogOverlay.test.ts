import assert from "node:assert/strict";
import test from "node:test";
import type { DerivedMetricDefinition } from "./derivedMetric.js";
import { resolveEffectivePlaybackMetricCatalog } from "./derivedMetricCatalogOverlay.js";
import { resolvePlaybackMetricCatalog } from "./playbackMetricContract.js";

function siteDefinition(
  metricKey: string,
  siteScopes: DerivedMetricDefinition["siteScopes"],
  overrides: Partial<DerivedMetricDefinition> = {}
): DerivedMetricDefinition {
  return {
    description: "",
    enabled: true,
    expression: "a",
    fallbackPolicy: "unavailable",
    inputs: [{ alias: "a", kind: "metric", metricKey: "realTimePower", scope: "output-site", unit: "kW" }],
    managed: true,
    metricKey,
    name: metricKey,
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 2,
    revision: 1,
    siteScopes,
    ...overrides
  };
}

test("effective catalog narrows allowedScopes from the derived definition for each page key", () => {
  const definitions = [
    siteDefinition("selfConsumptionRatio", ["cl", "kn"], { outputUnit: "%" }),
    siteDefinition("factoryCircuit.jungliTotalPower", ["cl"]),
    siteDefinition("factoryCircuit.guanyinTotalPower", ["kn"])
  ];

  const cases = [
    { expected: ["inherit-device", "cl", "kn"], metricKey: "selfConsumptionRatio", pageKey: "solar" as const },
    { expected: ["inherit-device", "cl"], metricKey: "totalPower", pageKey: "factory-circuit" as const },
    { expected: ["inherit-device", "kn"], metricKey: "totalPower", pageKey: "factory-circuit-guanyin" as const }
  ];

  for (const { expected, metricKey, pageKey } of cases) {
    const catalog = resolveEffectivePlaybackMetricCatalog({
      definitions,
      excludedMetricKeys: new Set(),
      pageKey
    });
    const entry = catalog.find((candidate) => candidate.metricKey === metricKey);
    assert.ok(entry, `${pageKey}/${metricKey} must stay in the catalog`);
    assert.deepEqual([...entry.allowedScopes ?? []], expected);
  }
});

test("effective catalog keeps the built-in label and metric key when a definition overlays an entry", () => {
  const builtIn = resolvePlaybackMetricCatalog("factory-circuit")
    .find((entry) => entry.metricKey === "totalPower");
  assert.ok(builtIn, "factory-circuit catalog must expose totalPower");

  const [entry] = resolveEffectivePlaybackMetricCatalog({
    definitions: [siteDefinition("factoryCircuit.jungliTotalPower", ["cl"], { name: "Jungli total power" })],
    excludedMetricKeys: new Set(),
    pageKey: "factory-circuit"
  }).filter((candidate) => candidate.metricKey === "totalPower");

  assert.equal(entry?.label, builtIn.label);
  assert.equal(entry?.metricKey, "totalPower");
  assert.equal(entry?.sourceClass, "derived-metric");
});

test("effective catalog appends enabled custom definitions and skips disabled or excluded ones", () => {
  const catalog = resolveEffectivePlaybackMetricCatalog({
    definitions: [
      siteDefinition("custom.enabled", ["cl", "kn"], { managed: false }),
      siteDefinition("custom.disabled", ["cl", "kn"], { enabled: false, managed: false }),
      siteDefinition("custom.excluded", ["cl", "kn"], { managed: false })
    ],
    excludedMetricKeys: new Set(["custom.excluded"]),
    pageKey: "solar"
  });
  const customKeys = catalog
    .map(({ metricKey }) => metricKey)
    .filter((metricKey) => metricKey.startsWith("custom."));

  assert.deepEqual(customKeys, ["custom.enabled"]);
});

test("effective catalog leaves built-in entries untouched when no definition matches", () => {
  const pageKey = "overview" as const;
  const builtIn = resolvePlaybackMetricCatalog(pageKey);
  const effective = resolveEffectivePlaybackMetricCatalog({
    definitions: [],
    excludedMetricKeys: new Set(),
    pageKey
  });

  assert.deepEqual(effective, builtIn);
});

test("effective catalog ignores a disabled definition that would otherwise narrow an entry", () => {
  const effective = resolveEffectivePlaybackMetricCatalog({
    definitions: [siteDefinition("factoryCircuit.jungliTotalPower", ["cl"], { enabled: false })],
    excludedMetricKeys: new Set(),
    pageKey: "factory-circuit"
  });
  const builtIn = resolvePlaybackMetricCatalog("factory-circuit")
    .find((entry) => entry.metricKey === "totalPower");
  const entry = effective.find((candidate) => candidate.metricKey === "totalPower");

  assert.deepEqual(entry?.allowedScopes, builtIn?.allowedScopes);
});
