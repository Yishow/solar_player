import {
  buildDisplayClientLivenessSnapshot,
  DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS,
  type DisplayClientContext,
  type DisplayClientHeartbeat,
  type DisplayClientLivenessEntry,
  type DisplayClientLivenessSnapshot,
  type DisplayClientLivenessSourceStatus
} from "@solar-display/shared";

const DUPLICATE_IDENTITY_THRESHOLD_MS = 30_000;
const DEVICE_RETENTION_MS =
  DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS * 1000;

type DeviceConnection = {
  connectedAt: string;
  connectionId: string;
  lastHeartbeatAt: string | null;
  sourceFingerprint: string | null;
};

type DeviceRecord = {
  connections: Map<string, DeviceConnection>;
  duplicateDetectedAt: string | null;
  duplicateEpisodeDetected: boolean;
  identity: DisplayClientContext;
  isIdle: boolean;
  isPlaying: boolean;
  appliedVersion: number | null;
  desiredVersion: number | null;
  lastSeenAt: string;
  multiSourceSince: string | null;
  pageKey: string | null;
  route: string;
  profileUpdateError: string | null;
  timeSyncState: DisplayClientHeartbeat["timeSyncState"];
  runtimeSyncState: DisplayClientHeartbeat["runtimeSyncState"];
  runtimeSyncPageKey: string | null;
  runtimeSyncResolvedAt: string | null;
  runtimeSyncError: string | null;
  updateState: DisplayClientHeartbeat["updateState"];
  viewport: {
    height: number;
    width: number;
  };
};

type DeviceLivenessRegistryOptions = {
  now?: () => Date;
};

function resolveSourceStatus(
  connections: Iterable<DeviceConnection>
): DisplayClientLivenessSourceStatus {
  const sourceFingerprints = new Set<string>();
  let connectionCount = 0;
  for (const connection of connections) {
    connectionCount += 1;
    if (connection.sourceFingerprint === null) {
      return "source-unknown";
    }
    sourceFingerprints.add(connection.sourceFingerprint);
  }

  if (connectionCount === 0) {
    return "source-unknown";
  }

  return sourceFingerprints.size > 1 ? "multi-source" : "same-source";
}

export class DeviceLivenessRegistry {
  private readonly connections = new Map<string, number>();
  private readonly devices = new Map<number, DeviceRecord>();
  private readonly now: () => Date;

  constructor(options: DeviceLivenessRegistryOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  connect(args: {
    connectionId: string;
    identity: DisplayClientContext;
    sourceFingerprint: string | null;
  }) {
    const connectedAt = this.now().toISOString();
    const device = this.devices.get(args.identity.deviceId) ?? {
      connections: new Map<string, DeviceConnection>(),
      appliedVersion: null,
      duplicateDetectedAt: null,
      duplicateEpisodeDetected: false,
      desiredVersion: null,
      identity: args.identity,
      isIdle: false,
      isPlaying: false,
      lastSeenAt: connectedAt,
      multiSourceSince: null,
      pageKey: null,
      profileUpdateError: null,
      route: "/",
      timeSyncState: "waiting",
      runtimeSyncState: "unknown",
      runtimeSyncPageKey: null,
      runtimeSyncResolvedAt: null,
      runtimeSyncError: null,
      updateState: "waiting",
      viewport: {
        height: 0,
        width: 0
      }
    };

    device.connections.set(args.connectionId, {
      connectedAt,
      connectionId: args.connectionId,
      lastHeartbeatAt: null,
      sourceFingerprint: args.sourceFingerprint
    });
    device.identity = args.identity;
    device.lastSeenAt = connectedAt;
    this.connections.set(args.connectionId, args.identity.deviceId);
    this.devices.set(args.identity.deviceId, device);
    this.refreshMultiSourceSince(device, connectedAt);
  }

  heartbeat(
    connectionId: string,
    payload: DisplayClientHeartbeat,
    identity?: DisplayClientContext
  ) {
    const deviceId = this.connections.get(connectionId);
    if (deviceId === undefined) {
      return false;
    }

    const device = this.devices.get(deviceId);
    const connection = device?.connections.get(connectionId);
    if (!device || !connection) {
      return false;
    }

    const heartbeatAt = this.now().toISOString();
    connection.lastHeartbeatAt = heartbeatAt;
    if (identity?.deviceId === deviceId) {
      device.identity = identity;
    }
    device.isPlaying = payload.isPlaying;
    device.appliedVersion = payload.appliedVersion;
    device.desiredVersion = payload.desiredVersion;
    device.lastSeenAt = heartbeatAt;
    device.pageKey = payload.pageKey;
    device.route = payload.route;
    device.profileUpdateError = payload.updateError ?? null;
    device.timeSyncState = payload.timeSyncState;
    device.runtimeSyncState = payload.runtimeSyncState ?? "unknown";
    device.runtimeSyncPageKey = payload.runtimeSyncPageKey ?? null;
    device.runtimeSyncResolvedAt = payload.runtimeSyncResolvedAt ?? null;
    device.runtimeSyncError = payload.runtimeSyncError ?? null;
    device.updateState = payload.updateState;
    return true;
  }

  disconnect(connectionId: string) {
    const deviceId = this.connections.get(connectionId);
    if (deviceId === undefined) {
      return false;
    }

    this.connections.delete(connectionId);
    const device = this.devices.get(deviceId);
    if (!device) {
      return false;
    }

    device.connections.delete(connectionId);
    this.refreshMultiSourceSince(device, this.now().toISOString());
    return true;
  }

  snapshot(now = this.now()): DisplayClientLivenessSnapshot {
    this.pruneExpiredDevices(now);
    return buildDisplayClientLivenessSnapshot(
      [...this.devices.values()].map((device) =>
        this.toSnapshotEntry(device, now)
      ),
      now
    );
  }

  private pruneExpiredDevices(now: Date) {
    for (const [deviceId, device] of this.devices) {
      if (
        device.connections.size === 0
        && now.getTime() - new Date(device.lastSeenAt).getTime() > DEVICE_RETENTION_MS
      ) {
        this.devices.delete(deviceId);
      }
    }
  }

  private refreshMultiSourceSince(device: DeviceRecord, timestamp: string) {
    const sourceStatus = resolveSourceStatus(device.connections.values());
    if (sourceStatus !== "multi-source") {
      device.multiSourceSince = null;
      device.duplicateEpisodeDetected = false;
      return;
    }

    if (device.multiSourceSince === null) {
      device.multiSourceSince = timestamp;
      device.duplicateEpisodeDetected = false;
    }
  }

  private toSnapshotEntry(
    device: DeviceRecord,
    now: Date
  ): DisplayClientLivenessEntry {
    const sourceStatus = resolveSourceStatus(device.connections.values());
    const duplicateIdentity =
      sourceStatus === "multi-source"
      && device.multiSourceSince !== null
      && now.getTime() - new Date(device.multiSourceSince).getTime()
        >= DUPLICATE_IDENTITY_THRESHOLD_MS;

    if (duplicateIdentity && !device.duplicateEpisodeDetected) {
      device.duplicateDetectedAt = now.toISOString();
      device.duplicateEpisodeDetected = true;
    }

    return {
      clientId: device.identity.clientId,
      appliedVersion: device.appliedVersion,
      connectedCount: device.connections.size,
      deviceId: device.identity.deviceId,
      duplicateDetectedAt: device.duplicateDetectedAt,
      duplicateIdentity,
      desiredVersion: device.desiredVersion,
      groupId: device.identity.groupId,
      isIdle: device.isIdle,
      isPlaying: device.isPlaying,
      lastSeenAt: device.lastSeenAt,
      pageKey: device.pageKey,
      profileId: device.identity.profileId,
      profileUpdateError: device.profileUpdateError,
      route: device.route,
      siteScope: device.identity.siteScope,
      sourceStatus,
      timeSyncState: device.timeSyncState,
      runtimeSyncState: device.runtimeSyncState,
      runtimeSyncPageKey: device.runtimeSyncPageKey,
      runtimeSyncResolvedAt: device.runtimeSyncResolvedAt,
      runtimeSyncError: device.runtimeSyncError,
      updateState: device.updateState,
      viewport: device.viewport
    };
  }
}
