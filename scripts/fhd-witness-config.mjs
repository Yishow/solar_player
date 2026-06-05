export const fhdViewport = Object.freeze({
  width: 1920,
  height: 1080
});

export const fhdPlaybackRoutes = Object.freeze([
  Object.freeze({
    routeKey: "overview",
    pageName: "Overview",
    routeUrl: "/overview",
    referenceImage: "docs/reference/FHD/01-1.Overview (大).png",
    screenshotFile: "playback/overview.png"
  }),
  Object.freeze({
    routeKey: "solar",
    pageName: "Solar",
    routeUrl: "/solar",
    referenceImage: "docs/reference/FHD/02-2.Solar (大).png",
    screenshotFile: "playback/solar.png"
  }),
  Object.freeze({
    routeKey: "factory-circuit",
    pageName: "FactoryCircuit",
    routeUrl: "/factory-circuit",
    referenceImage: "docs/reference/FHD/03-3.Factory Circuit (大).png",
    screenshotFile: "playback/factory-circuit.png"
  }),
  Object.freeze({
    routeKey: "images",
    pageName: "Images",
    routeUrl: "/images",
    referenceImage: "docs/reference/FHD/04-4.Images (大).png",
    screenshotFile: "playback/images.png"
  }),
  Object.freeze({
    routeKey: "sustainability",
    pageName: "Sustainability",
    routeUrl: "/sustainability",
    referenceImage: "docs/reference/FHD/05-5.Sustainability (大).png",
    screenshotFile: "playback/sustainability.png"
  })
]);

export const fhdEditorPreviewStates = Object.freeze(
  fhdPlaybackRoutes.map((route) =>
    Object.freeze({
      routeKey: route.routeKey,
      pageName: route.pageName,
      routeUrl: `/display-pages/editor?page=${route.routeKey}`,
      referenceImage: route.referenceImage,
      screenshotFile: `editor/${route.routeKey}-editor.png`
    })
  )
);

export const fhdGapClassifications = Object.freeze([
  "existing-editor-control",
  "new-editor-capability",
  "non-editor-runtime-gap",
  "intentional-difference"
]);

export const defaultEvidenceRoot = "docs/fhd-witness/runs";

export function createPlaywrightDependencyMessage() {
  return [
    "Playwright browser capture is unavailable.",
    "Run `pnpm install`, then `pnpm exec playwright install chromium`, and retry `pnpm run fhd:witness`.",
    "The command does not mark FHD witness evidence complete when Playwright or Chromium is missing."
  ].join(" ");
}

export function createDryRunSummary({
  baseUrl = "http://localhost:5173",
  runId = "dry-run"
} = {}) {
  const lines = [
    `FHD witness dry run (${runId})`,
    `Viewport: ${fhdViewport.width}x${fhdViewport.height}`,
    `Base URL: ${baseUrl}`,
    "",
    "Playback routes:"
  ];

  for (const route of fhdPlaybackRoutes) {
    lines.push(`- ${route.pageName}: ${route.routeUrl} -> ${route.referenceImage}`);
  }

  lines.push("", "Editor preview states:");
  for (const state of fhdEditorPreviewStates) {
    lines.push(`- ${state.pageName}: ${state.routeUrl}`);
  }

  return lines.join("\n");
}

export function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

export function createRunId(now = new Date()) {
  return now.toISOString().replace(/[:.]/g, "-");
}

export function joinUrl(baseUrl, routeUrl) {
  return `${normalizeBaseUrl(baseUrl)}${routeUrl}`;
}

export function createEvidenceBundle({
  runId,
  baseUrl,
  generatedAt,
  playbackResults,
  editorResults
}) {
  const lines = [
    `# FHD Witness Evidence Bundle - ${runId}`,
    "",
    `- timestamp / run id: ${runId}`,
    `- generated at: ${generatedAt}`,
    `- viewport: ${fhdViewport.width}x${fhdViewport.height}`,
    `- base URL: ${baseUrl}`,
    `- human acceptance status: pending human review`,
    "",
    "## Playback Witnesses",
    "",
    "| route key | live route URL | reference image | current screenshot | viewport | timestamp / run id | editor capability classification | remaining gap notes | human acceptance status |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  ];

  const classificationChoice = fhdGapClassifications.join(" / ");
  for (const result of playbackResults) {
    lines.push(
      `| ${result.routeKey} | ${result.liveRouteUrl} | ${result.referenceImage} | ${result.currentScreenshot} | ${fhdViewport.width}x${fhdViewport.height} | ${runId} | ${classificationChoice} | Fill after screenshot review. | pending human review |`
    );
  }

  lines.push(
    "",
    "## Editor Preview Witnesses",
    "",
    "| route key | live route URL | current screenshot | purpose |",
    "| --- | --- | --- | --- |"
  );

  for (const result of editorResults) {
    lines.push(
      `| ${result.routeKey} | ${result.liveRouteUrl} | ${result.currentScreenshot} | Proves the corresponding page can be reviewed from /display-pages/editor. |`
    );
  }

  lines.push(
    "",
    "## Gap Classifications",
    "",
    "- existing-editor-control: resolve with a current /display-pages/editor control.",
    "- new-editor-capability: add editor schema, inspector, draft/live persistence, preview/runtime rendering, fallback, validation, and tests before final tuning.",
    "- non-editor-runtime-gap: track as a product/system change outside editor capability.",
    "- intentional-difference: requires explicit human acceptance before closeout.",
    "",
    "Unsupported editor gaps are not complete as page-local CSS-only tuning."
  );

  return `${lines.join("\n")}\n`;
}
