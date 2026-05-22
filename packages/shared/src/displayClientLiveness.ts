import type { ManagementSocketSessionClass } from "./managementAccess.js";

export const DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS = 10_000;
export const DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS = 30;

export type DisplayClientHeartbeat = {
  clientTime: string | null;
  isIdle: boolean;
  isPlaying: boolean;
  pageKey: string | null;
  route: string;
  sessionClass: ManagementSocketSessionClass;
  viewport: {
    height: number;
    width: number;
  };
};

export type DisplayClientLivenessState = "online" | "stale" | "offline";

export type DisplayClientLivenessEntry = DisplayClientHeartbeat & {
  connected: boolean;
  connectedAt: string;
  lastSeenAt: string;
  remoteAddress: string | null;
  socketId: string;
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
  const clients = entries.map((entry) => ({
    ...entry,
    state: classifyDisplayClientLiveness({
      connected: entry.connected,
      lastSeenAt: entry.lastSeenAt,
      now
    })
  }));

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
