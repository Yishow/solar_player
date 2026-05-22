import { useEffect } from "react";
import { isWakeLockSupported, shouldReacquireWakeLock } from "./screenWakeLock";

type ReleaseListener = () => void;

export type WakeLockSentinelLike = {
  addEventListener?: (event: "release", listener: ReleaseListener) => void;
  removeEventListener?: (event: "release", listener: ReleaseListener) => void;
  release: () => Promise<void> | void;
};

export type WakeLockNavigatorLike = {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

export type WakeLockDocumentLike = {
  addEventListener: (event: "visibilitychange", listener: ReleaseListener) => void;
  removeEventListener: (event: "visibilitychange", listener: ReleaseListener) => void;
  visibilityState: DocumentVisibilityState;
};

type ScreenWakeLockOptions = {
  document?: WakeLockDocumentLike;
  enabled: boolean;
  navigator?: WakeLockNavigatorLike;
};

export function startScreenWakeLockLifecycle(options: ScreenWakeLockOptions) {
  const navigatorLike = options.navigator ?? globalThis.navigator;
  const documentLike = options.document ?? globalThis.document;

  if (!options.enabled || !documentLike || !isWakeLockSupported(navigatorLike)) {
    return async () => {};
  }

  let isStopped = false;
  let isRequesting = false;
  let sentinel: WakeLockSentinelLike | null = null;

  const handleSentinelRelease = () => {
    sentinel = null;
  };

  const releaseSentinel = async () => {
    if (!sentinel) {
      return;
    }

    const activeSentinel = sentinel;
    sentinel = null;
    activeSentinel.removeEventListener?.("release", handleSentinelRelease);

    try {
      await activeSentinel.release();
    } catch {
      // Silently degrade when the browser refuses or has already released the sentinel.
    }
  };

  const requestWakeLock = async () => {
    if (isStopped || isRequesting || sentinel) {
      return;
    }

    const wakeLockController = navigatorLike.wakeLock;

    if (!wakeLockController || !isWakeLockSupported(navigatorLike)) {
      return;
    }

    isRequesting = true;

    try {
      const nextSentinel = await wakeLockController.request("screen");

      if (isStopped) {
        try {
          await nextSentinel.release();
        } catch {
          // Ignore late release failures during teardown.
        }

        return;
      }

      sentinel = nextSentinel;
      nextSentinel.addEventListener?.("release", handleSentinelRelease);
    } catch {
      sentinel = null;
    } finally {
      isRequesting = false;
    }
  };

  const handleVisibilityChange = () => {
    if (
      shouldReacquireWakeLock({
        hasSentinel: sentinel !== null,
        visibilityState: documentLike.visibilityState
      })
    ) {
      void requestWakeLock();
    }
  };

  documentLike.addEventListener("visibilitychange", handleVisibilityChange);
  void requestWakeLock();

  return async () => {
    isStopped = true;
    documentLike.removeEventListener("visibilitychange", handleVisibilityChange);
    await releaseSentinel();
  };
}

export function useScreenWakeLock(options: ScreenWakeLockOptions) {
  useEffect(() => {
    const stop = startScreenWakeLockLifecycle(options);

    return () => {
      void stop();
    };
  }, [options.document, options.enabled, options.navigator]);
}
