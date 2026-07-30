import {
  advanceFreshnessWhileOffline,
  type FreshnessPolicy,
  type FreshnessResult,
  type TimeSyncState
} from "@solar-display/shared";

export function resolveClientFreshnessState(input: {
  connected: boolean;
  elapsedMonotonicMs: number;
  policy: FreshnessPolicy;
  serverFreshness: FreshnessResult;
  timeSyncState: TimeSyncState;
}) {
  if (input.connected) {
    return input.serverFreshness;
  }
  return advanceFreshnessWhileOffline({
    elapsedMs: input.elapsedMonotonicMs,
    policy: input.policy,
    snapshot: input.serverFreshness,
    timeTrusted:
      input.timeSyncState === "synced" || input.timeSyncState === "stale"
  });
}
