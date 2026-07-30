import assert from "node:assert/strict";
import test from "node:test";
import { SocketService, type MqttStatus } from "./SocketService.js";

type FakeSocketListener = (payload?: unknown) => void;

class FakeSocket {
  disconnectCalls = 0;
  emitted: Array<{ event: string; payload: unknown }> = [];
  handshake: {
    address: string;
    auth: Record<string, unknown>;
    headers: {
      cookie?: string;
    };
  } = {
    address: "10.0.0.42",
    auth: {},
    headers: {
      cookie: "solar_device_credential=credential-a"
    }
  };
  id = "socket-1";
  joinedRooms: string[] = [];
  listeners = new Map<string, FakeSocketListener>();

  emit(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
  }

  disconnect() {
    this.disconnectCalls += 1;
    this.trigger("disconnect");
  }

  join(room: string) {
    this.joinedRooms.push(room);
  }

  on(event: string, listener: FakeSocketListener) {
    this.listeners.set(event, listener);
  }

  trigger(event: string, payload?: unknown) {
    this.listeners.get(event)?.(payload);
  }
}

class FakeIo {
  connectionListener: ((socket: FakeSocket) => void) | null = null;
  emitted: Array<{ event: string; payload: unknown }> = [];
  middleware:
    | ((socket: FakeSocket, next: (error?: Error) => void) => void)
    | null = null;
  rejectedErrors: Error[] = [];

  emit(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
    return true;
  }

  on(event: "connection", listener: (socket: FakeSocket) => void) {
    this.connectionListener = listener;
  }

  use(middleware: (socket: FakeSocket, next: (error?: Error) => void) => void) {
    this.middleware = middleware;
  }

  close(callback?: (error?: Error) => void) {
    callback?.();
  }

  connect(socket: FakeSocket) {
    if (!this.middleware) {
      this.connectionListener?.(socket);
      return;
    }

    this.middleware(socket, (error) => {
      if (error) {
        this.rejectedErrors.push(error);
        return;
      }
      this.connectionListener?.(socket);
    });
  }
}

function createLogger() {
  return {
    debugCalls: [] as unknown[],
    debug(payload: unknown) {
      this.debugCalls.push(payload);
    },
    error() {},
    infoCalls: [] as unknown[],
    info(payload: unknown) {
      this.infoCalls.push(payload);
    },
    warnCalls: [] as unknown[],
    warn(payload: unknown) {
      this.warnCalls.push(payload);
    }
  };
}

function createMqttStatus(): MqttStatus {
  return {
    broker: "mqtt://broker",
    clientId: "socket-service-test",
    connected: true,
    reason: null,
    updatedAt: "2026-05-22T12:00:00.000Z"
  };
}

function createDeviceContext(deviceId = 1) {
  return {
    clientId: `display-${deviceId}`,
    contextRevision: `revision-${deviceId}`,
    deviceId,
    groupId: 10,
    profileId: 20,
    siteScope: "cl" as const
  };
}

const appliedProfileRolloutHeartbeat = {
  appliedVersion: 1,
  desiredVersion: 1,
  updateError: null,
  updateState: "applied" as const
};

function createIdentityAwareService(options: {
  classifySession?: () => "management-trusted" | "playback-safe";
  io: FakeIo;
  logger: ReturnType<typeof createLogger>;
  now: () => Date;
  recordDeviceProfileRolloutHeartbeat?: ConstructorParameters<
    typeof SocketService
  >[0]["recordDeviceProfileRolloutHeartbeat"];
  resolveDisplayClientContext: (credential: unknown) => ReturnType<typeof createDeviceContext>;
}) {
  return new SocketService({
    getLiveMetricsSnapshot: () => ({
      metrics: {},
      timestamp: "2026-05-22T12:00:00.000Z"
    }),
    getMqttStatus: createMqttStatus,
    ...options
  } as ConstructorParameters<typeof SocketService>[0]);
}

