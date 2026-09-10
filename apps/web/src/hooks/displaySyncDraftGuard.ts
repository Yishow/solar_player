import type { DisplaySyncEvent, DisplaySyncEventScope } from "@solar-display/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { shouldHandleDisplaySyncScope } from "./useDisplaySyncRefresh";

export type DisplaySyncDraftGuardState = {
  hasPendingRemoteChange: boolean;
};

export type DisplaySyncDraftGuardOutcome = "deferred" | "ignored" | "reloaded";

export type DisplaySyncReloadResult = {
  operationToken: number;
  outcome: "committed" | "deferred" | "failed" | "stale";
};

export type DisplaySyncReloadContext = {
  discardDraft: boolean;
};

type DisplaySyncReload = (
  context?: DisplaySyncReloadContext
) => Promise<void | DisplaySyncReloadResult>;

export async function applyDisplaySyncDraftGuard(
  state: DisplaySyncDraftGuardState,
  options: {
    event: DisplaySyncEvent;
    isDirty: boolean;
    relevantScopes: readonly DisplaySyncEventScope[];
    reloadNow: DisplaySyncReload;
  }
): Promise<{
  nextState: DisplaySyncDraftGuardState;
  outcome: DisplaySyncDraftGuardOutcome;
  reloadResult?: DisplaySyncReloadResult;
}> {
  if (!shouldHandleDisplaySyncScope(options.event, options.relevantScopes)) {
    return {
      nextState: state,
      outcome: "ignored"
    };
  }

  if (options.isDirty) {
    return {
      nextState: {
        hasPendingRemoteChange: true
      },
      outcome: "deferred"
    };
  }

  const reloadResult = await options.reloadNow({ discardDraft: false });

  if (reloadResult?.outcome === "stale") {
    return {
      nextState: state,
      outcome: "ignored",
      reloadResult
    };
  }

  if (reloadResult?.outcome === "deferred" || reloadResult?.outcome === "failed") {
    return {
      nextState: {
        hasPendingRemoteChange: true
      },
      outcome: "deferred",
      reloadResult
    };
  }

  return {
    nextState: {
      hasPendingRemoteChange: false
    },
    outcome: "reloaded",
    ...(reloadResult ? { reloadResult } : {})
  };
}

export function keepPendingDisplaySyncDraft(
  state: DisplaySyncDraftGuardState
): DisplaySyncDraftGuardState {
  return {
    ...state,
    hasPendingRemoteChange: true
  };
}

export async function discardPendingDisplaySyncDraft(
  state: DisplaySyncDraftGuardState,
  reloadNow: DisplaySyncReload
): Promise<{
  nextState: DisplaySyncDraftGuardState;
  outcome: DisplaySyncDraftGuardOutcome;
  reloadResult?: DisplaySyncReloadResult;
}> {
  const reloadResult = await reloadNow({ discardDraft: true });

  if (reloadResult?.outcome === "stale") {
    return {
      nextState: state,
      outcome: "ignored",
      reloadResult
    };
  }

  if (reloadResult?.outcome === "deferred" || reloadResult?.outcome === "failed") {
    return {
      nextState: {
        ...state,
        hasPendingRemoteChange: true
      },
      outcome: "deferred",
      reloadResult
    };
  }

  return {
    nextState: {
      ...state,
      hasPendingRemoteChange: false
    },
    outcome: "reloaded",
    ...(reloadResult ? { reloadResult } : {})
  };
}

export function hasDisplaySyncDraftChanges<T>(current: T, synced: T): boolean {
  return JSON.stringify(current) !== JSON.stringify(synced);
}

type UseDisplaySyncDraftGuardOptions = {
  externalReloadResult?: DisplaySyncReloadResult | null;
  isDirty: boolean;
  relevantScopes: readonly DisplaySyncEventScope[];
  reloadNow: DisplaySyncReload;
  stickyPending?: boolean;
};

export function useDisplaySyncDraftGuard({
  externalReloadResult = null,
  isDirty,
  relevantScopes,
  reloadNow,
  stickyPending = false
}: UseDisplaySyncDraftGuardOptions) {
  const [state, setState] = useState<DisplaySyncDraftGuardState>({
    hasPendingRemoteChange: false
  });
  const dirtyRef = useRef(isDirty);
  const relevantScopesRef = useRef(relevantScopes);
  const reloadNowRef = useRef(reloadNow);
  const stateRef = useRef(state);
  const mountedRef = useRef(true);
  const externalOperationTokenRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      !externalReloadResult
      || externalReloadResult.outcome === "stale"
      || externalReloadResult.outcome === "failed"
      || externalReloadResult.operationToken < externalOperationTokenRef.current
    ) {
      return;
    }
    externalOperationTokenRef.current = externalReloadResult.operationToken;
    const nextState = externalReloadResult.outcome === "deferred"
      ? { hasPendingRemoteChange: true }
      : isDirty
        ? stateRef.current
        : { hasPendingRemoteChange: false };
    stateRef.current = nextState;
    setState(nextState);
  }, [externalReloadResult, isDirty]);

  useEffect(() => {
    dirtyRef.current = isDirty;
    if (!stickyPending && !isDirty && stateRef.current.hasPendingRemoteChange) {
      const nextState = {
        hasPendingRemoteChange: false
      };
      stateRef.current = nextState;
      setState(nextState);
    }
  }, [isDirty, stickyPending]);

  useEffect(() => {
    relevantScopesRef.current = relevantScopes;
  }, [relevantScopes]);

  useEffect(() => {
    reloadNowRef.current = reloadNow;
  }, [reloadNow]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleDisplaySync = useCallback(async (event: DisplaySyncEvent) => {
    let result;
    try {
      result = await applyDisplaySyncDraftGuard(stateRef.current, {
        event,
        isDirty: dirtyRef.current,
        relevantScopes: relevantScopesRef.current,
        reloadNow: (context) => reloadNowRef.current(context)
      });
    } catch (error) {
      if (stickyPending && mountedRef.current) {
        const nextState = { hasPendingRemoteChange: true };
        stateRef.current = nextState;
        setState(nextState);
      }
      throw error;
    }

    if (result.outcome === "ignored") {
      return;
    }

    if (result.reloadResult?.outcome === "committed") {
      return;
    }

    if (!mountedRef.current) {
      return;
    }

    stateRef.current = result.nextState;
    setState(result.nextState);
  }, [stickyPending]);

  const keepEditing = useCallback(() => {
    setState((current) => {
      const nextState = keepPendingDisplaySyncDraft(current);
      stateRef.current = nextState;
      return nextState;
    });
  }, []);

  const discardAndReload = useCallback(async () => {
    try {
      const result = await discardPendingDisplaySyncDraft(
        stateRef.current,
        (context) => reloadNowRef.current(context)
      );
      if (result.outcome === "ignored" || result.reloadResult?.outcome === "committed") {
        return;
      }
      if (mountedRef.current) {
        stateRef.current = result.nextState;
        setState(result.nextState);
      }
    } catch (error) {
      if (stickyPending && mountedRef.current) {
        const nextState = { hasPendingRemoteChange: true };
        stateRef.current = nextState;
        setState(nextState);
      }
      throw error;
    }
  }, [stickyPending]);

  const clearPendingRemoteChange = useCallback(() => {
    const nextState = {
      hasPendingRemoteChange: false
    };
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  return {
    clearPendingRemoteChange,
    discardAndReload,
    handleDisplaySync,
    hasPendingRemoteChange: state.hasPendingRemoteChange,
    keepEditing
  };
}
