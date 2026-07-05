import { useEffect } from "react";
import { requestJson } from "../services/api";
import {
  getSocketClient,
  type LiveMetricsSnapshot
} from "../services/socket";
import {
  replaceLiveMetricsSnapshot,
  useLiveMetricsStoreSelector,
  type LiveMetricsStoreState
} from "./liveMetricsStore";

export type UseLiveMetricsOptions = {
  enabled?: boolean;
};

export type LiveMetricsSelection = {
  connectionState: LiveMetricsStoreState["connectionState"]["status"];
  isSocketConnected: boolean;
  lastUpdatedAt: LiveMetricsSnapshot["timestamp"];
  snapshot: LiveMetricsSnapshot;
};

let initialSnapshotRequest: Promise<void> | null = null;

export function selectLiveMetricsSelection(state: LiveMetricsStoreState): LiveMetricsSelection {
  return {
    connectionState: state.connectionState.status,
    isSocketConnected: state.connectionState.status === "connected",
    lastUpdatedAt: state.snapshot.timestamp,
    snapshot: state.snapshot
  };
}

export function isLiveMetricsSelectionEqual(
  current: LiveMetricsSelection,
  next: LiveMetricsSelection
) {
  return (
    current.connectionState === next.connectionState
    && current.isSocketConnected === next.isSocketConnected
    && current.lastUpdatedAt === next.lastUpdatedAt
    && current.snapshot === next.snapshot
  );
}

export async function loadInitialLiveMetricsSnapshot(
  loadSnapshot: () => Promise<LiveMetricsSnapshot> = () => requestJson<LiveMetricsSnapshot>("/api/metrics/live")
) {
  const response = await loadSnapshot();
  replaceLiveMetricsSnapshot(response);
}

function ensureLiveMetricsRuntime() {
  getSocketClient();

  if (initialSnapshotRequest !== null) {
    return;
  }

  initialSnapshotRequest = loadInitialLiveMetricsSnapshot()
    .catch(() => {
      // WebSocket reconnect already handles recovery; failed bootstrap should not break rendering.
    })
    .finally(() => {
      initialSnapshotRequest = null;
    });
}

export function useLiveMetricsSelector<T>(
  selector: (state: LiveMetricsStoreState) => T,
  isEqual: (current: T, next: T) => boolean = Object.is,
  options: UseLiveMetricsOptions = {}
) {
  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    ensureLiveMetricsRuntime();
  }, [enabled]);

  return useLiveMetricsStoreSelector(selector, isEqual, enabled);
}

export function useLiveMetrics(options: UseLiveMetricsOptions = {}) {
  return useLiveMetricsSelector(
    selectLiveMetricsSelection,
    isLiveMetricsSelectionEqual,
    options
  );
}
