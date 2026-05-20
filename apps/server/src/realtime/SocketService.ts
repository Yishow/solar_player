import type { Server as HttpServer } from "node:http";
import { Server as SocketIoServer } from "socket.io";
import type { DisplaySyncEvent } from "@solar-display/shared";
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
  id?: string;
};

type SocketServerLike = {
  emit: (event: string, payload: unknown) => boolean;
  on: (event: "connection", listener: (socket: SocketClientLike) => void) => unknown;
  close: (callback?: (error?: Error) => void) => void;
};

export type SystemNotification = {
  code?: string;
  details?: Record<string, unknown>;
  message: string;
  timestamp: string;
};

type SocketServiceOptions = {
  corsOrigin?: (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) => void;
  getLiveMetricsSnapshot: () => LiveMetricsSnapshot;
  getMqttStatus: () => MqttStatus;
  io?: SocketServerLike;
  logger: LoggerLike;
  server?: HttpServer;
};

export class SocketService {
  private readonly io: SocketServerLike;
  private readonly logger: LoggerLike;
  private liveMetricsSnapshot: LiveMetricsSnapshot;
  private mqttStatus: MqttStatus;

  constructor(options: SocketServiceOptions) {
    this.logger = options.logger;
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
      this.logger.info({ socketId: socket.id }, "Socket.IO client connected");
      socket.emit("mqtt:status", this.mqttStatus);
      socket.emit("liveMetrics:update", this.liveMetricsSnapshot);
    });
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
    this.io.emit("deviceStatus:update", data);
  }

  emitDisplaySync(data: DisplaySyncEvent) {
    this.io.emit("display:sync", data);
  }

  emitSystemError(data: SystemNotification) {
    this.io.emit("system:error", data);
  }

  emitSystemRecovered(data: SystemNotification) {
    this.io.emit("system:recovered", data);
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
