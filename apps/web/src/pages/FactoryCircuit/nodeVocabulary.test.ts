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
  assert.match(factoryCss, /\.factory-circuit-routing\s*\{[\s\S]*color:\s*var\(--factory-routing-line-color/);
  assert.match(factoryCss, /\.factory-circuit-routing circle\s*\{[\s\S]*fill:\s*var\(--factory-routing-endpoint-color/);
  assert.match(factorySource, /function FactoryCircuitLeafWatermark/);
  assert.match(factorySource, /function FactoryCircuitLineLeaf/);
  assert.doesNotMatch(factorySource, /DisplayLeafOrnament/);
  assert.match(factorySource, /className="routing-power-chain"/);
  assert.match(factorySource, /className="routing-power-flow"/);
  assert.match(factorySource, /className="routing-power-chevron"/);
  assert.match(factorySource, /className="routing-load-tree"/);
  assert.match(factorySource, /className="routing-trunk"/);
  assert.match(factorySource, /className="routing-board-branch"/);
  assert.match(factorySource, /resolvedConfig\.connectors/);
  assert.match(factorySource, /d="M1320 78 V553"/);
  assert.match(factorySource, /d="M1258 330 H1294 C1309 330 1320 318 1320 303"/);
  assert.match(factorySource, /d="M1320 102 C1320 88 1332 78 1346 78 H1382"/);
  assert.match(factorySource, /<circle cx="1382" cy="78" r="5" \/>/);
  assert.doesNotMatch(factorySource, /V553 M1320 78 V553/);
});

test("factory circuit page-owned icon registry renders every icon key as SVG", () => {
  assert.doesNotMatch(factoryIconSource, /ReferenceGlyph/);
  assert.match(factoryIconSource, /factoryReferenceSpriteUrl/);
  assert.match(factoryIconSource, /FactoryCircuitReferenceSprite/);
  assert.match(factoryIconSource, /<image/);
  assert.doesNotMatch(factoryIconSource, /case "bolt"/);
  assert.doesNotMatch(factoryIconSource, /<path d=/);

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
    assert.match(factoryIconSource, new RegExp(`"?${iconKey}"?: \\{ height: \\d+, width: \\d+, x: \\d+, y: \\d+ \\}`));
  }
});
