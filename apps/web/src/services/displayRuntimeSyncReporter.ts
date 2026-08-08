import type { DisplayClientHeartbeat } from "@solar-display/shared";

export type DisplayRuntimeSyncSnapshot = Pick<DisplayClientHeartbeat,
  "runtimeSyncState" | "runtimeSyncPageKey" | "runtimeSyncResolvedAt" | "runtimeSyncError"
>;

type ReportedState = NonNullable<DisplayClientHeartbeat["runtimeSyncState"]>;

type PageEntry = {
  error: string | null;
  resolvedAt: string | null;
  sequence: number;
  state: Exclude<ReportedState, "unknown">;
};

const notReported: DisplayRuntimeSyncSnapshot = {
  runtimeSyncState: "unknown",
  runtimeSyncPageKey: null,
  runtimeSyncResolvedAt: null,
  runtimeSyncError: null
};

// One entry per display page runtime source. A single global snapshot would let
// the next page in the rotation overwrite the outcome of the page that failed,
// which is exactly the signal management needs to see.
const entries = new Map<string, PageEntry>();
let sequence = 0;

// Reported before any other state, so that a client with one broken page reads
// as degraded no matter which page happens to be on screen.
const statePriority: Array<PageEntry["state"]> = ["degraded", "loading", "synced"];

export function readDisplayRuntimeSyncSnapshot(): DisplayRuntimeSyncSnapshot {
  for (const state of statePriority) {
    let selectedPageKey: string | null = null;
    let selected: PageEntry | null = null;

    for (const [pageKey, entry] of entries) {
      if (entry.state === state && (selected === null || entry.sequence > selected.sequence)) {
        selectedPageKey = pageKey;
        selected = entry;
      }
    }

    if (selected !== null) {
      return {
        runtimeSyncState: selected.state,
        runtimeSyncPageKey: selectedPageKey,
        runtimeSyncResolvedAt: selected.resolvedAt,
        runtimeSyncError: selected.error
      };
    }
  }

  return { ...notReported };
}

export function writeDisplayRuntimeSyncSnapshot(
  update: Partial<DisplayRuntimeSyncSnapshot>
) {
  const pageKey = update.runtimeSyncPageKey;
  const state = update.runtimeSyncState;
  if (!pageKey || !state || state === "unknown") {
    return;
  }

  const previous = entries.get(pageKey);
  sequence += 1;

  entries.set(pageKey, {
    // The last successful sync stays true regardless of the current state, so
    // both `loading` and `degraded` keep carrying it.
    error: state === "synced" || state === "loading" ? null : update.runtimeSyncError ?? null,
    resolvedAt: state === "synced"
      ? update.runtimeSyncResolvedAt ?? previous?.resolvedAt ?? null
      : previous?.resolvedAt ?? null,
    sequence,
    state
  });
}

export function resetDisplayRuntimeSyncSnapshotForTests() {
  entries.clear();
  sequence = 0;
}
