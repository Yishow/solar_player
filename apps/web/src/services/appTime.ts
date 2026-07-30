import {
  classifyTimeSyncState,
  isServerTimeSignal,
  type AppTimeSnapshot
} from "@solar-display/shared";

type AppTimeStoreOptions = {
  monotonicNow?: () => number;
};

type AcceptedTimeBase = {
  epochMs: number;
  instanceId: string;
  receivedMonotonicMs: number;
  sequence: number;
};

export function createAppTimeStore(options: AppTimeStoreOptions = {}) {
  const monotonicNow =
    options.monotonicNow
    ?? (() => performance.now());
  let accepted: AcceptedTimeBase | null = null;
  const listeners = new Set<() => void>();

  return {
    acceptSignal(value: unknown) {
      if (!isServerTimeSignal(value)) {
        return false;
      }
      if (
        accepted?.instanceId === value.instanceId
        && value.sequence <= accepted.sequence
      ) {
        return false;
      }

      accepted = {
        epochMs: value.epochMs,
        instanceId: value.instanceId,
        receivedMonotonicMs: monotonicNow(),
        sequence: value.sequence
      };
      listeners.forEach((listener) => listener());
      return true;
    },
    getSnapshot(): AppTimeSnapshot {
      const currentMonotonicMs = monotonicNow();
      if (!accepted) {
        return {
          lastSignalMonotonicMs: null,
          nowEpochMs: null,
          state: "waiting"
        };
      }

      return {
        lastSignalMonotonicMs: accepted.receivedMonotonicMs,
        nowEpochMs:
          accepted.epochMs
          + Math.max(0, currentMonotonicMs - accepted.receivedMonotonicMs),
        state: classifyTimeSyncState(
          accepted.receivedMonotonicMs,
          currentMonotonicMs
        )
      };
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}

const appTimeStore = createAppTimeStore();

export function acceptServerTimeSignal(signal: unknown) {
  return appTimeStore.acceptSignal(signal);
}

export function getAppTimeSnapshot() {
  return appTimeStore.getSnapshot();
}

export function subscribeAppTime(listener: () => void) {
  return appTimeStore.subscribe(listener);
}
