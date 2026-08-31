import { useRef, useSyncExternalStore } from "react";
import type { MetricScope } from "@solar-display/shared";
import type { LiveMetricsSnapshot, ScopedLiveMetricsSnapshot, SocketConnectionState } from "../services/socket";

export type LiveMetricsStoreState = {
  connectionState: SocketConnectionState;
  snapshot: LiveMetricsSnapshot;
  snapshotReceivedAtMonotonicMs?: number;
};

type EqualityFn<T> = (current: T, next: T) => boolean;
type StoreListener = () => void;
type Selector<T> = (state: LiveMetricsStoreState) => T;

export type LiveMetricsStore = {
  getState: () => LiveMetricsStoreState;
  setConnectionState: (nextConnectionState: SocketConnectionState) => boolean;
  setSnapshot: (nextSnapshot: ScopedLiveMetricsSnapshot) => boolean;
  subscribe: (listener: StoreListener) => () => void;
};

type LiveMetricsSelectorSubscription<T> = {
  getSnapshot: () => T;
  setEnabled: (enabled: boolean) => void;
  subscribe: (listener: StoreListener) => () => void;
  update: (selector: Selector<T>, isEqual: EqualityFn<T>) => void;
};

const DEFAULT_CONNECTION_STATE: SocketConnectionState = {
  lastError: null,
  lastHeartbeatAt: null,
  status: "connecting",
  transport: null
};

const DEFAULT_SNAPSHOT: LiveMetricsSnapshot = {
  metrics: {},
  timestamp: null
};

function shouldReplaceSnapshot(current: LiveMetricsSnapshot, next: LiveMetricsSnapshot) {
  if (current === next) {
    return false;
  }

  if (current.timestamp === null) {
    return true;
  }

  if (next.timestamp === null) {
    return false;
  }

  return next.timestamp >= current.timestamp;
}

/**
 * Compose the rendered snapshot in a fixed order: global, then the readings
 * delivered because a binding crosses site scope, then the session's own site.
 * Own-site applies last so it wins a metric key collision with a cross-site
 * reading. Cross-site readings deliberately do not participate in the
 * session-level timestamp or freshness policy, which stay own-site semantics.
 */
function composeScopedSnapshot(
  activeSiteScope: "cl" | "kn" | null,
  snapshots: Map<MetricScope, ScopedLiveMetricsSnapshot>,
  foreignSnapshots: Map<"cl" | "kn", ScopedLiveMetricsSnapshot>
): LiveMetricsSnapshot {
  const globalSnapshot = snapshots.get("global");
  const siteSnapshot = activeSiteScope ? snapshots.get(activeSiteScope) : undefined;
  const timestamps = [globalSnapshot?.timestamp, siteSnapshot?.timestamp].filter(
    (timestamp): timestamp is string => timestamp !== null && timestamp !== undefined
  );
  const foreignMetrics: LiveMetricsSnapshot["metrics"] = {};
  for (const foreignScope of ["cl", "kn"] as const) {
    if (foreignScope === activeSiteScope) continue;
    Object.assign(foreignMetrics, foreignSnapshots.get(foreignScope)?.metrics ?? {});
  }
  return {
    freshnessPolicy: siteSnapshot?.freshnessPolicy ?? globalSnapshot?.freshnessPolicy,
    metrics: {
      ...(globalSnapshot?.metrics ?? {}),
      ...foreignMetrics,
      ...(siteSnapshot?.metrics ?? {})
    },
    timestamp: timestamps.length > 0 ? timestamps.sort().at(-1)! : null
  };
}

function createSelectorSubscription<T>(
  store: LiveMetricsStore,
  selector: Selector<T>,
  isEqual: EqualityFn<T>
): LiveMetricsSelectorSubscription<T> {
  let currentSelector = selector;
  let currentIsEqual = isEqual;
  let currentState = store.getState();
  let currentSelected = currentSelector(currentState);
  let enabled = true;
  let unsubscribeFromStore: (() => void) | null = null;
  const listeners = new Set<StoreListener>();

  const syncSnapshot = (nextState = store.getState()) => {
    currentState = nextState;
    const nextSelected = currentSelector(nextState);

    if (!currentIsEqual(currentSelected, nextSelected)) {
      currentSelected = nextSelected;
    }

    return currentSelected;
  };

  const notifyListeners = () => {
    listeners.forEach((listener) => {
      listener();
    });
  };

  const handleStoreChange = () => {
    if (!enabled) {
      return;
    }

    const nextState = store.getState();
    const nextSelected = currentSelector(nextState);
    currentState = nextState;

    if (currentIsEqual(currentSelected, nextSelected)) {
      return;
    }

    currentSelected = nextSelected;
    notifyListeners();
  };

  const syncStoreSubscription = () => {
    const shouldSubscribe = enabled && listeners.size > 0;

    if (!shouldSubscribe) {
      unsubscribeFromStore?.();
      unsubscribeFromStore = null;
      return;
    }

    if (unsubscribeFromStore !== null) {
      return;
    }

    unsubscribeFromStore = store.subscribe(handleStoreChange);
  };

  return {
    getSnapshot() {
      return enabled ? syncSnapshot() : currentSelected;
    },
    setEnabled(nextEnabled) {
      if (enabled === nextEnabled) {
        return;
      }

      if (!nextEnabled) {
        syncSnapshot();
      }

      enabled = nextEnabled;

      if (enabled) {
        syncSnapshot();
      }

      syncStoreSubscription();
    },
    subscribe(listener) {
      listeners.add(listener);
      syncStoreSubscription();

      return () => {
        listeners.delete(listener);
        syncStoreSubscription();
      };
    },
    update(nextSelector, nextIsEqual) {
      currentSelector = nextSelector;
      currentIsEqual = nextIsEqual;
      const nextState = enabled ? store.getState() : currentState;
      syncSnapshot(nextState);
    }
  };
}

