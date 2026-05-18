import type {
  ConfigStage,
  DisplayPageConfigEnvelope,
  DisplayPageKey,
  FallbackPolicy
} from "@solar-display/shared";
import { defaultFallbackPolicy } from "@solar-display/shared";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { getDisplayPageConfig, updateDisplayPageConfig } from "../services/api";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

export function resolveDisplayPageConfigForPage<T>(
  pageId: DisplayPageKey,
  configPageId: DisplayPageKey,
  seedConfig: T,
  config: T
) {
  return configPageId === pageId ? config : deepClone(seedConfig);
}

export function mergeDisplayPageConfig<T>(seedConfig: T, overrideConfig: unknown): T {
  if (overrideConfig === undefined) {
    return deepClone(seedConfig);
  }

  if (Array.isArray(seedConfig)) {
    if (!Array.isArray(overrideConfig)) {
      return deepClone(seedConfig);
    }

    const mergedArray = seedConfig.map((seedValue, index) =>
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

export function setValueAtPath<T>(
  source: T,
  path: Array<number | string>,
  value: unknown
): T {
  if (path.length === 0) {
    return value as T;
  }

  const [head, ...tail] = path;

  if (Array.isArray(source)) {
    const nextArray = source.slice();
    const index = typeof head === "number" ? head : Number(head);
    nextArray[index] = setValueAtPath(nextArray[index], tail, value);
    return nextArray as T;
  }

  if (isPlainObject(source)) {
    const key = head as string | number;
    const sourceRecord = source as Record<string | number, unknown>;
    return {
      ...sourceRecord,
      [key]: setValueAtPath(sourceRecord[key], tail, value)
    } as T;
  }

  throw new Error(`Cannot set nested config path "${path.join(".")}" on a non-object value.`);
}

export function resolveDisplayPageConfigStagePath(pageId: DisplayPageKey, stage: ConfigStage) {
  return `/api/display-pages/${pageId}/${stage}`;
}

export function resolveDisplayPageFallbackPolicy(
  envelope: Pick<DisplayPageConfigEnvelope, "fallbackPolicy"> | null
): FallbackPolicy {
  return envelope?.fallbackPolicy ?? defaultFallbackPolicy;
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
  config: T;
  dirty: boolean;
  errorMessage: string;
  fallbackPolicy: FallbackPolicy;
  isLoading: boolean;
  isSaving: boolean;
  lastLoadedEnvelope: DisplayPageConfigEnvelope | null;
  message: string;
  reload: () => Promise<void>;
  save: () => Promise<void>;
  setConfig: Dispatch<SetStateAction<T>>;
};

export function useDisplayPageConfig<T>(
  pageId: DisplayPageKey,
  seedConfig: T,
  options: UseDisplayPageConfigOptions = {}
): UseDisplayPageConfigResult<T> {
  const enabled = options.enabled ?? true;
  const stage = options.stage ?? "live";
  const [config, setConfig] = useState<T>(() => deepClone(seedConfig));
  const [configPageId, setConfigPageId] = useState<DisplayPageKey>(pageId);
  const [lastLoadedConfig, setLastLoadedConfig] = useState<T>(() => deepClone(seedConfig));
  const [lastLoadedEnvelope, setLastLoadedEnvelope] = useState<DisplayPageConfigEnvelope | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSaving, setIsSaving] = useState(false);
  const [fallbackPolicy, setFallbackPolicy] = useState<FallbackPolicy>(defaultFallbackPolicy);
  const [message, setMessage] = useState(enabled ? "正在同步展示頁設定..." : "使用頁面預設設定。");
  const [errorMessage, setErrorMessage] = useState("");

  const dirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(lastLoadedConfig),
    [config, lastLoadedConfig]
  );

  useEffect(() => {
    if (!enabled) {
      const clonedSeed = deepClone(seedConfig);
      setConfig(clonedSeed);
      setConfigPageId(pageId);
      setLastLoadedConfig(clonedSeed);
      setLastLoadedEnvelope(null);
      setFallbackPolicy(defaultFallbackPolicy);
      setIsLoading(false);
      setIsSaving(false);
      setMessage("使用頁面預設設定。");
      setErrorMessage("");
      return;
    }

    let active = true;

    const load = async () => {
      setIsLoading(true);
      setMessage("正在同步展示頁設定...");
      setErrorMessage("");

      try {
        const envelope = await getDisplayPageConfig(pageId, stage);
        if (!active) {
          return;
        }

        const mergedConfig = mergeDisplayPageConfig(seedConfig, envelope.regions);
        setConfig(mergedConfig);
        setConfigPageId(pageId);
        setLastLoadedConfig(mergedConfig);
        setLastLoadedEnvelope(envelope);
        setFallbackPolicy(resolveDisplayPageFallbackPolicy(envelope));
        setMessage(resolveLoadMessage(stage, envelope));
      } catch (error) {
        if (!active) {
          return;
        }

        const clonedSeed = deepClone(seedConfig);
        setConfig(clonedSeed);
        setConfigPageId(pageId);
        setLastLoadedConfig(clonedSeed);
        setLastLoadedEnvelope(null);
        setFallbackPolicy(defaultFallbackPolicy);
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
  }, [enabled, pageId, seedConfig, stage]);

  const reload = async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setMessage("正在重新同步展示頁設定...");
    setErrorMessage("");

    try {
      const envelope = await getDisplayPageConfig(pageId, stage);
      const mergedConfig = mergeDisplayPageConfig(seedConfig, envelope.regions);
      setConfig(mergedConfig);
      setConfigPageId(pageId);
      setLastLoadedConfig(mergedConfig);
      setLastLoadedEnvelope(envelope);
      setFallbackPolicy(resolveDisplayPageFallbackPolicy(envelope));
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

    setIsSaving(true);
    setMessage("正在儲存展示頁設定...");
    setErrorMessage("");

    try {
      const envelope = await updateDisplayPageConfig(pageId, config as Record<string, unknown>, stage);
      const mergedConfig = mergeDisplayPageConfig(seedConfig, envelope.regions);
      setConfig(mergedConfig);
      setConfigPageId(pageId);
      setLastLoadedConfig(mergedConfig);
      setLastLoadedEnvelope(envelope);
      setFallbackPolicy(resolveDisplayPageFallbackPolicy(envelope));
      setMessage("展示頁設定已儲存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存展示頁設定失敗。");
      setMessage("儲存失敗，保留未儲存變更。");
    } finally {
      setIsSaving(false);
    }
  };

  const effectiveConfig = resolveDisplayPageConfigForPage(pageId, configPageId, seedConfig, config);
  const isAwaitingPageSync = configPageId !== pageId;

  return {
    config: effectiveConfig,
    dirty: isAwaitingPageSync ? false : dirty,
    errorMessage,
    fallbackPolicy,
    isLoading: isLoading || isAwaitingPageSync,
    isSaving,
    lastLoadedEnvelope,
    message,
    reload,
    save,
    setConfig
  };
}
