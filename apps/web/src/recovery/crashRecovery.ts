export const PLAYBACK_RELOAD_MAX = 3;
export const PLAYBACK_RELOAD_WINDOW_MS = 600_000;
export const PLAYBACK_STALL_GRACE_MS = 15_000;
export const PLAYBACK_WATCHDOG_INTERVAL_MS = 5_000;
export const PLAYBACK_ERROR_RELOAD_DELAY_MS = 5_000;

export type PlaybackReloadBudgetState = {
  reloadTimestamps: number[];
};

export function evaluateReloadBudget(
  state: PlaybackReloadBudgetState,
  now: number,
  options: {
    maxReloads: number;
    windowMs: number;
  }
) {
  const windowStart = now - options.windowMs;
  const recentReloads = state.reloadTimestamps.filter((timestamp) => timestamp >= windowStart);

  if (recentReloads.length >= options.maxReloads) {
    return {
      allowed: false,
      nextState: {
        reloadTimestamps: recentReloads
      }
    };
  }

  return {
    allowed: true,
    nextState: {
      reloadTimestamps: [...recentReloads, now]
    }
  };
}

function readChunkErrorMessage(reason: unknown): string | null {
  if (typeof reason === "string") {
    return reason;
  }

  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === "object" && reason !== null) {
    const candidate = reason as {
      message?: unknown;
      reason?: unknown;
    };

    if (typeof candidate.message === "string") {
      return candidate.message;
    }

    if (typeof candidate.reason === "string") {
      return candidate.reason;
    }
  }

  return null;
}

export function isChunkLoadError(reason: unknown) {
  const message = readChunkErrorMessage(reason)?.toLowerCase() ?? "";

  return (
    message.includes("failed to fetch dynamically imported module")
    || message.includes("error loading dynamically imported module")
    || message.includes("importing a module script failed")
  );
}

export function decidePlaybackStall(input: {
  isPlaying: boolean;
  playablePageCount: number;
  msSinceLastPageChange: number;
  expectedDurationMs: number;
  graceMs: number;
}) {
  if (!input.isPlaying || input.playablePageCount <= 1) {
    return false;
  }

  return input.msSinceLastPageChange > input.expectedDurationMs + input.graceMs;
}
