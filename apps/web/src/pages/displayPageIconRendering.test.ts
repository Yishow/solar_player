import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function readPageSource(pageName: string) {
  return readFileSync(path.join(import.meta.dirname, pageName, "index.tsx"), "utf8");
}

function readRuntimeContentSource(pageName: string) {
  return readFileSync(path.join(import.meta.dirname, pageName, "runtimeContent.tsx"), "utf8");
}

test("overview runtime routes KPI icons through the shared icon resolver", () => {
  const source = readRuntimeContentSource("Overview");

  assert.match(source, /renderDisplayPageIcon\(\{/);
  assert.match(source, /resolvedConfig\.iconSources\[shell\.cardItem\.key\]/);
  assert.match(source, /seedConfig\.iconSources\[shell\.cardItem\.key\]/);
});

test("solar runtime routes flow and KPI icons through the shared icon resolver", () => {
  const source = readRuntimeContentSource("Solar");

  assert.match(source, /resolvedConfig\.iconSources\.flowNodes\[flowItem\.key\]/);
  assert.match(source, /seedConfig\.iconSources\.flowNodes\[flowItem\.key\]/);
  assert.match(source, /resolvedConfig\.iconSources\.kpiCards\[cardItem\.key\]/);
  assert.match(source, /seedConfig\.iconSources\.kpiCards\[cardItem\.key\]/);
});

test("factory circuit runtime keeps node icons on the page shell and routes KPI icons through the shared icon resolver", () => {
  const pageSource = readPageSource("FactoryCircuit");
  const runtimeSource = readRuntimeContentSource("FactoryCircuit");

  assert.match(pageSource, /resolvedConfig\.iconSources\.nodes\[node\.key\]/);
  assert.match(runtimeSource, /resolvedConfig\.iconSources\.kpiCards\[kpiLayoutOrder\[index\]!\]/);
  assert.match(pageSource, /loadRowIcons=\{LOAD_ROW_SVG_ICONS\}/);
});

test("images runtime routes placeholder icons through the shared icon resolver", () => {
  const source = readPageSource("Images");

  assert.match(source, /resolvedConfig\.iconSources\.mainStagePlaceholder/);
  assert.match(source, /resolvedConfig\.iconSources\.infoPanel/);
  assert.match(source, /resolvedConfig\.iconSources\.thumbnailSlots\[thumbSlotOrder\[thumbIndex\]!\]/);
});

test("sustainability runtime routes KPI and stat icons through the shared icon resolver", () => {
  const source = readPageSource("Sustainability");

  assert.match(source, /resolvedConfig\.iconSources\.kpiCards\[cardKey\]/);
  assert.match(source, /resolvedConfig\.iconSources\.statCards\[cardKey\]/);
});
