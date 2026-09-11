import type {
  ConfigStage,
  DisplayPageCardRail,
  DisplayPageConfigEnvelope,
  DisplayPageFreeformObject,
  DisplayPageId,
  DisplaySyncEvent,
  DisplaySyncEventScope,
  FallbackPolicy,
  ManagementDraftSaveConflict
} from "@solar-display/shared";
import {
  defaultFallbackPolicy,
  isDisplayPageCardRail,
  isLegacyDisplayPageMetricHighlightRail,
  normalizeDisplayPageFreeformObjects,
  upgradeLegacyMetricHighlightRail
} from "@solar-display/shared";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDisplayPageConfig,
  isManagementDraftConflictError,
  updateDisplayPageConfig
} from "../services/api";
import { createDraftSession, type DisplayPageDraftSession, applyDraftConfigUpdate, rebaseDraftSessionBaseline, resetDraftPaths as resetDraftSessionPaths, redoDraftSession, undoDraftSession } from "./displayPageDraftSession";
import { deepClone, getValueAtPath, setValueAtPath } from "./displayPageConfigPaths";
import { useDisplaySyncRefresh } from "./useDisplaySyncRefresh";
export { getValueAtPath, setValueAtPath } from "./displayPageConfigPaths";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDisplayPageMediaEffectLayerCandidate(value: unknown): value is { kind: string; zone: string } {
  return isPlainObject(value) && typeof value.kind === "string" && typeof value.zone === "string";
}

function isDisplayPageMediaEffectLayerArray(value: unknown) {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => isDisplayPageMediaEffectLayerCandidate(entry));
}

const liveDisplayPageSyncScopes = ["display-pages"] as const;
const noDisplayPageSyncScopes = [] as const;

type DisplayPageConfigWithFreeformObjects = {
  freeformObjects?: DisplayPageFreeformObject[];
};

export function resolveDisplayPageConfigForPage<T>(
  pageId: DisplayPageId,
  configPageId: DisplayPageId,
  seedConfig: T,
  config: T
) {
  return configPageId === pageId ? config : deepClone(seedConfig);
}

export function mergeDisplayPageConfig<T>(seedConfig: T, overrideConfig: unknown): T {
  if (overrideConfig === undefined) {
    return deepClone(seedConfig);
  }

  if (isDisplayPageCardRail(seedConfig) && isLegacyDisplayPageMetricHighlightRail(overrideConfig)) {
    return upgradeLegacyMetricHighlightRail(overrideConfig, seedConfig.cards) as T;
  }

  if (Array.isArray(seedConfig)) {
    if (!Array.isArray(overrideConfig)) {
      return deepClone(seedConfig);
    }

    if (overrideConfig.length === 0) {
      return [] as T;
    }

    if (isDisplayPageMediaEffectLayerArray(seedConfig) || isDisplayPageMediaEffectLayerArray(overrideConfig)) {
      return deepClone(overrideConfig as T);
    }

    const usesIdentityMerge =
      seedConfig.some((item) => isPlainObject(item) && typeof item.id === "string") ||
      overrideConfig.some((item) => isPlainObject(item) && typeof item.id === "string");

    const mergedArray = usesIdentityMerge
      ? overrideConfig.map((overrideValue, index) => {
          const seedValue =
            isPlainObject(overrideValue) && typeof overrideValue.id === "string"
              ? seedConfig.find(
                  (candidate) =>
                    isPlainObject(candidate) && candidate.id === overrideValue.id
                ) ?? seedConfig[index] ?? overrideValue
              : seedConfig[index] ?? overrideValue;

          return mergeDisplayPageConfig(seedValue, overrideValue);
        })
      : seedConfig.map((seedValue, index) =>
          mergeDisplayPageConfig(seedValue, overrideConfig[index])
        );

    return mergedArray as T;
  }

  if (isPlainObject(seedConfig) && isPlainObject(overrideConfig)) {
    const output: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(seedConfig), ...Object.keys(overrideConfig)]);

    for (const key of keys) {
      const seedValue = seedConfig[key];
      const overrideValue = overrideConfig[key];

      output[key] =
        overrideValue === undefined
          ? deepClone(seedValue)
          : mergeDisplayPageConfig(seedValue, overrideValue);
    }

    return output as T;
  }

  return deepClone(overrideConfig as T);
}

