import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createSolarDisplayPageSeedConfig } from "./displayPageConfig";

const solarSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

function sourceBetween(start: string, end: string) {
  const startIndex = solarSource.indexOf(start);
  const endIndex = solarSource.indexOf(end, startIndex);

  assert.ok(startIndex >= 0, `missing source start: ${start}`);
  assert.ok(endIndex > startIndex, `missing source end: ${end}`);

  return solarSource.slice(startIndex, endIndex);
}

test("solar runtime reads resolved display config for hero, flow nodes, connectors, and KPI cards", () => {
  assert.match(solarSource, /resolvedConfig\.heroCopy\.eyebrow/);
  assert.match(solarSource, /resolvedConfig\.chrome\.heroTypography\.eyebrowFontSize/);
  assert.match(solarSource, /resolvedConfig\.chrome\.heroTypography\.titleFontSize/);
  assert.match(solarSource, /resolvedConfig\.chrome\.heroTypography\.subtitleMarginTop/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.thickness/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.opacity/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.baseLeft/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.baseTop/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.baseWidth/);
  assert.match(solarSource, /--display-gold-line-rotation/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.rotationDeg/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.leaf\.opacity/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.leaf\.baseLeft/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.leaf\.baseTop/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.leaf\.baseWidth/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.leaf\.baseHeight/);
  assert.match(solarSource, /resolvedConfig\.chrome\.ornaments\.leaf\.offsetX/);
  assert.match(solarSource, /\.\.\.seedConfig\.chrome\.ornaments\.goldLine/);
  assert.match(solarSource, /\.\.\.seedConfig\.chrome\.ornaments\.leaf/);
  assert.match(solarSource, /resolveDisplayPageMediaSource\(resolvedConfig\.heroMedia, seedConfig\.heroMedia\.src\)/);
  assert.match(
    solarSource,
    /buildDisplayPageMediaPresentation\(\s*resolvedConfig\.heroMedia,\s*solarHeroMediaEffectResolverOptions\s*\)/
  );
  assert.match(solarSource, /resolvedConfig\.flowNodes\[flowItem\.key\]/);
  assert.match(solarSource, /resolvedConfig\.flowNodeTreatments\[flowItem\.key\]/);
  assert.match(solarSource, /resolvedConfig\.connectors\[connector\.key\]/);
  assert.match(solarSource, /resolvedConfig\.connectorTreatments\[connector\.key\]/);
  assert.match(solarSource, /resolvedConfig\.kpiCards\[cardItem\.key\]/);
});

test("solar value-only refresh keeps static geometry output on config-only memo paths", () => {
  const flowNodeSource = sourceBetween("const flowNodeItems = useMemo(", "const connectorItems = useMemo(");
  const connectorSource = sourceBetween("const connectorItems = useMemo(", "const kpiCardItems = useMemo(");
  const kpiSource = sourceBetween("const kpiCardItems = useMemo(", "if (");
  const heroSource = sourceBetween("const solarTitleLine2 = useMemo(", "const heroTypography = resolvedConfig.chrome.heroTypography");

  assert.match(flowNodeSource, /\[resolvedConfig,\s*seedConfig\]/);
  assert.match(connectorSource, /\[resolvedConfig,\s*seedConfig\]/);
  assert.match(kpiSource, /\[resolvedConfig,\s*seedConfig\]/);
  assert.match(heroSource, /buildDisplayPageMediaPresentation/);
  assert.match(heroSource, /resolveDisplayPageMediaSource/);
  assert.doesNotMatch(flowNodeSource, /viewModel/);
  assert.doesNotMatch(connectorSource, /viewModel/);
  assert.doesNotMatch(kpiSource, /viewModel/);
  assert.doesNotMatch(heroSource, /viewModel/);
  assert.match(solarSource, /const node = viewModel\.flowNodes\[index\]!/);
  assert.match(solarSource, /const metric = viewModel\.kpis\[index\]!/);
});

test("solar runtime keeps hook calls before the loading-state return", () => {
  const loadingReturnSource = sourceBetween("return <DisplayPageLoadingState />;", "return (");

  assert.doesNotMatch(loadingReturnSource, /\buse[A-Z][A-Za-z]+\(/);
});

test("solar display page seed config captures the current default hero and layout contract", () => {
  const config = createSolarDisplayPageSeedConfig("/solar-hero.png");

  assert.equal(config.heroCopy.eyebrow, "綠能驅動・永續未來");
  assert.deepEqual(config.heroCopy.titleLines, ["太陽能驅動", "製造新能量"]);
  assert.equal(config.heroMedia.alt, "太陽能車棚與綠能展示場域");
  assert.equal(config.heroMedia.sourceMode, "seed-default");
  assert.ok(config.heroMedia.effects);
  assert.equal(config.flowNodes.solar.left, 795);
  assert.equal(config.connectors.inverterToFactory.width, 108);
  assert.equal(config.connectorTreatments.solarToInverter.strokeWidth, 6);
  assert.equal(config.connectorTreatments.inverterToFactory.strokeWidth, 6);
  assert.equal(config.connectorTreatments.inverterToCo2.strokeWidth, 4);
  assert.equal(config.chrome.ornaments.goldLine.baseLeft, 0);
  assert.equal(config.chrome.ornaments.goldLine.baseTop, 500);
  assert.equal(config.chrome.ornaments.goldLine.baseWidth, 1075);
  assert.equal(config.chrome.ornaments.goldLine.rotationDeg, -4);
  assert.equal(config.chrome.ornaments.leaf.baseLeft, 565);
  assert.equal(config.chrome.ornaments.leaf.baseTop, 330);
  assert.equal(config.chrome.ornaments.leaf.baseWidth, 190);
  assert.equal(config.chrome.ornaments.leaf.baseHeight, 132);
  assert.ok(
    config.connectorTreatments.solarToInverter.strokeWidth >
      config.connectorTreatments.inverterToCo2.strokeWidth,
    "main connectors stay thicker than the CO2 connector"
  );
  assert.equal(config.flowNodeTreatments.solar.iconScale, 1);
  assert.equal(config.flowNodeTreatments.solar.valueAlign, "center");
  const kpiWidths = Object.values(config.kpiCards).map((card) => card.width);
  assert.ok(
    kpiWidths.every((width) => width === kpiWidths[0]),
    "all five KPI cards share an equal width"
  );
  assert.equal(config.kpiCards.efficiency.width, 350);
});

test("solar runtime keeps story hydration staged behind visible config and socket metrics", () => {
  assert.match(solarSource, /useLiveMetrics\(\)/);
  assert.match(solarSource, /useDisplayStoryRuntime\("solar",\s*\{\s*enabled: runtimeHydrationEnabled\s*\}\)/);
  assert.match(solarSource, /solarStoryRuntime\.payload \?\? undefined/);
  assert.match(solarSource, /solarStory: solarStoryPayload/);
  assert.match(solarSource, /runtimeErrorMessage: runtimeHydrationEnabled \? solarStoryRuntime\.errorMessage : ""/);
  assert.match(solarSource, /usesRuntimeFallback: solarStoryRuntime\.usesFallback/);
});
