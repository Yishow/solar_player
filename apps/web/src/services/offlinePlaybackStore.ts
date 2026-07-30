import type {
  DisplayPlaybackRuntimeResponse,
  FreshnessPolicy
} from "@solar-display/shared";

export const OFFLINE_PLAYBACK_DATABASE = "solar-playback-runtime";
export const OFFLINE_PLAYBACK_SCHEMA_VERSION = 1;
export const OFFLINE_CACHE_STATE_EVENT = "solar:offline-cache-state";
const ACTIVE_SNAPSHOT_KEY = "active";
const STORE_NAMES = [
  "meta",
  "profileSnapshots",
  "rotationSnapshots",
  "freshnessPolicies",
  "metricSnapshots"
] as const;

type StoreName = (typeof STORE_NAMES)[number];

export type OfflineMetricSnapshot = {
  key: string;
  sourceTimestamps: string[];
  value: unknown;
};

export type OfflinePlaybackSnapshot = {
  appRelease: string;
  freshnessPolicy: FreshnessPolicy;
  metricSnapshots: OfflineMetricSnapshot[];
  profileVersion: number;
  runtime: DisplayPlaybackRuntimeResponse;
  savedAtServerEpoch: number;
  schemaVersion: typeof OFFLINE_PLAYBACK_SCHEMA_VERSION;
  siteScope: DisplayPlaybackRuntimeResponse["context"]["siteScope"];
};

type ActiveSnapshotPointer = {
  key: typeof ACTIVE_SNAPSHOT_KEY;
  snapshotId: string;
};

export interface OfflinePlaybackRepository {
  commit(snapshot: OfflinePlaybackSnapshot): Promise<void>;
  read(): Promise<OfflinePlaybackSnapshot | null>;
}

let offlineCommitQueue = Promise.resolve<unknown>(undefined);
const pendingMetricSnapshots = new Map<string, OfflineMetricSnapshot>();

function serializeOfflineCommit<T>(task: () => Promise<T>) {
  const pending = offlineCommitQueue.then(task, task);
  offlineCommitQueue = pending.catch(() => {});
  return pending;
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("Offline snapshot transaction aborted.")),
      { once: true }
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("Offline snapshot transaction failed.")),
      { once: true }
    );
  });
}

export function openOfflinePlaybackDatabase(
  indexedDb: IDBFactory = indexedDB
) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(
      OFFLINE_PLAYBACK_DATABASE,
      OFFLINE_PLAYBACK_SCHEMA_VERSION
    );
    request.addEventListener("upgradeneeded", () => {
      for (const storeName of STORE_NAMES) {
        if (!request.result.objectStoreNames.contains(storeName)) {
          request.result.createObjectStore(storeName);
        }
      }
    });
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

async function writeSnapshot(
  database: IDBDatabase,
  snapshot: OfflinePlaybackSnapshot,
  activate: boolean
) {
  assertValidOfflinePlaybackSnapshot(snapshot);
  const transaction = database.transaction([...STORE_NAMES], "readwrite");
  const snapshotId = createSnapshotId(snapshot);
  transaction.objectStore("profileSnapshots").put(
    {
      appRelease: snapshot.appRelease,
      profileVersion: snapshot.profileVersion,
      runtime: snapshot.runtime,
      savedAtServerEpoch: snapshot.savedAtServerEpoch,
      schemaVersion: snapshot.schemaVersion,
      siteScope: snapshot.siteScope
    },
    snapshotId
  );
  transaction.objectStore("rotationSnapshots").put(
    snapshot.runtime.preview,
    snapshotId
  );
  transaction.objectStore("freshnessPolicies").put(
    snapshot.freshnessPolicy,
    snapshotId
  );
  transaction.objectStore("metricSnapshots").put(
    snapshot.metricSnapshots,
    snapshotId
  );
  if (activate) {
    transaction.objectStore("meta").put(
      { key: ACTIVE_SNAPSHOT_KEY, snapshotId } satisfies ActiveSnapshotPointer,
      ACTIVE_SNAPSHOT_KEY
    );
  }
  await transactionComplete(transaction);
  return snapshotId;
}

