#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createDryRunSummary,
  createEvidenceBundle,
  createPlaywrightDependencyMessage,
  createRunId,
  defaultEvidenceRoot,
  fhdEditorPreviewStates,
  fhdPlaybackRoutes,
  fhdViewport,
  joinUrl,
  normalizeBaseUrl
} from "./fhd-witness-config.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.FHD_WITNESS_BASE_URL ?? "http://localhost:5173",
    dryRun: false,
    includeEditor: true,
    outputDir: defaultEvidenceRoot,
    runId: process.env.FHD_WITNESS_RUN_ID ?? createRunId()
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--base-url") {
      options.baseUrl = argv[++index] ?? "";
      continue;
    }
    if (arg === "--output-dir") {
      options.outputDir = argv[++index] ?? "";
      continue;
    }
    if (arg === "--run-id") {
      options.runId = argv[++index] ?? "";
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--skip-editor") {
      options.includeEditor = false;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (!options.baseUrl) {
    throw new Error("--base-url must not be empty");
  }
  if (!options.outputDir) {
    throw new Error("--output-dir must not be empty");
  }
  if (!options.runId) {
    throw new Error("--run-id must not be empty");
  }

  return options;
}

function printHelp() {
  console.log(`Usage: pnpm run fhd:witness -- [options]

Options:
  --base-url <url>     Running Vite app URL. Defaults to http://localhost:5173.
  --output-dir <path>  Evidence output root. Defaults to docs/fhd-witness/runs.
  --run-id <id>        Deterministic run directory name. Defaults to UTC timestamp.
  --dry-run            Print route/reference mapping without launching a browser.
  --skip-editor        Capture playback routes only.
`);
}

async function loadChromium() {
  try {
    const playwright = await import("playwright");
    return playwright.chromium;
  } catch (error) {
    throw new Error(createPlaywrightDependencyMessage(), { cause: error });
  }
}

async function launchChromium(chromium) {
  try {
    return await chromium.launch();
  } catch (error) {
    throw new Error(createPlaywrightDependencyMessage(), { cause: error });
  }
}

function withFrozenAutoplay(routeUrl) {
  // playback 頁會自動輪播；witness 用 ?autoplay=0 凍結單頁，否則五頁會截到同一輪播幀。
  const separator = routeUrl.includes("?") ? "&" : "?";
  return `${routeUrl}${separator}autoplay=0`;
}

async function capturePage({ page, baseUrl, runDir, target }) {
  const absoluteUrl = joinUrl(baseUrl, withFrozenAutoplay(target.routeUrl));
  const absolutePath = path.join(runDir, target.screenshotFile);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await page.goto(absoluteUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(1_200);
  await page.screenshot({ path: absolutePath, fullPage: false });

  return {
    routeKey: target.routeKey,
    liveRouteUrl: target.routeUrl,
    referenceImage: target.referenceImage,
    currentScreenshot: path.relative(repoRoot, absolutePath)
  };
}

async function captureWitness(options) {
  const chromium = await loadChromium();
  const browser = await launchChromium(chromium);
  const runDir = path.resolve(repoRoot, options.outputDir, options.runId);
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const generatedAt = new Date().toISOString();

  try {
    const page = await browser.newPage({ viewport: fhdViewport });
    const playbackResults = [];
    for (const target of fhdPlaybackRoutes) {
      playbackResults.push(await capturePage({ page, baseUrl, runDir, target }));
    }

    const editorResults = [];
    if (options.includeEditor) {
      for (const target of fhdEditorPreviewStates) {
        editorResults.push(await capturePage({ page, baseUrl, runDir, target }));
      }
    }

    const evidencePath = path.join(runDir, "evidence-bundle.md");
    await writeFile(
      evidencePath,
      createEvidenceBundle({
        runId: options.runId,
        baseUrl,
        generatedAt,
        playbackResults,
        editorResults
      })
    );

    console.log(`FHD witness evidence written to ${path.relative(repoRoot, evidencePath)}`);
    for (const result of playbackResults) {
      console.log(`- ${result.routeKey}: ${result.currentScreenshot}`);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (options.dryRun) {
    console.log(createDryRunSummary({ baseUrl: options.baseUrl, runId: options.runId }));
    return;
  }

  try {
    await captureWitness(options);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      if (error.cause) {
        console.error("Cause:", error.cause instanceof Error ? error.cause.message : String(error.cause));
      }
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  }
}

await main();
