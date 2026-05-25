import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const factorySource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
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
  assert.match(factoryCss, /\.factory-circuit-routing\s*\{[\s\S]*color:\s*var\(--factory-routing-line-color/);
  assert.match(factoryCss, /\.factory-circuit-routing circle\s*\{[\s\S]*fill:\s*var\(--factory-routing-endpoint-color/);
});
