import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const factorySource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const factoryIconSource = readFileSync(path.join(import.meta.dirname, "iconRegistry.tsx"), "utf8");
const sharedNodeCss = readFileSync(path.join(import.meta.dirname, "../shared/displaySurfaceNodes.css"), "utf8");
const factoryCss = readFileSync(path.join(import.meta.dirname, "factoryCircuit.css"), "utf8");

test("factory circuit nodes adopt the shared display node vocabulary", () => {
  assert.match(factorySource, /display-node-frame/);
  assert.match(factorySource, /display-node-icon/);
  assert.match(factorySource, /display-node-title/);
  assert.match(factorySource, /display-node-subtitle/);
  assert.match(sharedNodeCss, /\.display-node-frame\s*\{/);
  assert.match(sharedNodeCss, /\.display-node-icon\s*\{/);
  assert.match(sharedNodeCss, /\.display-node-title\s*\{/);
  assert.match(sharedNodeCss, /\.display-node-subtitle\s*\{/);
});

test("factory load rows and routing use shared display-family surface and token roles", () => {
  assert.match(factoryCss, /\.factory-circuit-load-row\s*\{[\s\S]*background:\s*var\(--display-card-surface/);
  assert.match(factoryCss, /\.factory-circuit-load-row\s*\{[\s\S]*box-shadow:\s*var\(--display-shadow-soft\);/);
  assert.match(factoryCss, /\.factory-circuit-load-row\s*\{[\s\S]*position:\s*absolute;/);
  assert.match(factoryCss, /\.factory-circuit-routing\s*\{[\s\S]*pointer-events:\s*none;/);
  assert.match(factorySource, /function FactoryCircuitLeafWatermark/);
  assert.match(factorySource, /function FactoryCircuitLineLeaf/);
  assert.match(factorySource, /function FactoryCircuitLeafVine/);
  assert.doesNotMatch(factorySource, /DisplayLeafOrnament/);
  assert.match(factorySource, /factory-routing-pv-inverter-reference\.png/);
  assert.match(factorySource, /factory-routing-inverter-board-reference\.png/);
  assert.match(factorySource, /factory-routing-inverter-drop-reference\.png/);
  assert.match(factorySource, /factory-routing-load-reference\.png/);
  assert.match(factorySource, /function FactoryCircuitRoutingReference/);
  assert.match(factoryCss, /\.factory-circuit-routing-reference\s*\{[\s\S]*position:\s*absolute;/);
  assert.doesNotMatch(factorySource, /<table/);
  assert.doesNotMatch(factorySource, /role="table"/);
  assert.doesNotMatch(factorySource, /className="routing-power-chain"/);
  assert.doesNotMatch(factorySource, /className="routing-load-tree"/);
  assert.doesNotMatch(factorySource, /d="M1258 330 H1306/);
  assert.doesNotMatch(factorySource, /d="M1320 78 V553"/);
  assert.doesNotMatch(factorySource, /<circle cx="1382" cy="78" r="5" \/>/);
});

test("factory circuit page-owned icon registry renders reference pixel crops", () => {
  assert.doesNotMatch(factoryIconSource, /ReferenceGlyph/);
  assert.doesNotMatch(factoryIconSource, /factoryReferenceSpriteUrl/);
  assert.doesNotMatch(factoryIconSource, /<svg/);
  assert.doesNotMatch(factoryIconSource, /case "bolt"/);
  assert.doesNotMatch(factoryIconSource, /strokeWidth=/);
  assert.match(factoryIconSource, /factory-circuit-reference-icon/);
  assert.match(factoryIconSource, /factory-icon-solar-reference\.png/);
  assert.match(factoryIconSource, /factory-icon-production-line-reference\.png/);
  assert.match(factoryIconSource, /src=\{definition\.src\}/);

  for (const iconKey of [
    "bars",
    "bolt",
    "ev",
    "hvac",
    "infrastructure",
    "inverter",
    "leaf",
    "lighting",
    "office",
    "pie",
    "production-line",
    "solar",
    "sun",
    "switchboard"
  ]) {
    assert.match(factoryIconSource, new RegExp(`"?${iconKey}"?: \\{\\s+src:`));
  }
});

test("factory circuit leaf ornaments use reference pixel crops without synthetic transforms", () => {
  assert.match(factorySource, /factory-line-leaf-reference\.png/);
  assert.match(factorySource, /factory-leaf-watermark-reference\.png/);
  assert.match(factorySource, /factory-leaf-vine-reference\.png/);
  assert.doesNotMatch(factorySource, /M9 113 C62 66 111 51 179 57 C126 99 67 118 9 113 Z/);
  assert.doesNotMatch(factorySource, /rotate\(-10deg\)/);
});
