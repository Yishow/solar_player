import assert from "node:assert/strict";
import test from "node:test";
import { applyBatchRecipe, suggestMappings } from "./mqttMappingBatch.js";

test("M2-R6-S01 highest counter is not automatically the site main", () => {
  const suggestions = suggestMappings({
    metricScope: "kn",
    observations: [
      { namespace: "factory/kn/dept", tag: "STAMPING", topic: "factory/kn/dept", value: "90000" },
      { namespace: "factory/kn/main", tag: "MAIN", topic: "factory/kn/main", value: "10000" }
    ]
  });
  assert.equal(suggestions.every((row) => row.autoSelectAsSiteMain === false), true);
});

test("M2-R6-S02 two MAIN tags stay distinguishable and unselected", () => {
  const suggestions = suggestMappings({
    metricScope: "kn",
    observations: [
      { namespace: "line-a", tag: "MAIN", topic: "factory/kn/a", value: "1" },
      { namespace: "line-b", tag: "MAIN", topic: "factory/kn/b", value: "2" }
    ]
  });
  assert.equal(suggestions.length, 2);
  assert.equal(new Set(suggestions.map((row) => row.topic)).size, 2);
  assert.equal(suggestions.every((row) => row.autoSelectAsSiteMain === false), true);
});

test("M2-R7-S02 rerunning a batch reuses existing identities", () => {
  const result = applyBatchRecipe({
    existing: [
      { meterId: "kn-main", metricScope: "kn", tagEquals: "MAIN", topic: "factory/kn/main" }
    ],
    metricScope: "kn",
    selected: [{ namespace: "factory/kn/main", tag: "MAIN", topic: "factory/kn/main", value: "10000" }],
    templateSelectorPath: "value"
  });
  assert.equal(result.created.length, 0);
  assert.equal(result.reused[0]?.existingMeterId, "kn-main");
  assert.equal(result.selectedSiteMain, null);
});