async function readSnapshotById(
  database: IDBDatabase,
  snapshotId: string
) {
  const transaction = database.transaction(
    ["profileSnapshots", "rotationSnapshots", "freshnessPolicies", "metricSnapshots"],
    "readonly"
  );
  const [profile, rotation, freshnessPolicy, metricSnapshots] =
    await Promise.all([
      requestResult(transaction.objectStore("profileSnapshots").get(snapshotId)),
      requestResult(transaction.objectStore("rotationSnapshots").get(snapshotId)),
      requestResult(transaction.objectStore("freshnessPolicies").get(snapshotId)),
      requestResult(transaction.objectStore("metricSnapshots").get(snapshotId))
    ]);
  await transactionComplete(transaction);
  if (!profile || !rotation || !freshnessPolicy || !Array.isArray(metricSnapshots)) {
    return null;
  }
  const record = profile as Omit<
    OfflinePlaybackSnapshot,
    "freshnessPolicy" | "metricSnapshots"
  >;
  const snapshot = {
    ...record,
    freshnessPolicy,
    metricSnapshots,
    runtime: {
      ...record.runtime,
      preview: rotation
    }
  } as OfflinePlaybackSnapshot;
  assertValidOfflinePlaybackSnapshot(snapshot);
  return snapshot;
}

export function createBrowserOfflinePlaybackRepository(
  indexedDb?: IDBFactory
): OfflinePlaybackRepository {
  const openDatabase = () => openOfflinePlaybackDatabase(indexedDb);

  return {
    async commit(snapshot) {
      const database = await openDatabase();
      try {
        await writeSnapshot(database, snapshot, true);
      } finally {
        database.close();
      }
    },

    async read() {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(["meta"], "readonly");
        const pointer = await requestResult(
          transaction.objectStore("meta").get(ACTIVE_SNAPSHOT_KEY)
        ) as ActiveSnapshotPointer | undefined;
        await transactionComplete(transaction);
        if (!pointer?.snapshotId) {
          return null;
        }
        return await readSnapshotById(database, pointer.snapshotId);
      } catch {
        return null;
      } finally {
        database.close();
      }
    }
  };
}

export async function readOfflinePlaybackSnapshotForRelease(
  appRelease: string,
  indexedDb?: IDBFactory
) {
  const database = await openOfflinePlaybackDatabase(indexedDb);
  try {
    const transaction = database.transaction(["profileSnapshots"], "readonly");
    const store = transaction.objectStore("profileSnapshots");
    const [keys, profiles] = await Promise.all([
      requestResult(store.getAllKeys()),
      requestResult(store.getAll())
    ]);
    await transactionComplete(transaction);
    const candidates = profiles.flatMap((profile, index) => {
      const record = profile as { appRelease?: string; savedAtServerEpoch?: number };
      return record.appRelease === appRelease && typeof keys[index] === "string"
        ? [{ key: keys[index] as string, savedAt: record.savedAtServerEpoch ?? 0 }]
        : [];
    }).sort((left, right) => right.savedAt - left.savedAt);
    return candidates[0]
      ? await readSnapshotById(database, candidates[0].key)
      : null;
  } catch {
    return null;
  } finally {
    database.close();
  }
}

export async function stageOfflinePlaybackSnapshotForRelease(
  appRelease: string
) {
  return serializeOfflineCommit(async () => {
    const repository = createBrowserOfflinePlaybackRepository();
    const current = await repository.read();
    if (!current) {
      throw new Error("Active offline playback snapshot is unavailable.");
    }
    const database = await openOfflinePlaybackDatabase();
    try {
      return await writeSnapshot(database, {
        ...current,
        appRelease
      }, false);
    } finally {
      database.close();
    }
  });
}

export function createSnapshotId(snapshot: OfflinePlaybackSnapshot) {
  return [
    snapshot.appRelease,
    snapshot.profileVersion,
    snapshot.runtime.effectiveRotationRevision
  ].join(":");
}

export function assertValidOfflinePlaybackSnapshot(
  snapshot: OfflinePlaybackSnapshot
) {
  if (
    snapshot.schemaVersion !== OFFLINE_PLAYBACK_SCHEMA_VERSION
    || !Number.isInteger(snapshot.profileVersion)
    || snapshot.profileVersion < 1
    || !Number.isFinite(snapshot.savedAtServerEpoch)
    || snapshot.runtime.profileRollout.appliedVersion !== snapshot.profileVersion
    || snapshot.runtime.context.siteScope !== snapshot.siteScope
    || snapshot.runtime.preview.playablePages.length === 0
  ) {
    throw new Error("Invalid offline playback snapshot.");
  }
  if (containsSecretField(snapshot)) {
    throw new Error("Offline playback snapshot contains a secret field.");
  }
}

