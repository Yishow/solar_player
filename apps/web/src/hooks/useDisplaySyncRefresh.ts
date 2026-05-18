import { useEffect } from "react";
import { subscribeSocketEvent } from "../services/socket";

export function useDisplaySyncRefresh(onSync: () => void) {
  useEffect(() => {
    const unsubscribe = subscribeSocketEvent("display:sync", () => {
      onSync();
    });

    return () => {
      unsubscribe();
    };
  }, [onSync]);
}
