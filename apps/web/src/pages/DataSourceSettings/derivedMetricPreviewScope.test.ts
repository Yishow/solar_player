import assert from "node:assert/strict";
import test from "node:test";
import type { DerivedMetricDefinition } from "@solar-display/shared";
import { derivedMetricEvaluationScopes, resolveDerivedMetricPreviewScope } from "./DerivedMetricRegistryPanel";

function definition(overrides: Partial<DerivedMetricDefinition>): DerivedMetricDefinition {
  return {
    description: "",
    enabled: true,
    expression: "a",
    fallbackPolicy: "unavailable",
    inputs: [{ alias: "a", kind: "metric", metricKey: "realTimePower", scope: "output-site", unit: "kW" }],
    managed: false,
    metricKey: "custom.preview",
    name: "Custom preview",
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 2,
    revision: 1,
    ...overrides
  };
}

test("preview scope matches a scope the definition actually evaluates", () => {
  const cases = [
    { expected: "global", draft: definition({ outputScopePolicy: "global", siteScopes: undefined }) },
    { expected: "cl", draft: definition({ siteScopes: ["cl", "kn"] }) },
    { expected: "kn", draft: definition({ siteScopes: ["kn"] }) },
    { expected: "cl", draft: definition({ siteScopes: undefined }) }
  ] as const;

  for (const { draft, expected } of cases) {
    assert.equal(resolveDerivedMetricPreviewScope(draft), expected);
    assert.equal(derivedMetricEvaluationScopes(draft).includes(expected), true);
  }
});

test("a KN-only definition is never previewed under CL", () => {
  const draft = definition({ siteScopes: ["kn"] });
  assert.equal(resolveDerivedMetricPreviewScope(draft), "kn");
  assert.deepEqual(derivedMetricEvaluationScopes(draft), ["kn"]);
});
