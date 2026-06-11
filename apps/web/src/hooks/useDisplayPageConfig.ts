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
const displayPageConfigRequestSequences = new Map<string, number>();

function resolveDisplayPageConfigCacheKey(pageId: DisplayPageId, stage: ConfigStage) {
  return `${stage}:${pageId}`;
}

type DisplayPageConfigEnvelopeLoaderOptions = {
  force?: boolean;
  readConfig?: (pageId: DisplayPageId, stage: ConfigStage) => Promise<DisplayPageConfigEnvelope>;
};

export function primeDisplayPageConfigCache(
  pageId: DisplayPageId,
  stage: ConfigStage,
  envelope: DisplayPageConfigEnvelope
) {
  displayPageConfigCache.set(resolveDisplayPageConfigCacheKey(pageId, stage), envelope);
}

export function clearDisplayPageConfigCache() {
  displayPageConfigCache.clear();
  pendingDisplayPageConfigRequests.clear();
  displayPageConfigRequestSequences.clear();
}

export async function loadDisplayPageConfigEnvelope(
  pageId: DisplayPageId,
  stage: ConfigStage,
  options: DisplayPageConfigEnvelopeLoaderOptions = {}
) {
  const cacheKey = resolveDisplayPageConfigCacheKey(pageId, stage);
  const cachedEnvelope = displayPageConfigCache.get(cacheKey);

  if (!options.force && cachedEnvelope) {
    return cachedEnvelope;
  }

  const pendingRequest = pendingDisplayPageConfigRequests.get(cacheKey);

  if (!options.force && pendingRequest) {
    return pendingRequest;
  }

  const requestSequence = (displayPageConfigRequestSequences.get(cacheKey) ?? 0) + 1;
  displayPageConfigRequestSequences.set(cacheKey, requestSequence);

  const request = (options.readConfig ?? getDisplayPageConfig)(pageId, stage)
    .then((envelope) => {
      if (displayPageConfigRequestSequences.get(cacheKey) === requestSequence) {
        primeDisplayPageConfigCache(pageId, stage, envelope);
      }

      return envelope;
    })
    .finally(() => {
      if (pendingDisplayPageConfigRequests.get(cacheKey) === request) {
        pendingDisplayPageConfigRequests.delete(cacheKey);
      }
    });

  pendingDisplayPageConfigRequests.set(cacheKey, request);
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
  const currentSession = sessions[pageId];
  const hasSession = Boolean(currentSession);
  const config = currentSession?.config ?? deepClone(seedConfig);
  const lastLoadedEnvelope = currentSession?.lastLoadedEnvelope ?? null;
  const fallbackPolicy = currentSession?.fallbackPolicy ?? defaultFallbackPolicy;
  const dirty = currentSession?.dirty ?? false;

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
        const envelope = await loadDisplayPageConfigEnvelope(pageId, stage);
        if (!isCurrentRequest()) {
          return;
        }

        const mergedConfig = mergeDisplayPageConfigEnvelope(seedConfig, envelope);
        setSessions((current) => ({ ...current, [pageId]: createDraftSession(mergedConfig, envelope, resolveDisplayPageFallbackPolicy(envelope)) }));
        setMessage(resolveLoadMessage(stage, envelope));
      } catch (error) {
        if (!isCurrentRequest()) {
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

    try {
      const envelope = await loadDisplayPageConfigEnvelope(pageId, stage, { force: true });
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      const mergedConfig = mergeDisplayPageConfigEnvelope(seedConfig, envelope);
      setSessions((current) => ({ ...current, [pageId]: createDraftSession(mergedConfig, envelope, resolveDisplayPageFallbackPolicy(envelope)) }));
      setMessage(resolveLoadMessage(stage, envelope));
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) {
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

    try {
      const payload = splitDisplayPageConfigEnvelopePayload(config as Record<string, unknown>);
      const envelope = await updateDisplayPageConfig(
        pageId,
        payload.regions,
        stage,
        { baseVersion: lastLoadedEnvelope.version },
        payload.freeformObjects
      );
      const mergedConfig = mergeDisplayPageConfigEnvelope(seedConfig, envelope);
      setSessions((current) => ({ ...current, [pageId]: createDraftSession(mergedConfig, envelope, resolveDisplayPageFallbackPolicy(envelope)) }));
      setMessage("展示頁設定已儲存。");
    } catch (error) {
      if (isManagementDraftConflictError(error)) {
        const latestEnvelope = error.conflict.latestEnvelope as DisplayPageConfigEnvelope;
        const latestConfig = mergeDisplayPageConfigEnvelope(seedConfig, latestEnvelope);
        setSessions((current) => {
          const session = current[pageId] ?? createDraftSession(deepClone(seedConfig), null, defaultFallbackPolicy);

          return {
            ...current,
            [pageId]: applyDisplayPageSaveConflict(
              session,
              latestConfig,
              latestEnvelope,
              resolveDisplayPageFallbackPolicy(latestEnvelope)
            )
          };
        });
        setErrorMessage(
          resolveDisplayPageSaveConflictMessage(
            error.conflict as ManagementDraftSaveConflict<DisplayPageConfigEnvelope>
          )
        );
        setMessage("儲存衝突，已保留本地未儲存變更。");
      } else {
        setErrorMessage(error instanceof Error ? error.message : "儲存展示頁設定失敗。");
        setMessage("儲存失敗，保留未儲存變更。");
      }
    } finally {
      setIsSaving(false);
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
