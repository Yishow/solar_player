import { useEffect, useRef } from "react";
import {
  PLAYBACK_STALL_GRACE_MS,
  PLAYBACK_WATCHDOG_INTERVAL_MS,
  decidePlaybackStall
} from "../recovery/crashRecovery";
export {
  PLAYBACK_STALL_GRACE_MS,
  PLAYBACK_WATCHDOG_INTERVAL_MS
} from "../recovery/crashRecovery";
import { createPlaybackReloadBudgetController } from "../recovery/reloadController";

export type PlaybackWatchdogLoopOptions = {
  allowReload: () => boolean;
  clearScheduledInterval: (timer: unknown) => void;
  currentPageKey: string | null;
  expectedDurationMs: number;
  graceMs?: number;
  isPlaying: boolean;
  lastPageChangeAt: number;
  now: () => number;
  onReload: () => void;
  playablePageCount: number;
  scheduleInterval: (callback: () => void, intervalMs: number) => unknown;
};

export function startPlaybackWatchdogLoop(options: PlaybackWatchdogLoopOptions) {
  const intervalId = options.scheduleInterval(() => {
    const shouldReload = decidePlaybackStall({
      expectedDurationMs: options.expectedDurationMs,
      graceMs: options.graceMs ?? PLAYBACK_STALL_GRACE_MS,
      isPlaying: options.isPlaying,
      msSinceLastPageChange: options.now() - options.lastPageChangeAt,
      playablePageCount: options.playablePageCount
    });

    if (shouldReload && options.allowReload()) {
      options.onReload();
    }
  }, PLAYBACK_WATCHDOG_INTERVAL_MS);

  return () => {
    options.clearScheduledInterval(intervalId);
  };
}

export function usePlaybackWatchdog(input: {
  isPlaying: boolean;
  playablePageCount: number;
  currentPageKey: string | null;
  expectedDurationMs: number;
}) {
  const lastPageChangeAtRef = useRef(Date.now());
  const previousPageKeyRef = useRef<string | null>(input.currentPageKey);

  useEffect(() => {
    if (previousPageKeyRef.current === input.currentPageKey) {
      return;
    }

    previousPageKeyRef.current = input.currentPageKey;
    lastPageChangeAtRef.current = Date.now();
  }, [input.currentPageKey]);

  useEffect(() => {
    const reloadBudget = createPlaybackReloadBudgetController();

    return startPlaybackWatchdogLoop({
      allowReload: () => reloadBudget.allowReload(),
      clearScheduledInterval: (timer) => {
        clearInterval(timer as ReturnType<typeof setInterval>);
      },
      currentPageKey: input.currentPageKey,
      expectedDurationMs: input.expectedDurationMs,
      isPlaying: input.isPlaying,
      lastPageChangeAt: lastPageChangeAtRef.current,
      now: Date.now,
      onReload: () => {
        window.location.reload();
      },
      playablePageCount: input.playablePageCount,
      scheduleInterval: (callback, intervalMs) => setInterval(callback, intervalMs)
    });
  }, [input.currentPageKey, input.expectedDurationMs, input.isPlaying, input.playablePageCount]);
}