test("SocketService stores the Server-authoritative rollout heartbeat state", () => {
  const io = new FakeIo();
  const logger = createLogger();
  const received: unknown[] = [];
  const service = createIdentityAwareService({
    io,
    logger,
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    recordDeviceProfileRolloutHeartbeat(deviceId, heartbeat) {
      received.push({ deviceId, heartbeat });
      return {
        appliedVersion: 1,
        desired: null,
        desiredVersion: 2,
        lastError: "desired version mismatch",
        updatedAt: "2026-05-22T12:00:00.000Z",
        updateState: "failed"
      };
    },
    resolveDisplayClientContext: () => createDeviceContext()
  });
  const socket = new FakeSocket();
  io.connect(socket);
  socket.trigger("client:heartbeat", {
    ...appliedProfileRolloutHeartbeat,
    isPlaying: true,
    pageKey: "overview",
    route: "/overview",
    timeSyncState: "synced"
  });

  assert.equal(received.length, 1);
  assert.equal(received[0] && (received[0] as { deviceId: number }).deviceId, 1);
  assert.deepEqual(
    {
      appliedVersion:
        service.getDisplayClientLivenessSnapshot().clients[0]?.appliedVersion,
      desiredVersion:
        service.getDisplayClientLivenessSnapshot().clients[0]?.desiredVersion,
      profileUpdateError:
        service.getDisplayClientLivenessSnapshot().clients[0]?.profileUpdateError,
      updateState:
        service.getDisplayClientLivenessSnapshot().clients[0]?.updateState
    },
    {
      appliedVersion: 1,
      desiredVersion: 2,
      profileUpdateError: "desired version mismatch",
      updateState: "failed"
    }
  );
});

test("SocketService aggregates child connections under the credential-bound Device identity", () => {
  const io = new FakeIo();
  const logger = createLogger();
  let currentNow = new Date("2026-05-22T12:00:00.000Z");
  const service = createIdentityAwareService({
    io,
    logger,
    now: () => currentNow,
    resolveDisplayClientContext: () => createDeviceContext()
  });
  const firstSocket = new FakeSocket();
  const secondSocket = new FakeSocket();
  secondSocket.id = "socket-2";

  io.connect(firstSocket);
  io.connect(secondSocket);
  currentNow = new Date("2026-05-22T12:00:10.000Z");
  firstSocket.trigger("client:heartbeat", {
    ...appliedProfileRolloutHeartbeat,
    isPlaying: false,
    pageKey: "overview",
    route: "/overview",
    timeSyncState: "waiting"
  });
  currentNow = new Date("2026-05-22T12:00:20.000Z");
  secondSocket.trigger("client:heartbeat", {
    ...appliedProfileRolloutHeartbeat,
    clientId: "claimed-other-device",
    isPlaying: true,
    pageKey: "solar",
    route: "/solar",
    timeSyncState: "synced"
  });

  const snapshot = service.getDisplayClientLivenessSnapshot(currentNow) as {
    clients: Array<Record<string, unknown>>;
  };
  assert.equal(snapshot.clients.length, 1);
  assert.deepEqual(
    {
      clientId: snapshot.clients[0]?.clientId,
      connectedCount: snapshot.clients[0]?.connectedCount,
      deviceId: snapshot.clients[0]?.deviceId,
      isPlaying: snapshot.clients[0]?.isPlaying,
      pageKey: snapshot.clients[0]?.pageKey,
      route: snapshot.clients[0]?.route,
      sourceStatus: snapshot.clients[0]?.sourceStatus
    },
    {
      clientId: "display-1",
      connectedCount: 2,
      deviceId: 1,
      isPlaying: true,
      pageKey: "solar",
      route: "/solar",
      sourceStatus: "same-source"
    }
  );
  assert.equal("remoteAddress" in (snapshot.clients[0] ?? {}), false);
  assert.equal("socketId" in (snapshot.clients[0] ?? {}), false);

  firstSocket.trigger("disconnect");
  assert.equal(
    (service.getDisplayClientLivenessSnapshot(currentNow).clients[0] as unknown as {
      connectedCount: number;
    }).connectedCount,
    1
  );

  secondSocket.trigger("disconnect");
  const disconnected = service.getDisplayClientLivenessSnapshot(currentNow).clients[0] as unknown as {
    connectedCount: number;
    route: string;
    state: string;
  };
  assert.equal(disconnected.connectedCount, 0);
  assert.equal(disconnected.route, "/solar");
  assert.equal(disconnected.state, "offline");
});

