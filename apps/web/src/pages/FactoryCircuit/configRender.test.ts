import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createFactoryCircuitDisplayPageSeedConfig, factoryCircuitDisplayPageEditorRegions } from "./displayPageConfig";

const factoryCircuitPageSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const factoryCircuitRuntimeSource = readFileSync(path.join(import.meta.dirname, "runtimeContent.tsx"), "utf8");

test("factory circuit runtime reads resolved display config for copy, status, nodes, connectors, load rows, and KPI cards", () => {
  assert.match(factoryCircuitPageSource, /resolvedConfig\.hero\.eyebrow/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.hero\.title/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.chrome\.heroTypography\.eyebrowFontSize/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.chrome\.heroTypography\.titleFontSize/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.chrome\.heroTypography\.subtitleFontSize/);
  assert.match(factoryCircuitPageSource, /buildCopyTypographyStyleVars\(resolvedConfig\.chrome\.copyTypography\)/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.thickness/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.chrome\.ornaments\.leaf\.opacity/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.chrome\.ornaments\.leaf\.rotationDeg/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.chrome\.ornaments\.leaf\.scale/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.textBlocks\.copy/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.nodes\[node\.key\]/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.nodeTreatments\[node\.key\]/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.connectors\[connectorKey as keyof typeof resolvedConfig\.connectors\]/);
  assert.match(factoryCircuitPageSource, /resolvedConfig\.connectorTreatments\[connectorKey as keyof typeof resolvedConfig\.connectorTreatments\]/);
  assert.match(factoryCircuitRuntimeSource, /resolvedConfig\.loadPanel/);
  assert.match(factoryCircuitRuntimeSource, /resolvedConfig\.loadRows\[slotKey\]/);
  assert.match(
    factoryCircuitRuntimeSource,
    /candidate\.itemId === slotKey/
  );
  assert.match(factoryCircuitRuntimeSource, /resolvedConfig\.rhythm\.factoryLoadRows/);
  assert.match(factoryCircuitRuntimeSource, /buildFactoryLoadRowRhythmStyle/);
  assert.match(factoryCircuitRuntimeSource, /resolvedConfig\.kpiCards\[kpiKey\]/);
  assert.match(factoryCircuitRuntimeSource, /resolvedConfig\.cardStyles\[kpiKey\]/);
  assert.match(factoryCircuitPageSource, /flow: \{ \.\.\.seedConfig\.cardStyles\.flow/);
  assert.match(factoryCircuitPageSource, /\.\.\.seedConfig\.chrome\.ornaments\.leaf/);
  assert.match(factoryCircuitRuntimeSource, /<DisplayCardValueRow/);
  assert.doesNotMatch(factoryCircuitPageSource, /leaf\.opacity \/ seedConfig\.chrome\.ornaments\.leaf\.opacity/);
  assert.doesNotMatch(factoryCircuitPageSource, /factory-circuit-status-note/);
  assert.match(factoryCircuitRuntimeSource, /factory-circuit-load-state/);
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
  assert.equal(config.chrome.copyTypography.secondaryFontSize, 18);
  assert.equal(config.chrome.ornaments.leaf.opacity, 0.38);
  assert.equal(config.chrome.ornaments.leaf.rotationDeg, 0);
  assert.equal(config.cardStyles.totalPower.titleFontSize, 18);
  assert.equal(config.cardStyles.totalPower.valueFontSize, 60);
  assert.equal(config.cardStyles.flow.valueFontSize, 42);
  assert.equal((config as any).rhythm?.factoryLoadRows?.iconTextGap, 24);
  assert.equal((config as any).rhythm?.factoryLoadRows?.labelFontSize, 22);
  assert.equal(config.loadRows.stamping.height, 84);
  assert.equal(config.kpiCards.totalPower.left, 32);
  assert.deepEqual(config.iconSources.kpiCards.solarShare, {
    iconKey: "pie",
    mode: "page-icon-key",
    registry: "factory-circuit"
  });
});

test("factory circuit editor exposes copy typography leaf rotation and KPI card style fields", () => {
  const heroRegion = factoryCircuitDisplayPageEditorRegions.find((region) => region.id === "factory-circuit-hero");
  const leafRegion = factoryCircuitDisplayPageEditorRegions.find((region) => region.id === "factory-ornament-leaf");
  const kpiRegion = factoryCircuitDisplayPageEditorRegions.find((region) => region.id === "factory-kpi-totalPower");

  assert.ok(heroRegion);
  assert.ok(leafRegion);
  assert.ok(kpiRegion);
  assert.ok(heroRegion.fields.some((field) => field.id === "factory-copy-secondary-font-size"));
  assert.ok(leafRegion.fields.some((field) => field.id === "factory-leaf-rotation"));
  assert.ok(kpiRegion.fields.some((field) => field.id === "totalPower-card-title-font-size"));
  assert.ok(kpiRegion.fields.some((field) => field.id === "totalPower-card-value-font-size"));
});

test("factory load row editor regions expose visibility toggle and configuring status select", () => {
  const loadRowRegions = factoryCircuitDisplayPageEditorRegions.filter((region) =>
    region.id.startsWith("factory-load-row-")
  );

  assert.equal(loadRowRegions.length, 8);
  for (const region of loadRowRegions) {
    const key = region.id.replace("factory-load-row-", "");
    const visible = region.fields.find((field) => field.id === `${key}-visible`);
    const status = region.fields.find((field) => field.id === `${key}-status`);

    assert.ok(visible, `${region.id} should expose a visible toggle`);
    assert.equal(visible?.path.join("."), `loadRowStates.${key}.visible`);

    assert.ok(status, `${region.id} should expose a status select`);
    assert.equal(status?.fieldType, "select");
    assert.equal(status?.path.join("."), `loadRowStates.${key}.status`);
    assert.deepEqual(
      status && "options" in status ? status.options.map((option) => option.value) : [],
      ["normal", "configuring"]
    );
  }
});

test("factory seed config provides load row state entries that default to normal and visible", () => {
  const config = createFactoryCircuitDisplayPageSeedConfig();
  assert.deepEqual(
    Object.keys(config.loadRowStates).sort(),
    Object.keys(config.loadRows).sort()
  );
  for (const [key, state] of Object.entries(config.loadRowStates)) {
    assert.notEqual(state.status, "configuring");
    if (key === "heavy_vehicle" || key === "ed_coating") {
      assert.equal(state.visible, false);
    } else {
      assert.notEqual(state.visible, false);
    }
  }
});

test("factory runtime applies load row visibility and configuring placeholder", () => {
  assert.match(factoryCircuitRuntimeSource, /resolvedConfig\.loadRowStates/);
  assert.match(factoryCircuitRuntimeSource, /resolveDisplayPageCardStatus/);
  assert.match(factoryCircuitRuntimeSource, /displayPageCardConfiguringLabel/);
});

test("factory KPI editor regions expose visibility toggle and configuring status select", () => {
  const kpiRegions = factoryCircuitDisplayPageEditorRegions.filter((region) =>
    region.id.startsWith("factory-kpi-")
  );

  assert.equal(kpiRegions.length, 5);
  for (const region of kpiRegions) {
    const key = region.id.replace("factory-kpi-", "");
    const visible = region.fields.find((field) => field.id === `${key}-visible`);
    const status = region.fields.find((field) => field.id === `${key}-status`);

    assert.ok(visible, `${region.id} should expose a visible toggle`);
    assert.equal(visible?.path.join("."), `kpiCardStates.${key}.visible`);

    assert.ok(status, `${region.id} should expose a status select`);
    assert.equal(status?.fieldType, "select");
    assert.equal(status?.path.join("."), `kpiCardStates.${key}.status`);
    assert.deepEqual(
      status && "options" in status ? status.options.map((option) => option.value) : [],
      ["normal", "configuring"]
    );
  }
});

test("factory seed config provides KPI card state entries that default to normal and visible", () => {
  const config = createFactoryCircuitDisplayPageSeedConfig();
  assert.deepEqual(
    Object.keys(config.kpiCardStates).sort(),
    Object.keys(config.kpiCards).sort()
  );
  for (const state of Object.values(config.kpiCardStates)) {
    assert.notEqual(state.status, "configuring");
    assert.notEqual(state.visible, false);
  }
});

test("factory runtime applies KPI card visibility and configuring placeholder", () => {
  assert.match(factoryCircuitRuntimeSource, /resolvedConfig\.kpiCardStates/);
  assert.match(factoryCircuitRuntimeSource, /resolveDisplayPageCardStatus/);
  assert.match(factoryCircuitRuntimeSource, /displayPageCardConfiguringLabel/);
});
