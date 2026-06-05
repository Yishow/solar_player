import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../../");
const configUrl = pathToFileURL(path.join(repoRoot, "scripts/fhd-witness-config.mjs")).href;
const captureScriptPath = path.join(repoRoot, "scripts/capture-fhd-witness.mjs");
const evidenceTemplatePath = path.join(repoRoot, "docs/fhd-witness/evidence-template.md");
const closeoutMatrixPath = path.join(repoRoot, "docs/fhd-witness/playback-closeout-matrix.md");
const rootFacingDocs = ["AGENTS.md", "CLAUDE.md", "README.md"].map((fileName) =>
  readFileSync(path.join(repoRoot, fileName), "utf8")
);

test("FHD witness mapping covers the five playback routes with FHD reference images only", async () => {
  const { fhdPlaybackRoutes, fhdViewport } = await import(configUrl);

  assert.deepEqual(fhdViewport, { width: 1920, height: 1080 });
  assert.deepEqual(
    fhdPlaybackRoutes.map((route: { pageName: string; routeUrl: string; referenceImage: string }) => ({
      pageName: route.pageName,
      routeUrl: route.routeUrl,
      referenceImage: route.referenceImage
    })),
    [
      {
        pageName: "Overview",
        routeUrl: "/overview",
        referenceImage: "docs/reference/FHD/01-1.Overview (大).png"
      },
      {
        pageName: "Solar",
        routeUrl: "/solar",
        referenceImage: "docs/reference/FHD/02-2.Solar (大).png"
      },
      {
        pageName: "FactoryCircuit",
        routeUrl: "/factory-circuit",
        referenceImage: "docs/reference/FHD/03-3.Factory Circuit (大).png"
      },
      {
        pageName: "Images",
        routeUrl: "/images",
        referenceImage: "docs/reference/FHD/04-4.Images (大).png"
      },
      {
        pageName: "Sustainability",
        routeUrl: "/sustainability",
        referenceImage: "docs/reference/FHD/05-5.Sustainability (大).png"
      }
    ]
  );

  for (const route of fhdPlaybackRoutes) {
    assert.equal(route.referenceImage.includes("docs/reference-match/"), false);
    assert.equal(existsSync(path.join(repoRoot, route.referenceImage)), true);
  }
});

test("FHD witness config exposes editor preview states and accepted implementation classifications", async () => {
  const { fhdEditorPreviewStates, fhdGapClassifications } = await import(configUrl);

  assert.deepEqual(
    fhdEditorPreviewStates.map((state: { pageName: string; routeUrl: string; screenshotFile: string }) => ({
      pageName: state.pageName,
      routeUrl: state.routeUrl,
      screenshotFile: state.screenshotFile
    })),
    [
      {
        pageName: "Overview",
        routeUrl: "/display-pages/editor?page=overview",
        screenshotFile: "editor/overview-editor.png"
      },
      {
        pageName: "Solar",
        routeUrl: "/display-pages/editor?page=solar",
        screenshotFile: "editor/solar-editor.png"
      },
      {
        pageName: "FactoryCircuit",
        routeUrl: "/display-pages/editor?page=factory-circuit",
        screenshotFile: "editor/factory-circuit-editor.png"
      },
      {
        pageName: "Images",
        routeUrl: "/display-pages/editor?page=images",
        screenshotFile: "editor/images-editor.png"
      },
      {
        pageName: "Sustainability",
        routeUrl: "/display-pages/editor?page=sustainability",
        screenshotFile: "editor/sustainability-editor.png"
      }
    ]
  );
  assert.deepEqual(fhdGapClassifications, [
    "existing-editor-control",
    "new-editor-capability",
    "non-editor-runtime-gap",
    "intentional-difference"
  ]);
});

test("FHD witness docs define the closeout matrix and evidence template without reference-match dependency", () => {
  const closeoutMatrix = readFileSync(closeoutMatrixPath, "utf8");
  const evidenceTemplate = readFileSync(evidenceTemplatePath, "utf8");

  for (const source of [closeoutMatrix, evidenceTemplate]) {
    assert.match(source, /docs\/reference\/FHD\//);
    assert.doesNotMatch(source, /docs\/reference-match\//);
  }

  for (const field of [
    "route key",
    "live route URL",
    "reference image",
    "current screenshot",
    "viewport",
    "timestamp / run id",
    "editor capability classification",
    "remaining gap notes",
    "human acceptance status"
  ]) {
    assert.match(evidenceTemplate, new RegExp(field, "i"));
  }

  for (const classification of [
    "existing-editor-control",
    "new-editor-capability",
    "non-editor-runtime-gap",
    "intentional-difference"
  ]) {
    assert.match(evidenceTemplate, new RegExp(classification));
  }
});

test("FHD capture script has dry-run mapping and actionable Playwright dependency failure text", async () => {
  const { createPlaywrightDependencyMessage, createDryRunSummary } = await import(configUrl);
  const captureScript = readFileSync(captureScriptPath, "utf8");

  assert.match(captureScript, /playwright/);
  assert.match(createPlaywrightDependencyMessage(), /pnpm install/i);
  assert.match(createPlaywrightDependencyMessage(), /pnpm exec playwright install chromium/i);
  assert.match(createDryRunSummary(), /1920x1080/);
  assert.match(createDryRunSummary(), /\/overview/);
  assert.match(createDryRunSummary(), /\/display-pages\/editor\?page=overview/);
});

test("generated FHD evidence bundle keeps required row fields and allowed classification choices", async () => {
  const { createEvidenceBundle } = await import(configUrl);
  const bundle = createEvidenceBundle({
    runId: "test-run",
    baseUrl: "http://localhost:5173",
    generatedAt: "2026-06-05T00:00:00.000Z",
    playbackResults: [
      {
        routeKey: "overview",
        liveRouteUrl: "/overview",
        referenceImage: "docs/reference/FHD/01-1.Overview (大).png",
        currentScreenshot: "docs/fhd-witness/runs/test-run/playback/overview.png"
      }
    ],
    editorResults: [
      {
        routeKey: "overview",
        liveRouteUrl: "/display-pages/editor?page=overview",
        currentScreenshot: "docs/fhd-witness/runs/test-run/editor/overview-editor.png"
      }
    ]
  });

  assert.match(bundle, /viewport/);
  assert.match(bundle, /timestamp \/ run id/);
  assert.match(bundle, /existing-editor-control/);
  assert.match(bundle, /new-editor-capability/);
  assert.match(bundle, /non-editor-runtime-gap/);
  assert.match(bundle, /intentional-difference/);
  assert.doesNotMatch(bundle, /pending-review/);
});

test("root-facing docs align AI-led witness capture, editor-first gaps, and human acceptance", () => {
  for (const source of rootFacingDocs) {
    assert.match(source, /docs\/fhd-witness\/playback-closeout-matrix\.md/);
    assert.match(source, /docs\/fhd-witness\/evidence-template\.md/);
    assert.match(source, /pnpm run fhd:witness/);
    assert.match(source, /docs\/reference\/FHD\//);
    assert.match(source, /editor capability/i);
    assert.match(source, /human|人工|使用者/);
  }
});