test("SocketService emits an immediate ordered Server Time Signal on connection", () => {
  const io = new FakeIo();
  const logger = createLogger();
  const service = createIdentityAwareService({
    io,
    logger,
    now: () => new Date("2026-07-30T08:00:00.000Z"),
    resolveDisplayClientContext: () => createDeviceContext()
  });
  const socket = new FakeSocket();

  io.connect(socket);

  const timeSignal = socket.emitted.find(
    (entry) => entry.event === "server:time"
  )?.payload as Record<string, unknown>;
  assert.deepEqual(
    {
      broadcastIntervalMs: timeSignal.broadcastIntervalMs,
      epochMs: timeSignal.epochMs,
      sequence: timeSignal.sequence,
      timeZone: timeSignal.timeZone
    },
    {
      broadcastIntervalMs: 30_000,
      epochMs: Date.parse("2026-07-30T08:00:00.000Z"),
      sequence: 1,
      timeZone: "Asia/Taipei"
    }
  );
  assert.equal(typeof timeSignal.instanceId, "string");

  void service.close();
});

test("SocketService rejects unknown credentials and disconnects a connection revoked before heartbeat", () => {
  const io = new FakeIo();
  const logger = createLogger();
  let revoked = false;
  const service = createIdentityAwareService({
    io,
    logger,
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    resolveDisplayClientContext: (credential) => {
      if (credential !== "credential-a" || revoked) {
        throw new Error("credential_revoked");
      }
      return createDeviceContext();
    }
  });
  const unknownSocket = new FakeSocket();
  unknownSocket.id = "unknown";
  unknownSocket.handshake.headers.cookie = "solar_device_credential=unknown";

  io.connect(unknownSocket);
  assert.equal(service.getDisplayClientLivenessSnapshot().clients.length, 0);
  assert.equal(io.rejectedErrors.length, 1);
  assert.deepEqual(unknownSocket.joinedRooms, []);
  assert.deepEqual(unknownSocket.emitted, []);

  const socket = new FakeSocket();
  io.connect(socket);
  socket.trigger("client:heartbeat", {
    ...appliedProfileRolloutHeartbeat,
    isPlaying: true,
    pageKey: "solar",
    route: "/solar",
    timeSyncState: "synced"
  });
  socket.trigger("client:heartbeat", {
    isPlaying: "yes",
    pageKey: "overview",
    route: "/overview"
  });
  assert.equal(service.getDisplayClientLivenessSnapshot().clients[0]?.route, "/solar");

  revoked = true;
  socket.trigger("client:heartbeat", {
    isPlaying: false,
    pageKey: "overview",
    route: "/overview"
  });

  assert.equal(socket.disconnectCalls, 1);
  assert.equal(
    (service.getDisplayClientLivenessSnapshot().clients[0] as unknown as {
      connectedCount: number;
      route: string;
    }).connectedCount,
    0
  );
  assert.equal(service.getDisplayClientLivenessSnapshot().clients[0]?.route, "/solar");
});

test("SocketService rejects an unpaired playback socket before the connection event", () => {
  const io = new FakeIo();
  const logger = createLogger();
  const service = createIdentityAwareService({
    io,
    logger,
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    resolveDisplayClientContext: () => {
      throw new Error("device_unpaired");
    }
  });
  const socket = new FakeSocket();
  delete socket.handshake.headers.cookie;

  io.connect(socket);

  assert.equal(io.rejectedErrors.length, 1);
  assert.deepEqual(socket.joinedRooms, []);
  assert.deepEqual(socket.emitted, []);
  assert.equal(service.getDisplayClientLivenessSnapshot().clients.length, 0);
});

