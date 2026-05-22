import type { Server as HttpServer } from "node:http";
import { Server as SocketIoServer } from "socket.io";
import {
  buildDisplayClientLivenessSnapshot,
  type DisplayClientHeartbeat,
  type DisplayClientLivenessEntry,
  type DisplayClientLivenessSnapshot,
  type DisplaySyncEvent,
  type ManagementSocketSessionClass
} from "@solar-display/shared";
import type { LiveMetricsSnapshot } from "../metrics/liveMetrics.js";

export type MqttStatus = {
  broker: string;
  clientId: string;
  connected: boolean;
  reason: string | null;
  updatedAt: string;
};

type LoggerLike = {
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
};

type SocketServerLike = {
  emit: (event: string, payload: unknown) => boolean;
  on: (event: "connection", listener: (socket: SocketClientLike) => void) => unknown;
  to?: (room: string) => {
    emit: (event: string, payload: unknown) => boolean;
  };
  close: (callback?: (error?: Error) => void) => void;
};

export type SystemNotification = {
  code?: string;
  details?: Record<string, unknown>;
  message: string;
  timestamp: string;
};

type SocketServiceOptions = {
  classifySession?: (handshake: NonNullable<SocketClientLike["handshake"]>) => ManagementSocketSessionClass;
  corsOrigin?: (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) => void;
  getLiveMetricsSnapshot: () => LiveMetricsSnapshot;
  getMqttStatus: () => MqttStatus;
  io?: SocketServerLike;
  logger: LoggerLike;
  now?: () => Date;
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
  if (typeof candidate.isPlaying !== "boolean" || typeof candidate.isIdle !== "boolean") {
    return false;
  }
  if (
    candidate.sessionClass !== "playback-safe"
    && candidate.sessionClass !== "management-trusted"
  ) {
    return false;
  }
  if (typeof candidate.clientTime !== "string") {
    return false;
  }

  const viewport = candidate.viewport;
  if (typeof viewport !== "object" || viewport === null) {
    return false;
  }

  const viewportWidth = (viewport as Record<string, unknown>).width;
  const viewportHeight = (viewport as Record<string, unknown>).height;
  return typeof viewportWidth === "number" && typeof viewportHeight === "number";
}

export class SocketService {
  private readonly io: SocketServerLike;
  private readonly classifySession;
  private readonly logger: LoggerLike;
  private readonly now: () => Date;
  private readonly displayClientRegistry = new Map<string, DisplayClientLivenessEntry>();
  private liveMetricsSnapshot: LiveMetricsSnapshot;
  private mqttStatus: MqttStatus;

  constructor(options: SocketServiceOptions) {
    this.classifySession = options.classifySession;
    this.logger = options.logger;
    this.now = options.now ?? (() => new Date());
    this.liveMetricsSnapshot = options.getLiveMetricsSnapshot();
    this.mqttStatus = options.getMqttStatus();
    this.io =
      options.io ??
      new SocketIoServer(options.server, {
        cors: {
          origin: options.corsOrigin ?? ((_origin, callback) => callback(null, false))
        },
        pingInterval: 25000,
        pingTimeout: 20000
      });

    this.io.on("connection", (socket) => {
      const sessionClass = socket.handshake
        ? this.classifySession?.(socket.handshake) ?? "playback-safe"
        : "playback-safe";
      const connectedAt = this.now().toISOString();
      const socketId = socket.id;

      socket.join?.("playback-safe");
      if (sessionClass === "management-trusted") {
        socket.join?.("management-trusted");
      }

      if (socketId) {
        this.displayClientRegistry.set(socketId, {
          clientTime: null,
          connected: true,
          connectedAt,
          isIdle: false,
          isPlaying: false,
          lastSeenAt: connectedAt,
          pageKey: null,
          remoteAddress: socket.handshake?.address ?? null,
          route: "/",
          sessionClass,
          socketId,
          viewport: {
            height: 0,
            width: 0
          }
        });
      }

      socket.on?.("client:heartbeat", (payload) => {
        const heartbeatSocketId = socket.id;
        if (!heartbeatSocketId) {
          return;
        }

        const entry = this.displayClientRegistry.get(heartbeatSocketId);
        if (!entry) {
          return;
        }

        if (!isDisplayClientHeartbeat(payload)) {
          this.logger.warn(
            { payload, socketId: heartbeatSocketId },
            "Ignored invalid display client heartbeat payload"
          );
          return;
        }

        this.displayClientRegistry.set(heartbeatSocketId, {
          ...entry,
          clientTime: payload.clientTime,
          isIdle: payload.isIdle,
          isPlaying: payload.isPlaying,
          lastSeenAt: this.now().toISOString(),
          pageKey: payload.pageKey,
          route: payload.route,
          viewport: payload.viewport
        });
      });

      socket.on?.("disconnect", () => {
        if (!socket.id) {
          return;
        }

        this.displayClientRegistry.delete(socket.id);
      });

      this.logger.info({ sessionClass, socketId: socket.id }, "Socket.IO client connected");
      socket.emit("mqtt:status", this.mqttStatus);
      socket.emit("liveMetrics:update", this.liveMetricsSnapshot);
    });
  }

  private emitManagementOnly(event: string, payload: unknown) {
    if (this.io.to) {
      this.io.to("management-trusted").emit(event, payload);
      return;
    }

    this.io.emit(event, payload);
  }

  emitLiveMetrics(data: LiveMetricsSnapshot) {
    this.liveMetricsSnapshot = data;
    this.io.emit("liveMetrics:update", data);
  }

  emitMqttStatus(status: MqttStatus) {
    this.mqttStatus = status;
    this.io.emit("mqtt:status", status);
  }

  emitCircuitMetrics(data: LiveMetricsSnapshot) {
    this.io.emit("circuitMetrics:update", data);
  }

  emitCircuitSettingsUpdated(data: unknown) {
    this.io.emit("circuit:settingsUpdated", data);
  }

  emitPlaybackSettingsUpdated(data: unknown) {
    this.io.emit("playback:settingsUpdated", data);
  }

  emitImagesUpdated(data: unknown) {
    this.io.emit("images:updated", data);
  }

  emitDeviceStatusUpdate(data: unknown) {
    this.emitManagementOnly("deviceStatus:update", data);
  }

  emitDisplaySync(data: DisplaySyncEvent) {
    this.io.emit("display:sync", data);
  }

  getDisplayClientLivenessSnapshot(now = this.now()): DisplayClientLivenessSnapshot {
    return buildDisplayClientLivenessSnapshot(
      [...this.displayClientRegistry.values()],
      now
    );
  }

  emitSystemError(data: SystemNotification) {
    this.emitManagementOnly("system:error", data);
  }

  emitSystemRecovered(data: SystemNotification) {
    this.emitManagementOnly("system:recovered", data);
  }

  async close() {
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
