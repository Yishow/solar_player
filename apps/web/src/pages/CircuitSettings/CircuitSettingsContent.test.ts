import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pageDir = path.resolve(import.meta.dirname);
const circuitSettingsIndexSource = fs.readFileSync(path.join(pageDir, "index.tsx"), "utf8");
const circuitSettingsLoadModelSource = fs.readFileSync(path.join(pageDir, "loadModel.ts"), "utf8");
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

test("circuit settings renders rows before deferred readiness diagnostics", () => {
  assert.match(circuitSettingsIndexSource, /readCachedCircuitEditableModel\(\)/);
  assert.match(circuitSettingsIndexSource, /export async function loadCircuitSettingsRoute\(\)/);
  assert.match(circuitSettingsIndexSource, /useState<CircuitConfig\[\]>\(initialEditableModel\?\.circuits \?\? \[\]\)/);
  assert.match(circuitSettingsIndexSource, /const \[hasLoadedCircuits, setHasLoadedCircuits\] = useState\(initialEditableModel !== null\)/);
  assert.match(circuitSettingsIndexSource, /force: initialEditableModel !== null,\s*silent: initialEditableModel !== null/s);
  assert.match(circuitSettingsLoadModelSource, /let cachedCircuitEditableModel: CircuitEditableModel \| null = null/);
  assert.match(circuitSettingsLoadModelSource, /if \(!options\.force && canUseCache && cachedCircuitEditableModel\)/);
  assert.match(circuitSettingsIndexSource, /useDisplayReadiness\(\{\s*enabled:\s*hasLoadedCircuits\s*\}\)/);
  assert.match(circuitSettingsIndexSource, /setHasLoadedCircuits\(true\)/);
});

test("circuit settings reuses editable loader before deferred readiness refresh", () => {
  assert.match(circuitSettingsIndexSource, /loadEditableSettingsLane/);
  assert.match(circuitSettingsIndexSource, /refreshDeferredSettingsDiagnostics/);
  assert.match(circuitSettingsIndexSource, /const loadCircuitEditableModel = useCallback/);
  assert.match(circuitSettingsIndexSource, /loadCircuits=\{loadCircuitEditableModel\}/);
  assert.match(circuitSettingsIndexSource, /await loadCircuitEditableModel\(\{ force: true, propagateError: true, silent: true \}\)/);
  assert.match(circuitSettingsIndexSource, /refreshDeferredSettingsDiagnostics\(\[reloadReadiness\]\)/);
});
