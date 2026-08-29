import assert from "node:assert/strict";
import test from "node:test";
import type { SiteScope } from "@solar-display/shared";
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
  leftRooms: string[] = [];
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

  leave(room: string) {
    this.leftRooms.push(room);
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
  connectedSockets = new Set<FakeSocket>();
  socketsByRoom = new Map<string, Set<FakeSocket>>();

  emit(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
    // Real socket.io fans `io.emit` out to every connected socket regardless of
    // room membership; without this the fake cannot tell a broadcast that
    // reaches unidentified sessions from one that silently drops.
    for (const socket of this.connectedSockets) {
      socket.emit(event, payload);
    }
    return true;
  }

  on(event: "connection", listener: (socket: FakeSocket) => void) {
    this.connectionListener = listener;
  }

  to(room: string) {
    return {
      emit: (event: string, payload: unknown) => {
        for (const socket of this.socketsByRoom.get(room) ?? []) {
          socket.emit(event, payload);
        }
        return true;
      }
    };
  }

  use(middleware: (socket: FakeSocket, next: (error?: Error) => void) => void) {
    this.middleware = middleware;
  }

  close(callback?: (error?: Error) => void) {
    callback?.();
  }

  connect(socket: FakeSocket) {
    const join = socket.join.bind(socket);
    socket.join = (room: string) => {
      join(room);
      const sockets = this.socketsByRoom.get(room) ?? new Set<FakeSocket>();
      sockets.add(socket);
      this.socketsByRoom.set(room, sockets);
    };
    const leave = socket.leave.bind(socket);
    socket.leave = (room: string) => {
      leave(room);
      this.socketsByRoom.get(room)?.delete(socket);
    };
    if (!this.middleware) {
      this.connectedSockets.add(socket);
      this.connectionListener?.(socket);
      return;
    }

    this.middleware(socket, (error) => {
      if (error) {
        this.rejectedErrors.push(error);
        return;
      }
      this.connectedSockets.add(socket);
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

function createDeviceContext(deviceId = 1, siteScope: SiteScope = "cl") {
  return {
    clientId: `display-${deviceId}`,
    contextRevision: `revision-${siteScope}-${deviceId}`,
    deviceId,
    groupId: 10,
    profileId: 20,
    siteScope
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
  scheduleInterval?: ConstructorParameters<typeof SocketService>[0]["scheduleInterval"];
  clearScheduledInterval?: ConstructorParameters<typeof SocketService>[0]["clearScheduledInterval"];
}) {
  return new SocketService({
    getLiveMetricsSnapshot: () => ({
      metrics: {},
      timestamp: "2026-05-22T12:00:00.000Z"
    }),
    getMqttStatus: createMqttStatus,
    resolvePlaybackMetricAuthorizationPlan: () => ({
      foreignSiteIdentities: [],
      identities: [],
      revision: "test"
    }),
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

test("CL playback receives only the explicitly authorized KN metric bootstrap and deltas", () => {
  const io = new FakeIo();
  const logger = createLogger();
  const snapshots = {
    cl: { metrics: { localPower: { quality: "good", timestamp: "2026-05-22T12:00:00.000Z", unit: "kW", value: 10 } }, timestamp: "2026-05-22T12:00:00.000Z" },
    global: { metrics: {}, timestamp: "2026-05-22T12:00:00.000Z" },
    kn: {
      metrics: {
        realTimePower: { quality: "good", timestamp: "2026-05-22T12:00:00.000Z", unit: "kW", value: 88 },
        unrelatedKnMetric: { quality: "good", timestamp: "2026-05-22T12:00:00.000Z", unit: "kW", value: 999 }
      },
      timestamp: "2026-05-22T12:00:00.000Z"
    }
  } as const;
  const service = new SocketService({
    getLiveMetricsSnapshot: (metricScope) => snapshots[metricScope],
    getMqttStatus: createMqttStatus,
    io,
    logger,
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    resolveDisplayClientContext: () => createDeviceContext(1, "cl"),
    resolvePlaybackMetricAuthorizationPlan: () => ({
      foreignSiteIdentities: [{ metricKey: "realTimePower", metricScope: "kn" }],
      identities: [{ metricKey: "realTimePower", metricScope: "kn" }],
      revision: "revision-cl-1|overview:2"
    })
  } as ConstructorParameters<typeof SocketService>[0]);
  const socket = new FakeSocket();
  io.connect(socket);

  const knBootstrap = socket.emitted.find(
    ({ event, payload }) =>
      event === "liveMetrics:update"
      && (payload as { metricScope?: string }).metricScope === "kn"
  )?.payload as { metrics: Record<string, unknown> } | undefined;
  assert.deepEqual(Object.keys(knBootstrap?.metrics ?? {}), ["realTimePower"]);

  socket.emitted = [];
  service.emitLiveMetrics("kn", snapshots.kn);
  const knDelta = socket.emitted.find(
    ({ event, payload }) =>
      event === "liveMetrics:update"
      && (payload as { metricScope?: string }).metricScope === "kn"
  )?.payload as { metrics: Record<string, unknown> } | undefined;
  assert.deepEqual(Object.keys(knDelta?.metrics ?? {}), ["realTimePower"]);
});

test("published binding revision removes foreign delivery and clears its cached scope", () => {
  const io = new FakeIo();
  const logger = createLogger();
  const snapshots = {
    cl: { metrics: {}, timestamp: "2026-05-22T12:00:00.000Z" },
    global: { metrics: {}, timestamp: "2026-05-22T12:00:00.000Z" },
    kn: {
      metrics: {
        realTimePower: { quality: "good", timestamp: "2026-05-22T12:00:00.000Z", unit: "kW", value: 88 }
      },
      timestamp: "2026-05-22T12:00:00.000Z"
    }
  } as const;
  let authorization = {
    foreignSiteIdentities: [{ metricKey: "realTimePower", metricScope: "kn" as const }],
    identities: [{ metricKey: "realTimePower", metricScope: "kn" as const }],
    revision: "revision-cl-1|overview:2"
  };
  const service = new SocketService({
    getLiveMetricsSnapshot: (metricScope) => snapshots[metricScope],
    getMqttStatus: createMqttStatus,
    io,
    logger,
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    resolveDisplayClientContext: () => createDeviceContext(1, "cl"),
    resolvePlaybackMetricAuthorizationPlan: () => authorization
  } as ConstructorParameters<typeof SocketService>[0]);
  const socket = new FakeSocket();
  io.connect(socket);
  socket.emitted = [];

  authorization = {
    foreignSiteIdentities: [],
    identities: [],
    revision: "revision-cl-1|overview:3"
  };
  socket.trigger("client:heartbeat", {
    ...appliedProfileRolloutHeartbeat,
    isPlaying: true,
    pageKey: "overview",
    route: "/overview",
    timeSyncState: "synced"
  });

  const knReset = socket.emitted.find(
    ({ event, payload }) =>
      event === "liveMetrics:update"
      && (payload as { metricScope?: string }).metricScope === "kn"
  )?.payload as { metrics: Record<string, unknown> } | undefined;
  assert.deepEqual(knReset?.metrics, {});

  socket.emitted = [];
  service.emitLiveMetrics("kn", snapshots.kn);
  assert.equal(
    socket.emitted.some(
      ({ event, payload }) =>
        event === "liveMetrics:update"
        && (payload as { metricScope?: string }).metricScope === "kn"
    ),
    false
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

test("SocketService broadcasts server time immediately and every 30000 milliseconds", () => {
  const io = new FakeIo();
  let scheduled: (() => void) | undefined;
  const service = createIdentityAwareService({
    io,
    logger: createLogger(),
    now: () => new Date("2026-07-30T08:00:00.000Z"),
    resolveDisplayClientContext: () => createDeviceContext(),
    scheduleInterval(callback, intervalMs) {
      assert.equal(intervalMs, 30_000);
      scheduled = callback;
      return "timer";
    },
    clearScheduledInterval: () => undefined
  });
  const socket = new FakeSocket();
  delete socket.handshake.headers.cookie;
  io.connect(socket);
  assert.equal(socket.emitted.filter(({ event }) => event === "server:time").length, 1);
  assert.deepEqual(socket.joinedRooms, []);

  scheduled?.();
  assert.equal(io.emitted.filter(({ event }) => event === "server:time").length, 1);
  // The unidentified socket joins no room, so only a genuine all-connections
  // broadcast can deliver the periodic signal to it.
  assert.equal(socket.emitted.filter(({ event }) => event === "server:time").length, 2);

  scheduled?.();
  assert.equal(socket.emitted.filter(({ event }) => event === "server:time").length, 3);
  void service.close();
});

test("SocketService identifies invalid credentials as unidentified and disconnects a later revocation", () => {
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
  assert.equal(io.rejectedErrors.length, 0);
  assert.deepEqual(unknownSocket.joinedRooms, []);
  assert.equal(unknownSocket.emitted[0]?.event, "server:time");

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

test("SocketService accepts an unpaired playback socket as unidentified", () => {
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

  assert.equal(io.rejectedErrors.length, 0);
  assert.deepEqual(socket.joinedRooms, []);
  assert.equal(socket.emitted[0]?.event, "server:time");
  assert.doesNotThrow(() => {
    socket.trigger("client:heartbeat", {
      ...appliedProfileRolloutHeartbeat,
      isPlaying: true,
      pageKey: "overview",
      route: "/overview",
      timeSyncState: "synced"
    });
  });
  assert.equal(socket.disconnectCalls, 0);
  assert.equal(service.getDisplayClientLivenessSnapshot().clients.length, 0);
});

test("SocketService downgrades every credential resolution failure to unidentified", () => {
  for (const failure of [
    "credential_revoked",
    "credential_disabled",
    "device_missing",
    "unexpected_failure"
  ]) {
    const io = new FakeIo();
    const service = createIdentityAwareService({
      io,
      logger: createLogger(),
      now: () => new Date("2026-05-22T12:00:00.000Z"),
      resolveDisplayClientContext: () => {
        throw new Error(failure);
      }
    });
    const socket = new FakeSocket();
    io.connect(socket);

    assert.equal(io.rejectedErrors.length, 0, failure);
    assert.deepEqual(socket.joinedRooms, [], failure);
    assert.equal(socket.disconnectCalls, 0, failure);
    assert.equal(service.getDisplayClientLivenessSnapshot().clients.length, 0, failure);
  }
});

test("SocketService puts only identified sessions in the shared broadcast room", () => {
  const io = new FakeIo();
  const service = createIdentityAwareService({
    io,
    logger: createLogger(),
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    resolveDisplayClientContext: () => createDeviceContext()
  });
  const identified = new FakeSocket();
  const unidentified = new FakeSocket();
  unidentified.id = "unidentified";
  delete unidentified.handshake.headers.cookie;
  io.connect(identified);
  io.connect(unidentified);

  assert.deepEqual(identified.joinedRooms, ["identified", "device:1", "site:cl"]);
  assert.deepEqual(unidentified.joinedRooms, []);
  service.close();
});

test("SocketService routes site and global live metrics without cross-site leakage", () => {
  const io = new FakeIo();
  const service = new SocketService({
    getLiveMetricsSnapshot: (metricScope) => ({
      metrics: { bootstrap: { quality: "good", timestamp: "2026-05-22T12:00:00.000Z", unit: null, value: metricScope === "cl" ? 1 : metricScope === "kn" ? 2 : 3 } },
      timestamp: "2026-05-22T12:00:00.000Z"
    }),
    getMqttStatus: createMqttStatus,
    io,
    logger: createLogger(),
    resolveDisplayClientContext: (credential) =>
      credential === "credential-kn"
        ? createDeviceContext(2, "kn")
        : createDeviceContext(1, "cl")
  });
  const cl = new FakeSocket();
  cl.handshake.headers.cookie = "solar_device_credential=credential-cl";
  const kn = new FakeSocket();
  kn.id = "socket-kn";
  kn.handshake.headers.cookie = "solar_device_credential=credential-kn";
  io.connect(cl);
  io.connect(kn);

  const bootstrapScopes = (socket: FakeSocket) => socket.emitted
    .filter((event) => event.event === "liveMetrics:update")
    .map((event) => (event.payload as { metricScope: string }).metricScope);
  assert.deepEqual(bootstrapScopes(cl), ["cl", "global"]);
  assert.deepEqual(bootstrapScopes(kn), ["kn", "global"]);

  cl.emitted = [];
  kn.emitted = [];
  service.emitLiveMetrics("cl", { metrics: {}, timestamp: "2026-05-22T12:01:00.000Z" });
  assert.deepEqual(bootstrapScopes(cl), ["cl"]);
  assert.deepEqual(bootstrapScopes(kn), []);

  service.emitLiveMetrics("global", { metrics: {}, timestamp: "2026-05-22T12:02:00.000Z" });
  assert.deepEqual(bootstrapScopes(cl), ["cl", "global"]);
  assert.deepEqual(bootstrapScopes(kn), ["global"]);

  service.emitLiveMetricsToDevice(2, "cl", {
    metrics: { authorizedCrossSite: { quality: "good", timestamp: "2026-05-22T12:03:00.000Z", unit: "kW", value: 9 } },
    timestamp: "2026-05-22T12:03:00.000Z"
  });
  assert.equal(cl.emitted.some((event) => JSON.stringify(event.payload).includes("authorizedCrossSite")), false);
  assert.equal(kn.emitted.some((event) => JSON.stringify(event.payload).includes("authorizedCrossSite")), true);

  cl.emitted = [];
  kn.emitted = [];
  service.emitCircuitMetrics("cl", {
    metrics: { stampingPower: { quality: "good", timestamp: "2026-05-22T12:04:00.000Z", unit: "kW", value: 12 } },
    timestamp: "2026-05-22T12:04:00.000Z"
  });
  assert.deepEqual(
    cl.emitted
      .filter((event) => event.event === "circuitMetrics:update")
      .map((event) => (event.payload as { metricScope: string }).metricScope),
    ["cl"]
  );
  assert.equal(kn.emitted.some((event) => event.event === "circuitMetrics:update"), false);
  service.close();
});

test("SocketService changes site rooms and sends a fresh scoped bootstrap when context changes", () => {
  const io = new FakeIo();
  let currentSite: SiteScope = "cl";
  const service = createIdentityAwareService({
    io,
    logger: createLogger(),
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    resolveDisplayClientContext: () => createDeviceContext(1, currentSite)
  });
  const socket = new FakeSocket();
  io.connect(socket);
  socket.emitted = [];
  currentSite = "kn";
  socket.trigger("client:heartbeat", {
    ...appliedProfileRolloutHeartbeat,
    isPlaying: true,
    pageKey: "overview",
    route: "/overview",
    timeSyncState: "synced"
  });

  assert.deepEqual(socket.leftRooms, ["site:cl"]);
  assert.equal(socket.joinedRooms.at(-1), "site:kn");
  assert.deepEqual(
    socket.emitted.filter((event) => event.event === "liveMetrics:update").map((event) => (event.payload as { metricScope: string }).metricScope),
    ["kn", "global"]
  );
  service.close();
});

test("SocketService sends only server time to unidentified sessions", () => {
  const io = new FakeIo();
  const service = createIdentityAwareService({
    io,
    logger: createLogger(),
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    resolveDisplayClientContext: () => createDeviceContext()
  });
  const unidentified = new FakeSocket();
  delete unidentified.handshake.headers.cookie;
  io.connect(unidentified);
  unidentified.emitted = [];

  service.emitLiveMetrics("cl", { metrics: {}, timestamp: "2026-05-22T12:00:00.000Z" });
  service.emitMqttStatus(createMqttStatus());
  service.emitCircuitMetrics("cl", { metrics: {}, timestamp: "2026-05-22T12:00:00.000Z" });
  service.emitCircuitSettingsUpdated({});
  service.emitPlaybackSettingsUpdated({});
  service.emitImagesUpdated({});
  service.emitDisplaySync({} as never);
  service.emitDeviceStatusUpdate({});
  service.emitSystemError({ message: "boom", timestamp: "2026-05-22T12:00:00.000Z" });
  service.emitSystemRecovered({ message: "ok", timestamp: "2026-05-22T12:00:00.000Z" });

  assert.deepEqual(unidentified.emitted, []);
  service.close();
});

test("SocketService keeps management-only events out of playback-safe sessions", () => {
  const io = new FakeIo();
  const service = createIdentityAwareService({
    io,
    logger: createLogger(),
    now: () => new Date("2026-05-22T12:00:00.000Z"),
    resolveDisplayClientContext: () => createDeviceContext()
  });
  const playbackSafe = new FakeSocket();
  io.connect(playbackSafe);
  assert.deepEqual(playbackSafe.joinedRooms, ["identified", "device:1", "site:cl"]);
  playbackSafe.emitted = [];

  service.emitDeviceStatusUpdate({});
  service.emitSystemError({ message: "boom", timestamp: "2026-05-22T12:00:00.000Z" });
  service.emitSystemRecovered({ message: "ok", timestamp: "2026-05-22T12:00:00.000Z" });

  assert.deepEqual(playbackSafe.emitted, []);
  service.close();
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
    "identified",
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
