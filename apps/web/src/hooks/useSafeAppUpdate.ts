import { useEffect, useMemo, useState } from "react";
import {
  SAFE_PLAYBACK_BOUNDARY_EVENT,
  SERVICE_WORKER_ACTIVATE_CANDIDATE,
  SERVICE_WORKER_CANDIDATE_READY,
  SERVICE_WORKER_COMMIT_ACTIVE_CACHE
} from "../services/appUpdateProtocol";
import {
  readCandidateOfflineCacheIdentity,
  stageOfflinePlaybackSnapshotForRelease
} from "../services/offlinePlaybackStore";

export {
  SAFE_PLAYBACK_BOUNDARY_EVENT,
  SERVICE_WORKER_ACTIVATE_CANDIDATE,
  SERVICE_WORKER_CANDIDATE_READY
} from "../services/appUpdateProtocol";

export type SafeAppUpdateState = "idle" | "staged" | "activating" | "failed";

export async function promoteStagedAppUpdate(options: {
  activateWorker?: () => Promise<void>;
  commitCache: () => Promise<void>;
  stageSnapshot: () => Promise<unknown>;
}) {
  await options.stageSnapshot();
  await options.activateWorker?.();
  await options.commitCache();
}

export function createSafeAppUpdateController(options: {
  activate: () => Promise<void>;
}) {
  let state: SafeAppUpdateState = "idle";
  return {
    candidateReady() {
      if (state !== "activating") state = "staged";
      return state;
    },
    getState() {
      return state;
    },
    async safeBoundary() {
      if (state !== "staged") return state;
      state = "activating";
      try {
        await options.activate();
        state = "idle";
      } catch {
        state = "failed";
      }
      return state;
    }
  };
}

export function announceSafePlaybackBoundary() {
  window.dispatchEvent(new Event(SAFE_PLAYBACK_BOUNDARY_EVENT));
}

export function waitForServiceWorkerControllerChange(
  container: Pick<ServiceWorkerContainer, "addEventListener" | "removeEventListener">,
  timeoutMs = 10_000
) {
  return new Promise<void>((resolve, reject) => {
    const handleChange = () => {
      clearTimeout(timeout);
      container.removeEventListener("controllerchange", handleChange);
      resolve();
    };
    const timeout = window.setTimeout(() => {
      container.removeEventListener("controllerchange", handleChange);
      reject(new Error("Service Worker activation timed out."));
    }, timeoutMs);
    container.addEventListener("controllerchange", handleChange);
  });
}

function commitActiveServiceWorkerCache(worker: ServiceWorker, timeoutMs = 10_000) {
  return new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      reject(new Error("Service Worker cache commit timed out."));
    }, timeoutMs);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      if (event.data?.ok) {
        resolve();
      } else {
        reject(new Error(event.data?.error ?? "Service Worker cache commit failed."));
      }
    };
    worker.postMessage(
      { type: SERVICE_WORKER_COMMIT_ACTIVE_CACHE },
      [channel.port2]
    );
  });
}

export function useSafeAppUpdate() {
  const [state, setState] = useState<SafeAppUpdateState>("idle");
  const controller = useMemo(
    () => createSafeAppUpdateController({
      activate: async () => {
        let registration = await navigator.serviceWorker.getRegistration();
        const candidate = await readCandidateOfflineCacheIdentity();
        if (!registration || !candidate) {
          throw new Error("Staged Service Worker candidate is unavailable.");
        }
        const waitingWorker = registration.waiting;
        await promoteStagedAppUpdate({
          activateWorker: waitingWorker
            ? async () => {
                const activated = waitForServiceWorkerControllerChange(
                  navigator.serviceWorker
                );
                waitingWorker.postMessage({
                  type: SERVICE_WORKER_ACTIVATE_CANDIDATE
                });
                await activated;
                registration = await navigator.serviceWorker.getRegistration();
              }
            : undefined,
          commitCache: async () => {
            if (!registration?.active) {
              throw new Error("Activated Service Worker is unavailable.");
            }
            await commitActiveServiceWorkerCache(registration.active);
          },
          stageSnapshot: () =>
            stageOfflinePlaybackSnapshotForRelease(candidate.appRelease)
        });
      }
    }),
    []
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === SERVICE_WORKER_CANDIDATE_READY) {
        setState(controller.candidateReady());
      }
    };
    const handleBoundary = () => {
      void controller.safeBoundary().then(setState);
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    window.addEventListener(SAFE_PLAYBACK_BOUNDARY_EVENT, handleBoundary);
    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting) {
        setState(controller.candidateReady());
        return;
      }
      void readCandidateOfflineCacheIdentity().then((candidate) => {
        if (candidate) setState(controller.candidateReady());
      });
    });
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      window.removeEventListener(SAFE_PLAYBACK_BOUNDARY_EVENT, handleBoundary);
    };
  }, [controller]);

  return state;
}
