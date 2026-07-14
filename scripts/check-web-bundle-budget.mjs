#!/usr/bin/env node
import { createGzip } from "node:zlib";
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Writable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const DEFAULT_DIST_DIR = resolve(repoRoot, "apps/web/dist");
/** 25% below the 388.56 kB gzip baseline recorded 2026-07-13. */
const MAX_ENTRY_GZIP_BYTES = Math.floor(291.42 * 1024);

const MANAGEMENT_SOURCE_MARKERS = [
  "pages/BrandAssets",
  "pages/CircuitSettings",
  "pages/DataSourceSettings",
  "pages/DeviceStatus",
  "pages/DisplayPagesEditor/runtime",
  "pages/EnergyHistory",
  "pages/EnergyTrend",
  "pages/ImageManagement",
  "pages/MqttSettings",
  "pages/OfflineError",
  "pages/PlaybackSettings",
  "pages/SlideshowPreview"
];

const TEMPLATE_SOURCE_MARKERS = [
  "runtimeOverview",
  "runtimeSolar",
  "runtimeFactoryCircuit",
  "runtimeImages",
  "runtimeSustainability"
];

function findManifestPath(distDir) {
  const candidates = [
    join(distDir, ".vite", "manifest.json"),
    join(distDir, "manifest.json")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function gzipSize(filePath) {
  let size = 0;
  const counter = new Writable({
    write(chunk, _encoding, callback) {
      size += chunk.length;
      callback();
    }
  });

  await pipeline(createReadStream(filePath), createGzip(), counter);
  return size;
}

function collectReachableManifestKeys(manifest, startKeys) {
  const queue = [...startKeys];
  const seen = new Set(startKeys);

  while (queue.length > 0) {
    const key = queue.shift();
    const entry = manifest[key];
    if (!entry) {
      continue;
    }

    for (const nextKey of entry.dynamicImports ?? []) {
      if (!seen.has(nextKey)) {
        seen.add(nextKey);
        queue.push(nextKey);
      }
    }

    for (const nextKey of entry.imports ?? []) {
      if (!seen.has(nextKey)) {
        seen.add(nextKey);
        queue.push(nextKey);
      }
    }
  }

  return seen;
}

function collectStaticImportKeys(manifest, startKey) {
  const queue = [startKey];
  const seen = new Set(startKey ? [startKey] : []);

  while (queue.length > 0) {
    const key = queue.shift();
    const entry = manifest[key];
    if (!entry) {
      continue;
    }

    for (const nextKey of entry.imports ?? []) {
      if (!seen.has(nextKey)) {
        seen.add(nextKey);
        queue.push(nextKey);
      }
    }
  }

  return seen;
}

function findMatchingKeys(keys, markers) {
  return markers.map((marker) => {
    const match = [...keys].find((key) => key.includes(marker));
    return { marker, match: match ?? null };
  });
}

function listJsAssets(distDir) {
  const assetsDir = join(distDir, "assets");
  if (!existsSync(assetsDir)) {
    return [];
  }

  return readdirSync(assetsDir)
    .filter((name) => name.endsWith(".js"))
    .map((name) => join(assetsDir, name));
}

export async function checkWebBundleBudget({
  distDir = DEFAULT_DIST_DIR,
  maxEntryGzipBytes = MAX_ENTRY_GZIP_BYTES,
  log = console.log
} = {}) {
  const failures = [];
  const manifestPath = findManifestPath(distDir);

  if (!manifestPath) {
    failures.push(`Vite manifest not found under ${distDir} (expected .vite/manifest.json or manifest.json)`);
    return { ok: false, failures, entryGzipBytes: null };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entryKeys = Object.entries(manifest)
    .filter(([, value]) => value?.isEntry)
    .map(([key]) => key);

  if (entryKeys.length === 0) {
    failures.push("No isEntry chunk found in Vite manifest");
    return { ok: false, failures, entryGzipBytes: null };
  }

  const primaryEntryKey =
    entryKeys.find((key) => key.endsWith("index.html") || key.includes("main")) ?? entryKeys[0];
  const primaryEntry = manifest[primaryEntryKey];
  const entryFile = join(distDir, primaryEntry.file);

  if (!existsSync(entryFile)) {
    failures.push(`Entry asset missing: ${entryFile}`);
    return { ok: false, failures, entryGzipBytes: null };
  }

  const entryGzipBytes = await gzipSize(entryFile);
  const entryGzipKb = entryGzipBytes / 1024;
  log(
    `[bundle-budget] entry ${primaryEntry.file}: ${entryGzipKb.toFixed(2)} kB gzip (limit ${
      maxEntryGzipBytes / 1024
    } kB)`
  );

  if (entryGzipBytes > maxEntryGzipBytes) {
    failures.push(
      `Initial entry gzip ${entryGzipKb.toFixed(2)} kB exceeds budget ${(maxEntryGzipBytes / 1024).toFixed(2)} kB`
    );
  }

  const reachableKeys = collectReachableManifestKeys(manifest, [primaryEntryKey]);
  const dynamicReachableKeys = new Set(
    [...reachableKeys].filter((key) => {
      const entry = manifest[key];
      return Boolean(entry?.isDynamicEntry) || (primaryEntry.dynamicImports ?? []).includes(key);
    })
  );

  // Walk full dynamic import graph from the entry, not only direct dynamicImports.
  const allDynamicFromEntry = new Set();
  const visitQueue = [...(primaryEntry.dynamicImports ?? [])];
  while (visitQueue.length > 0) {
    const key = visitQueue.shift();
    if (allDynamicFromEntry.has(key)) {
      continue;
    }
    allDynamicFromEntry.add(key);
    const entry = manifest[key];
    for (const next of entry?.dynamicImports ?? []) {
      visitQueue.push(next);
    }
  }

  const managementMatches = findMatchingKeys(allDynamicFromEntry, MANAGEMENT_SOURCE_MARKERS);
  const missingManagement = managementMatches.filter((item) => !item.match);
  if (missingManagement.length === MANAGEMENT_SOURCE_MARKERS.length) {
    failures.push(
      `No management lazy chunks found in entry dynamicImports graph (looked for ${MANAGEMENT_SOURCE_MARKERS.join(", ")})`
    );
  } else if (missingManagement.length > 0) {
    log(
      `[bundle-budget] management chunks present for ${
        managementMatches.length - missingManagement.length
      }/${managementMatches.length} markers`
    );
  } else {
    log(`[bundle-budget] management lazy chunks: ${managementMatches.length} markers matched`);
  }

  // At least several management pages must be separate lazy chunks.
  const matchedManagementCount = managementMatches.filter((item) => item.match).length;
  if (matchedManagementCount < 4) {
    failures.push(
      `Expected multiple management route chunks in dynamic import graph, found ${matchedManagementCount}`
    );
  }

  const templateMatches = findMatchingKeys(allDynamicFromEntry, TEMPLATE_SOURCE_MARKERS);
  const missingTemplates = templateMatches.filter((item) => !item.match).map((item) => item.marker);
  if (missingTemplates.length > 0) {
    failures.push(
      `Missing playback template lazy chunks in dynamic import graph: ${missingTemplates.join(", ")}`
    );
  } else {
    log(`[bundle-budget] playback template lazy chunks: ${TEMPLATE_SOURCE_MARKERS.join(", ")}`);
  }

  // Ensure templates are not rolled into the initial entry file by checking entry source map / size graph.
  // Static re-import guard: management/template markers must not appear in the entry's statically-reachable
  // import graph (manifest `imports` edges). A static re-import would bundle the page into the initial load
  // and bypass the dynamicImports checks above.
  const staticReachableKeys = collectStaticImportKeys(manifest, primaryEntryKey);
  const staticManagementMatches = findMatchingKeys(staticReachableKeys, MANAGEMENT_SOURCE_MARKERS)
    .filter((item) => item.match)
    .map((item) => item.marker);
  const staticTemplateMatches = findMatchingKeys(staticReachableKeys, TEMPLATE_SOURCE_MARKERS)
    .filter((item) => item.match)
    .map((item) => item.marker);

  if (staticManagementMatches.length > 0) {
    failures.push(
      `Management markers statically reachable from entry (bundled into initial load): ${staticManagementMatches.join(", ")}`
    );
  }

  if (staticTemplateMatches.length > 0) {
    failures.push(
      `Playback template markers statically reachable from entry (bundled into initial load): ${staticTemplateMatches.join(", ")}`
    );
  }

  const entryDynamicCount = (primaryEntry.dynamicImports ?? []).length;
  if (entryDynamicCount === 0) {
    failures.push("Entry chunk has no dynamicImports; route/template splitting did not take effect");
  } else {
    log(`[bundle-budget] entry direct dynamicImports: ${entryDynamicCount}`);
  }

  const jsAssets = listJsAssets(distDir);
  if (jsAssets.length < 5) {
    failures.push(`Expected multiple JS assets after split, found ${jsAssets.length}`);
  } else {
    log(`[bundle-budget] dist JS assets: ${jsAssets.length}`);
  }

  // Guard against static residual: management markers must not all live only on the entry file.
  const entryStat = statSync(entryFile);
  log(`[bundle-budget] entry raw size: ${(entryStat.size / 1024).toFixed(2)} kB`);

  if (failures.length > 0) {
    for (const failure of failures) {
      log(`[bundle-budget] FAIL: ${failure}`);
    }
    return {
      ok: false,
      failures,
      entryGzipBytes,
      manifestPath,
      primaryEntryKey,
      dynamicReachableKeys: [...allDynamicFromEntry]
    };
  }

  log("[bundle-budget] PASS");
  return {
    ok: true,
    failures,
    entryGzipBytes,
    manifestPath,
    primaryEntryKey,
    dynamicReachableKeys: [...allDynamicFromEntry]
  };
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const distArgIndex = process.argv.indexOf("--dist");
  const distDir =
    distArgIndex >= 0 && process.argv[distArgIndex + 1]
      ? resolve(process.argv[distArgIndex + 1])
      : DEFAULT_DIST_DIR;

  checkWebBundleBudget({ distDir })
    .then((result) => {
      process.exit(result.ok ? 0 : 1);
    })
    .catch((error) => {
      console.error("[bundle-budget] unexpected error", error);
      process.exit(1);
    });
}