export function mergeDisplayPageConfigEnvelope<T>(
  seedConfig: T,
  envelope: Pick<DisplayPageConfigEnvelope, "freeformObjects" | "regions">
) {
  const merged = mergeDisplayPageConfig(seedConfig, envelope.regions) as T & DisplayPageConfigWithFreeformObjects;
  merged.freeformObjects = normalizeDisplayPageFreeformObjects(envelope.freeformObjects);
  return merged as T;
}

export function splitDisplayPageConfigEnvelopePayload(config: Record<string, unknown>) {
  const { freeformObjects, ...regions } = config as Record<string, unknown> & DisplayPageConfigWithFreeformObjects;

  return {
    freeformObjects: normalizeDisplayPageFreeformObjects(freeformObjects),
    regions
  };
}

export function resolveDisplayPageConfigStagePath(pageId: DisplayPageId, stage: ConfigStage) {
  return `/api/display-pages/${pageId}/${stage}`;
}

export function resolveDisplayPageFallbackPolicy(
  envelope: Pick<DisplayPageConfigEnvelope, "fallbackPolicy"> | null
): FallbackPolicy {
  return envelope?.fallbackPolicy ?? defaultFallbackPolicy;
}

const displayPageConfigCache = new Map<string, DisplayPageConfigEnvelope>();
const pendingDisplayPageConfigRequests = new Map<string, Promise<DisplayPageConfigEnvelope>>();
const latestDisplayPageConfigRequestOutcomes = new Map<string, Promise<DisplayPageConfigEnvelope>>();
// Per stage:page key. Every read start and every authoritative commit advances
// it, and a read may publish or deliver its own outcome only while the key still
// holds the generation it started with. Values come from one counter and are
// never reused, so clearing the map cannot revive an in-flight read.
const displayPageConfigGenerations = new Map<string, number>();
let lastDisplayPageConfigGeneration = 0;

function resolveDisplayPageConfigCacheKey(pageId: DisplayPageId, stage: ConfigStage) {
  return `${stage}:${pageId}`;
}

function advanceDisplayPageConfigGeneration(cacheKey: string) {
  lastDisplayPageConfigGeneration += 1;
  displayPageConfigGenerations.set(cacheKey, lastDisplayPageConfigGeneration);
  return lastDisplayPageConfigGeneration;
}

type DisplayPageConfigEnvelopeLoaderOptions = {
  force?: boolean;
  readConfig?: (pageId: DisplayPageId, stage: ConfigStage) => Promise<DisplayPageConfigEnvelope>;
};

/**
 * Commits an authoritative envelope — an external prime, a saved draft, or a
 * save conflict's latest envelope. Older reads of the same page and stage are
 * invalidated and detached first, so none of them can replace it later.
 */
export function primeDisplayPageConfigCache(
  pageId: DisplayPageId,
  stage: ConfigStage,
  envelope: DisplayPageConfigEnvelope
) {
  const cacheKey = resolveDisplayPageConfigCacheKey(pageId, stage);
  advanceDisplayPageConfigGeneration(cacheKey);
  pendingDisplayPageConfigRequests.delete(cacheKey);
  latestDisplayPageConfigRequestOutcomes.delete(cacheKey);
  displayPageConfigCache.set(cacheKey, envelope);
}

export function clearDisplayPageConfigCache() {
  displayPageConfigCache.clear();
  pendingDisplayPageConfigRequests.clear();
  latestDisplayPageConfigRequestOutcomes.clear();
  displayPageConfigGenerations.clear();
}

// The cache always holds the newest authoritative envelope of a key: commits and
// current reads write it, superseded reads never do. Returns it when it differs
// from `known`, i.e. when something newer was committed since `known` was seen.
function resolveNewerDisplayPageConfigEnvelope(
  pageId: DisplayPageId,
  stage: ConfigStage,
  known: DisplayPageConfigEnvelope | undefined
) {
  const committed = displayPageConfigCache.get(resolveDisplayPageConfigCacheKey(pageId, stage));
  return committed !== undefined && committed !== known ? committed : null;
}

