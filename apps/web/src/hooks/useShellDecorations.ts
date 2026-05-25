import type { DisplaySyncEvent, PublicShellDecorationConfig, ShellDecorationObject } from "@solar-display/shared";
import { sortShellDecorationObjects } from "@solar-display/shared";
import { getPublicShellDecorations } from "../services/shellDecorations";
import { useRuntimeRefreshLifecycle } from "./useRuntimeRefreshLifecycle";

type ShellDecorationRuntimeRefreshHook = (options: {
  enabled: boolean;
  load: () => Promise<PublicShellDecorationConfig>;
  refreshKey: string;
  shouldRefresh: (event: DisplaySyncEvent) => boolean;
}) => {
  errorMessage: string;
  isLoading: boolean;
  isRefreshing: boolean;
  lastResolvedAt: string | null;
  payload: PublicShellDecorationConfig | null;
  refresh: () => Promise<void>;
  usesFallback: boolean;
};

export function shouldRefreshShellDecorationsForDisplaySync(event: Pick<DisplaySyncEvent, "scope">) {
  return event.scope === "display-pages";
}

export function resolveShellDecorationRuntimePayload(payload: PublicShellDecorationConfig | null | undefined): {
  footerObjects: ShellDecorationObject[];
  headerObjects: ShellDecorationObject[];
} {
  return {
    footerObjects: sortShellDecorationObjects(payload?.footerObjects ?? []),
    headerObjects: sortShellDecorationObjects(payload?.headerObjects ?? [])
  };
}

export function createUseShellDecorations(dependencies: {
  load: () => Promise<PublicShellDecorationConfig>;
  useRuntimeRefresh: ShellDecorationRuntimeRefreshHook;
}) {
  return function useShellDecorations() {
    const state = dependencies.useRuntimeRefresh({
      enabled: true,
      load: dependencies.load,
      refreshKey: "shell-decorations",
      shouldRefresh: shouldRefreshShellDecorationsForDisplaySync
    });

    return {
      ...state,
      ...resolveShellDecorationRuntimePayload(state.payload)
    };
  };
}

export const useShellDecorations = createUseShellDecorations({
  load: getPublicShellDecorations,
  useRuntimeRefresh: useRuntimeRefreshLifecycle
});