test("SocketService keeps management sockets available when a stale Device cookie is present", () => {
  const io = new FakeIo();
  const logger = createLogger();
  const service = createIdentityAwareService({
    classifySession: () => "management-trusted",
    io,
    logger,
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    resolveDisplayClientContext: () => {
      throw new Error("credential_revoked");
    }
  });
  const socket = new FakeSocket();

  io.connect(socket);

  assert.equal(io.rejectedErrors.length, 0);
  assert.deepEqual(socket.joinedRooms, [
    "playback-safe",
    "management-trusted"
  ]);
  assert.equal(service.getDisplayClientLivenessSnapshot().clients.length, 0);
});

test("SocketService warns only after 30 seconds of different-source credential overlap", () => {
  const io = new FakeIo();
  const logger = createLogger();
  let currentNow = new Date("2026-05-22T12:00:00.000Z");
  const service = createIdentityAwareService({
    io,
    logger,
    now: () => currentNow,
    resolveDisplayClientContext: () => createDeviceContext()
  });
  const firstSocket = new FakeSocket();
  const secondSocket = new FakeSocket();
  secondSocket.id = "socket-2";
  secondSocket.handshake.address = "10.0.0.99";

  io.connect(firstSocket);
  io.connect(secondSocket);

  currentNow = new Date("2026-05-22T12:00:29.999Z");
  assert.equal(
    (service.getDisplayClientLivenessSnapshot(currentNow).clients[0] as unknown as {
      duplicateIdentity: boolean;
    }).duplicateIdentity,
    false
  );

  currentNow = new Date("2026-05-22T12:00:30.000Z");
  const duplicate = service.getDisplayClientLivenessSnapshot(currentNow).clients[0] as unknown as {
    duplicateDetectedAt: string | null;
    duplicateIdentity: boolean;
    sourceStatus: string;
  };
  assert.equal(duplicate.duplicateIdentity, true);
  assert.equal(duplicate.duplicateDetectedAt, "2026-05-22T12:00:30.000Z");
  assert.equal(duplicate.sourceStatus, "multi-source");
});

test("SocketService tracks a connected display client heartbeat and retains Device state on disconnect", () => {
  const io = new FakeIo();
  const logger = createLogger();
  let currentNow = new Date("2026-05-22T12:00:00.000Z");
  const service = new SocketService({
    getLiveMetricsSnapshot: () => ({
      metrics: {},
      timestamp: "2026-05-22T12:00:00.000Z"
    }),
    getMqttStatus: createMqttStatus,
    io,
    logger,
    now: () => currentNow,
    resolveDisplayClientContext: () => createDeviceContext()
  });
  const socket = new FakeSocket();

  io.connect(socket);
  currentNow = new Date("2026-05-22T12:00:10.000Z");
  socket.trigger("client:heartbeat", {
    ...appliedProfileRolloutHeartbeat,
    clientTime: "2026-05-22T12:00:05.000Z",
    isIdle: false,
    isPlaying: true,
    pageKey: "solar",
    route: "/solar",
    sessionClass: "playback-safe",
    timeSyncState: "stale",
    viewport: {
      height: 1080,
      width: 1920
    }
  });

  const snapshot = service.getDisplayClientLivenessSnapshot(
    new Date("2026-05-22T12:00:10.000Z")
  );

  assert.deepEqual(snapshot.summary, {
    offline: 0,
    online: 1,
    stale: 0,
    total: 1
  });
  assert.equal(
    (snapshot.clients[0] as unknown as { connectedCount: number }).connectedCount,
    1
  );
  assert.equal(
    (snapshot.clients[0] as unknown as { deviceId: number }).deviceId,
    1
  );
  assert.equal(snapshot.clients[0]?.route, "/solar");
  assert.equal(snapshot.clients[0]?.pageKey, "solar");
  assert.equal(snapshot.clients[0]?.isPlaying, true);
  assert.equal(snapshot.clients[0]?.isIdle, false);
  assert.equal(snapshot.clients[0]?.lastSeenAt, "2026-05-22T12:00:10.000Z");
  assert.equal(snapshot.clients[0]?.timeSyncState, "stale");

  socket.trigger("disconnect");

  assert.deepEqual(service.getDisplayClientLivenessSnapshot().summary, {
    offline: 1,
    online: 0,
    stale: 0,
    total: 1
  });
  assert.equal(service.getDisplayClientLivenessSnapshot().clients[0]?.route, "/solar");
});

