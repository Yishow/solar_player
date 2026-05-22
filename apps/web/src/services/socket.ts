import type {
  DisplayClientHeartbeat,
  DisplaySyncEvent,
  ManagementSocketSessionClass,
  PlaybackSettingsUpdatedEvent
} from "@solar-display/shared";
import { io, type Socket } from "socket.io-client";
import { routeMetaMap } from "../app/routeMeta";
import { resolveBrowserApiOrigin } from "./api";

export type LiveMetricReading = {
  quality: string | null;
  timestamp: string;
  unit: string | null;
  value: number;
};

export type LiveMetricsSnapshot = {
  metrics: Record<string, LiveMetricReading>;
  timestamp: string | null;
};

export type MqttConnectionStatus = {
  broker: string;
  clientId: string;
  connected: boolean;
  reason: string | null;
  updatedAt: string | null;
};

export type SocketConnectionState = {
  lastError: string | null;
  lastHeartbeatAt: string | null;
  status: "connected" | "connecting" | "disconnected";
  transport: string | null;
};

type ServerToClientEvents = {
  "circuitMetrics:update": LiveMetricsSnapshot;
  "deviceStatus:update": unknown;
  "display:sync": DisplaySyncEvent;
  "images:updated": unknown;
  "liveMetrics:update": LiveMetricsSnapshot;
  "mqtt:status": MqttConnectionStatus;
  "playback:settingsUpdated": PlaybackSettingsUpdatedEvent;
  "system:error": unknown;
  "system:recovered": unknown;
};

type ClientToServerEvents = {
  "client:heartbeat": DisplayClientHeartbeat;
};

let socketClient: Socket | null = null;
let socketSessionClass: ManagementSocketSessionClass | null = null;
let cachedLiveMetrics: LiveMetricsSnapshot = {
  metrics: {},
  timestamp: null
};
let cachedMqttStatus: MqttConnectionStatus = {
  broker: "",
  clientId: "",
  connected: false,
  reason: null,
  updatedAt: null
};
let connectionState: SocketConnectionState = {
  lastError: null,
  lastHeartbeatAt: null,
  status: "connecting",
  transport: null
};

const connectionStateListeners = new Set<(state: SocketConnectionState) => void>();

function notifyConnectionState() {
  connectionStateListeners.forEach((listener) => {
    listener(connectionState);
  });
}

function setConnectionState(next: Partial<SocketConnectionState>) {
  connectionState = {
    ...connectionState,
    ...next
  };
  notifyConnectionState();
}

export function resolveSocketOrigin(locationLike?: {
  hostname: string;
  port: string;
  protocol: string;
}) {
  const configuredBaseUrl = (
    import.meta as ImportMeta & {
      env?: {
        VITE_API_BASE_URL?: string;
      };
    }
  ).env?.VITE_API_BASE_URL;

  if (configuredBaseUrl) {
    return new URL(configuredBaseUrl).origin;
  }

  if (!locationLike && typeof window === "undefined") {
    return "http://localhost:3000";
  }

  return resolveBrowserApiOrigin(locationLike ?? window.location);
}

export function resolveSocketSessionClass(pathname: string): ManagementSocketSessionClass {
  return routeMetaMap.get(pathname)?.group === "management" ? "management-trusted" : "playback-safe";
}

function resolveCurrentSocketSessionClass() {
  if (typeof window === "undefined") {
    return "playback-safe" as const;
  }

  return resolveSocketSessionClass(window.location.pathname);
}

function attachHeartbeat(client: Socket) {
  const syncHeartbeat = () => {
    setConnectionState({
      lastHeartbeatAt: new Date().toISOString(),
      transport: client.io.engine.transport.name
    });
  };

  client.io.engine.on("packet", (packet) => {
    if (packet.type === "ping" || packet.type === "pong") {
      syncHeartbeat();
    }
  });

  client.on("connect", () => {
    syncHeartbeat();
  });
}

function createSocketClient(sessionClass: ManagementSocketSessionClass) {
  const client = io(resolveSocketOrigin(), {
    auth: {
      sessionClass
    },
    path: "/socket.io",
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 8000,
    timeout: 10000,
    transports: ["websocket", "polling"]
  });

  client.on("connect", () => {
    setConnectionState({
      lastError: null,
      status: "connected",
      transport: client.io.engine.transport.name
    });
  });

  client.on("disconnect", (reason) => {
    setConnectionState({
      lastError: reason,
      status: "disconnected"
    });
  });

  client.on("connect_error", (error) => {
    setConnectionState({
      lastError: error.message,
      status: "disconnected"
    });
  });

  client.io.on("reconnect_attempt", () => {
    setConnectionState({
      status: "connecting"
    });
  });

  client.io.on("reconnect", () => {
    setConnectionState({
      lastError: null,
      status: "connected",
      transport: client.io.engine.transport.name
    });
  });

  client.on("liveMetrics:update", (snapshot) => {
    cachedLiveMetrics = snapshot;
  });

  client.on("mqtt:status", (status) => {
    cachedMqttStatus = status;
  });

  attachHeartbeat(client);

  return client;
}

function ensureSocketClient() {
  const nextSessionClass = resolveCurrentSocketSessionClass();

  if (socketClient === null || socketSessionClass !== nextSessionClass) {
    socketClient?.disconnect();
    socketClient = createSocketClient(nextSessionClass);
    socketSessionClass = nextSessionClass;
  }

  return socketClient;
}

export function getSocketClient() {
  return ensureSocketClient();
}

export function getCachedLiveMetrics() {
  return cachedLiveMetrics;
}

export function getCachedMqttStatus() {
  return cachedMqttStatus;
}

export function getSocketConnectionState() {
  return connectionState;
}

export function subscribeConnectionState(listener: (state: SocketConnectionState) => void) {
  connectionStateListeners.add(listener);
  listener(connectionState);

  return () => {
    connectionStateListeners.delete(listener);
  };
}

export function emitClientHeartbeatViaClient(
  client: {
    connected: boolean;
    emit: (event: string, payload: unknown) => unknown;
  },
  payload: DisplayClientHeartbeat
) {
  if (!client.connected) {
    return false;
  }

  client.emit("client:heartbeat", payload);
  return true;
}

export function emitClientHeartbeat(payload: DisplayClientHeartbeat) {
  return emitClientHeartbeatViaClient(ensureSocketClient(), payload);
}

export function subscribeSocketEvent<EventName extends keyof ServerToClientEvents>(
  event: EventName,
  listener: (payload: ServerToClientEvents[EventName]) => void
) {
  const client = ensureSocketClient();
  client.on(event, listener as never);

  return () => {
    client.off(event, listener as never);
  };
}