type DisplayPageConfigEnvelopeAdmission = {
  envelope: DisplayPageConfigEnvelope;
  outcome: "published" | "rejected" | "unchanged";
};

// Admits a server-confirmed save or conflict envelope for one stage:page key.
// Only a version above the one the key already holds is published; an equal or
// older envelope leaves the cache, its generation and in-flight reads alone and
// yields the confirmed envelope instead. Versions are never compared across keys.
function admitDisplayPageConfigEnvelope(
  pageId: DisplayPageId,
  stage: ConfigStage,
  candidate: DisplayPageConfigEnvelope
): DisplayPageConfigEnvelopeAdmission {
  const confirmed = displayPageConfigCache.get(resolveDisplayPageConfigCacheKey(pageId, stage));
  if (confirmed && candidate.version <= confirmed.version) {
    return { envelope: confirmed, outcome: candidate.version === confirmed.version ? "unchanged" : "rejected" };
  }

  primeDisplayPageConfigCache(pageId, stage, candidate);
  return { envelope: candidate, outcome: "published" };
}

export async function loadDisplayPageConfigEnvelope(
  pageId: DisplayPageId,
  stage: ConfigStage,
  options: DisplayPageConfigEnvelopeLoaderOptions = {}
): Promise<DisplayPageConfigEnvelope> {
  const cacheKey = resolveDisplayPageConfigCacheKey(pageId, stage);
  const cachedEnvelope = displayPageConfigCache.get(cacheKey);

  if (!options.force && cachedEnvelope) {
    return cachedEnvelope;
  }

  const pendingRequest = pendingDisplayPageConfigRequests.get(cacheKey);

  if (!options.force && pendingRequest) {
    return pendingRequest;
  }

  const readConfig = options.readConfig ?? getDisplayPageConfig;
  const generation = advanceDisplayPageConfigGeneration(cacheKey);
  const isCurrentRead = () => displayPageConfigGenerations.get(cacheKey) === generation;
  // A superseded read never hands over its own payload or error: its caller gets
  // the newer read still in flight, else the envelope committed since, else a
  // fresh read.
  const resolveSupersededRead = () =>
    pendingDisplayPageConfigRequests.get(cacheKey)
    ?? latestDisplayPageConfigRequestOutcomes.get(cacheKey)
    ?? displayPageConfigCache.get(cacheKey)
    ?? loadDisplayPageConfigEnvelope(pageId, stage, { readConfig });

  const request = readConfig(pageId, stage)
    .then(
      (envelope) => {
        if (!isCurrentRead()) {
          return resolveSupersededRead();
        }

        displayPageConfigCache.set(cacheKey, envelope);
        return envelope;
      },
      (error: unknown) => {
        if (!isCurrentRead()) {
          return resolveSupersededRead();
        }

        throw error;
      }
    )
    .finally(() => {
      if (pendingDisplayPageConfigRequests.get(cacheKey) === request) {
        pendingDisplayPageConfigRequests.delete(cacheKey);
      }
    });

  pendingDisplayPageConfigRequests.set(cacheKey, request);
  latestDisplayPageConfigRequestOutcomes.set(cacheKey, request);
  return request;
}

export function resolveCachedDisplayPageConfigSession<T>(
  pageId: DisplayPageId,
  stage: ConfigStage,
  seedConfig: T
): (DisplayPageDraftSession<T> & { lastLoadedEnvelope: DisplayPageConfigEnvelope }) | null {
  const envelope = displayPageConfigCache.get(resolveDisplayPageConfigCacheKey(pageId, stage));

  if (!envelope) {
    return null;
  }

  return createDisplayPageConfigSessionFromEnvelope(seedConfig, envelope);
}

export function createDisplayPageConfigSessionFromEnvelope<T>(
  seedConfig: T,
  envelope: DisplayPageConfigEnvelope
): DisplayPageDraftSession<T> & { lastLoadedEnvelope: DisplayPageConfigEnvelope } {
  const mergedConfig = mergeDisplayPageConfigEnvelope(seedConfig, envelope);
  return {
    ...createDraftSession(mergedConfig, envelope, resolveDisplayPageFallbackPolicy(envelope)),
    lastLoadedEnvelope: envelope
  };
}

