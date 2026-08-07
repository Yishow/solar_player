import type { DisplaySyncEvent } from "@solar-display/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeSocketEvent } from "../services/socket";
import { writeDisplayRuntimeSyncSnapshot } from "../services/displayRuntimeSyncReporter";

export type RuntimeRefreshState<T> = {
  errorMessage: string;
  isLoading: boolean;
  isRefreshing: boolean;
  lastResolvedAt: string | null;
  payload: T | null;
  usesFallback: boolean;
};

export function createRuntimeRefreshState<T>(payload: T | null = null): RuntimeRefreshState<T> {
  return {
    errorMessage: "",
    isLoading: payload === null,
    isRefreshing: false,
    lastResolvedAt: null,
    payload,
    usesFallback: false
  };
}

export function markRuntimeRefreshLoading<T>(
  state: RuntimeRefreshState<T>,
  options?: {
    refreshing?: boolean;
  }
): RuntimeRefreshState<T> {
  const refreshing = options?.refreshing ?? state.payload !== null;

  return {
    ...state,
    errorMessage: "",
    isLoading: !refreshing,
    isRefreshing: refreshing
  };
}

export function resolveRuntimeRefreshSuccess<T>(
  state: RuntimeRefreshState<T>,
  payload: T,
  resolvedAt: string
): RuntimeRefreshState<T> {
  return {
    ...state,
    errorMessage: "",
    isLoading: false,
    isRefreshing: false,
    lastResolvedAt: resolvedAt,
    payload,
    usesFallback: false
  };
}

export function resolveRuntimeRefreshFailure<T>(
  state: RuntimeRefreshState<T>,
  errorMessage: string
): RuntimeRefreshState<T> {
  return {
    ...state,
    errorMessage,
    isLoading: false,
    isRefreshing: false,
    usesFallback: true
  };
}

export function shouldApplyRuntimeRefreshResult(currentRequestId: number, requestId: number) {
  return currentRequestId === requestId;
}

type UseRuntimeRefreshLifecycleOptions<T> = {
  enabled: boolean;
  initialPayload?: T | null;
  load: () => Promise<T>;
  refreshKey: string;
  shouldRefresh: (event: DisplaySyncEvent) => boolean;
  runtimeSyncPageKey?: string;
  scheduleRetry?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancelRetry?: (timer: ReturnType<typeof setTimeout>) => void;
  subscribeDisplaySync?: (
    listener: (event: DisplaySyncEvent) => void
  ) => () => void;
};

const scheduleRuntimeRetry = (callback: () => void, delay: number) => setTimeout(callback, delay);
const cancelRuntimeRetry = (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer);
const subscribeRuntimeDisplaySync = (listener: (event: DisplaySyncEvent) => void) =>
  subscribeSocketEvent("display:sync", listener);

export function useRuntimeRefreshLifecycle<T>({
  enabled,
  initialPayload = null,
  load,
  refreshKey,
  shouldRefresh,
  runtimeSyncPageKey,
  scheduleRetry = scheduleRuntimeRetry,
  cancelRetry = cancelRuntimeRetry,
  subscribeDisplaySync = subscribeRuntimeDisplaySync
}: UseRuntimeRefreshLifecycleOptions<T>) {
  const [state, setState] = useState<RuntimeRefreshState<T>>(() =>
    createRuntimeRefreshState<T>(initialPayload)
  );
  const loadRef = useRef(load);
  const requestIdRef = useRef(0);
  const shouldRefreshRef = useRef(shouldRefresh);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    shouldRefreshRef.current = shouldRefresh;
  }, [shouldRefresh]);

  const runLoad = useCallback(async (mode: "bootstrap" | "refresh") => {
    if (retryTimerRef.current !== null) {
      cancelRetry(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState((current) =>
      markRuntimeRefreshLoading(current, {
        refreshing: mode === "refresh" || current.payload !== null
      })
    );
    if (runtimeSyncPageKey) {
      writeDisplayRuntimeSyncSnapshot({
        runtimeSyncState: "loading",
        runtimeSyncPageKey
      });
    }

    try {
      const payload = await loadRef.current();

      if (!shouldApplyRuntimeRefreshResult(requestIdRef.current, requestId)) {
        return;
      }

      setState((current) => resolveRuntimeRefreshSuccess(current, payload, new Date().toISOString()));
      retryAttemptRef.current = 0;
      if (runtimeSyncPageKey) {
        writeDisplayRuntimeSyncSnapshot({
          runtimeSyncState: "synced",
          runtimeSyncPageKey,
          runtimeSyncResolvedAt: new Date().toISOString(),
          runtimeSyncError: null
        });
      }
    } catch (error) {
      if (!shouldApplyRuntimeRefreshResult(requestIdRef.current, requestId)) {
        return;
      }

      const nextError = error instanceof Error ? error.message : "runtime source failed";
      setState((current) => resolveRuntimeRefreshFailure(current, nextError));
      retryAttemptRef.current += 1;
      if (runtimeSyncPageKey) {
        writeDisplayRuntimeSyncSnapshot({
          runtimeSyncState: "degraded",
          runtimeSyncPageKey,
          runtimeSyncError: nextError
        });
        const delay = Math.min(60_000, 2_000 * (2 ** (retryAttemptRef.current - 1)));
        retryTimerRef.current = scheduleRetry(() => {
          retryTimerRef.current = null;
          void runLoad("refresh");
        }, delay);
      }
    }
  }, [cancelRetry, runtimeSyncPageKey, scheduleRetry]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void runLoad("bootstrap");
  }, [enabled, refreshKey, runLoad]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unsubscribe = subscribeDisplaySync((event) => {
      if (!shouldRefreshRef.current(event)) {
        return;
      }

      void runLoad("refresh");
    });

    return () => {
      unsubscribe();
      if (retryTimerRef.current !== null) {
        cancelRetry(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [cancelRetry, enabled, runLoad, subscribeDisplaySync]);

  return {
    ...state,
    refresh: () => runLoad("refresh")
  };
}
