import type { DisplayClientContext } from "./displayClientContext.js";
import type { TimeSyncState } from "./appTime.js";
import type {
  DeviceProfileRolloutHeartbeat,
  ProfileUpdateState
} from "./deviceProfileRollout.js";

export const DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS = 10_000;
export const DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS = 30;

export type DisplayClientHeartbeat = DeviceProfileRolloutHeartbeat & {
  isPlaying: boolean;
  pageKey: string | null;
  route: string;
  timeSyncState: TimeSyncState;
};

export type DisplayClientLivenessState = "online" | "stale" | "offline";

export type DisplayClientLivenessSourceStatus =
  | "multi-source"
  | "same-source"
  | "source-unknown";

export type DisplayClientLivenessEntry = {
  clientId: string;
  connectedCount: number;
  deviceId: number;
  duplicateDetectedAt: string | null;
  duplicateIdentity: boolean;
  groupId: number;
  isIdle: boolean;
  isPlaying: boolean;
  lastSeenAt: string;
  pageKey: string | null;
  profileId: number;
  appliedVersion: number | null;
  desiredVersion: number | null;
  profileUpdateError: string | null;
  updateState: ProfileUpdateState;
  route: string;
  siteScope: DisplayClientContext["siteScope"];
  sourceStatus: DisplayClientLivenessSourceStatus;
  timeSyncState: TimeSyncState;
  viewport: {
    height: number;
    width: number;
  };
};

export type DisplayClientLivenessSnapshot = {
  clients: Array<
    DisplayClientLivenessEntry & {
      state: DisplayClientLivenessState;
    }
  >;
  summary: {
    offline: number;
    online: number;
    stale: number;
    total: number;
  };
};

export function classifyDisplayClientLiveness(args: {
  connected: boolean;
  lastSeenAt: Date | string;
  now: Date;
  stalenessWindowSeconds?: number;
}): DisplayClientLivenessState {
  if (!args.connected) {
    return "offline";
  }

  const lastSeenAt =
    args.lastSeenAt instanceof Date ? args.lastSeenAt : new Date(args.lastSeenAt);
  const lastSeenAtMs = lastSeenAt.getTime();
  if (!Number.isFinite(lastSeenAtMs)) {
    return "stale";
  }

  const stalenessWindowSeconds =
    args.stalenessWindowSeconds ?? DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS;
  const ageMs = args.now.getTime() - lastSeenAtMs;
  return ageMs <= stalenessWindowSeconds * 1000 ? "online" : "stale";
}

export function buildDisplayClientLivenessSnapshot(
  entries: DisplayClientLivenessEntry[],
  now = new Date()
): DisplayClientLivenessSnapshot {
  const clients = entries
    .map((entry) => ({
      clientId: entry.clientId,
      connectedCount: entry.connectedCount,
      deviceId: entry.deviceId,
      duplicateDetectedAt: entry.duplicateDetectedAt,
      duplicateIdentity: entry.duplicateIdentity,
      groupId: entry.groupId,
      isIdle: entry.isIdle,
      isPlaying: entry.isPlaying,
      lastSeenAt: entry.lastSeenAt,
      pageKey: entry.pageKey,
      profileId: entry.profileId,
      appliedVersion: entry.appliedVersion,
      desiredVersion: entry.desiredVersion,
      profileUpdateError: entry.profileUpdateError,
      route: entry.route,
      siteScope: entry.siteScope,
      sourceStatus: entry.sourceStatus,
      state: classifyDisplayClientLiveness({
        connected: entry.connectedCount > 0,
        lastSeenAt: entry.lastSeenAt,
        now
      }),
      timeSyncState: entry.timeSyncState,
      updateState: entry.updateState,
      viewport: entry.viewport
    }))
    .sort((left, right) => left.deviceId - right.deviceId);

  const summary = clients.reduce(
    (totals, client) => {
      totals[client.state] += 1;
      totals.total += 1;
      return totals;
    },
    {
      offline: 0,
      online: 0,
      stale: 0,
      total: 0
    }
  );

  return {
    clients,
    summary
  };
}
