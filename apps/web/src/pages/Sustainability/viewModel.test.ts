import assert from "node:assert/strict";
import test from "node:test";
import { sustainabilitySummary } from "../../mocks/sustainability";
import { buildSustainabilityViewModel } from "./viewModel";

test("buildSustainabilityViewModel falls back to readable storytelling cards when summary data is missing", () => {
  const model = buildSustainabilityViewModel({
    highlights: [],
    summary: null
  });

  assert.equal(model.bigNumbers[0]?.value, "18.6");
  assert.equal(model.bigNumbers[0]?.unit, "GWh");
  assert.equal(model.bigNumbers[0]?.iconKey, "bars");
  assert.equal(model.bigNumbers[1]?.value, "9,842");
  assert.equal(model.esgCards[0]?.iconKey, "procure");
  assert.equal(model.esgCards.length, 3);
  assert.match(model.hero.copyZhLines[0] ?? "", /國瑞汽車致力推動綠色製造/);
});

test("buildSustainabilityViewModel keeps the sustainability witness numbers aligned with the current mock summary", () => {
  const model = buildSustainabilityViewModel({
    highlights: [],
    summary: sustainabilitySummary
  });

  assert.equal(model.bigNumbers[0]?.value, "18.6");
  assert.equal(model.bigNumbers[1]?.value, "9,842");
  assert.equal(model.esgCards[2]?.iconKey, "tree");
  assert.equal(model.esgCards[2] && "value" in model.esgCards[2] ? model.esgCards[2].value : null, "25,600");
});
