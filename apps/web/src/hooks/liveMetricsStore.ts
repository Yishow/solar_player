import { useRef, useSyncExternalStore } from "react";
import type { LiveMetricsSnapshot, SocketConnectionState } from "../services/socket";

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
  setSnapshot: (nextSnapshot: LiveMetricsSnapshot) => boolean;
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

      state = {
        ...state,
        connectionState: nextConnectionState
      };
      emitChange();
      return true;
    },
    setSnapshot(nextSnapshot) {
      if (!shouldReplaceSnapshot(state.snapshot, nextSnapshot)) {
        return false;
      }

      state = {
        ...state,
        snapshot: nextSnapshot,
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

export function replaceLiveMetricsSnapshot(nextSnapshot: LiveMetricsSnapshot) {
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
