import { useEffect } from "react";
import { requestJson } from "../services/api";
import {
  getSocketClient,
  type LiveMetricsSnapshot,
  type ScopedLiveMetricsSnapshot
} from "../services/socket";
import {
  replaceLiveMetricsSnapshot,
  useLiveMetricsStoreSelector,
  type LiveMetricsStoreState
} from "./liveMetricsStore";
import { useAppTime } from "./useAppTime";
import { resolveClientFreshnessState } from "./useFreshnessState";

export type UseLiveMetricsOptions = {
  enabled?: boolean;
};

export type LiveMetricsSelection = {
  connectionState: LiveMetricsStoreState["connectionState"]["status"];
  isSocketConnected: boolean;
  lastUpdatedAt: LiveMetricsSnapshot["timestamp"];
  snapshot: LiveMetricsSnapshot;
  snapshotReceivedAtMonotonicMs: number;
};

let initialSnapshotRequest: Promise<void> | null = null;

export function selectLiveMetricsSelection(state: LiveMetricsStoreState): LiveMetricsSelection {
  return {
    connectionState: state.connectionState.status,
    isSocketConnected: state.connectionState.status === "connected",
    lastUpdatedAt: state.snapshot.timestamp,
    snapshot: state.snapshot,
    snapshotReceivedAtMonotonicMs: state.snapshotReceivedAtMonotonicMs ?? 0
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
    && current.snapshotReceivedAtMonotonicMs === next.snapshotReceivedAtMonotonicMs
  );
}

export async function loadInitialLiveMetricsSnapshot(
  loadSnapshot: () => Promise<ScopedLiveMetricsSnapshot & { globalSnapshot?: ScopedLiveMetricsSnapshot }> = () =>
    requestJson<ScopedLiveMetricsSnapshot & { globalSnapshot?: ScopedLiveMetricsSnapshot }>("/api/metrics/live")
) {
  const response = await loadSnapshot();
  if (response.globalSnapshot) {
    replaceLiveMetricsSnapshot(response.globalSnapshot);
  }
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
  const selection = useLiveMetricsSelector(
    selectLiveMetricsSelection,
    isLiveMetricsSelectionEqual,
    options
  );
  const appTime = useAppTime();
  if (
    selection.isSocketConnected
    || !selection.snapshot.freshnessPolicy
  ) {
    return selection;
  }
  const monotonicNow =
    typeof performance === "undefined"
      ? selection.snapshotReceivedAtMonotonicMs
      : performance.now();
  const elapsedMs = Math.max(
    0,
    monotonicNow - selection.snapshotReceivedAtMonotonicMs
  );
  return {
    ...selection,
    snapshot: {
      ...selection.snapshot,
      metrics: Object.fromEntries(
        Object.entries(selection.snapshot.metrics).map(([metricKey, reading]) => [
          metricKey,
          reading.freshness
            ? {
                ...reading,
                freshness: resolveClientFreshnessState({
                  connected: false,
                  elapsedMonotonicMs: elapsedMs,
                  policy: selection.snapshot.freshnessPolicy!,
                  serverFreshness: reading.freshness,
                  timeSyncState: appTime.state
                })
              }
            : reading
        ])
      )
    }
  };
}
