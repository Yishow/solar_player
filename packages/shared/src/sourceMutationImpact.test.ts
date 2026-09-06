import assert from "node:assert/strict";
import test from "node:test";
import { evaluateSourceMutationImpact } from "./sourceMutationImpact.js";

test("U2-R5-S02 delete of a referenced source is blocked until resolved", () => {
  const impact = evaluateSourceMutationImpact({
    consumers: [
      { kind: "live", metricKey: "consumptionEnergy", pageId: "overview", itemId: "power" },
      { kind: "draft", metricKey: "consumptionEnergy", pageId: "overview", itemId: "power" }
    ]
  });
  assert.equal(impact.canMutate, false);
  assert.equal(impact.consumers.length, 2);
  assert.equal(impact.unknown, false);
});

test("U2-R5 unknown impact is not treated as zero dependents", () => {
  const impact = evaluateSourceMutationImpact({ consumers: [], lookupFailed: true });
  assert.equal(impact.unknown, true);
  assert.equal(impact.canMutate, false);
});

test("U2-R5 resolved impact allows the mutation", () => {
  const impact = evaluateSourceMutationImpact({
    confirmResolved: true,
    consumers: [{ kind: "live", metricKey: "consumptionEnergy", pageId: "overview" }]
  });
  assert.equal(impact.canMutate, true);
});
