import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
const referenceBoundaryDoc = readFileSync(
  path.join(repoRoot, "docs/reference-match/fhd-reference-informed-closeout-boundaries.md"),
  "utf8"
);
const playbackCanonicalsDoc = readFileSync(
  path.join(repoRoot, "docs/reference-match/playback-visual-canonicals.md"),
  "utf8"
);
const guardrailSpec = readFileSync(
  path.join(repoRoot, "openspec/specs/display-surface-visual-guardrails/spec.md"),
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

function resolveChangeProposalPath(changeName: string) {
  const activePath = path.join(repoRoot, "openspec/changes", changeName, "proposal.md");
  if (existsSync(activePath)) {
    return activePath;
  }

  const archiveRoot = path.join(repoRoot, "openspec/changes/archive");
  const archivedDir = readdirSync(archiveRoot).find((entry) => entry.endsWith(`-${changeName}`));
  if (!archivedDir) {
    throw new Error(`Cannot find proposal for change ${changeName}`);
  }

  return path.join(archiveRoot, archivedDir, "proposal.md");
}

const proposalPaths = [
  "add-display-surface-visual-guardrails",
  "normalize-display-surface-chrome-tokens",
  "align-factory-circuit-display-primitives",
  "split-live-display-preview-showcase-mode"
].map((changeName) => resolveChangeProposalPath(changeName));

const pageSources = [
  "Overview/index.tsx",
  "Solar/index.tsx",
  "FactoryCircuit/index.tsx",
  "Images/index.tsx",
  "Sustainability/index.tsx"
].map((relativePath) => readFileSync(path.join(import.meta.dirname, relativePath), "utf8"));

test("display surface checklist covers the required review dimensions and documented exceptions", () => {
  assert.match(checklistDoc, /Hero typography/);
  assert.match(checklistDoc, /Hero hierarchy/);
  assert.match(checklistDoc, /Photo fade/);
  assert.match(checklistDoc, /Card family/);
  assert.match(checklistDoc, /Card-family rhythm/);
  assert.match(checklistDoc, /Ornament consistency/);
  assert.match(checklistDoc, /Source-like icon language/);
  assert.match(checklistDoc, /Live preview mode/);
  assert.match(checklistDoc, /FHD geometry/);
  assert.match(checklistDoc, /Absolute composition/);
  assert.match(checklistDoc, /Distance readability/);
  assert.match(checklistDoc, /management-surface drift/i);
  assert.match(checklistDoc, /Protected canonical status/);
  assert.match(checklistDoc, /Documented exception/);
  assert.match(checklistDoc, /data:image\/svg\+xml/);
  assert.match(checklistDoc, /mask/);
  assert.match(checklistDoc, /漸層/);

  for (const proposalPath of proposalPaths) {
    const proposalSource = readFileSync(proposalPath, "utf8");
    assert.match(proposalSource, /docs\/display-surface-visual-review-checklist\.md/);
  }
});

test("display surface checklist reviews reference differences as scoped boundary decisions", () => {
  for (const token of ["protected-product-choice", "reference-quality-target", "actual-gap"]) {
    assert.match(checklistDoc, new RegExp(token));
    assert.match(referenceBoundaryDoc, new RegExp(token));
  }

  assert.match(checklistDoc, /scoped boundary/i);
  assert.match(checklistDoc, /header/i);
  assert.match(checklistDoc, /footer/i);
  assert.match(checklistDoc, /Gap Type/);
  assert.match(checklistDoc, /Protected Attributes/);
  assert.match(checklistDoc, /Reference Quality Cue/);
  assert.match(checklistDoc, /Verification Gate/);
  assert.match(checklistDoc, /management-surface drift/i);
  assert.match(checklistDoc, /table-first|toolbar-first|settings-like/i);
  assert.match(referenceBoundaryDoc, /page content/i);
  assert.match(referenceBoundaryDoc, /Gap Type/);
  assert.match(referenceBoundaryDoc, /Verification Gate/);
  assert.match(referenceBoundaryDoc, /hero|KPI|flow|circuit|media stage|caption|ornament|highlight rail/i);
});

test("playback visual canonicals document names witness pairs and protected attributes for all five playback pages", () => {
  const playbackRoutes = [
    {
      route: "/overview",
      fhdWitness: "docs/reference/FHD/01-1.Overview (大).png",
      prototypeWitness:
        "docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/01-overview-spec.md"
    },
    {
      route: "/solar",
      fhdWitness: "docs/reference/FHD/02-2.Solar (大).png",
      prototypeWitness:
        "docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/02-solar-spec.md"
    },
    {
      route: "/factory-circuit",
      fhdWitness: "docs/reference/FHD/03-3.Factory Circuit (大).png",
      prototypeWitness:
        "docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/03-factory-circuit-spec.md"
    },
    {
      route: "/images",
      fhdWitness: "docs/reference/FHD/04-4.Images (大).png",
      prototypeWitness:
        "docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/04-images-spec.md"
    },
    {
      route: "/sustainability",
      fhdWitness: "docs/reference/FHD/05-5.Sustainability (大).png",
      prototypeWitness:
        "docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/05-sustainability-spec.md"
    }
  ];

  assert.match(playbackCanonicalsDoc, /Protected attributes/);
  assert.match(playbackCanonicalsDoc, /Preserved or changed/);
  assert.match(playbackCanonicalsDoc, /Documented exception/);

  for (const page of playbackRoutes) {
    assert.match(playbackCanonicalsDoc, new RegExp(page.route.replace("/", "\\/")));
    assert.match(playbackCanonicalsDoc, new RegExp(page.fhdWitness.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(
      playbackCanonicalsDoc,
      new RegExp(page.prototypeWitness.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
  }
});

test("display surface spec promotes playback witness pairs and management-surface drift rules", () => {
  assert.match(guardrailSpec, /Preserve playback visual canonicals from FHD witnesses/);
  assert.match(guardrailSpec, /Treat FHD witness pairs as the canonical comparison source/);
  assert.match(guardrailSpec, /Prevent management-surface drift inside playback focus regions/);
  assert.match(guardrailSpec, /hero hierarchy/i);
  assert.match(guardrailSpec, /card-family rhythm/i);
  assert.match(guardrailSpec, /source-like icon language/i);
  assert.match(guardrailSpec, /distance readability/i);
  assert.match(guardrailSpec, /management-surface drift/i);
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

  assert.deepEqual(overview.heroCopyLayout, { left: 86, top: 196, width: 620 });
  assert.deepEqual(overview.heroContainer, { height: 466, left: 540, top: 176, width: 1340 });
  assert.equal(solar.kpiCards.generation.height, 220);
  assert.equal(factory.statusBlock.width, 430);
  assert.equal(images.infoPanel.width, 398);
  assert.equal(sustainability.statCards.esg.height, 232);
});

test("shared display chrome roles use semantic tokens and avoid raw color drift in the shared surface css", () => {
  assert.match(sharedChromeCss, /color:\s*var\(--display-eyebrow-green\);/);
  assert.match(sharedChromeCss, /color:\s*var\(--display-title-ink\);/);
  assert.match(sharedChromeCss, /color:\s*var\(--display-subtitle-ink\);/);
  assert.match(sharedChromeCss, /background:\s*linear-gradient\(\s*90deg,\s*var\(--display-photo-fade-paper\)/);
  assert.match(sharedChromeCss, /background:\s*linear-gradient\(\s*135deg,\s*var\(--display-ornament-leaf-fill\),\s*var\(--display-ornament-leaf-fill-soft\)\);/);
  assert.equal(/#[0-9a-fA-F]{3,8}|rgba?\(/.test(sharedChromeCss), false);
});
