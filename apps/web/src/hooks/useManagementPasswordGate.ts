import { useCallback, useEffect, useState } from "react";
import { requestJson } from "../services/api";

export type ManagementPasswordGateState = {
  enabled: boolean;
  authenticated: boolean;
  lockedUntil: string | null;
};

const initialState: ManagementPasswordGateState = {
  enabled: true,
  authenticated: false,
  lockedUntil: null
};

export function requiresManagementUnlock(state: ManagementPasswordGateState | null) {
  return state === null || (state.enabled && !state.authenticated);
}

export function useManagementPasswordGate() {
  const [state, setState] = useState<ManagementPasswordGateState | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const next = await requestJson<ManagementPasswordGateState>("/api/management-auth/state");
      setState(next);
      setErrorMessage("");
      return next;
    } catch {
      setState(initialState);
      setErrorMessage("無法確認管理存取狀態，請解鎖後再試。");
      return initialState;
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const unlock = useCallback(async (password: string) => {
    try {
      await requestJson<{ authenticated: boolean }>("/api/management-auth/unlock", {
        method: "POST",
        body: JSON.stringify({ password })
      });
      await refresh();
      return true;
    } catch (error) {
      const statusCode = error instanceof Error && "statusCode" in error
        ? (error as Error & { statusCode?: number }).statusCode
        : undefined;
      if (statusCode === 429) {
        const lockedUntil = error instanceof Error && "body" in error
          ? ((error as Error & { body?: { lockedUntil?: string | null } }).body?.lockedUntil ?? null)
          : null;
        setState((current) => ({ ...(current ?? initialState), authenticated: false, lockedUntil }));
        setErrorMessage("");
      } else {
        setErrorMessage("密碼不正確。");
      }
      return false;
    }
  }, [refresh]);

  const lock = useCallback(async () => {
    await requestJson("/api/management-auth/lock", { method: "POST" });
    await refresh();
  }, [refresh]);

  return {
    ...state,
    isLoading: state === null,
    requiresUnlock: requiresManagementUnlock(state),
    errorMessage,
    refresh,
    unlock,
    lock
  };
}
