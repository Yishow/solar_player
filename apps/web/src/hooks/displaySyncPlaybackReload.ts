import type { DisplaySyncEvent, DisplaySyncEventScope } from "@solar-display/shared";

const playbackRuntimeDisplaySyncScopes = new Set<DisplaySyncEventScope>([
  "circuits",
  "display-pages",
  "images",
  "mqtt"
]);

export function shouldReloadPlaybackRuntimeForDisplaySync(scope: DisplaySyncEventScope) {
  return playbackRuntimeDisplaySyncScopes.has(scope);
}

type DisplaySyncPlaybackReloadCoordinatorOptions = {
  debounceMs?: number;
  reloadPlayback: () => Promise<void>;
};

export function createDisplaySyncPlaybackReloadCoordinator({
  debounceMs = 50,
  reloadPlayback
}: DisplaySyncPlaybackReloadCoordinatorOptions) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlightReload: Promise<void> | null = null;
  let disposed = false;
  let pendingRelevantEvent = false;

  const runReload = async () => {
    if (disposed || inFlightReload) {
      return inFlightReload ?? Promise.resolve();
    }

    const nextReload = reloadPlayback()
      .catch(() => {
        // The playback controller surfaces its own error state.
      })
      .finally(async () => {
        inFlightReload = null;

        if (pendingRelevantEvent && !disposed) {
          pendingRelevantEvent = false;
          await runReload();
        }
      });

    inFlightReload = nextReload;
    return nextReload;
  };

  const scheduleReload = () => {
    if (disposed || timer) {
      return;
    }

    timer = setTimeout(() => {
      timer = null;
      void runReload();
    }, debounceMs);
  };

  return {
    dispose() {
      disposed = true;
      pendingRelevantEvent = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        await runReload();
      }

      if (inFlightReload) {
        await inFlightReload;
      }
    },
    notify(event: DisplaySyncEvent) {
      if (!shouldReloadPlaybackRuntimeForDisplaySync(event.scope) || disposed) {
        return false;
      }

      if (timer) {
        return true;
      }

      if (inFlightReload) {
        pendingRelevantEvent = true;
        return true;
      }

      scheduleReload();
      return true;
    }
  };
}
