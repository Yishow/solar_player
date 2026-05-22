import {
  PLAYBACK_RELOAD_MAX,
  PLAYBACK_RELOAD_WINDOW_MS,
  type PlaybackReloadBudgetState,
  evaluateReloadBudget
} from "./crashRecovery";

export const PLAYBACK_RELOAD_BUDGET_STORAGE_KEY = "solar-display:reload-budget";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type ReloadBudgetControllerOptions = {
  maxReloads?: number;
  now?: () => number;
  storage?: StorageLike | null;
  storageKey?: string;
  windowMs?: number;
};

function readReloadBudgetState(
  storage: StorageLike | null | undefined,
  storageKey: string
): PlaybackReloadBudgetState {
  if (!storage) {
    return {
      reloadTimestamps: []
    };
  }

  try {
    const rawValue = storage.getItem(storageKey);
    if (!rawValue) {
      return {
        reloadTimestamps: []
      };
    }

    const parsed = JSON.parse(rawValue) as PlaybackReloadBudgetState;
    if (!Array.isArray(parsed.reloadTimestamps)) {
      return {
        reloadTimestamps: []
      };
    }

    return {
      reloadTimestamps: parsed.reloadTimestamps.filter((timestamp) => Number.isFinite(timestamp))
    };
  } catch {
    return {
      reloadTimestamps: []
    };
  }
}

function writeReloadBudgetState(
  storage: StorageLike | null | undefined,
  storageKey: string,
  state: PlaybackReloadBudgetState
) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Recovery should fail closed without blocking the reload path.
  }
}

export function createPlaybackReloadBudgetController(options: ReloadBudgetControllerOptions = {}) {
  const storageKey = options.storageKey ?? PLAYBACK_RELOAD_BUDGET_STORAGE_KEY;
  const storage =
    options.storage
    ?? (typeof window === "undefined" ? null : window.sessionStorage);
  const now = options.now ?? Date.now;

  return {
    allowReload() {
      const budgetState = readReloadBudgetState(storage, storageKey);
      const result = evaluateReloadBudget(budgetState, now(), {
        maxReloads: options.maxReloads ?? PLAYBACK_RELOAD_MAX,
        windowMs: options.windowMs ?? PLAYBACK_RELOAD_WINDOW_MS
      });

      writeReloadBudgetState(storage, storageKey, result.nextState);
      return result.allowed;
    }
  };
}
