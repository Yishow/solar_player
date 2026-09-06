import assert from "node:assert/strict";
import test from "node:test";
import { previewUnsavedBinding } from "./unsavedBindingPreview.js";

test("U4 unsaved binding preview does not apply the draft", () => {
  const preview = previewUnsavedBinding(
    { metricKey: "consumptionEnergy", metricScope: "kn" },
    { metricKey: "factoryCircuit.stampingPower", metricScope: "kn" }
  );
  assert.equal(preview.applied, false);
  assert.equal(preview.published.metricKey, "consumptionEnergy");
  assert.equal(preview.preview.metricKey, "factoryCircuit.stampingPower");
});
