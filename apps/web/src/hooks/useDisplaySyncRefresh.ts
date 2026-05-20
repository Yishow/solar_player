import type { DisplaySyncEvent, DisplaySyncEventScope } from "@solar-display/shared";
import { useEffect } from "react";
import { subscribeSocketEvent } from "../services/socket";

export function shouldHandleDisplaySyncScope(
  event: Pick<DisplaySyncEvent, "scope">,
  relevantScopes: readonly DisplaySyncEventScope[]
) {
  return relevantScopes.includes(event.scope);
}

export async function invokeDisplaySyncRefresh(
  onSync: (event: DisplaySyncEvent) => void | Promise<void>,
  event: DisplaySyncEvent
): Promise<void> {
  try {
    await onSync(event);
  } catch {
    // Individual management surfaces surface reload failures in their own error banners.
  }
}

export function useDisplaySyncRefresh(
  onSync: (event: DisplaySyncEvent) => void | Promise<void>,
  relevantScopes: readonly DisplaySyncEventScope[]
) {
  useEffect(() => {
    const unsubscribe = subscribeSocketEvent("display:sync", (event) => {
      if (!shouldHandleDisplaySyncScope(event, relevantScopes)) {
        return;
      }

      void invokeDisplaySyncRefresh(onSync, event);
    });

    return () => {
      unsubscribe();
    };
  }, [onSync, relevantScopes]);
}
