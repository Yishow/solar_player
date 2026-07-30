export const SERVER_TIME_BROADCAST_INTERVAL_MS = 30_000;
export const SERVER_TIME_STALE_AFTER_MS = 90_000;
export const SERVER_TIME_UNTRUSTED_AFTER_MS = 1_800_000;
export const SERVER_TIME_ZONE = "Asia/Taipei";

export type TimeSyncState =
  | "stale"
  | "synced"
  | "time-untrusted"
  | "waiting";

export type ServerTimeSignal = {
  broadcastIntervalMs: typeof SERVER_TIME_BROADCAST_INTERVAL_MS;
  epochMs: number;
  instanceId: string;
  sequence: number;
  timeZone: typeof SERVER_TIME_ZONE;
};

export type AppTimeSnapshot = {
  lastSignalMonotonicMs: number | null;
  nowEpochMs: number | null;
  state: TimeSyncState;
};

export function isServerTimeSignal(value: unknown): value is ServerTimeSignal {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.broadcastIntervalMs === SERVER_TIME_BROADCAST_INTERVAL_MS
    && typeof candidate.epochMs === "number"
    && Number.isFinite(candidate.epochMs)
    && typeof candidate.instanceId === "string"
    && candidate.instanceId.length > 0
    && typeof candidate.sequence === "number"
    && Number.isInteger(candidate.sequence)
    && candidate.sequence > 0
    && candidate.timeZone === SERVER_TIME_ZONE
  );
}

export function classifyTimeSyncState(
  lastSignalMonotonicMs: number | null,
  monotonicNowMs: number
): TimeSyncState {
  if (lastSignalMonotonicMs === null) {
    return "waiting";
  }

  const elapsedMs = Math.max(0, monotonicNowMs - lastSignalMonotonicMs);
  if (elapsedMs >= SERVER_TIME_UNTRUSTED_AFTER_MS) {
    return "time-untrusted";
  }
  if (elapsedMs >= SERVER_TIME_STALE_AFTER_MS) {
    return "stale";
  }
  return "synced";
}