test("SocketService accepts only the four required heartbeat Time Sync States", () => {
  const io = new FakeIo();
  const logger = createLogger();
  const service = createIdentityAwareService({
    io,
    logger,
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    resolveDisplayClientContext: () => createDeviceContext()
  });
  const socket = new FakeSocket();
  io.connect(socket);

  for (const timeSyncState of [
    undefined,
    "unknown",
    "waiting",
    "synced",
    "stale",
    "time-untrusted"
  ]) {
    socket.trigger("client:heartbeat", {
      ...appliedProfileRolloutHeartbeat,
      isPlaying: true,
      pageKey: "overview",
      route: `/time/${String(timeSyncState)}`,
      ...(timeSyncState === undefined ? {} : { timeSyncState })
    });
  }

  assert.equal(
    service.getDisplayClientLivenessSnapshot().clients[0]?.route,
    "/time/time-untrusted"
  );
  assert.equal(
    service.getDisplayClientLivenessSnapshot().clients[0]?.timeSyncState,
    "time-untrusted"
  );
  assert.equal(logger.warnCalls.length, 2);
});

test("SocketService ignores heartbeats from an unknown socket and warns on invalid payloads", () => {
  const io = new FakeIo();
  const logger = createLogger();
  const service = new SocketService({
    getLiveMetricsSnapshot: () => ({
      metrics: {},
      timestamp: "2026-05-22T12:00:00.000Z"
    }),
    getMqttStatus: createMqttStatus,
    io,
    logger,
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    resolveDisplayClientContext: () => createDeviceContext()
  });
  const socket = new FakeSocket();

  io.connect(socket);
  socket.trigger("disconnect");

  assert.doesNotThrow(() => {
    socket.trigger("client:heartbeat", {
      clientTime: "2026-05-22T12:00:05.000Z",
      isIdle: false,
      isPlaying: true,
      pageKey: "overview",
      route: "/overview",
      sessionClass: "playback-safe",
      viewport: {
        height: 1080,
        width: 1920
      }
    });
  });
  assert.equal(service.getDisplayClientLivenessSnapshot().clients.length, 1);
  assert.equal(service.getDisplayClientLivenessSnapshot().clients[0]?.pageKey, null);

  const invalidSocket = new FakeSocket();
  invalidSocket.id = "socket-2";
  io.connect(invalidSocket);
  invalidSocket.trigger("client:heartbeat", {
    isIdle: false,
    isPlaying: "yes",
    pageKey: "overview",
    route: "/overview",
    sessionClass: "playback-safe",
    viewport: {
      height: 1080,
      width: 1920
    }
  });

  assert.equal(service.getDisplayClientLivenessSnapshot().clients.length, 1);
  assert.equal(service.getDisplayClientLivenessSnapshot().clients[0]?.pageKey, null);
  assert.equal(logger.warnCalls.length > 0, true);
});

test("SocketService keeps routine client connections out of info logs", () => {
  const io = new FakeIo();
  const logger = createLogger();
  new SocketService({
    getLiveMetricsSnapshot: () => ({
      metrics: {},
      timestamp: "2026-05-22T12:00:00.000Z"
    }),
    getMqttStatus: createMqttStatus,
    io,
    logger,
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    resolveDisplayClientContext: () => createDeviceContext()
  });
  const socket = new FakeSocket();

  io.connect(socket);

  assert.equal(logger.infoCalls.length, 0);
  assert.deepEqual(logger.debugCalls, [
    {
      sessionClass: "playback-safe",
      socketId: "socket-1"
    }
  ]);
});
