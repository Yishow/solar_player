import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createFactoryCircuitDisplayPageSeedConfig } from "./displayPageConfig";

const factoryCircuitSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("factory circuit runtime reads resolved display config for copy, status, nodes, connectors, load rows, and KPI cards", () => {
  assert.match(factoryCircuitSource, /resolvedConfig\.hero\.eyebrow/);
  assert.match(factoryCircuitSource, /resolvedConfig\.hero\.title/);
  assert.match(factoryCircuitSource, /resolvedConfig\.chrome\.heroTypography\.eyebrowFontSize/);
  assert.match(factoryCircuitSource, /resolvedConfig\.chrome\.heroTypography\.titleFontSize/);
  assert.match(factoryCircuitSource, /resolvedConfig\.chrome\.heroTypography\.subtitleFontSize/);
  assert.match(factoryCircuitSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.thickness/);
  assert.match(factoryCircuitSource, /resolvedConfig\.chrome\.ornaments\.leaf\.opacity/);
  assert.match(factoryCircuitSource, /resolvedConfig\.chrome\.ornaments\.leaf\.scale/);
  assert.match(factoryCircuitSource, /resolvedConfig\.textBlocks\.copy/);
  assert.match(factoryCircuitSource, /resolvedConfig\.nodes\[node\.key\]/);
  assert.match(factoryCircuitSource, /resolvedConfig\.nodeTreatments\[node\.key\]/);
  assert.match(factoryCircuitSource, /resolvedConfig\.connectors\[connectorKey as keyof typeof resolvedConfig\.connectors\]/);
  assert.match(factoryCircuitSource, /resolvedConfig\.connectorTreatments\[connectorKey as keyof typeof resolvedConfig\.connectorTreatments\]/);
  assert.match(factoryCircuitSource, /resolvedConfig\.loadPanel/);
  assert.match(factoryCircuitSource, /resolvedConfig\.loadRows\[loadRowOrder\[index\]!\]/);
  assert.match(factoryCircuitSource, /resolvedConfig\.kpiCards\[kpiLayoutOrder\[index\]!\]/);
  assert.doesNotMatch(factoryCircuitSource, /factory-circuit-status-note/);
  assert.match(factoryCircuitSource, /factory-circuit-load-state/);
});

test("factory circuit display page seed config captures the current default layout and hero contract", () => {
  const config = createFactoryCircuitDisplayPageSeedConfig();

  assert.equal(config.hero.eyebrow, "綠能驅動・永續未來");
  assert.equal(config.hero.title, "廠區用電迴路");
  assert.equal(config.textBlocks.copy.left, 78);
  assert.equal(config.statusBlock.top, 620);
  assert.equal(config.nodes.board.width, 182);
  assert.equal(config.nodes.board.height, 336);
  assert.equal(config.connectors.inverterToBoard.width, 74);
  assert.equal(config.connectorTreatments.inverterToBoard.strokeWidth, 16);
  assert.equal(config.nodeTreatments.board.iconScale, 1);
  assert.equal(config.nodeTreatments.board.valueAlign, "center");
  assert.equal(config.loadRows.production.height, 84);
  assert.equal(config.kpiCards.totalPower.left, 32);
  assert.deepEqual(config.iconSources.kpiCards.solarShare, {
    iconKey: "pie",
    mode: "page-icon-key",
    registry: "factory-circuit"
  });
});