function containsSecretField(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsSecretField);
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.entries(value).some(([key, entry]) => {
    if (/credential|pairing.?token|cookie|authorization/i.test(key)) {
      return true;
    }
    return containsSecretField(entry);
  });
}

export type OfflineAssetManifestEntry = {
  hash: string;
  required: boolean;
  url: string;
};

export type OfflineAssetManifest = {
  appRelease: string;
  assets: OfflineAssetManifestEntry[];
  schemaVersion: 1;
};

export function validateOfflineAssetManifest(manifest: OfflineAssetManifest) {
  if (
    manifest.schemaVersion !== 1
    || !manifest.appRelease
    || manifest.assets.length === 0
  ) {
    return false;
  }
  const urls = new Set<string>();
  for (const asset of manifest.assets) {
    if (
      !asset.url.startsWith("/")
      || /pairing.?token/i.test(asset.url)
      || !/^[a-f0-9]{64}$/i.test(asset.hash)
      || urls.has(asset.url)
    ) {
      return false;
    }
    urls.add(asset.url);
  }
  return true;
}

export async function sha256Hex(response: Response) {
  const bytes = await response.clone().arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function stageOfflineAssetManifest(
  manifest: OfflineAssetManifest,
  options: {
    caches?: CacheStorage;
    fetch?: typeof fetch;
  } = {}
) {
  if (!validateOfflineAssetManifest(manifest)) {
    throw new Error("Invalid offline asset manifest.");
  }
  const cacheStorage = options.caches ?? caches;
  const fetchAsset = options.fetch ?? fetch;
  const candidateName = `solar-playback:${manifest.appRelease}:candidate`;
  const cache = await cacheStorage.open(candidateName);
  try {
    for (const asset of manifest.assets) {
      const response = await fetchAsset(asset.url, { cache: "no-store" });
      const cacheResponse = response.clone();
      if (!response.ok || await sha256Hex(response) !== asset.hash.toLowerCase()) {
        throw new Error(`Offline asset validation failed: ${asset.url}`);
      }
      await cache.put(asset.url, cacheResponse);
    }
    return candidateName;
  } catch (error) {
    await cacheStorage.delete(candidateName);
    throw error;
  }
}

export const OFFLINE_CACHE_METADATA = "solar-playback:metadata";
export const OFFLINE_ACTIVE_CACHE_KEY = "/__active-cache";
export const OFFLINE_CANDIDATE_CACHE_KEY = "/__candidate-cache";

export type OfflineActiveCacheIdentity = {
  appRelease: string;
  cacheName: string;
  verifiedUrls: string[];
};

export async function readActiveOfflineCacheIdentity(
  cacheStorage: CacheStorage = caches
): Promise<OfflineActiveCacheIdentity | null> {
  try {
    const metadata = await cacheStorage.open(OFFLINE_CACHE_METADATA);
    const response = await metadata.match(OFFLINE_ACTIVE_CACHE_KEY);
    if (!response) return null;
    const identity = await response.json() as OfflineActiveCacheIdentity;
    if (
      !identity.appRelease
      || !identity.cacheName.startsWith("solar-playback:")
      || !Array.isArray(identity.verifiedUrls)
    ) {
      return null;
    }
    const activeCache = await cacheStorage.open(identity.cacheName);
    const manifestResponse = await activeCache.match("/offline-manifest.json");
    if (!manifestResponse) return null;
    const manifest = await manifestResponse.json() as OfflineAssetManifest;
    if (
      !validateOfflineAssetManifest(manifest)
      || manifest.appRelease !== identity.appRelease
    ) {
      return null;
    }
    const requiredAssets = manifest.assets.filter((asset) => asset.required);
    const cachedRequiredAssets = await Promise.all(
      requiredAssets.map((asset) => activeCache.match(asset.url))
    );
    if (cachedRequiredAssets.some((asset) => !asset)) return null;
    const cachedUrls = (await activeCache.keys()).map((request) => {
      const url = new URL(request.url);
      return url.pathname + url.search;
    });
    return {
      ...identity,
      verifiedUrls: [...new Set([...identity.verifiedUrls, ...cachedUrls])]
    };
  } catch {
    return null;
  }
}

export async function readCandidateOfflineCacheIdentity(
  cacheStorage: CacheStorage = caches
) {
  try {
    const metadata = await cacheStorage.open(OFFLINE_CACHE_METADATA);
    const response = await metadata.match(OFFLINE_CANDIDATE_CACHE_KEY);
    if (!response) return null;
    const identity = await response.json() as OfflineActiveCacheIdentity;
    if (!identity.appRelease || !identity.cacheName.startsWith("solar-playback:")) {
      return null;
    }
    const active = await readActiveOfflineCacheIdentity(cacheStorage);
    return active?.cacheName === identity.cacheName ? null : identity;
  } catch {
    return null;
  }
}

export async function readVerifiedOfflineAssetUrls(
  cacheStorage: CacheStorage = caches
) {
  const active = await readActiveOfflineCacheIdentity(cacheStorage);
  return new Set(active?.verifiedUrls ?? []);
}

export function announceOfflineCacheState(offline: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OFFLINE_CACHE_STATE_EVENT, {
    detail: { offline }
  }));
}

