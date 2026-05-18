import { isPlaybackAllowedBySchedule } from "./playback.js";
import type { PlaybackPage, PlaybackSettings } from "./types.js";

export type DisplayRotationPlanEntry = PlaybackPage;

export type DisplayRotationPlan = {
  pages: DisplayRotationPlanEntry[];
};

export const displayRotationSkipReasons = [
  "disabled",
  "out-of-schedule",
  "unpublished",
  "asset-unhealthy",
  "data-not-ready"
] as const;

export type DisplayRotationSkipReason =
  | (typeof displayRotationSkipReasons)[number]
  | (string & {});

export type DisplayRotationPageCondition = {
  detail?: string | null;
  isHealthy?: boolean;
  isPublished?: boolean;
  isReady?: boolean;
  skipReason?: DisplayRotationSkipReason | null;
};

export type DisplayRotationSkippedPage = DisplayRotationPlanEntry & {
  detail?: string | null;
  skipReason: DisplayRotationSkipReason;
};

export type DisplayRotationPreview = {
  evaluatedAt: string;
  fallbackRoute: string | null;
  playablePages: DisplayRotationPlanEntry[];
  skippedPages: DisplayRotationSkippedPage[];
};

export function sortDisplayRotationPlanEntries(pages: DisplayRotationPlanEntry[]) {
  return [...pages].sort((left, right) => {
    if (left.displayOrder === right.displayOrder) {
      return left.id - right.id;
    }

    return left.displayOrder - right.displayOrder;
  });
}

export function buildDisplayRotationPlan(pages: DisplayRotationPlanEntry[]): DisplayRotationPlan {
  return {
    pages: sortDisplayRotationPlanEntries(pages)
  };
}

function resolveSkipReason(
  page: DisplayRotationPlanEntry,
  condition: DisplayRotationPageCondition | undefined,
  scheduleAllowed: boolean
): DisplayRotationSkipReason | null {
  if (!page.enabled) {
    return "disabled";
  }

  if (!scheduleAllowed) {
    return "out-of-schedule";
  }

  if (condition?.skipReason) {
    return condition.skipReason;
  }

  if (condition?.isPublished === false) {
    return "unpublished";
  }

  if (condition?.isHealthy === false) {
    return "asset-unhealthy";
  }

  if (condition?.isReady === false) {
    return "data-not-ready";
  }

  return null;
}

export function evaluateDisplayRotation(input: {
  fallbackRoute?: string;
  now: Date;
  pageConditions?: Record<number, DisplayRotationPageCondition>;
  pages: DisplayRotationPlanEntry[];
  settings: PlaybackSettings;
}): DisplayRotationPreview {
  const sortedPages = sortDisplayRotationPlanEntries(input.pages);
  const scheduleAllowed = isPlaybackAllowedBySchedule(input.settings, input.now);
  const playablePages: DisplayRotationPlanEntry[] = [];
  const skippedPages: DisplayRotationSkippedPage[] = [];

  for (const page of sortedPages) {
    const condition = input.pageConditions?.[page.id];
    const skipReason = resolveSkipReason(page, condition, scheduleAllowed);

    if (!skipReason) {
      playablePages.push(page);
      continue;
    }

    skippedPages.push({
      ...page,
      detail: condition?.detail ?? null,
      skipReason
    });
  }

  return {
    evaluatedAt: input.now.toISOString(),
    fallbackRoute: playablePages.length > 0 ? null : input.fallbackRoute ?? "/offline",
    playablePages,
    skippedPages
  };
}
