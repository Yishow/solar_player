import type { DisplayClientHeartbeat } from "@solar-display/shared";

export type DisplayRuntimeSyncSnapshot = Pick<DisplayClientHeartbeat,
  "runtimeSyncState" | "runtimeSyncPageKey" | "runtimeSyncResolvedAt" | "runtimeSyncError"
>;

const initialSnapshot: DisplayRuntimeSyncSnapshot = {
  runtimeSyncState: "unknown",
  runtimeSyncPageKey: null,
  runtimeSyncResolvedAt: null,
  runtimeSyncError: null
};

let snapshot: DisplayRuntimeSyncSnapshot = { ...initialSnapshot };

export function readDisplayRuntimeSyncSnapshot(): DisplayRuntimeSyncSnapshot {
  return { ...snapshot };
}

export function writeDisplayRuntimeSyncSnapshot(
  update: Partial<DisplayRuntimeSyncSnapshot>
) {
  snapshot = {
    ...snapshot,
    ...update,
    runtimeSyncError: update.runtimeSyncState === "synced"
      ? null
      : update.runtimeSyncError ?? snapshot.runtimeSyncError
  };
}

export function resetDisplayRuntimeSyncSnapshotForTests() {
  snapshot = { ...initialSnapshot };
}
