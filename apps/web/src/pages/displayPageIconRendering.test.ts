import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function readPageSource(pageName: string) {
  return readFileSync(path.join(import.meta.dirname, pageName, "index.tsx"), "utf8");
}

test("overview runtime routes KPI icons through the shared icon resolver", () => {
  const source = readPageSource("Overview");

  assert.match(source, /renderDisplayPageIcon\(\{/);
  assert.match(source, /resolvedConfig\.iconSources\[cardItem\.key\]/);
  assert.match(source, /seedConfig\.iconSources\[cardItem\.key\]/);
});

test("solar runtime routes flow and KPI icons through the shared icon resolver", () => {
  const source = readPageSource("Solar");

  assert.match(source, /resolvedConfig\.iconSources\.flowNodes\[flowItem\.key\]/);
  assert.match(source, /seedConfig\.iconSources\.flowNodes\[flowItem\.key\]/);
  assert.match(source, /resolvedConfig\.iconSources\.kpiCards\[cardItem\.key\]/);
  assert.match(source, /seedConfig\.iconSources\.kpiCards\[cardItem\.key\]/);
});

test("factory circuit runtime routes node, load row, and KPI icons through the shared icon resolver", () => {
  const source = readPageSource("FactoryCircuit");

  assert.match(source, /resolvedConfig\.iconSources\.nodes\[node\.key\]/);
  assert.match(source, /resolvedConfig\.iconSources\.loadRows\[loadRowOrder\[index\]!\]/);
  assert.match(source, /resolvedConfig\.iconSources\.kpiCards\[kpiLayoutOrder\[index\]!\]/);
});

test("images runtime routes placeholder icons through the shared icon resolver", () => {
  const source = readPageSource("Images");

  assert.match(source, /resolvedConfig\.iconSources\.mainStagePlaceholder/);
  assert.match(source, /resolvedConfig\.iconSources\.infoPanel/);
  assert.match(source, /resolvedConfig\.iconSources\.thumbnailSlots\[thumbSlotOrder\[thumbIndex\]!\]/);
});

test("sustainability runtime routes KPI and stat icons through the shared icon resolver", () => {
  const source = readPageSource("Sustainability");

  assert.match(source, /resolvedConfig\.iconSources\.kpiCards\[sustainabilityKpiOrder\[index\]!\]/);
  assert.match(source, /resolvedConfig\.iconSources\.statCards\[sustainabilityStatOrder\[index\]!\]/);
});
