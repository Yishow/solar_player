import { useEffect } from "react";
import { subscribeSocketEvent } from "../services/socket";

export async function invokeDisplaySyncRefresh(
  onSync: () => void | Promise<void>
): Promise<void> {
  try {
    await onSync();
  } catch {
    // Individual management surfaces surface reload failures in their own error banners.
  }
}

export function useDisplaySyncRefresh(onSync: () => void | Promise<void>) {
  useEffect(() => {
    const unsubscribe = subscribeSocketEvent("display:sync", () => {
      void invokeDisplaySyncRefresh(onSync);
    });

    return () => {
      unsubscribe();
    };
  }, [onSync]);
}
