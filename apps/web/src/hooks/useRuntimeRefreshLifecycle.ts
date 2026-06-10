import type { DisplaySyncEvent } from "@solar-display/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeSocketEvent } from "../services/socket";

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
};

export function useRuntimeRefreshLifecycle<T>({
  enabled,
  initialPayload = null,
  load,
  refreshKey,
  shouldRefresh
}: UseRuntimeRefreshLifecycleOptions<T>) {
  const [state, setState] = useState<RuntimeRefreshState<T>>(() =>
    createRuntimeRefreshState<T>(initialPayload)
  );
  const loadRef = useRef(load);
  const requestIdRef = useRef(0);
  const shouldRefreshRef = useRef(shouldRefresh);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    shouldRefreshRef.current = shouldRefresh;
  }, [shouldRefresh]);

  const runLoad = useCallback(async (mode: "bootstrap" | "refresh") => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState((current) =>
      markRuntimeRefreshLoading(current, {
        refreshing: mode === "refresh" || current.payload !== null
      })
    );

    try {
      const payload = await loadRef.current();

      if (!shouldApplyRuntimeRefreshResult(requestIdRef.current, requestId)) {
        return;
      }

      setState((current) => resolveRuntimeRefreshSuccess(current, payload, new Date().toISOString()));
    } catch (error) {
      if (!shouldApplyRuntimeRefreshResult(requestIdRef.current, requestId)) {
        return;
      }

      const nextError = error instanceof Error ? error.message : "runtime source failed";
      setState((current) => resolveRuntimeRefreshFailure(current, nextError));
    }
  }, []);

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

    const unsubscribe = subscribeSocketEvent("display:sync", (event) => {
      if (!shouldRefreshRef.current(event)) {
        return;
      }

      void runLoad("refresh");
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, runLoad]);

  return {
    ...state,
    refresh: () => runLoad("refresh")
  };
}
