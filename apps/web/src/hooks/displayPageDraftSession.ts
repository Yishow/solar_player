import type { DisplayPageConfigEnvelope, FallbackPolicy } from "@solar-display/shared";
import { createEditorHistory, pushEditorHistory, redoEditorHistory, undoEditorHistory } from "../pages/DisplayPagesEditor/history";
import { deepClone, getValueAtPath, setValueAtPath } from "./displayPageConfigPaths";

type DisplayPageDirtySnapshot = {
  dirty: boolean;
  dirtyPaths: string[];
  hasUnscopedDirty: boolean;
};

type DisplayPageDraftDirtyHistory = {
  future: DisplayPageDirtySnapshot[];
  past: DisplayPageDirtySnapshot[];
};

type DisplayPageDirtyPath = Array<number | string>;

export type DisplayPageDraftSession<T> = {
  config: T;
  dirty: boolean;
  dirtyHistory: DisplayPageDraftDirtyHistory;
  dirtyPaths: string[];
  fallbackPolicy: FallbackPolicy;
  hasUnscopedDirty: boolean;
  history: ReturnType<typeof createEditorHistory<T>>;
  lastLoadedConfig: T;
  lastLoadedEnvelope: DisplayPageConfigEnvelope | null;
};

type ApplyDraftConfigUpdateOptions<T> = {
  dirtyPaths?: DisplayPageDirtyPath[];
  historyBase?: T;
  recordHistory?: boolean;
};

function encodeDirtyPath(path: DisplayPageDirtyPath) {
  return JSON.stringify(path);
}

function decodeDirtyPath(path: string): DisplayPageDirtyPath {
  return JSON.parse(path) as DisplayPageDirtyPath;
}

function createDirtySnapshot<T>(session: DisplayPageDraftSession<T>): DisplayPageDirtySnapshot {
  return {
    dirty: session.dirty,
    dirtyPaths: session.dirtyPaths,
    hasUnscopedDirty: session.hasUnscopedDirty
  };
}

function isScopedPathDirty<T>(config: T, lastLoadedConfig: T, path: string) {
  const decodedPath = decodeDirtyPath(path);
  return JSON.stringify(getValueAtPath(config, decodedPath)) !== JSON.stringify(getValueAtPath(lastLoadedConfig, decodedPath));
}

function hasScopedPathChange<T>(currentConfig: T, nextConfig: T, path: string) {
  const decodedPath = decodeDirtyPath(path);
  return JSON.stringify(getValueAtPath(currentConfig, decodedPath)) !== JSON.stringify(getValueAtPath(nextConfig, decodedPath));
}

function reconcileDirtyState<T>(
  config: T,
  lastLoadedConfig: T,
  dirtyPaths: string[],
  hasUnscopedDirty: boolean
) {
  const nextDirtyPaths = dirtyPaths.filter((path) => isScopedPathDirty(config, lastLoadedConfig, path));
  return {
    dirty: hasUnscopedDirty || nextDirtyPaths.length > 0,
    dirtyPaths: nextDirtyPaths,
    hasUnscopedDirty
  };
}

function restoreDirtySnapshot<T>(
  session: DisplayPageDraftSession<T>,
  snapshot: DisplayPageDirtySnapshot
): DisplayPageDraftSession<T> {
  return {
    ...session,
    dirty: snapshot.dirty,
    dirtyPaths: snapshot.dirtyPaths,
    hasUnscopedDirty: snapshot.hasUnscopedDirty
  };
}

export function createDraftSession<T>(
  config: T,
  envelope: DisplayPageConfigEnvelope | null,
  fallbackPolicy: FallbackPolicy
): DisplayPageDraftSession<T> {
  return {
    config,
    dirty: false,
    dirtyHistory: {
      future: [],
      past: []
    },
    dirtyPaths: [],
    fallbackPolicy,
    hasUnscopedDirty: false,
    history: createEditorHistory<T>(),
    lastLoadedConfig: deepClone(config),
    lastLoadedEnvelope: envelope
  };
}

