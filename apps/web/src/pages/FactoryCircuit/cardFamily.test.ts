import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const factorySource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const factoryCss = readFileSync(path.join(import.meta.dirname, "factoryCircuit.css"), "utf8");

test("factory KPI cards use the shared display card family without changing metric binding", () => {
  assert.match(factorySource, /DisplayCardFrame/);
  assert.match(factorySource, /DisplayCardHeader/);
  assert.match(factorySource, /DisplayCardValueRow/);
  assert.match(factorySource, /DisplayCardFooter/);
  assert.match(factorySource, /renderDisplayPageIcon\(\{/);
  assert.match(factorySource, /seedSource: seedConfig\.iconSources\.kpiCards\[kpiLayoutOrder\[index\]!\]/);
  assert.match(factorySource, /source: resolvedConfig\.iconSources\.kpiCards\[kpiLayoutOrder\[index\]!\]/);
  assert.match(factorySource, /<DisplayCardValueRow[^>]+value=\{metric\.value\}/);
  assert.match(factorySource, /<DisplayCardFooter>/);
  assert.doesNotMatch(factorySource, /factory-circuit-kpi-head/);
  assert.doesNotMatch(factorySource, /factory-circuit-kpi-value/);
});

test("factory KPI CSS uses shared card rhythm variables for compact variants instead of absolute value blocks", () => {
  assert.match(factoryCss, /\.factory-circuit-kpi-card\s*\{[\s\S]*--display-card-title-size:/);
  assert.match(factoryCss, /\.factory-circuit-kpi-card\s*\{[\s\S]*--display-card-value-size:/);
  assert.match(factoryCss, /\.factory-circuit-kpi-routing\s*\{[\s\S]*--display-card-value-size:/);
  assert.match(factoryCss, /\.factory-circuit-kpi-routing\s*\{[\s\S]*--display-card-title-size:/);
  assert.doesNotMatch(factoryCss, /\.factory-circuit-kpi-head\s*\{/);
  assert.doesNotMatch(factoryCss, /\.factory-circuit-kpi-value\s*\{/);
});
