import { useCallback, useEffect, useRef, useState } from "react";

export type DisplaySyncDraftGuardState = {
  hasPendingRemoteChange: boolean;
};

export type DisplaySyncDraftGuardOutcome = "deferred" | "reloaded";

export async function applyDisplaySyncDraftGuard(
  state: DisplaySyncDraftGuardState,
  options: {
    isDirty: boolean;
    reloadNow: () => Promise<void>;
  }
): Promise<{
  nextState: DisplaySyncDraftGuardState;
  outcome: DisplaySyncDraftGuardOutcome;
}> {
  if (options.isDirty) {
    return {
      nextState: {
        hasPendingRemoteChange: true
      },
      outcome: "deferred"
    };
  }

  await options.reloadNow();

  return {
    nextState: {
      hasPendingRemoteChange: false
    },
    outcome: "reloaded"
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
  reloadNow: () => Promise<void>
): Promise<{
  nextState: DisplaySyncDraftGuardState;
  outcome: DisplaySyncDraftGuardOutcome;
}> {
  await reloadNow();

  return {
    nextState: {
      ...state,
      hasPendingRemoteChange: false
    },
    outcome: "reloaded"
  };
}

export function hasDisplaySyncDraftChanges<T>(current: T, synced: T): boolean {
  return JSON.stringify(current) !== JSON.stringify(synced);
}

type UseDisplaySyncDraftGuardOptions = {
  isDirty: boolean;
  reloadNow: () => Promise<void>;
};

export function useDisplaySyncDraftGuard({
  isDirty,
  reloadNow
}: UseDisplaySyncDraftGuardOptions) {
  const [state, setState] = useState<DisplaySyncDraftGuardState>({
    hasPendingRemoteChange: false
  });
  const dirtyRef = useRef(isDirty);
  const reloadNowRef = useRef(reloadNow);
  const stateRef = useRef(state);

  useEffect(() => {
    dirtyRef.current = isDirty;
    if (!isDirty && stateRef.current.hasPendingRemoteChange) {
      const nextState = {
        hasPendingRemoteChange: false
      };
      stateRef.current = nextState;
      setState(nextState);
    }
  }, [isDirty]);

  useEffect(() => {
    reloadNowRef.current = reloadNow;
  }, [reloadNow]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleDisplaySync = useCallback(async () => {
    const result = await applyDisplaySyncDraftGuard(stateRef.current, {
      isDirty: dirtyRef.current,
      reloadNow: () => reloadNowRef.current()
    });
    stateRef.current = result.nextState;
    setState(result.nextState);
  }, []);

  const keepEditing = useCallback(() => {
    setState((current) => {
      const nextState = keepPendingDisplaySyncDraft(current);
      stateRef.current = nextState;
      return nextState;
    });
  }, []);

  const discardAndReload = useCallback(async () => {
    const result = await discardPendingDisplaySyncDraft(stateRef.current, () => reloadNowRef.current());
    stateRef.current = result.nextState;
    setState(result.nextState);
  }, []);

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
