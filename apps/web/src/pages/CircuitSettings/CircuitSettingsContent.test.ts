import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pageDir = path.resolve(import.meta.dirname);
const circuitSettingsSource =
  fs.readFileSync(path.join(pageDir, "CircuitSettingsContent.tsx"), "utf8") +
  fs.readFileSync(path.join(pageDir, "CircuitRow.tsx"), "utf8");

test("circuit settings keeps readiness feedback inline instead of mounting an overlapping absolute card inside the table shell", () => {
  assert.match(circuitSettingsSource, /cs-readiness/);
  assert.doesNotMatch(circuitSettingsSource, /DisplayReadinessPanel/);
});

test("circuit settings keeps bulk table editing while replacing freeform icon authoring with bounded presentation controls", () => {
  assert.match(circuitSettingsSource, /<CustomSelect/);
  assert.match(circuitSettingsSource, /value=\{row\.icon \?\? ""\}/);
  assert.match(circuitSettingsSource, /value=\{row\.unit \?\? ""\}/);
  assert.match(circuitSettingsSource, /row\.slotImpactLabel/);
  assert.match(circuitSettingsSource, /row\.thresholdSummaryLabel/);
  assert.doesNotMatch(circuitSettingsSource, /Display Impact/);
  assert.doesNotMatch(circuitSettingsSource, /placeholder="bolt"/);
});