export function resolveInitialDisplayPageConfigSession<T>({
  enabled,
  initialEnvelope,
  initialSession,
  pageId,
  seedConfig,
  stage
}: {
  enabled: boolean;
  initialEnvelope?: DisplayPageConfigEnvelope | null;
  initialSession?: DisplayPageDraftSession<T> | null;
  pageId: DisplayPageId;
  seedConfig: T;
  stage: ConfigStage;
}): DisplayPageDraftSession<T> | null {
  if (!enabled) {
    return null;
  }

  if (
    initialSession?.lastLoadedEnvelope?.pageId === pageId &&
    initialSession.lastLoadedEnvelope.stage === stage
  ) {
    return initialSession;
  }

  if (initialEnvelope?.pageId === pageId && initialEnvelope.stage === stage) {
    return createDisplayPageConfigSessionFromEnvelope(seedConfig, initialEnvelope);
  }

  return resolveCachedDisplayPageConfigSession(pageId, stage, seedConfig);
}

export function applyDisplayPageSaveConflict<T>(
  session: DisplayPageDraftSession<T>,
  latestConfig: T,
  latestEnvelope: DisplayPageConfigEnvelope,
  fallbackPolicy: FallbackPolicy
): DisplayPageDraftSession<T> {
  return rebaseDraftSessionBaseline(session, latestConfig, latestEnvelope, fallbackPolicy, { markDirty: true });
}

export function resolveDisplayPageSaveConflictMessage(
  conflict: ManagementDraftSaveConflict<DisplayPageConfigEnvelope>
) {
  return `儲存衝突：伺服器草稿已更新到 v${conflict.currentVersion}，已保留本地未儲存變更，請先重新同步後再決定是否重套。`;
}

export function shouldHydrateDisplayPageSession(enabled: boolean, hasSession: boolean) {
  return enabled && !hasSession;
}

export function shouldReloadDisplayPageConfigOnSync(input: {
  enabled: boolean;
  stage: ConfigStage;
  dirty: boolean;
  scope: DisplaySyncEventScope;
}): boolean {
  return (
    input.enabled && input.stage === "live" && !input.dirty && input.scope === "display-pages"
  );
}

export function shouldDeferDisplayPageRuntimeRender(args: {
  runtimeHydrationEnabled: boolean;
  isLoading: boolean;
  lastLoadedEnvelope: DisplayPageConfigEnvelope | null;
  stage: ConfigStage;
}) {
  return args.runtimeHydrationEnabled && args.stage === "live" && args.isLoading && args.lastLoadedEnvelope === null;
}

export function resolveDisplayPageConfigSyncScopes(enabled: boolean, stage: ConfigStage) {
  return enabled && stage === "live" ? liveDisplayPageSyncScopes : noDisplayPageSyncScopes;
}

function resolveLoadMessage(stage: ConfigStage, envelope: DisplayPageConfigEnvelope) {
  if (envelope.updatedAt) {
    return stage === "live" ? "正式展示頁設定已同步。" : "展示頁設定已同步。";
  }
  return stage === "live" ? "目前使用 live seed fallback。" : "目前使用 seed fallback，可直接開始編輯。";
}

type UseDisplayPageConfigOptions<T = unknown> = {
  enabled?: boolean;
  initialEnvelope?: DisplayPageConfigEnvelope | null;
  initialSession?: DisplayPageDraftSession<T> | null;
  stage?: ConfigStage;
};

type UseDisplayPageConfigResult<T> = {
  applyConfigUpdate: (
    nextValue: SetStateAction<T>,
    options?: { dirtyPaths?: Array<Array<number | string>>; historyBase?: T; recordHistory?: boolean }
  ) => void;
  canRedo: boolean;
  canUndo: boolean;
  config: T;
  dirty: boolean;
  errorMessage: string;
  fallbackPolicy: FallbackPolicy;
  isLoading: boolean;
  isSaving: boolean;
  lastLoadedEnvelope: DisplayPageConfigEnvelope | null;
  message: string;
  resetPaths: (paths: Array<Array<number | string>>) => void;
  reload: () => Promise<void>;
  redo: () => void;
  save: () => Promise<void>;
  setConfig: Dispatch<SetStateAction<T>>;
  seedConfig: T;
  undo: () => void;
};

