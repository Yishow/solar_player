import {
  getEnabledPlaybackPages,
  getPlaybackDurationMs,
  resolvePlaybackIndexByRoute,
  type PlaybackPage,
  type PlaybackRuntime
} from "@solar-display/shared";

type ResolveRouteRuntimeSyncInput = {
  currentPath?: string;
  lastSyncedPath?: string;
  pages: PlaybackPage[];
  runtime: PlaybackRuntime | null;
};

export function resolveRouteRuntimeSync({
  currentPath,
  lastSyncedPath,
  pages,
  runtime
}: ResolveRouteRuntimeSyncInput): PlaybackRuntime | null {
  if (!currentPath || !runtime || currentPath === lastSyncedPath) {
    return null;
  }

  const playablePages = getEnabledPlaybackPages(pages);
  const routeIndex = resolvePlaybackIndexByRoute(playablePages, currentPath);

  if (routeIndex < 0 || routeIndex === runtime.currentIndex) {
    return null;
  }

  const nextPage = playablePages[routeIndex] ?? null;

  return {
    ...runtime,
    countdownMs: getPlaybackDurationMs(nextPage),
    currentIndex: routeIndex,
    isIdle: false,
    lastInteractionAt: Date.now()
  };
}