export function createLiveMetricsStore(
  initialState: LiveMetricsStoreState = {
    connectionState: DEFAULT_CONNECTION_STATE,
    snapshot: DEFAULT_SNAPSHOT
  }
): LiveMetricsStore {
  let state = initialState;
  let activeSiteScope: "cl" | "kn" | null = null;
  const scopedSnapshots = new Map<MetricScope, ScopedLiveMetricsSnapshot>();
  const foreignSnapshots = new Map<"cl" | "kn", ScopedLiveMetricsSnapshot>();
  const listeners = new Set<StoreListener>();

  const emitChange = () => {
    listeners.forEach((listener) => {
      listener();
    });
  };

  return {
    getState() {
      return state;
    },
    setConnectionState(nextConnectionState) {
      if (state.connectionState === nextConnectionState) {
        return false;
      }

      // Cross-site readings arrive only while a session is authorized for them
      // and never age out on their own, so they must not outlive the connection
      // that delivered them. Reconnecting re-delivers whatever is still
      // authorized; anything that is not simply stops coming back.
      const reconnected =
        nextConnectionState.status === "connected"
        && state.connectionState.status !== "connected"
        && foreignSnapshots.size > 0;
      if (reconnected) {
        foreignSnapshots.clear();
      }

      state = {
        ...state,
        connectionState: nextConnectionState,
        ...(reconnected
          ? { snapshot: composeScopedSnapshot(activeSiteScope, scopedSnapshots, foreignSnapshots) }
          : {})
      };
      emitChange();
      return true;
    },
    setSnapshot(nextSnapshot) {
      // A cross-site payload describes another site's readings that this
      // session was explicitly authorized to see. It must never be mistaken for
      // the session's own site, which is what `activeSiteScope` tracks.
      const isForeignSite = nextSnapshot.foreignSite === true && nextSnapshot.metricScope !== "global";
      const currentScopedSnapshot = isForeignSite
        ? foreignSnapshots.get(nextSnapshot.metricScope as "cl" | "kn")
        : scopedSnapshots.get(nextSnapshot.metricScope);
      if (currentScopedSnapshot && !shouldReplaceSnapshot(currentScopedSnapshot, nextSnapshot)) {
        return false;
      }

      if (isForeignSite) {
        foreignSnapshots.set(nextSnapshot.metricScope as "cl" | "kn", nextSnapshot);
      } else {
        if (nextSnapshot.metricScope !== "global") {
          activeSiteScope = nextSnapshot.metricScope;
          scopedSnapshots.delete(nextSnapshot.metricScope === "cl" ? "kn" : "cl");
          foreignSnapshots.delete(nextSnapshot.metricScope);
        }
        scopedSnapshots.set(nextSnapshot.metricScope, nextSnapshot);
      }

      state = {
        ...state,
        snapshot: composeScopedSnapshot(activeSiteScope, scopedSnapshots, foreignSnapshots),
        snapshotReceivedAtMonotonicMs:
          typeof performance === "undefined" ? 0 : performance.now()
      };
      emitChange();
      return true;
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    }
  };
}

const sharedLiveMetricsStore = createLiveMetricsStore();

export function getLiveMetricsStoreState() {
  return sharedLiveMetricsStore.getState();
}

export function replaceLiveMetricsSnapshot(nextSnapshot: ScopedLiveMetricsSnapshot) {
  return sharedLiveMetricsStore.setSnapshot(nextSnapshot);
}

export function replaceLiveMetricsConnectionState(nextConnectionState: SocketConnectionState) {
  return sharedLiveMetricsStore.setConnectionState(nextConnectionState);
}

export function createLiveMetricsSelectorSubscription<T>(
  store: LiveMetricsStore,
  selector: Selector<T>,
  isEqual: EqualityFn<T> = Object.is
) {
  return createSelectorSubscription(store, selector, isEqual);
}

export function useLiveMetricsStoreSelector<T>(
  selector: Selector<T>,
  isEqual: EqualityFn<T> = Object.is,
  enabled = true
) {
  const subscriptionRef = useRef<LiveMetricsSelectorSubscription<T> | null>(null);

  if (subscriptionRef.current === null) {
    subscriptionRef.current = createSelectorSubscription(sharedLiveMetricsStore, selector, isEqual);
  } else {
    subscriptionRef.current.update(selector, isEqual);
  }
  subscriptionRef.current.setEnabled(enabled);

  return useSyncExternalStore(
    subscriptionRef.current.subscribe,
    subscriptionRef.current.getSnapshot,
    subscriptionRef.current.getSnapshot
  );
}
