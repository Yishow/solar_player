import {
  createPlaybackRuntime,
  getEnabledPlaybackPages,
  getPlaybackDurationMs,
  getPlaybackPage,
  isPlaybackAllowedBySchedule,
  resolvePlaybackIndexByRoute,
  type PlaybackPage,
  type PlaybackRuntime,
  type PlaybackSettings
} from "@solar-display/shared";

type ReconcilePlaybackRuntimeAfterRefreshInput = {
  currentPath?: string;
  currentRuntime: PlaybackRuntime | null;
  nextPages: PlaybackPage[];
  nowMs: number;
  previousPages: PlaybackPage[];
  settings: PlaybackSettings;
};

export function reconcilePlaybackRuntimeAfterRefresh({
  currentPath,
  currentRuntime,
  nextPages,
  nowMs,
  previousPages,
  settings
}: ReconcilePlaybackRuntimeAfterRefreshInput): PlaybackRuntime {
  if (!currentRuntime) {
    return createPlaybackRuntime(settings, nextPages, {
      nowMs,
      route: currentPath
    });
  }

  const nextPlayablePages = getEnabledPlaybackPages(nextPages);

  if (nextPlayablePages.length === 0) {
    return createPlaybackRuntime(settings, nextPages, {
      isIdle: currentRuntime.isIdle,
      lastInteractionAt: currentRuntime.lastInteractionAt,
      nowMs
    });
  }

  const previousCurrentPage = getPlaybackPage(currentRuntime, previousPages);
  const routeIndex = currentPath ? resolvePlaybackIndexByRoute(nextPlayablePages, currentPath) : -1;
  const previousPageIndex =
    previousCurrentPage ? nextPlayablePages.findIndex((page) => page.id === previousCurrentPage.id) : -1;

  const nextCurrentPage =
    routeIndex >= 0
      ? nextPlayablePages[routeIndex] ?? null
      : previousPageIndex >= 0
        ? nextPlayablePages[previousPageIndex] ?? null
        : nextPlayablePages[Math.min(currentRuntime.currentIndex, nextPlayablePages.length - 1)] ?? nextPlayablePages[0] ?? null;
  const preserveContinuity =
    !!previousCurrentPage && !!nextCurrentPage && previousCurrentPage.id === nextCurrentPage.id;
  const baselineRuntime = createPlaybackRuntime(settings, nextPages, {
    currentPageId: nextCurrentPage?.id ?? null,
    isIdle: currentRuntime.isIdle,
    lastInteractionAt: currentRuntime.lastInteractionAt,
    nowMs
  });
  const preservePlaying =
    !baselineRuntime.isIdle && isPlaybackAllowedBySchedule(settings, new Date(nowMs)) && settings.autoplay
      ? currentRuntime.isPlaying
      : false;

  return {
    ...baselineRuntime,
    countdownMs: preserveContinuity
      ? Math.min(currentRuntime.countdownMs, getPlaybackDurationMs(nextCurrentPage))
      : baselineRuntime.countdownMs,
    isPlaying: preservePlaying
  };
}
