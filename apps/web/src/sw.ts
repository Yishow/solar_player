/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const MANIFEST_URL = "/offline-manifest.json";
const CACHE_PREFIX = "solar-playback:";
const METADATA_CACHE = "solar-playback:metadata";
const ACTIVE_CACHE_KEY = "/__active-cache";
const CANDIDATE_CACHE_KEY = "/__candidate-cache";
const CANDIDATE_READY = "SOLAR_APP_CANDIDATE_READY";
const ACTIVATE_CANDIDATE = "SOLAR_ACTIVATE_CANDIDATE";
const CACHE_RUNTIME_ASSETS = "SOLAR_CACHE_RUNTIME_ASSETS";
const COMMIT_ACTIVE_CACHE = "SOLAR_COMMIT_ACTIVE_CACHE";
/** Present only in release-scoped App Shell cache names, per stageAppShell. */
const APP_SHELL_CACHE_MARKER = ":candidate:";

type OfflineAssetManifest = {
  appRelease: string;
  assets: Array<{ hash: string; required: boolean; url: string }>;
  schemaVersion: 1;
};

type CacheIdentity = {
  appRelease: string;
  cacheName: string;
  verifiedUrls: string[];
};

let metadataMutationQueue = Promise.resolve();

function serializeMetadataMutation(task: () => Promise<void>) {
  const pending = metadataMutationQueue.then(task, task);
  metadataMutationQueue = pending.catch(() => {});
  return pending;
}

function validateManifest(manifest: OfflineAssetManifest) {
  if (
    manifest.schemaVersion !== 1
    || !manifest.appRelease
    || !Array.isArray(manifest.assets)
    || manifest.assets.length === 0
  ) {
    return false;
  }
  const urls = new Set<string>();
  return manifest.assets.every((asset) => {
    const valid =
      asset.url.startsWith("/")
      && !/pairing.?token/i.test(asset.url)
      && /^[a-f0-9]{64}$/i.test(asset.hash)
      && !urls.has(asset.url);
    urls.add(asset.url);
    return valid;
  });
}

async function sha256Hex(response: Response) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await response.clone().arrayBuffer()
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function readIdentity(key: string): Promise<CacheIdentity | null> {
  const metadata = await caches.open(METADATA_CACHE);
  const response = await metadata.match(key);
  if (!response) return null;
  try {
    const identity = await response.json() as CacheIdentity;
    return identity.appRelease && identity.cacheName.startsWith(CACHE_PREFIX)
      ? identity
      : null;
  } catch {
    return null;
  }
}

async function writeIdentity(key: string, identity: CacheIdentity) {
  const metadata = await caches.open(METADATA_CACHE);
  await metadata.put(
    key,
    new Response(JSON.stringify(identity), {
      headers: { "Content-Type": "application/json" }
    })
  );
}

async function stageAppShell() {
  const response = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Offline manifest is unavailable.");
  const manifestText = await response.clone().text();
  const manifest = JSON.parse(manifestText) as OfflineAssetManifest;
  if (!validateManifest(manifest)) throw new Error("Offline manifest is invalid.");

  const manifestHash = (await sha256Hex(new Response(manifestText))).slice(0, 16);
  const cacheName = `${CACHE_PREFIX}${manifest.appRelease}:candidate:${manifestHash}`;
  const cache = await caches.open(cacheName);
  try {
    for (let index = 0; index < manifest.assets.length; index += 12) {
      await Promise.all(
        manifest.assets.slice(index, index + 12).map(async (asset) => {
          const assetResponse = await fetch(asset.url, { cache: "no-store" });
          const cacheResponse = assetResponse.clone();
          if (!assetResponse.ok || await sha256Hex(assetResponse) !== asset.hash) {
            throw new Error(`Offline asset validation failed: ${asset.url}`);
          }
          await cache.put(asset.url, cacheResponse);
        })
      );
    }
    await cache.put(MANIFEST_URL, new Response(manifestText, {
      headers: { "Content-Type": "application/json" }
    }));
    const identity: CacheIdentity = {
      appRelease: manifest.appRelease,
      cacheName,
      verifiedUrls: manifest.assets.map((asset) => asset.url)
    };
    await writeIdentity(CANDIDATE_CACHE_KEY, identity);
    const active = await readIdentity(ACTIVE_CACHE_KEY);
    if (!active) {
      await self.skipWaiting();
      return;
    }
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({
        appRelease: manifest.appRelease,
        cacheName,
        type: CANDIDATE_READY
      });
    }
  } catch (error) {
    await caches.delete(cacheName);
    throw error;
  }
}

/**
 * Delete App Shell caches that are neither active nor the current candidate.
 *
 * Without this, every release leaves its shell cache behind forever and a
 * long-running kiosk grows until it hits the storage quota, at which point
 * offline caching starts failing. Only caches carrying the App Shell marker are
 * touched — the metadata cache and the install-error debug cache share the
 * prefix but are not release-scoped shells.
 */
