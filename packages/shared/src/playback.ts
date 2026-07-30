import type { PlaybackIdleMode, PlaybackPage, PlaybackSettings } from "./types.js";

export type PlaybackRuntime = {
  currentIndex: number;
  countdownMs: number;
  isIdle: boolean;
  isPlaying: boolean;
  lastInteractionAt: number;
};

export type SafePlaybackBoundaryPlan = {
  applyAtMs: number;
  applyByMs: number;
  currentPageId: number | null;
  currentPageRemainsValid: boolean;
  receivedAtMs: number;
};

const DEFAULT_PAGE_DURATION_SECONDS = 15;
export const PLAYBACK_TRANSITION_SPEED_MIN_MS = 120;
export const PLAYBACK_TRANSITION_SPEED_MAX_MS = 250;
export const DEFAULT_PLAYBACK_TRANSITION_SPEED_MS = 250;

function normalizeDurationSeconds(value: number) {
  return Math.max(1, Number.isFinite(value) ? Math.floor(value) : DEFAULT_PAGE_DURATION_SECONDS);
}

export function normalizePlaybackTransitionSpeed(value: number, allowDisabled = false) {
  if (!Number.isFinite(value) || value <= 0) {
    return allowDisabled ? 0 : PLAYBACK_TRANSITION_SPEED_MIN_MS;
  }

  return Math.min(
    PLAYBACK_TRANSITION_SPEED_MAX_MS,
    Math.max(PLAYBACK_TRANSITION_SPEED_MIN_MS, Math.round(value))
  );
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
  return isPlaybackAllowedByScheduleParts(
    settings,
    getPlaybackDay(now),
    now.getHours(),
    now.getMinutes()
  );
}

function isPlaybackAllowedByScheduleParts(
  settings: PlaybackSettings,
  day: number,
  hours: number,
  minutes: number
) {
  if (!settings.scheduleEnabled) {
    return true;
  }

  if (settings.repeatDays.length > 0 && !settings.repeatDays.includes(day)) {
    return false;
  }

  const startMinutes = parseClockValue(settings.scheduleStart);
  const endMinutes = parseClockValue(settings.scheduleEnd);

  if (startMinutes === null || endMinutes === null) {
    return true;
  }

  const currentMinutes = hours * 60 + minutes;

  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function isPlaybackAllowedByScheduleAtEpoch(
  settings: PlaybackSettings,
  epochMs: number,
  timeZone: string
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone,
    weekday: "short"
  }).formatToParts(new Date(epochMs));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    values.get("weekday") ?? ""
  );

  return isPlaybackAllowedByScheduleParts(
    settings,
    day,
    Number(values.get("hour")),
    Number(values.get("minute"))
  );
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
    scheduleAllowed?: boolean;
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
  const scheduleAllowsPlayback =
    options?.scheduleAllowed
    ?? isPlaybackAllowedBySchedule(settings, new Date(nowMs));
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

export function createSafePlaybackBoundaryPlan(input: {
  current: PlaybackRuntime;
  nextPages: PlaybackPage[];
  previousPages: PlaybackPage[];
  receivedAtMs: number;
}): SafePlaybackBoundaryPlan {
  const currentPage = getPlaybackPage(input.current, input.previousPages);
  const currentPageRemainsValid =
    currentPage !== null &&
    getEnabledPlaybackPages(input.nextPages).some(
      (page) => page.id === currentPage.id
    );
  const applyByMs =
    input.receivedAtMs + Math.max(0, input.current.countdownMs);

  return {
    applyAtMs: currentPageRemainsValid ? applyByMs : input.receivedAtMs,
    applyByMs,
    currentPageId: currentPage?.id ?? null,
    currentPageRemainsValid,
    receivedAtMs: input.receivedAtMs
  };
}

export function resolveSafePlaybackBoundaryRuntime(input: {
  current: PlaybackRuntime;
  nextPages: PlaybackPage[];
  nowMs: number;
  plan: SafePlaybackBoundaryPlan;
  scheduleAllowed?: boolean;
  settings: PlaybackSettings;
}): PlaybackRuntime | null {
  if (input.nowMs < input.plan.applyAtMs) {
    return null;
  }

  const nextPlayablePages = getEnabledPlaybackPages(input.nextPages);
  if (nextPlayablePages.length === 0) {
    return createPlaybackRuntime(input.settings, input.nextPages, {
      isIdle: input.current.isIdle,
      isPlaying: false,
      lastInteractionAt: input.current.lastInteractionAt,
      nowMs: input.nowMs
    });
  }

  const currentIndex = nextPlayablePages.findIndex(
    (page) => page.id === input.plan.currentPageId
  );
  const startPage =
    nextPlayablePages.find((page) => page.id === input.settings.startPage) ??
    nextPlayablePages[0] ??
    null;
  const atNonLoopEdge =
    input.plan.currentPageRemainsValid &&
    !input.settings.loop &&
    currentIndex === nextPlayablePages.length - 1;
  const targetPage =
    input.plan.currentPageRemainsValid && currentIndex >= 0
      ? nextPlayablePages[
          getNextPlaybackIndex(
            currentIndex,
            input.nextPages,
            input.settings.loop,
            1
          )
        ] ?? startPage
      : startPage;
  const scheduleAllowsPlayback =
    input.scheduleAllowed
    ?? isPlaybackAllowedBySchedule(input.settings, new Date(input.nowMs));

  return createPlaybackRuntime(input.settings, input.nextPages, {
    currentPageId: targetPage?.id ?? null,
    isIdle: input.current.isIdle,
    isPlaying:
      input.current.isPlaying &&
      !input.current.isIdle &&
      scheduleAllowsPlayback &&
      !atNonLoopEdge,
    lastInteractionAt: input.current.lastInteractionAt,
    nowMs: input.nowMs,
    scheduleAllowed: scheduleAllowsPlayback
  });
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