export function applyDraftConfigUpdate<T>(
  session: DisplayPageDraftSession<T>,
  nextValue: T | ((current: T) => T),
  options?: ApplyDraftConfigUpdateOptions<T>
): DisplayPageDraftSession<T> {
  const nextConfig = typeof nextValue === "function" ? (nextValue as (current: T) => T)(session.config) : nextValue;
  const nextDirtyPathKeys = options?.dirtyPaths?.map(encodeDirtyPath) ?? [];
  const hasScopedChange =
    nextDirtyPathKeys.length === 0 ||
    nextDirtyPathKeys.some((path) => hasScopedPathChange(session.config, nextConfig, path));
  const shouldRecordOperation = options?.recordHistory !== false && nextConfig !== session.config && hasScopedChange;
  const nextHistory = shouldRecordOperation
    ? pushEditorHistory(session.history, options?.historyBase ?? session.config, nextConfig, { skipEqualityCheck: true })
    : session.history;
  const nextDirtyHistory = shouldRecordOperation
    ? {
        future: [],
        past: [...session.dirtyHistory.past, createDirtySnapshot(session)]
      }
    : session.dirtyHistory;
  const hasUnscopedDirty = shouldRecordOperation && nextDirtyPathKeys.length === 0
    ? true
    : session.hasUnscopedDirty;
  const scopedDirtyState = reconcileDirtyState(
    nextConfig,
    session.lastLoadedConfig,
    [...new Set([...session.dirtyPaths, ...nextDirtyPathKeys])],
    hasUnscopedDirty
  );

  return {
    ...session,
    config: nextConfig,
    dirty: scopedDirtyState.dirty,
    dirtyHistory: nextDirtyHistory,
    dirtyPaths: scopedDirtyState.dirtyPaths,
    hasUnscopedDirty: scopedDirtyState.hasUnscopedDirty,
    history: nextHistory
  };
}

export function resetDraftPaths<T>(
  session: DisplayPageDraftSession<T>,
  seedConfig: T,
  paths: Array<Array<number | string>>
): DisplayPageDraftSession<T> {
  return applyDraftConfigUpdate(
    session,
    (current) =>
      paths.reduce(
        (nextConfig, path) => setValueAtPath(nextConfig, path, getValueAtPath(seedConfig, path)),
        current
      ),
    { dirtyPaths: paths }
  );
}

export function undoDraftSession<T>(session: DisplayPageDraftSession<T>): DisplayPageDraftSession<T> {
  const result = undoEditorHistory(session.history, session.config);
  const dirtySnapshot = session.dirtyHistory.past.at(-1);
  if (!dirtySnapshot) {
    return {
      ...session,
      config: result.current,
      history: result.history
    };
  }
  return {
    ...restoreDirtySnapshot(session, dirtySnapshot),
    config: result.current,
    dirtyHistory: {
      future: [createDirtySnapshot(session), ...session.dirtyHistory.future],
      past: session.dirtyHistory.past.slice(0, -1)
    },
    history: result.history
  };
}

export function redoDraftSession<T>(session: DisplayPageDraftSession<T>): DisplayPageDraftSession<T> {
  const result = redoEditorHistory(session.history, session.config);
  const [dirtySnapshot, ...future] = session.dirtyHistory.future;
  if (!dirtySnapshot) {
    return {
      ...session,
      config: result.current,
      history: result.history
    };
  }
  return {
    ...restoreDirtySnapshot(session, dirtySnapshot),
    config: result.current,
    dirtyHistory: {
      future,
      past: [...session.dirtyHistory.past, createDirtySnapshot(session)]
    },
    history: result.history
  };
}

export function rebaseDraftSessionBaseline<T>(
  session: DisplayPageDraftSession<T>,
  latestConfig: T,
  latestEnvelope: DisplayPageConfigEnvelope,
  fallbackPolicy: FallbackPolicy,
  options?: { markDirty?: boolean }
): DisplayPageDraftSession<T> {
  const lastLoadedConfig = deepClone(latestConfig);
  const scopedDirtyState = reconcileDirtyState(
    session.config,
    lastLoadedConfig,
    session.dirtyPaths,
    options?.markDirty ? true : session.hasUnscopedDirty
  );

  return {
    ...session,
    dirty: scopedDirtyState.dirty,
    dirtyHistory: {
      future: [],
      past: []
    },
    dirtyPaths: scopedDirtyState.dirtyPaths,
    fallbackPolicy,
    hasUnscopedDirty: scopedDirtyState.hasUnscopedDirty,
    lastLoadedConfig,
    lastLoadedEnvelope: latestEnvelope
  };
}
