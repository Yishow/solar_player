import type { PlaybackIdleMode, PlaybackPage, PlaybackSettings } from "./types.js";

export type PlaybackRuntime = {
  currentIndex: number;
  countdownMs: number;
  isIdle: boolean;
  isPlaying: boolean;
  lastInteractionAt: number;
};

const DEFAULT_PAGE_DURATION_SECONDS = 15;

function normalizeDurationSeconds(value: number) {
  return Math.max(1, Number.isFinite(value) ? Math.floor(value) : DEFAULT_PAGE_DURATION_SECONDS);
}

export function sortPlaybackPages(pages: PlaybackPage[]) {
  return [...pages].sort((left, right) => {
    if (left.displayOrder === right.displayOrder) {
      return left.id - right.id;
    }

    return left.displayOrder - right.displayOrder;
  });
}

export function getEnabledPlaybackPages(pages: PlaybackPage[]) {
  return sortPlaybackPages(pages).filter((page) => page.enabled);
}

export function getPlaybackDurationMs(page: PlaybackPage | null) {
  return normalizeDurationSeconds(page?.durationSeconds ?? DEFAULT_PAGE_DURATION_SECONDS) * 1000;
}

export function resolvePlaybackStartIndex(pages: PlaybackPage[], startPage: number) {
  const startIndex = pages.findIndex((page) => page.id === startPage);
  return startIndex >= 0 ? startIndex : 0;
}

export function resolvePlaybackIndexByRoute(pages: PlaybackPage[], route: string) {
  return pages.findIndex((page) => page.route === route);
}

export function getPlaybackDay(now: Date) {
  return now.getDay();
}

function parseClockValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parts = value.split(":");
  if (parts.length !== 2) {
    return null;
  }

  const hours = Number.parseInt(parts[0] ?? "", 10);
  const minutes = Number.parseInt(parts[1] ?? "", 10);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function resolveIdleModeEnabled(idleMode: PlaybackIdleMode) {
  return idleMode === "return-to-start";
}

export function isPlaybackAllowedBySchedule(settings: PlaybackSettings, now: Date) {
  if (!settings.scheduleEnabled) {
    return true;
  }

  if (settings.repeatDays.length > 0 && !settings.repeatDays.includes(getPlaybackDay(now))) {
    return false;
  }

  const startMinutes = parseClockValue(settings.scheduleStart);
  const endMinutes = parseClockValue(settings.scheduleEnd);

  if (startMinutes === null || endMinutes === null) {
    return true;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function shouldEnterIdleMode(
  settings: PlaybackSettings,
  lastInteractionAt: number,
  nowMs: number
) {
  if (!resolveIdleModeEnabled(settings.idleMode)) {
    return false;
  }

  const timeoutMs = Math.max(1, settings.idleTimeout) * 1000;
  return nowMs - lastInteractionAt >= timeoutMs;
}

export function createPlaybackRuntime(
  settings: PlaybackSettings,
  pages: PlaybackPage[],
  options?: {
    currentPageId?: number | null;
    isIdle?: boolean;
    isPlaying?: boolean;
    lastInteractionAt?: number;
    nowMs?: number;
    route?: string;
  }
) {
  const playablePages = getEnabledPlaybackPages(pages);
  const nowMs = options?.nowMs ?? Date.now();

  if (playablePages.length === 0) {
    return {
      countdownMs: 0,
      currentIndex: 0,
      isIdle: false,
      isPlaying: false,
      lastInteractionAt: nowMs
    } satisfies PlaybackRuntime;
  }

  const routeIndex =
    options?.route !== undefined ? resolvePlaybackIndexByRoute(playablePages, options.route) : -1;
  const currentPageIndex =
    options?.currentPageId !== undefined && options.currentPageId !== null
      ? playablePages.findIndex((page) => page.id === options.currentPageId)
      : -1;
  const currentIndex =
    routeIndex >= 0
      ? routeIndex
      : currentPageIndex >= 0
        ? currentPageIndex
        : resolvePlaybackStartIndex(playablePages, settings.startPage);
  const currentPage = playablePages[currentIndex] ?? playablePages[0] ?? null;
  const scheduleAllowsPlayback = isPlaybackAllowedBySchedule(settings, new Date(nowMs));
  const isIdle = options?.isIdle ?? false;
  const autoplayAllowed = settings.autoplay && scheduleAllowsPlayback && !isIdle;

  return {
    countdownMs: getPlaybackDurationMs(currentPage),
    currentIndex,
    isIdle,
    isPlaying: options?.isPlaying ?? autoplayAllowed,
    lastInteractionAt: options?.lastInteractionAt ?? nowMs
  } satisfies PlaybackRuntime;
}

export function getPlaybackPage(runtime: PlaybackRuntime, pages: PlaybackPage[]) {
  const playablePages = getEnabledPlaybackPages(pages);
  return playablePages[runtime.currentIndex] ?? null;
}

export function getNextPlaybackIndex(
  currentIndex: number,
  pages: PlaybackPage[],
  loop: boolean,
  direction: 1 | -1
) {
  const playablePages = getEnabledPlaybackPages(pages);

  if (playablePages.length === 0) {
    return 0;
  }

  const lastIndex = playablePages.length - 1;
  const nextIndex = currentIndex + direction;

  if (nextIndex < 0) {
    return loop ? lastIndex : 0;
  }

  if (nextIndex > lastIndex) {
    return loop ? 0 : lastIndex;
  }

  return nextIndex;
}

export function isPlaybackAtEdge(runtime: PlaybackRuntime, pages: PlaybackPage[], direction: 1 | -1) {
  const playablePages = getEnabledPlaybackPages(pages);

  if (playablePages.length === 0) {
    return true;
  }

  if (direction === 1) {
    return runtime.currentIndex >= playablePages.length - 1;
  }

  return runtime.currentIndex <= 0;
}