async function reclaimSupersededCaches(keepCacheNames: Array<string | null | undefined>) {
  const keep = new Set(
    keepCacheNames.filter((name): name is string => typeof name === "string" && name.length > 0)
  );

  for (const cacheName of await caches.keys()) {
    if (
      !cacheName.startsWith(CACHE_PREFIX)
      || !cacheName.includes(APP_SHELL_CACHE_MARKER)
      || keep.has(cacheName)
    ) {
      continue;
    }
    await caches.delete(cacheName);
  }
}

async function validateCandidate() {
  const candidate = await readIdentity(CANDIDATE_CACHE_KEY);
  if (!candidate) throw new Error("Offline candidate metadata is unavailable.");
  const cache = await caches.open(candidate.cacheName);
  const manifestResponse = await cache.match(MANIFEST_URL);
  if (!manifestResponse) throw new Error("Offline candidate manifest is unavailable.");
  const manifest = await manifestResponse.json() as OfflineAssetManifest;
  if (
    !validateManifest(manifest)
    || manifest.appRelease !== candidate.appRelease
  ) {
    throw new Error("Offline candidate identity is invalid.");
  }
  for (const asset of manifest.assets.filter((entry) => entry.required)) {
    if (!await cache.match(asset.url)) {
      throw new Error(`Offline candidate is incomplete: ${asset.url}`);
    }
  }
  return candidate;
}

async function cacheRuntimeAssets(assets: unknown) {
  if (!Array.isArray(assets)) return;
  const active = await readIdentity(ACTIVE_CACHE_KEY);
  if (!active) return;
  const fetchedAssets: Array<{ key: string; response: Response }> = [];
  for (const rawAsset of assets) {
    const asset = rawAsset as { hash?: unknown; url?: unknown };
    if (
      !asset
      || typeof asset !== "object"
      || typeof asset.url !== "string"
      || typeof asset.hash !== "string"
      || !/^[a-f0-9]{64}$/i.test(asset.hash)
    ) {
      continue;
    }
    const url = new URL(asset.url, self.location.origin);
    if (
      url.origin !== self.location.origin
      || !url.pathname.startsWith("/uploads/")
      || /pairing.?token/i.test(url.pathname + url.search)
    ) {
      continue;
    }
    const response = await fetch(url.href, { cache: "no-store" });
    if (!response.ok) continue;
    const cacheResponse = response.clone();
    const hash = await sha256Hex(response);
    if (hash !== asset.hash.toLowerCase()) continue;
    fetchedAssets.push({
      key: url.pathname + url.search,
      response: cacheResponse
    });
  }
  const current = await readIdentity(ACTIVE_CACHE_KEY);
  if (!current || current.cacheName !== active.cacheName) return;
  const cache = await caches.open(current.cacheName);
  for (const asset of fetchedAssets) {
    await cache.put(asset.key, asset.response);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(stageAppShell().catch(async (error) => {
    const debugCache = await caches.open(`${CACHE_PREFIX}install-error`);
    await debugCache.put(
      "/__offline-install-error",
      new Response(error instanceof Error ? error.message : String(error))
    );
    throw error;
  }));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === ACTIVATE_CANDIDATE) {
    event.waitUntil(self.skipWaiting());
  } else if (event.data?.type === CACHE_RUNTIME_ASSETS) {
    event.waitUntil(cacheRuntimeAssets(event.data.assets));
  } else if (event.data?.type === COMMIT_ACTIVE_CACHE) {
    event.waitUntil((async () => {
      try {
        const candidate = await validateCandidate();
        await serializeMetadataMutation(() =>
          writeIdentity(ACTIVE_CACHE_KEY, candidate)
        );
        // Reclaim only after the commit succeeded, so a complete usable cache
        // exists at every moment. Best-effort: a reclamation failure must not
        // turn a successful commit into a reported failure.
        try {
          const stagedCandidate = await readIdentity(CANDIDATE_CACHE_KEY);
          await reclaimSupersededCaches([
            candidate.cacheName,
            stagedCandidate?.cacheName
          ]);
        } catch {
          // Storage remains larger than necessary; playback is unaffected.
        }
        event.ports[0]?.postMessage({ ok: true });
      } catch (error) {
        event.ports[0]?.postMessage({
          error: error instanceof Error ? error.message : String(error),
          ok: false
        });
      }
    })());
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const candidate = await readIdentity(CANDIDATE_CACHE_KEY);
    if (!candidate) return;
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({
        appRelease: candidate.appRelease,
        cacheName: candidate.cacheName,
        type: CANDIDATE_READY
      });
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET"
    || url.origin !== self.location.origin
    || /pairing.?token/i.test(url.pathname + url.search)
    || url.pathname.startsWith("/api/")
  ) {
    return;
  }
  event.respondWith((async () => {
    try {
      return await fetch(event.request);
    } catch {
      const active = await readIdentity(ACTIVE_CACHE_KEY);
      if (active) {
        const cache = await caches.open(active.cacheName);
        const cached =
          await cache.match(event.request)
          ?? await cache.match(url.pathname + url.search)
          ?? (event.request.mode === "navigate"
            ? await cache.match("/index.html")
            : undefined);
        if (cached) return cached;
      }
      return new Response("Offline playback unavailable.", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        status: 503
      });
    }
  })());
});

export {};
