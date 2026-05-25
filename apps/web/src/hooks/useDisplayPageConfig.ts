import type {
  ConfigStage,
  DisplayPageCardRail,
  DisplayPageConfigEnvelope,
  DisplayPageFreeformObject,
  DisplayPageId,
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
import { useEffect, useMemo, useState } from "react";
import {
  getDisplayPageConfig,
  isManagementDraftConflictError,
  updateDisplayPageConfig
} from "../services/api";
import { createDraftSession, type DisplayPageDraftSession, applyDraftConfigUpdate, resetDraftPaths as resetDraftSessionPaths, redoDraftSession, undoDraftSession } from "./displayPageDraftSession";
import { deepClone, getValueAtPath, setValueAtPath } from "./displayPageConfigPaths";
export { getValueAtPath, setValueAtPath } from "./displayPageConfigPaths";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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

export function applyDisplayPageSaveConflict<T>(
  session: DisplayPageDraftSession<T>,
  latestConfig: T,
  latestEnvelope: DisplayPageConfigEnvelope,
  fallbackPolicy: FallbackPolicy
): DisplayPageDraftSession<T> {
  return {
    ...session,
    fallbackPolicy,
    lastLoadedConfig: deepClone(latestConfig),
    lastLoadedEnvelope: latestEnvelope
  };
}

export function resolveDisplayPageSaveConflictMessage(
  conflict: ManagementDraftSaveConflict<DisplayPageConfigEnvelope>
) {
  return `儲存衝突：伺服器草稿已更新到 v${conflict.currentVersion}，已保留本地未儲存變更，請先重新同步後再決定是否重套。`;
}

export function shouldHydrateDisplayPageSession(enabled: boolean, hasSession: boolean) {
  return enabled && !hasSession;
}

export function shouldDeferDisplayPageRuntimeRender(args: {
  runtimeHydrationEnabled: boolean;
  isLoading: boolean;
  lastLoadedEnvelope: DisplayPageConfigEnvelope | null;
  stage: ConfigStage;
}) {
  return args.runtimeHydrationEnabled && args.stage === "live" && args.isLoading && args.lastLoadedEnvelope === null;
}

function resolveLoadMessage(stage: ConfigStage, envelope: DisplayPageConfigEnvelope) {
  if (envelope.updatedAt) {
    return stage === "live" ? "正式展示頁設定已同步。" : "展示頁設定已同步。";
  }
  return stage === "live" ? "目前使用 live seed fallback。" : "目前使用 seed fallback，可直接開始編輯。";
}

type UseDisplayPageConfigOptions = {
  enabled?: boolean;
  stage?: ConfigStage;
};

type UseDisplayPageConfigResult<T> = {
  applyConfigUpdate: (
    nextValue: SetStateAction<T>,
    options?: { historyBase?: T; recordHistory?: boolean }
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
  options: UseDisplayPageConfigOptions = {}
): UseDisplayPageConfigResult<T> {
  const enabled = options.enabled ?? true;
  const stage = options.stage ?? "live";
  const [sessions, setSessions] = useState<Record<string, DisplayPageDraftSession<T>>>({});
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(enabled ? "正在同步展示頁設定..." : "使用頁面預設設定。");
  const [errorMessage, setErrorMessage] = useState("");
  const currentSession = sessions[pageId];
  const config = currentSession?.config ?? deepClone(seedConfig);
  const lastLoadedConfig = currentSession?.lastLoadedConfig ?? deepClone(seedConfig);
  const lastLoadedEnvelope = currentSession?.lastLoadedEnvelope ?? null;
  const fallbackPolicy = currentSession?.fallbackPolicy ?? defaultFallbackPolicy;

  const dirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(lastLoadedConfig),
    [config, lastLoadedConfig]
  );

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setIsSaving(false);
      setMessage("使用頁面預設設定。");
      setErrorMessage("");
      return;
    }

    let active = true;
    if (!shouldHydrateDisplayPageSession(enabled, Boolean(sessions[pageId]))) {
      setIsLoading(false);
      setMessage(dirty ? "保留未儲存草稿。" : "展示頁設定已同步。");
      setErrorMessage("");
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setMessage("正在同步展示頁設定...");
      setErrorMessage("");

      try {
        const envelope = await getDisplayPageConfig(pageId, stage);
        if (!active) {
          return;
        }

        const mergedConfig = mergeDisplayPageConfigEnvelope(seedConfig, envelope);
        setSessions((current) => ({ ...current, [pageId]: createDraftSession(mergedConfig, envelope, resolveDisplayPageFallbackPolicy(envelope)) }));
        setMessage(resolveLoadMessage(stage, envelope));
      } catch (error) {
        if (!active) {
          return;
        }

        const clonedSeed = deepClone(seedConfig);
        setSessions((current) => ({ ...current, [pageId]: createDraftSession(clonedSeed, null, defaultFallbackPolicy) }));
        setErrorMessage(error instanceof Error ? error.message : "載入展示頁設定失敗。");
        setMessage("使用 seed fallback。");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [dirty, enabled, pageId, seedConfig, sessions, stage]);

  const reload = async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setMessage("正在重新同步展示頁設定...");
    setErrorMessage("");

    try {
      const envelope = await getDisplayPageConfig(pageId, stage);
      const mergedConfig = mergeDisplayPageConfigEnvelope(seedConfig, envelope);
      setSessions((current) => ({ ...current, [pageId]: createDraftSession(mergedConfig, envelope, resolveDisplayPageFallbackPolicy(envelope)) }));
      setMessage(resolveLoadMessage(stage, envelope));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "重新同步展示頁設定失敗。");
      setMessage("重新同步失敗，保留目前編輯狀態。");
    } finally {
      setIsLoading(false);
    }
  };

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
  const applyConfigUpdate = (nextValue: SetStateAction<T>, options?: { recordHistory?: boolean }) => {
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
