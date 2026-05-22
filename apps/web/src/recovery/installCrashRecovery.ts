import { isChunkLoadError } from "./crashRecovery";
import { createPlaybackReloadBudgetController } from "./reloadController";

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
};

function tryReload(
  windowLike: CrashRecoveryWindowLike,
  options: InstallCrashRecoveryOptions = {}
) {
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
    tryReload(windowLike, options);
  };

  const handleUnhandledRejection = (event: unknown) => {
    const candidate = event as {
      reason?: unknown;
    };

    if (!isChunkLoadError(candidate.reason)) {
      return;
    }

    tryReload(windowLike, options);
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