export function useDisplayPageConfig<T>(
  pageId: DisplayPageId,
  seedConfig: T,
  options: UseDisplayPageConfigOptions<T> = {}
): UseDisplayPageConfigResult<T> {
  const enabled = options.enabled ?? true;
  const stage = options.stage ?? "live";
  const initialCachedSession = resolveInitialDisplayPageConfigSession({
    enabled,
    initialEnvelope: options.initialEnvelope,
    initialSession: options.initialSession,
    pageId,
    seedConfig,
    stage
  });
  const [sessions, setSessions] = useState<Record<string, DisplayPageDraftSession<T>>>(() =>
    initialCachedSession ? { [pageId]: initialCachedSession } : {}
  );
  const [isLoading, setIsLoading] = useState(enabled && initialCachedSession === null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(enabled ? "正在同步展示頁設定..." : "使用頁面預設設定。");
  const [errorMessage, setErrorMessage] = useState("");
  const loadRequestIdRef = useRef(0);
  // The page and stage this owner currently serves; null while disabled or
  // after unmount. A late save consults it so it never writes into a page,
  // stage or lifecycle the owner has since left.
  const ownerRef = useRef<{ lifecycle: number; pageId: DisplayPageId; stage: ConfigStage } | null>(null);
  const ownerLifecycleRef = useRef(0);
  const saveRequestIdRef = useRef(0);
  const currentSession = sessions[pageId];
  const hasSession = Boolean(currentSession);
  const config = currentSession?.config ?? deepClone(seedConfig);
  const lastLoadedEnvelope = currentSession?.lastLoadedEnvelope ?? null;
  const fallbackPolicy = currentSession?.fallbackPolicy ?? defaultFallbackPolicy;
  const dirty = currentSession?.dirty ?? false;

  useEffect(() => {
    ownerLifecycleRef.current += 1;
    const owner = enabled ? { lifecycle: ownerLifecycleRef.current, pageId, stage } : null;
    ownerRef.current = owner;
    saveRequestIdRef.current += 1;
    setIsSaving(false);

    return () => {
      if (ownerRef.current === owner) {
        ownerRef.current = null;
      }
      saveRequestIdRef.current += 1;
      loadRequestIdRef.current += 1;
    };
  }, [enabled, pageId, stage]);

  useEffect(() => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    if (!enabled) {
      setIsLoading(false);
      setIsSaving(false);
      setMessage("使用頁面預設設定。");
      setErrorMessage("");
      return;
    }

    let active = true;
    const isCurrentRequest = () => active && requestId === loadRequestIdRef.current;

    if (!shouldHydrateDisplayPageSession(enabled, hasSession)) {
      setIsLoading(false);
      setMessage(dirty ? "保留未儲存草稿。" : "展示頁設定已同步。");
      setErrorMessage("");
      return;
    }

    const cachedSession = resolveCachedDisplayPageConfigSession(pageId, stage, seedConfig);
    if (cachedSession) {
      setSessions((current) => ({ ...current, [pageId]: cachedSession }));
      setIsLoading(false);
      setMessage(resolveLoadMessage(stage, cachedSession.lastLoadedEnvelope));
      setErrorMessage("");
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setMessage("正在同步展示頁設定...");
      setErrorMessage("");

      try {
        const loadedEnvelope = await loadDisplayPageConfigEnvelope(pageId, stage);
        if (!isCurrentRequest()) {
          return;
        }

        const envelope = resolveNewerDisplayPageConfigEnvelope(pageId, stage, loadedEnvelope) ?? loadedEnvelope;
        setSessions((current) => ({ ...current, [pageId]: createDisplayPageConfigSessionFromEnvelope(seedConfig, envelope) }));
        setMessage(resolveLoadMessage(stage, envelope));
      } catch (error) {
        if (!isCurrentRequest()) {
          return;
        }

        // Hydration only reads a cold cache, so any envelope there now was
        // committed after this read began and outranks its failure.
        const committedEnvelope = resolveNewerDisplayPageConfigEnvelope(pageId, stage, undefined);
        if (committedEnvelope) {
          setSessions((current) => ({ ...current, [pageId]: createDisplayPageConfigSessionFromEnvelope(seedConfig, committedEnvelope) }));
          setMessage(resolveLoadMessage(stage, committedEnvelope));
          return;
        }

        const clonedSeed = deepClone(seedConfig);
        setSessions((current) => ({ ...current, [pageId]: createDraftSession(clonedSeed, null, defaultFallbackPolicy) }));
        setErrorMessage(error instanceof Error ? error.message : "載入展示頁設定失敗。");
        setMessage("使用 seed fallback。");
      } finally {
        if (isCurrentRequest()) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [dirty, enabled, hasSession, pageId, seedConfig, stage]);

  const reload = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    setIsLoading(true);
    setMessage("正在重新同步展示頁設定...");
    setErrorMessage("");
    const envelopeAtStart = displayPageConfigCache.get(resolveDisplayPageConfigCacheKey(pageId, stage));

    try {
      const loadedEnvelope = await loadDisplayPageConfigEnvelope(pageId, stage, { force: true });
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      const envelope = resolveNewerDisplayPageConfigEnvelope(pageId, stage, loadedEnvelope) ?? loadedEnvelope;
      setSessions((current) => ({ ...current, [pageId]: createDisplayPageConfigSessionFromEnvelope(seedConfig, envelope) }));
      setMessage(resolveLoadMessage(stage, envelope));
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      // A failed force read keeps the warm envelope; only an envelope committed
      // after this reload began outranks the failure.
      const committedEnvelope = resolveNewerDisplayPageConfigEnvelope(pageId, stage, envelopeAtStart);
      if (committedEnvelope) {
        setSessions((current) => ({ ...current, [pageId]: createDisplayPageConfigSessionFromEnvelope(seedConfig, committedEnvelope) }));
        setMessage(resolveLoadMessage(stage, committedEnvelope));
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "重新同步展示頁設定失敗。");
      setMessage("重新同步失敗，保留目前編輯狀態。");
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, pageId, seedConfig, stage]);

  const displaySyncScopes = useMemo(
    () => resolveDisplayPageConfigSyncScopes(enabled, stage),
    [enabled, stage]
  );

  const handleDisplaySync = useCallback(
    (event: DisplaySyncEvent) => {
      if (!shouldReloadDisplayPageConfigOnSync({ enabled, stage, dirty, scope: event.scope })) {
        return;
      }

      void reload();
    },
    [dirty, enabled, reload, stage]
  );

  useDisplaySyncRefresh(handleDisplaySync, displaySyncScopes);

  const save = async () => {
    if (!enabled || stage !== "draft") {
      return;
    }

    if (!lastLoadedEnvelope) {
      setErrorMessage("缺少最新伺服器基線，請先重新同步後再儲存。");
      setMessage("儲存失敗，請先重新同步。");
      return;
    }

    setIsSaving(true);
    setMessage("正在儲存展示頁設定...");
    setErrorMessage("");

    const saveOwner = ownerRef.current;
    const saveRequestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = saveRequestId;
    const ownsSaveOperation = () =>
      ownerRef.current === saveOwner && saveRequestIdRef.current === saveRequestId;
    // A server-confirmed envelope (saved, or a conflict's latest) is admitted
    // against the version this page and stage already confirmed. A published
    // envelope supersedes every earlier read of the key. While the owner still
    // serves this page, its earlier load is invalidated with the publish and the
    // loading that load held is settled here, since that load's own finally no
    // longer counts. Sessions are keyed by page, so a published envelope still
    // reaches this page's session after the owner switched pages, but never after
    // it switched stage, was disabled, or unmounted. An equal or older envelope
    // publishes nothing and fences no read; it only rebases the operation that
    // still owns it onto the confirmed envelope.
    const commitServerEnvelope = (
      candidate: DisplayPageConfigEnvelope,
      nextSession: (
        envelope: DisplayPageConfigEnvelope,
        session: DisplayPageDraftSession<T> | undefined
      ) => DisplayPageDraftSession<T>
    ) => {
      const ownsOperation = ownsSaveOperation();
      const admission = admitDisplayPageConfigEnvelope(pageId, stage, candidate);
      if (admission.outcome !== "published") {
        if (ownsOperation) {
          setSessions((current) => ({ ...current, [pageId]: nextSession(admission.envelope, current[pageId]) }));
        }
        return;
      }

      if (ownsOperation) {
        loadRequestIdRef.current += 1;
      }

      const currentOwner = ownerRef.current;
      if (!currentOwner || currentOwner.stage !== stage) {
        return;
      }
      if (currentOwner.pageId === pageId && !ownsOperation) {
        return;
      }

      setSessions((current) => ({ ...current, [pageId]: nextSession(admission.envelope, current[pageId]) }));
      if (ownsOperation) {
        setIsLoading(false);
      }
    };

    try {
      const payload = splitDisplayPageConfigEnvelopePayload(config as Record<string, unknown>);
      const envelope = await updateDisplayPageConfig(
        pageId,
        payload.regions,
        stage,
        { baseVersion: lastLoadedEnvelope.version },
        payload.freeformObjects
      );
      commitServerEnvelope(envelope, (confirmed) => createDisplayPageConfigSessionFromEnvelope(seedConfig, confirmed));
      if (ownsSaveOperation()) {
        setMessage("展示頁設定已儲存。");
      }
    } catch (error) {
      if (isManagementDraftConflictError(error)) {
        const latestEnvelope = error.conflict.latestEnvelope as DisplayPageConfigEnvelope;
        // The session only rebases its baseline onto the admitted envelope and
        // keeps the local draft.
        commitServerEnvelope(latestEnvelope, (confirmed, session) => applyDisplayPageSaveConflict(
          session ?? createDraftSession(deepClone(seedConfig), null, defaultFallbackPolicy),
          mergeDisplayPageConfigEnvelope(seedConfig, confirmed),
          confirmed,
          resolveDisplayPageFallbackPolicy(confirmed)
        ));
        if (ownsSaveOperation()) {
          setErrorMessage(
            resolveDisplayPageSaveConflictMessage(
              error.conflict as ManagementDraftSaveConflict<DisplayPageConfigEnvelope>
            )
          );
          setMessage("儲存衝突，已保留本地未儲存變更。");
        }
      } else if (ownsSaveOperation()) {
        setErrorMessage(error instanceof Error ? error.message : "儲存展示頁設定失敗。");
        setMessage("儲存失敗，保留未儲存變更。");
      }
    } finally {
      if (ownsSaveOperation()) {
        setIsSaving(false);
      }
    }
  };
  const applyConfigUpdate = (
    nextValue: SetStateAction<T>,
    options?: { dirtyPaths?: Array<Array<number | string>>; historyBase?: T; recordHistory?: boolean }
  ) => {
    setSessions((current) => {
      const session = current[pageId] ?? createDraftSession(deepClone(seedConfig), null, defaultFallbackPolicy);

      return {
        ...current,
        [pageId]: applyDraftConfigUpdate(session, nextValue, options)
      };
    });
  };
  const setConfig: Dispatch<SetStateAction<T>> = (nextValue) => {
    applyConfigUpdate(nextValue);
  };
  const resetPaths = (paths: Array<Array<number | string>>) => {
    setSessions((current) => {
      const session = current[pageId] ?? createDraftSession(deepClone(seedConfig), null, defaultFallbackPolicy);
      return {
        ...current,
        [pageId]: resetDraftSessionPaths(session, seedConfig, paths)
      };
    });
  };
  const undo = () => {
    setSessions((current) => {
      const session = current[pageId];
      if (!session) {
        return current;
      }

      return {
        ...current,
        [pageId]: undoDraftSession(session)
      };
    });
  };
  const redo = () => {
    setSessions((current) => {
      const session = current[pageId];
      if (!session) {
        return current;
      }

      return {
        ...current,
        [pageId]: redoDraftSession(session)
      };
    });
  };

  return {
    applyConfigUpdate,
    canRedo: (currentSession?.history.future.length ?? 0) > 0,
    canUndo: (currentSession?.history.past.length ?? 0) > 0,
    config,
    dirty,
    errorMessage,
    fallbackPolicy,
    isLoading,
    isSaving,
    lastLoadedEnvelope,
    message,
    resetPaths,
    reload,
    redo,
    save,
    setConfig,
    seedConfig,
    undo
  };
}
