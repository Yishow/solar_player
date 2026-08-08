import type { IncomingMessage, Server as HttpServer } from "node:http";
import { createHash } from "node:crypto";
import { Server as SocketIoServer } from "socket.io";
import {
  type DisplayClientContext,
  type DisplayClientHeartbeat,
  type DisplayClientLivenessSnapshot,
  type DisplaySyncEvent,
  type DisplaySocketSessionClass,
  type ManagementSocketSessionClass
} from "@solar-display/shared";
import type { LiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import { readDeviceCredentialCookie } from "../plugins/deviceContext.js";
import { DeviceLivenessRegistry } from "../services/deviceLivenessRegistry.js";
import { resolveDisplayClientContext } from "../services/displayClientContextService.js";
import { recordDeviceProfileRolloutHeartbeat } from "../services/deviceProfileRolloutService.js";
import { createServerTimeSignal } from "./serverTimeSignal.js";

export type MqttStatus = {
  broker: string;
  clientId: string;
  connected: boolean;
  reason: string | null;
  updatedAt: string;
};

type LoggerLike = {
  debug?: (payload: unknown, message?: string) => void;
  info: (payload: unknown, message?: string) => void;
  warn: (payload: unknown, message?: string) => void;
  error: (payload: unknown, message?: string) => void;
};

type SocketClientLike = {
  emit: (event: string, payload: unknown) => void;
  handshake?: {
    address?: string;
    auth?: Record<string, unknown>;
    headers: Record<string, string | string[] | undefined>;
  };
  id?: string;
  join?: (room: string) => void;
  on?: (event: string, listener: (payload?: unknown) => void) => void;
  disconnect?: (close?: boolean) => void;
};

type SocketServerLike = {
  emit: (event: string, payload: unknown) => boolean;
  on: (event: "connection", listener: (socket: SocketClientLike) => void) => unknown;
  to: (room: string) => {
    emit: (event: string, payload: unknown) => boolean;
  };
  use?: (
    middleware: (
      socket: SocketClientLike,
      next: (error?: Error) => void
    ) => void
  ) => unknown;
  close: (callback?: (error?: Error) => void) => void;
};

export type SystemNotification = {
  code?: string;
  details?: Record<string, unknown>;
  message: string;
  timestamp: string;
};

type SocketServiceOptions = {
  allowRequest?: (
    req: IncomingMessage,
    fn: (err: string | null | undefined, success: boolean) => void
  ) => void;
  classifySession?: (handshake: NonNullable<SocketClientLike["handshake"]>) => ManagementSocketSessionClass;
  corsOrigin?: (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) => void;
  getLiveMetricsSnapshot: () => LiveMetricsSnapshot;
  getMqttStatus: () => MqttStatus;
  io?: SocketServerLike;
  logger: LoggerLike;
  now?: () => Date;
  recordDeviceProfileRolloutHeartbeat?: typeof recordDeviceProfileRolloutHeartbeat;
  resolveDisplayClientContext?: (credential: unknown) => DisplayClientContext;
  scheduleInterval?: (callback: () => void, intervalMs: number) => unknown;
  clearScheduledInterval?: (timer: unknown) => void;
  server?: HttpServer;
};

function isDisplayClientHeartbeat(payload: unknown): payload is DisplayClientHeartbeat {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.route !== "string") {
    return false;
  }
  if (candidate.pageKey !== null && typeof candidate.pageKey !== "string") {
    return false;
  }
  if (typeof candidate.isPlaying !== "boolean") {
    return false;
  }
  if (
    !(
      candidate.desiredVersion === null
      || (
        Number.isInteger(candidate.desiredVersion)
        && (candidate.desiredVersion as number) > 0
      )
    )
    || !(
      candidate.appliedVersion === null
      || (
        Number.isInteger(candidate.appliedVersion)
        && (candidate.appliedVersion as number) > 0
      )
    )
    || !(
      candidate.updateState === "waiting"
      || candidate.updateState === "applied"
      || candidate.updateState === "failed"
    )
    || !(
      candidate.updateError === undefined
      || candidate.updateError === null
      || typeof candidate.updateError === "string"
    )
  ) {
    return false;
  }
  return (
    candidate.timeSyncState === "waiting"
    || candidate.timeSyncState === "synced"
    || candidate.timeSyncState === "stale"
    || candidate.timeSyncState === "time-untrusted"
  );
}

