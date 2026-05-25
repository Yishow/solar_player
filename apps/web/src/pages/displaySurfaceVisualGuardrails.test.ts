import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { displayPageTemplateKeys } from "@solar-display/shared";
import { createFactoryCircuitDisplayPageSeedConfig } from "./FactoryCircuit/displayPageConfig";
import { createImagesDisplayPageSeedConfig } from "./Images/displayPageConfig";
import { createOverviewDisplayPageSeedConfig } from "./Overview/displayPageConfig";
import { createSolarDisplayPageSeedConfig } from "./Solar/displayPageConfig";
import { createSustainabilityDisplayPageSeedConfig } from "./Sustainability/displayPageConfig";

const repoRoot = path.resolve(import.meta.dirname, "../../../../");
const checklistDoc = readFileSync(
  path.join(repoRoot, "docs/display-surface-visual-review-checklist.md"),
  "utf8"
);
const sharedChromeCss = readFileSync(
  path.join(import.meta.dirname, "shared/displaySurfaceChrome.css"),
  "utf8"
);
const runtimePageDefinitionsSource = readFileSync(
  path.join(import.meta.dirname, "DisplayPagesEditor/runtimePageDefinitions.tsx"),
  "utf8"
);
const livePreviewRegistrySource = readFileSync(
  path.join(import.meta.dirname, "shared/liveDisplayPagePreviewRegistry.ts"),
  "utf8"
);
const runtimeDefinitionSources = [
  "DisplayPagesEditor/runtimeOverview.tsx",
  "DisplayPagesEditor/runtimeSolar.tsx",
  "DisplayPagesEditor/runtimeFactoryCircuit.tsx",
  "DisplayPagesEditor/runtimeImages.tsx",
  "DisplayPagesEditor/runtimeSustainability.tsx"
].map((relativePath) => readFileSync(path.join(import.meta.dirname, relativePath), "utf8"));

const proposalPaths = [
  "openspec/changes/add-display-surface-visual-guardrails/proposal.md",
  "openspec/changes/normalize-display-surface-chrome-tokens/proposal.md",
  "openspec/changes/align-factory-circuit-display-primitives/proposal.md",
  "openspec/changes/split-live-display-preview-showcase-mode/proposal.md"
].map((relativePath) => path.join(repoRoot, relativePath));

const pageSources = [
  "Overview/index.tsx",
  "Solar/index.tsx",
  "FactoryCircuit/index.tsx",
  "Images/index.tsx",
  "Sustainability/index.tsx"
].map((relativePath) => readFileSync(path.join(import.meta.dirname, relativePath), "utf8"));

test("display surface checklist covers the required review dimensions and documented exceptions", () => {
  assert.match(checklistDoc, /Hero typography/);
  assert.match(checklistDoc, /Photo fade/);
  assert.match(checklistDoc, /Card family/);
  assert.match(checklistDoc, /Ornament consistency/);
  assert.match(checklistDoc, /Live preview mode/);
  assert.match(checklistDoc, /FHD geometry/);
  assert.match(checklistDoc, /Distance readability/);
  assert.match(checklistDoc, /data:image\/svg\+xml/);
  assert.match(checklistDoc, /mask/);
  assert.match(checklistDoc, /漸層/);

  for (const proposalPath of proposalPaths) {
    const proposalSource = readFileSync(proposalPath, "utf8");
    assert.match(proposalSource, /docs\/display-surface-visual-review-checklist\.md/);
  }
});

test("runtime preview definitions expose renderers and seed configs for all five display pages", () => {
  assert.deepEqual(
    [...displayPageTemplateKeys].sort(),
    ["factory-circuit", "images", "overview", "solar", "sustainability"]
  );
  assert.match(runtimePageDefinitionsSource, /overviewRuntimePageDefinition/);
  assert.match(runtimePageDefinitionsSource, /solarRuntimePageDefinition/);
  assert.match(runtimePageDefinitionsSource, /factoryCircuitRuntimePageDefinition/);
  assert.match(runtimePageDefinitionsSource, /imagesRuntimePageDefinition/);
  assert.match(runtimePageDefinitionsSource, /sustainabilityRuntimePageDefinition/);
  assert.match(livePreviewRegistrySource, /runtimePageDefinitions\.map/);
  assert.match(livePreviewRegistrySource, /renderPreview:\s*definition\.renderPreview/);
  assert.match(livePreviewRegistrySource, /createSeedConfig:\s*definition\.createSeedConfig/);

  for (const source of runtimeDefinitionSources) {
    assert.match(source, /createSeedConfig:\s*\(\)\s*=>/);
    assert.match(source, /renderPreview:\s*\(config\)\s*=>/);
  }
});

test("shared card primitives remain the expected display playback path where card families already exist", () => {
  for (const source of pageSources) {
    assert.match(source, /DisplayCardFrame/);
    assert.match(source, /DisplayCardHeader/);
    assert.match(source, /DisplayCardFooter/);
  }
});

test("display seed configs keep protected FHD geometry fixtures stable across the five playback pages", () => {
  const overview = createOverviewDisplayPageSeedConfig("/overview-hero.png");
  const solar = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const factory = createFactoryCircuitDisplayPageSeedConfig();
  const images = createImagesDisplayPageSeedConfig("/images-main.jpg");
  const sustainability = createSustainabilityDisplayPageSeedConfig("/sustainability-hero.jpg");

  assert.deepEqual(overview.heroCopyLayout, { left: 86, top: 172, width: 642 });
  assert.equal(solar.kpiCards.generation.height, 220);
  assert.equal(factory.statusBlock.width, 430);
  assert.equal(images.infoPanel.width, 374);
  assert.equal(sustainability.statCards.esg.height, 220);
});

test("shared display chrome roles use semantic tokens and avoid raw color drift in the shared surface css", () => {
  assert.match(sharedChromeCss, /color:\s*var\(--display-eyebrow-green\);/);
  assert.match(sharedChromeCss, /color:\s*var\(--display-title-ink\);/);
  assert.match(sharedChromeCss, /color:\s*var\(--display-subtitle-ink\);/);
  assert.match(sharedChromeCss, /background:\s*linear-gradient\(\s*90deg,\s*var\(--display-photo-fade-paper\)/);
  assert.match(sharedChromeCss, /background:\s*linear-gradient\(\s*135deg,\s*var\(--display-ornament-leaf-fill\),\s*var\(--display-ornament-leaf-fill-soft\)\);/);
  assert.equal(/#[0-9a-fA-F]{3,8}|rgba?\(/.test(sharedChromeCss), false);
});
