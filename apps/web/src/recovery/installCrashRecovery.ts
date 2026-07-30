import { isChunkLoadError } from "./crashRecovery";
import { createPlaybackReloadBudgetController } from "./reloadController";
import {
  readActiveOfflineCacheIdentity,
  readOfflinePlaybackSnapshotForRelease
} from "../services/offlinePlaybackStore";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type LocationLike = {
  reload: () => void;
};

export type CrashRecoveryWindowLike = {
  addEventListener: (event: string, listener: (event: unknown) => void) => void;
  location: LocationLike;
  removeEventListener: (event: string, listener: (event: unknown) => void) => void;
  sessionStorage?: StorageLike;
};

type InstallCrashRecoveryOptions = {
  now?: () => number;
  recoverFromActiveCache?: () => Promise<boolean>;
};

const OFFLINE_RECOVERY_ATTEMPT_KEY = "solar:offline-chunk-recovery-attempted";

async function hasActiveOfflineCache() {
  if (typeof caches === "undefined" || typeof indexedDB === "undefined") return false;
  const active = await readActiveOfflineCacheIdentity();
  return Boolean(
    active
    && await readOfflinePlaybackSnapshotForRelease(active.appRelease)
  );
}

async function tryReload(
  windowLike: CrashRecoveryWindowLike,
  options: InstallCrashRecoveryOptions = {}
) {
  try {
    if (
      windowLike.sessionStorage?.getItem(OFFLINE_RECOVERY_ATTEMPT_KEY) !== "1"
      && await (options.recoverFromActiveCache ?? hasActiveOfflineCache)()
    ) {
      windowLike.sessionStorage?.setItem(OFFLINE_RECOVERY_ATTEMPT_KEY, "1");
      windowLike.location.reload();
      return true;
    }
  } catch {
    // Fall through to the bounded network recovery path.
  }

  const controller = createPlaybackReloadBudgetController({
    now: options.now,
    storage: windowLike.sessionStorage ?? null
  });

  if (!controller.allowReload()) {
    return false;
  }

  windowLike.location.reload();
  return true;
}

export function installCrashRecoveryWithEnvironment(
  windowLike: CrashRecoveryWindowLike,
  options: InstallCrashRecoveryOptions = {}
) {
  const handlePreloadError = (event: unknown) => {
    const candidate = event as {
      preventDefault?: () => void;
    };

    candidate.preventDefault?.();
    void tryReload(windowLike, options);
  };

  const handleUnhandledRejection = (event: unknown) => {
    const candidate = event as {
      reason?: unknown;
    };

    if (!isChunkLoadError(candidate.reason)) {
      return;
    }

    void tryReload(windowLike, options);
  };

  windowLike.addEventListener("vite:preloadError", handlePreloadError);
  windowLike.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    windowLike.removeEventListener("vite:preloadError", handlePreloadError);
    windowLike.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}

export function installCrashRecovery() {
  if (typeof window === "undefined") {
    return () => {};
  }

  return installCrashRecoveryWithEnvironment(window);
}