function normalizeRuntimeSync(payload: Record<string, unknown>) {
  const state = payload.runtimeSyncState;
  if (state !== "unknown" && state !== "loading" && state !== "synced" && state !== "degraded") {
    return { runtimeSyncState: "unknown" as const, runtimeSyncPageKey: null, runtimeSyncResolvedAt: null, runtimeSyncError: null };
  }
  return {
    runtimeSyncState: state as "unknown" | "loading" | "synced" | "degraded",
    runtimeSyncPageKey: typeof payload.runtimeSyncPageKey === "string" ? payload.runtimeSyncPageKey : null,
    runtimeSyncResolvedAt: typeof payload.runtimeSyncResolvedAt === "string" ? payload.runtimeSyncResolvedAt : null,
    runtimeSyncError: state === "synced" ? null : typeof payload.runtimeSyncError === "string" ? payload.runtimeSyncError : null
  };
}

function readHandshakeCookie(
  headers: NonNullable<SocketClientLike["handshake"]>["headers"]
) {
  const cookie = headers.cookie;
  return Array.isArray(cookie) ? cookie.join(";") : cookie;
}

function createSourceFingerprint(address: string | undefined) {
  if (!address) {
    return null;
  }

  const normalized = address.trim().toLowerCase().replace(/^::ffff:/, "");
  if (!normalized) {
    return null;
  }

  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export class SocketService {
  private readonly io: SocketServerLike;
  private readonly classifySession;
  private readonly logger: LoggerLike;
  private readonly now: () => Date;
  private readonly recordDeviceProfileRolloutHeartbeat;
  private readonly authenticatedSocketIdentities =
    new WeakMap<SocketClientLike, DisplayClientContext>();
  private readonly socketSessionClasses =
    new WeakMap<SocketClientLike, DisplaySocketSessionClass>();
  private readonly displayClientRegistry: DeviceLivenessRegistry;
  private readonly resolveDisplayClientContext;
  private readonly stopServerTimeSignalBroadcast: () => void;
  private liveMetricsSnapshot: LiveMetricsSnapshot;
  private mqttStatus: MqttStatus;

  constructor(options: SocketServiceOptions) {
    this.classifySession = options.classifySession;
    this.logger = options.logger;
    this.now = options.now ?? (() => new Date());
    this.recordDeviceProfileRolloutHeartbeat =
      options.recordDeviceProfileRolloutHeartbeat
      ?? ((_deviceId, heartbeat) => ({
        appliedVersion: heartbeat.appliedVersion,
        desired: null,
        desiredVersion: heartbeat.desiredVersion,
        lastError: heartbeat.updateError ?? null,
        updatedAt: null,
        updateState: heartbeat.updateState
      }));
    this.displayClientRegistry = new DeviceLivenessRegistry({
      now: this.now
    });
    this.resolveDisplayClientContext =
      options.resolveDisplayClientContext ?? resolveDisplayClientContext;
    this.liveMetricsSnapshot = options.getLiveMetricsSnapshot();
    this.mqttStatus = options.getMqttStatus();
    this.io =
      options.io ??
      new SocketIoServer(options.server, {
        allowRequest: options.allowRequest,
        cors: {
          origin: options.allowRequest
            ? true
            : options.corsOrigin ?? ((_origin, callback) => callback(null, false))
        },
        pingInterval: 25000,
        pingTimeout: 20000
      });
    const serverTimeSignal = createServerTimeSignal({
      clearScheduledInterval: options.clearScheduledInterval,
      nowEpochMs: () => this.now().getTime(),
      scheduleInterval: options.scheduleInterval
    });
    this.stopServerTimeSignalBroadcast = serverTimeSignal.startBroadcast(
      (payload) => {
        this.broadcastToAll("server:time", payload);
      }
    );

    const authenticateSocket = (
      socket: SocketClientLike,
      sessionClass: DisplaySocketSessionClass
    ) => {
      if (sessionClass === "management-trusted") {
        return null;
      }

      if (sessionClass === "unidentified") {
        return null;
      }

      if (!socket.handshake) {
        throw new Error("Display client Socket handshake is unavailable");
      }

      const cookieHeader = readHandshakeCookie(socket.handshake.headers);
      if (!cookieHeader) {
        throw new Error("Display client Device Credential is required");
      }

      return this.resolveDisplayClientContext(
        readDeviceCredentialCookie(cookieHeader)
      );
    };

    this.io.use?.((socket, next) => {
      const sessionClass = socket.handshake
        ? this.classifySession?.(socket.handshake) ?? "playback-safe"
        : "playback-safe";
      try {
        const identity = authenticateSocket(socket, sessionClass);
        if (identity) {
          this.authenticatedSocketIdentities.set(socket, identity);
        }
        this.socketSessionClasses.set(socket, sessionClass);
        next();
      } catch (error) {
        this.logger.warn(
          { error, socketId: socket.id },
          "Display client Socket identity authentication failed"
        );
        this.socketSessionClasses.set(socket, "unidentified");
        next();
      }
    });

    this.io.on("connection", (socket) => {
      const sessionClass = this.socketSessionClasses.get(socket)
        ?? (socket.handshake
        ? this.classifySession?.(socket.handshake) ?? "playback-safe"
        : "playback-safe");
      const socketId = socket.id;
      let identity = this.authenticatedSocketIdentities.get(socket) ?? null;

      if (!this.io.use) {
        try {
          identity = authenticateSocket(socket, sessionClass);
        } catch (error) {
          this.logger.warn(
            { error, socketId },
            "Display client Socket identity authentication failed"
          );
          this.socketSessionClasses.set(socket, "unidentified");
          identity = null;
        }
      }

      if (identity && sessionClass === "unidentified") {
        identity = null;
      }

      if (!identity && sessionClass === "playback-safe") {
        this.socketSessionClasses.set(socket, "unidentified");
      }

      const effectiveSessionClass = this.socketSessionClasses.get(socket)
        ?? sessionClass;

      if (effectiveSessionClass !== "unidentified") {
        socket.join?.("identified");
      }
      if (effectiveSessionClass === "management-trusted") {
        socket.join?.("management-trusted");
      }

      let authenticatedDeviceId = identity?.deviceId ?? null;
      if (socketId && identity) {
        this.displayClientRegistry.connect({
          connectionId: socketId,
          identity,
          sourceFingerprint: createSourceFingerprint(
            socket.handshake?.address
          )
        });
        socket.join?.(`device:${identity.deviceId}`);
      }

      socket.on?.("client:heartbeat", (payload) => {
        if (effectiveSessionClass === "unidentified") {
          return;
        }
        const heartbeatSocketId = socket.id;
        if (
          !heartbeatSocketId
          || authenticatedDeviceId === null
          || !socket.handshake
        ) {
          return;
        }

        try {
          const currentIdentity = this.resolveDisplayClientContext(
            readDeviceCredentialCookie(
              readHandshakeCookie(socket.handshake.headers)
            )
          );
          if (currentIdentity.deviceId !== authenticatedDeviceId) {
            throw new Error("Socket Device identity changed");
          }
          identity = currentIdentity;
        } catch (error) {
          this.logger.warn(
            { error, socketId: heartbeatSocketId },
            "Display client Socket credential is no longer valid"
          );
          this.displayClientRegistry.disconnect(heartbeatSocketId);
          authenticatedDeviceId = null;
          socket.disconnect?.(true);
          return;
        }

        if (!isDisplayClientHeartbeat(payload)) {
          this.logger.warn(
            { payload, socketId: heartbeatSocketId },
            "Ignored invalid display client heartbeat payload"
          );
          return;
        }

        try {
          const rollout = this.recordDeviceProfileRolloutHeartbeat(
            authenticatedDeviceId,
            payload
          );
          this.displayClientRegistry.heartbeat(
            heartbeatSocketId,
            {
              ...payload,
              ...normalizeRuntimeSync(payload as unknown as Record<string, unknown>),
              appliedVersion: rollout.appliedVersion,
              desiredVersion: rollout.desiredVersion,
              updateError: rollout.lastError,
              updateState: rollout.updateState
            },
            identity ?? undefined
          );
        } catch (error) {
          this.logger.warn(
            { error, socketId: heartbeatSocketId },
            "Ignored invalid Profile rollout heartbeat state"
          );
        }
      });

      socket.on?.("disconnect", () => {
        if (!socket.id) {
          return;
        }

        this.displayClientRegistry.disconnect(socket.id);
      });

      this.logger.debug?.({ sessionClass: effectiveSessionClass, socketId: socket.id }, "Socket.IO client connected");
      serverTimeSignal.emitImmediately((payload) => {
        socket.emit("server:time", payload);
      });
      if (effectiveSessionClass !== "unidentified") {
        socket.emit("mqtt:status", this.mqttStatus);
        socket.emit("liveMetrics:update", this.liveMetricsSnapshot);
      }
    });
  }

  private broadcastToAll(event: string, payload: unknown) {
    this.io.emit(event, payload);
  }

  private broadcastToIdentified(event: string, payload: unknown) {
    this.io.to("identified").emit(event, payload);
  }

  private emitManagementOnly(event: string, payload: unknown) {
    this.io.to("management-trusted").emit(event, payload);
  }

  emitLiveMetrics(data: LiveMetricsSnapshot) {
    this.liveMetricsSnapshot = data;
    this.broadcastToIdentified("liveMetrics:update", data);
  }

  emitMqttStatus(status: MqttStatus) {
    this.mqttStatus = status;
    this.broadcastToIdentified("mqtt:status", status);
  }

  emitCircuitMetrics(data: LiveMetricsSnapshot) {
    this.broadcastToIdentified("circuitMetrics:update", data);
  }

  emitCircuitSettingsUpdated(data: unknown) {
    this.broadcastToIdentified("circuit:settingsUpdated", data);
  }

  emitPlaybackSettingsUpdated(data: unknown) {
    this.broadcastToIdentified("playback:settingsUpdated", data);
  }

  emitImagesUpdated(data: unknown) {
    this.broadcastToIdentified("images:updated", data);
  }

  emitDeviceStatusUpdate(data: unknown) {
    this.emitManagementOnly("deviceStatus:update", data);
  }

  emitDisplaySync(data: DisplaySyncEvent) {
    this.broadcastToIdentified("display:sync", data);
  }

  getDisplayClientLivenessSnapshot(now = this.now()): DisplayClientLivenessSnapshot {
    return this.displayClientRegistry.snapshot(now);
  }

  emitSystemError(data: SystemNotification) {
    this.emitManagementOnly("system:error", data);
  }

  emitSystemRecovered(data: SystemNotification) {
    this.emitManagementOnly("system:recovered", data);
  }

  async close() {
    this.stopServerTimeSignalBroadcast();
    await new Promise<void>((resolve, reject) => {
      const finalize = (error?: Error) => {
        if (error && error.message !== "Server is not running.") {
          reject(error);
          return;
        }

        resolve();
      };

      try {
        this.io.close(finalize);
      } catch (error) {
        if (error instanceof Error && error.message === "Server is not running.") {
          resolve();
          return;
        }

        reject(error);
      }
    });
  }
}
