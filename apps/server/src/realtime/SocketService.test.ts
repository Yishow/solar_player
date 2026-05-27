import assert from "node:assert/strict";
import test from "node:test";
import { SocketService, type MqttStatus } from "./SocketService.js";

type FakeSocketListener = (payload?: unknown) => void;

class FakeSocket {
  emitted: Array<{ event: string; payload: unknown }> = [];
  handshake = {
    address: "10.0.0.42",
    auth: {},
    headers: {}
  };
  id = "socket-1";
  joinedRooms: string[] = [];
  listeners = new Map<string, FakeSocketListener>();

  emit(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
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

  emit(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
    return true;
  }

  on(event: "connection", listener: (socket: FakeSocket) => void) {
    this.connectionListener = listener;
  }

  close(callback?: (error?: Error) => void) {
    callback?.();
  }

  connect(socket: FakeSocket) {
    this.connectionListener?.(socket);
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

test("SocketService tracks a connected display client heartbeat and removes it on disconnect", () => {
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
    now: () => currentNow
  });
  const socket = new FakeSocket();

  io.connect(socket);
  currentNow = new Date("2026-05-22T12:00:10.000Z");
  socket.trigger("client:heartbeat", {
    clientTime: "2026-05-22T12:00:05.000Z",
    isIdle: false,
    isPlaying: true,
    pageKey: "solar",
    route: "/solar",
    sessionClass: "playback-safe",
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
  assert.equal(snapshot.clients[0]?.socketId, "socket-1");
  assert.equal(snapshot.clients[0]?.remoteAddress, "10.0.0.42");
  assert.equal(snapshot.clients[0]?.route, "/solar");
  assert.equal(snapshot.clients[0]?.pageKey, "solar");
  assert.equal(snapshot.clients[0]?.isPlaying, true);
  assert.equal(snapshot.clients[0]?.isIdle, false);
  assert.equal(snapshot.clients[0]?.lastSeenAt, "2026-05-22T12:00:10.000Z");
  assert.equal(snapshot.clients[0]?.clientTime, "2026-05-22T12:00:05.000Z");

  socket.trigger("disconnect");

  assert.deepEqual(service.getDisplayClientLivenessSnapshot().summary, {
    offline: 0,
    online: 0,
    stale: 0,
    total: 0
  });
  assert.equal(service.getDisplayClientLivenessSnapshot().clients.length, 0);
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
    now: () => new Date("2026-05-22T12:00:00.000Z")
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
  assert.equal(service.getDisplayClientLivenessSnapshot().clients.length, 0);

  const invalidSocket = new FakeSocket();
  invalidSocket.id = "socket-2";
  io.connect(invalidSocket);
  invalidSocket.trigger("client:heartbeat", {
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
    now: () => new Date("2026-05-22T12:00:00.000Z")
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
