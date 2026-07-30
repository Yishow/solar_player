import { randomUUID } from "node:crypto";
import {
  SERVER_TIME_BROADCAST_INTERVAL_MS,
  SERVER_TIME_ZONE,
  type ServerTimeSignal
} from "@solar-display/shared";

type ServerTimeSignalOptions = {
  clearScheduledInterval?: (timer: unknown) => void;
  createInstanceId?: () => string;
  nowEpochMs?: () => number;
  scheduleInterval?: (callback: () => void, intervalMs: number) => unknown;
};

export function createServerTimeSignal(
  options: ServerTimeSignalOptions = {}
) {
  const instanceId = (options.createInstanceId ?? randomUUID)();
  const nowEpochMs = options.nowEpochMs ?? Date.now;
  let sequence = 0;

  const createSignal = (): ServerTimeSignal => ({
    broadcastIntervalMs: SERVER_TIME_BROADCAST_INTERVAL_MS,
    epochMs: nowEpochMs(),
    instanceId,
    sequence: ++sequence,
    timeZone: SERVER_TIME_ZONE
  });

  return {
    emitImmediately(emit: (payload: ServerTimeSignal) => void) {
      emit(createSignal());
    },
    startBroadcast(emit: (payload: ServerTimeSignal) => void) {
      const scheduleInterval = options.scheduleInterval ?? setInterval;
      const clearScheduledInterval =
        options.clearScheduledInterval
        ?? ((timer: unknown) => {
          clearInterval(timer as ReturnType<typeof setInterval>);
        });
      const timer = scheduleInterval(() => {
        emit(createSignal());
      }, SERVER_TIME_BROADCAST_INTERVAL_MS);
      (timer as { unref?: () => void }).unref?.();

      return () => {
        clearScheduledInterval(timer);
      };
    }
  };
}
