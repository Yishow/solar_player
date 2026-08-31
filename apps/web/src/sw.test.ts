import assert from "node:assert/strict";
import test from "node:test";

const CACHE_PREFIX = "solar-playback:";
const METADATA_CACHE = "solar-playback:metadata";
const CANDIDATE_CACHE_KEY = "/__candidate-cache";
const MANIFEST_URL = "/offline-manifest.json";

class FakeCache {
  readonly store = new Map<string, Response>();

  async match(request: RequestInfo | URL) {
    return this.store.get(String(request));
  }

  async put(request: RequestInfo | URL, response: Response) {
    this.store.set(String(request), response);
  }
}

class FakeCacheStorage {
  readonly caches = new Map<string, FakeCache>();
  deleteShouldThrow = false;

  async open(name: string) {
    const existing = this.caches.get(name);
    if (existing) {
      return existing;
    }
    const created = new FakeCache();
    this.caches.set(name, created);
    return created;
  }

  async keys() {
    return [...this.caches.keys()];
  }

  async delete(name: string) {
    if (this.deleteShouldThrow) {
      throw new Error("quota error during delete");
    }
    return this.caches.delete(name);
  }
}

function buildManifest(appRelease: string) {
  return JSON.stringify({
    appRelease,
    assets: [{ hash: "a".repeat(64), required: true, url: "/index.html" }],
    schemaVersion: 1
  });
}

/**
 * sw.ts registers its listeners at module scope against `self`, so the globals
 * have to exist before the import. Returns the captured listeners plus the fake
 * cache storage the module will use.
 */
async function loadServiceWorker() {
  const listeners = new Map<string, (event: unknown) => void>();
  const cacheStorage = new FakeCacheStorage();

  Object.assign(globalThis, {
    caches: cacheStorage,
    self: {
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        listeners.set(type, handler);
      },
      clients: {
        claim: async () => {},
        matchAll: async () => []
      },
      location: { origin: "https://solar.test" },
      skipWaiting: async () => {}
    }
  });

  const module = await import(`./sw.js?case=${listeners.size}-${Date.now()}-${Math.random()}`);
  return { cacheStorage, listeners, module };
}

async function seedCommittableCandidate(
  cacheStorage: FakeCacheStorage,
  options: { appRelease: string; candidateCacheName: string; manifest?: string }
) {
  const metadata = await cacheStorage.open(METADATA_CACHE);
  await metadata.put(
    CANDIDATE_CACHE_KEY,
    new Response(
      JSON.stringify({
        appRelease: options.appRelease,
        cacheName: options.candidateCacheName,
        verifiedUrls: ["/index.html"]
      })
    )
  );

  const candidate = await cacheStorage.open(options.candidateCacheName);
  await candidate.put(
    MANIFEST_URL,
    new Response(options.manifest ?? buildManifest(options.appRelease))
  );
  await candidate.put("/index.html", new Response("<html></html>"));
}

function commitActiveCache(listeners: Map<string, (event: unknown) => void>) {
  const handler = listeners.get("message");
  assert.ok(handler, "sw.ts must register a message listener");

  const pending: Array<Promise<unknown>> = [];
  const replies: Array<{ ok: boolean; error?: string }> = [];

  handler({
    data: { type: "SOLAR_COMMIT_ACTIVE_CACHE" },
    ports: [{ postMessage: (reply: { ok: boolean }) => replies.push(reply) }],
    waitUntil: (promise: Promise<unknown>) => pending.push(promise)
  });

  return { replies, settled: Promise.all(pending) };
}

test("committing a candidate reclaims superseded App Shell caches", async () => {
  const { cacheStorage, listeners } = await loadServiceWorker();
  const supersededCache = `${CACHE_PREFIX}1.0.0:candidate:oldhash`;
  const candidateCache = `${CACHE_PREFIX}2.0.0:candidate:newhash`;

  await cacheStorage.open(supersededCache);
  await seedCommittableCandidate(cacheStorage, {
    appRelease: "2.0.0",
    candidateCacheName: candidateCache
  });

  const { replies, settled } = commitActiveCache(listeners);
  await settled;

  assert.deepEqual(replies, [{ ok: true }]);
  assert.equal(
    cacheStorage.caches.has(supersededCache),
    false,
    "superseded release cache should be reclaimed"
  );
  assert.equal(
    cacheStorage.caches.has(candidateCache),
    true,
    "the newly active cache must survive"
  );
  assert.equal(
    cacheStorage.caches.has(METADATA_CACHE),
    true,
    "metadata cache must survive"
  );
});

test("a failed commit reclaims nothing", async () => {
  const { cacheStorage, listeners } = await loadServiceWorker();
  const supersededCache = `${CACHE_PREFIX}1.0.0:candidate:oldhash`;
  const candidateCache = `${CACHE_PREFIX}2.0.0:candidate:newhash`;

  await cacheStorage.open(supersededCache);
  // appRelease disagrees with the candidate identity, so validation fails.
  await seedCommittableCandidate(cacheStorage, {
    appRelease: "2.0.0",
    candidateCacheName: candidateCache,
    manifest: buildManifest("9.9.9")
  });

  const { replies, settled } = commitActiveCache(listeners);
  await settled;

  assert.equal(replies[0]?.ok, false, "commit should fail");
  assert.equal(
    cacheStorage.caches.has(supersededCache),
    true,
    "nothing may be reclaimed when the commit fails"
  );
});

test("a reclamation failure still reports a successful commit", async () => {
  const { cacheStorage, listeners } = await loadServiceWorker();
  const candidateCache = `${CACHE_PREFIX}2.0.0:candidate:newhash`;

  await cacheStorage.open(`${CACHE_PREFIX}1.0.0:candidate:oldhash`);
  await seedCommittableCandidate(cacheStorage, {
    appRelease: "2.0.0",
    candidateCacheName: candidateCache
  });
  cacheStorage.deleteShouldThrow = true;

  const { replies, settled } = commitActiveCache(listeners);
  await settled;

  assert.deepEqual(replies, [{ ok: true }]);
  assert.equal(
    cacheStorage.caches.has(candidateCache),
    true,
    "the active cache must remain usable after a failed reclamation"
  );
});
