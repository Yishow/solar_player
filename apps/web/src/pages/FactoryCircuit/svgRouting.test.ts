import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createFactoryCircuitDisplayPageSeedConfig } from "./displayPageConfig";

const factoryCircuitSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("factory circuit routing renders as inline SVG instead of PNG reference overlays", () => {
  assert.match(factoryCircuitSource, /<svg[\s\S]*className="factory-circuit-routing-svg"/);
  assert.match(factoryCircuitSource, /<path[\s\S]*data-route-key=\{route\.key\}/);
  assert.doesNotMatch(factoryCircuitSource, /factory-circuit-routing-reference/);
  assert.doesNotMatch(factoryCircuitSource, /factoryRoutingPvInverterReferenceUrl/);
  assert.doesNotMatch(factoryCircuitSource, /factoryRoutingInverterBoardReferenceUrl/);
  assert.doesNotMatch(factoryCircuitSource, /factoryRoutingInverterDropReferenceUrl/);
  assert.doesNotMatch(factoryCircuitSource, /factoryRoutingLoadReferenceUrl/);
});

test("factory circuit SVG routing applies connector treatment stroke attributes", () => {
  assert.match(factoryCircuitSource, /strokeWidth=\{route\.treatment\.strokeWidth\}/);
  assert.match(factoryCircuitSource, /stroke=\{route\.treatment\.strokeColor\}/);
  assert.match(factoryCircuitSource, /opacity=\{route\.treatment\.opacity\}/);
  assert.match(factoryCircuitSource, /strokeLinecap=\{route\.treatment\.lineCap\}/);
});

test("factory circuit SVG routing paths derive from node and load row config geometry", () => {
  const seedConfig = createFactoryCircuitDisplayPageSeedConfig();

  assert.equal(Object.keys(seedConfig.loadRows).length, 6);
  assert.equal(seedConfig.connectorTreatments.solarToInverter.strokeColor, "#6f9b5a");
  assert.match(factoryCircuitSource, /resolvedConfig\.nodes\.solar/);
  assert.match(factoryCircuitSource, /resolvedConfig\.nodes\.inverter/);
  assert.match(factoryCircuitSource, /resolvedConfig\.nodes\.board/);
  assert.match(factoryCircuitSource, /loadRowOrder\.map\(\(loadRowKey\)/);
  assert.match(factoryCircuitSource, /resolvedConfig\.loadRows\[loadRowKey\]/);
  assert.match(factoryCircuitSource, /rectRightCenter\(solarNode\)/);
  assert.match(factoryCircuitSource, /rectLeftCenter\(inverterNode\)/);
  assert.match(factoryCircuitSource, /rectLeftCenter\(boardNode\)/);
  assert.match(factoryCircuitSource, /rectLoadRowAnchor\(loadRow\)/);
  assert.doesNotMatch(factoryCircuitSource, /d="M1258 330 H1306/);
  assert.doesNotMatch(factoryCircuitSource, /d="M1320 78 V553/);
});