export function cacheVerifiedRuntimeAssets(
  assets: Array<{ hash: string; url: string }>
) {
  if (
    typeof navigator === "undefined"
    || !("serviceWorker" in navigator)
    || assets.length === 0
  ) {
    return;
  }
  navigator.serviceWorker.controller?.postMessage({
    assets,
    type: "SOLAR_CACHE_RUNTIME_ASSETS"
  });
}

export function isVerifiedCachedAsset(
  assetUrl: string | null | undefined,
  verifiedUrls: ReadonlySet<string>
) {
  return typeof assetUrl === "string" && verifiedUrls.has(assetUrl);
}

const OFFLINE_METRIC_PATHS = [
  "/api/brand/profiles/active",
  "/api/display-page-registry",
  "/api/freshness-policy",
  "/api/shell-decorations",
  "/api/weather/current",
  "/api/display-card-data",
  "/api/display-story",
  "/api/sustainability-story",
  "/api/image-playlist?",
  "/api/metrics/live",
  "/api/display-pages/"
] as const;

export function isOfflineMetricPath(path: string, method = "GET") {
  return method === "GET" && OFFLINE_METRIC_PATHS.some((prefix) => path.startsWith(prefix));
}

function collectSourceTimestamps(value: unknown, timestamps = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const entry of value) collectSourceTimestamps(entry, timestamps);
    return timestamps;
  }
  if (!value || typeof value !== "object") {
    return timestamps;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (
      /^(sourceTimestamp|sourceUpdatedAt|capturedAt|generatedAt)$/i.test(key)
      && typeof entry === "string"
    ) {
      timestamps.add(entry);
    } else {
      collectSourceTimestamps(entry, timestamps);
    }
  }
  return timestamps;
}

export async function cacheOfflineMetricResponse(
  path: string,
  value: unknown,
  repository: OfflinePlaybackRepository = createBrowserOfflinePlaybackRepository()
) {
  return serializeOfflineCommit(async () => {
    const active = await repository.read();
    if (!isOfflineMetricPath(path)) {
      return;
    }
    const metricSnapshot: OfflineMetricSnapshot = {
      key: path,
      sourceTimestamps: [...collectSourceTimestamps(value)],
      value
    };
    if (!active) {
      pendingMetricSnapshots.set(path, metricSnapshot);
      return;
    }
    await repository.commit({
      ...active,
      metricSnapshots: [
        ...active.metricSnapshots.filter((entry) => entry.key !== path),
        metricSnapshot
      ]
    });
  });
}

export async function readOfflineMetricResponse<T>(
  path: string,
  repository: OfflinePlaybackRepository = createBrowserOfflinePlaybackRepository()
) {
  const active = await repository.read();
  const metric = active?.metricSnapshots.find((entry) => entry.key === path);
  return metric?.value as T | undefined;
}

export async function commitOfflinePlaybackRuntimeSnapshot(
  snapshot: OfflinePlaybackSnapshot,
  repository: OfflinePlaybackRepository = createBrowserOfflinePlaybackRepository()
) {
  return serializeOfflineCommit(async () => {
    const previous = await repository.read();
    const metricSnapshots =
      previous?.profileVersion === snapshot.profileVersion
      && previous.siteScope === snapshot.siteScope
        ? previous.metricSnapshots
        : [];
    const mergedMetrics = new Map(
      metricSnapshots.map((metric) => [metric.key, metric])
    );
    for (const metric of pendingMetricSnapshots.values()) {
      mergedMetrics.set(metric.key, metric);
    }
    await repository.commit({
      ...snapshot,
      metricSnapshots: [...mergedMetrics.values()]
    });
    pendingMetricSnapshots.clear();
  });
}
