import type { DisplayPageConfigEnvelope, FallbackPolicy } from "@solar-display/shared";
import { createEditorHistory, pushEditorHistory, redoEditorHistory, undoEditorHistory } from "../pages/DisplayPagesEditor/history";
import { deepClone, getValueAtPath, setValueAtPath } from "./displayPageConfigPaths";

export type DisplayPageDraftSession<T> = {
  config: T;
  fallbackPolicy: FallbackPolicy;
  history: ReturnType<typeof createEditorHistory<T>>;
  lastLoadedConfig: T;
  lastLoadedEnvelope: DisplayPageConfigEnvelope | null;
};

export function createDraftSession<T>(
  config: T,
  envelope: DisplayPageConfigEnvelope | null,
  fallbackPolicy: FallbackPolicy
): DisplayPageDraftSession<T> {
  return {
    config,
    fallbackPolicy,
    history: createEditorHistory<T>(),
    lastLoadedConfig: deepClone(config),
    lastLoadedEnvelope: envelope
  };
}

export function applyDraftConfigUpdate<T>(
  session: DisplayPageDraftSession<T>,
  nextValue: T | ((current: T) => T),
  options?: { historyBase?: T; recordHistory?: boolean }
): DisplayPageDraftSession<T> {
  const nextConfig = typeof nextValue === "function" ? (nextValue as (current: T) => T)(session.config) : nextValue;
  const nextHistory =
    options?.recordHistory === false
      ? session.history
      : pushEditorHistory(session.history, options?.historyBase ?? session.config, nextConfig);

  return {
    ...session,
    config: nextConfig,
    history: nextHistory
  };
}

export function resetDraftPaths<T>(
  session: DisplayPageDraftSession<T>,
  seedConfig: T,
  paths: Array<Array<number | string>>
): DisplayPageDraftSession<T> {
  return applyDraftConfigUpdate(session, (current) =>
    paths.reduce(
      (nextConfig, path) => setValueAtPath(nextConfig, path, getValueAtPath(seedConfig, path)),
      current
    )
  );
}

export function undoDraftSession<T>(session: DisplayPageDraftSession<T>): DisplayPageDraftSession<T> {
  const result = undoEditorHistory(session.history, session.config);
  return {
    ...session,
    config: result.current,
    history: result.history
  };
}

export function redoDraftSession<T>(session: DisplayPageDraftSession<T>): DisplayPageDraftSession<T> {
  const result = redoEditorHistory(session.history, session.config);
  return {
    ...session,
    config: result.current,
    history: result.history
  };
}
