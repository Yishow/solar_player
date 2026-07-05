import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const factorySource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const factoryRuntimeSource = readFileSync(path.join(import.meta.dirname, "runtimeContent.tsx"), "utf8");
const factoryCss = readFileSync(path.join(import.meta.dirname, "factoryCircuit.css"), "utf8");

test("factory KPI cards use the shared display card family while honoring configuring placeholder", () => {
  assert.match(factoryRuntimeSource, /DisplayCardFrame/);
  assert.match(factoryRuntimeSource, /DisplayCardHeader/);
  assert.match(factoryRuntimeSource, /DisplayCardValueRow/);
  assert.match(factoryRuntimeSource, /DisplayCardFooter/);
  assert.match(factoryRuntimeSource, /renderDisplayPageIcon\(\{/);
  assert.match(factoryRuntimeSource, /seedSource: seedConfig\.iconSources\.kpiCards\[kpiLayoutOrder\[index\]!\]/);
  assert.match(factoryRuntimeSource, /source: resolvedConfig\.iconSources\.kpiCards\[kpiLayoutOrder\[index\]!\]/);
  assert.match(factoryRuntimeSource, /resolvedConfig\.kpiCardStates/);
  assert.match(factoryRuntimeSource, /displayPageCardConfiguringLabel/);
  assert.match(
    factoryRuntimeSource,
    /<DisplayCardValueRow[^>]+value=\{isConfiguring \? displayPageCardConfiguringLabel : metric\.value\}/
  );
  assert.match(factoryRuntimeSource, /<DisplayCardFooter>/);
  assert.doesNotMatch(factoryRuntimeSource, /factory-circuit-kpi-head/);
  assert.doesNotMatch(factoryRuntimeSource, /factory-circuit-kpi-value/);
});

test("factory KPI CSS uses shared card rhythm variables for compact variants instead of absolute value blocks", () => {
  assert.match(factoryCss, /\.factory-circuit-kpi-card\s*\{[\s\S]*--display-card-title-size:/);
  assert.match(factoryCss, /\.factory-circuit-kpi-card\s*\{[\s\S]*--display-card-value-size:/);
  assert.match(factoryCss, /\.factory-circuit-kpi-routing\s*\{[\s\S]*--display-card-value-size:/);
  assert.match(factoryCss, /\.factory-circuit-kpi-routing\s*\{[\s\S]*--display-card-title-size:/);
  assert.doesNotMatch(factoryCss, /\.factory-circuit-kpi-head\s*\{/);
  assert.doesNotMatch(factoryCss, /\.factory-circuit-kpi-value\s*\{/);
});
