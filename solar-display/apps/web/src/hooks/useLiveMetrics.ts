import { useEffect, useState } from "react";
import { requestJson } from "../services/api";
import {
  getCachedLiveMetrics,
  getSocketClient,
  getSocketConnectionState,
  subscribeConnectionState,
  subscribeSocketEvent,
  type LiveMetricsSnapshot,
  type SocketConnectionState
} from "../services/socket";

function shouldReplaceSnapshot(current: LiveMetricsSnapshot, next: LiveMetricsSnapshot) {
  if (current.timestamp === null) {
    return true;
  }

  if (next.timestamp === null) {
    return false;
  }

  return next.timestamp >= current.timestamp;
}

export function useLiveMetrics() {
  const [snapshot, setSnapshot] = useState<LiveMetricsSnapshot>(getCachedLiveMetrics());
  const [connectionState, setConnectionState] = useState<SocketConnectionState>(
    getSocketConnectionState()
  );

  useEffect(() => {
    let active = true;

    const loadInitialSnapshot = async () => {
      try {
        const response = await requestJson<LiveMetricsSnapshot>("/api/metrics/live");
        if (!active) {
          return;
        }

        setSnapshot((current) => (shouldReplaceSnapshot(current, response) ? response : current));
      } catch {
        // WebSocket reconnect already handles recovery; failed bootstrap should not break rendering.
      }
    };

    const unsubscribeMetrics = subscribeSocketEvent("liveMetrics:update", (nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });
    const unsubscribeConnection = subscribeConnectionState((nextState) => {
      setConnectionState(nextState);
    });

    getSocketClient();
    void loadInitialSnapshot();

    return () => {
      active = false;
      unsubscribeMetrics();
      unsubscribeConnection();
    };
  }, []);

  return {
    connectionState: connectionState.status,
    isSocketConnected: connectionState.status === "connected",
    lastUpdatedAt: snapshot.timestamp,
    snapshot
  };
}
