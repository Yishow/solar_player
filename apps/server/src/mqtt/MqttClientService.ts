import type Database from "better-sqlite3";
import { randomBytes } from "node:crypto";
import {
  connect,
  type IClientOptions,
  type MqttClient
} from "mqtt";
import { getDatabase } from "../db/index.js";
import { type LiveMetricsSnapshot, readLiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import type { SocketService } from "../realtime/SocketService.js";
import { parse } from "./PayloadParser.js";
import { type MqttSettingsRow, resolveMqttSettings } from "./settings-source.js";

type LoggerLike = {
  debug?: (payload: unknown, message?: string) => void;
  info: (payload: unknown, message?: string) => void;
  warn: (payload: unknown, message?: string) => void;
  error: (payload: unknown, message?: string) => void;
};

type MqttSettingsRecord = MqttSettingsRow;

type TopicMappingRecord = {
  metric_key: string;
  topic: string;
  unit: string | null;
  value_path: string | null;
  multiplier: number | null;
  offset: number | null;
  decimal_places: number | null;
};

type ConnectFunction = typeof connect;

type TestConnectionInput = {
  host: string;
  port: number;
  username: string;
  password: string;
  clientId: string;
  reconnectInterval: number;
  messageTimeout: number;
  dataMode: string;
};

type MqttClientServiceOptions = {
  logger: LoggerLike;
  database?: Database.Database;
  generatedClientIdFn?: () => string;
  connectFn?: ConnectFunction;
  socketService?: Pick<
    SocketService,
    | "emitCircuitMetrics"
    | "emitLiveMetrics"
    | "emitMqttStatus"
    | "emitSystemError"
    | "emitSystemRecovered"
  >;
};

export type MqttStatus = {
  connected: boolean;
  broker: string;
  clientId: string;
  reason: string | null;
  updatedAt: string;
};

const MQTT31_CLIENT_ID_LIMIT = 23;
const TEST_CONNECTION_CLIENT_ID_SUFFIX = "-probe";
const GENERIC_RUNTIME_CLIENT_IDS = new Set(["", "solar-display", "solar-display-player"]);
const RUNTIME_CLIENT_ID_PREFIX = "solar-display-";
const GENERATED_CLIENT_ID_SETTING_KEY = "mqtt_generated_client_id";
const MQTT_RUNTIME_LEASE_SETTING_KEY = "mqtt_runtime_lease";

function waitForEvent(client: MqttClient, options: { timeoutMs: number }) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("MQTT connection timeout"));
    }, options.timeoutMs);

    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      client.off("connect", onConnect);
      client.off("error", onError);
    };

    client.once("connect", onConnect);
    client.once("error", onError);
  });
}

function callClient(
  client: MqttClient,
  operation: "subscribe" | "unsubscribe",
  topics: string[]
) {
  return new Promise<void>((resolve, reject) => {
    if (topics.length === 0) {
      resolve();
      return;
    }

    const callback = (error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    if (operation === "subscribe") {
      client.subscribe(topics, callback);
      return;
    }

    client.unsubscribe(topics, callback);
  });
}

function disconnectClient(client: MqttClient) {
  return new Promise<void>((resolve) => {
    client.end(true, {}, () => {
      resolve();
    });
  });
}

function buildBrokerUrl(settings: Pick<MqttSettingsRecord, "broker_host" | "broker_port">) {
  const host = settings.broker_host?.trim() || "localhost";
  const port = settings.broker_port ?? 1883;
  return `mqtt://${host}:${port}`;
}

function roundValue(value: number, decimalPlaces: number | null) {
  if (decimalPlaces === null || !Number.isFinite(decimalPlaces)) {
    return value;
  }

  return Number(value.toFixed(decimalPlaces));
}

function buildTestConnectionClientId(clientId: string) {
  const normalizedClientId = clientId.trim() || "solar-display-player";
  const maxBaseLength = Math.max(
    MQTT31_CLIENT_ID_LIMIT - TEST_CONNECTION_CLIENT_ID_SUFFIX.length,
    1
  );

  return `${normalizedClientId.slice(0, maxBaseLength)}${TEST_CONNECTION_CLIENT_ID_SUFFIX}`;
}

export class MqttClientService {
  private readonly database: Database.Database;
  private readonly logger: LoggerLike;
  private readonly connectFn: ConnectFunction;
  private readonly generatedClientIdFn: () => string;
  private readonly socketService: MqttClientServiceOptions["socketService"];
  private readonly runtimeLeaseOwnerToken = `${process.pid}-${randomBytes(4).toString("hex")}`;
  private client: MqttClient | null = null;
  private desiredTopics = new Set<string>();
  private activeTopics = new Set<string>();
  private reconnectsEnabled = false;
  private leaseRenewalTimer: NodeJS.Timeout | null = null;
  private leaseRetryTimer: NodeJS.Timeout | null = null;
  private status: MqttStatus = {
    broker: "",
    clientId: "",
    connected: false,
    reason: "offline",
    updatedAt: new Date().toISOString()
  };
  private hasActiveSystemError = false;
  private mockMode = false;

  constructor(options: MqttClientServiceOptions) {
    this.database = options.database ?? getDatabase();
    this.logger = options.logger;
    this.connectFn = options.connectFn ?? connect;
    this.generatedClientIdFn =
      options.generatedClientIdFn
      ?? (() => `${RUNTIME_CLIENT_ID_PREFIX}${randomBytes(4).toString("hex")}`);
    this.socketService = options.socketService;
  }

  async connect() {
    const settings = this.readSettings();
    await this.disconnect({ broadcast: false });

    this.status = {
      broker: `${settings.broker_host ?? "localhost"}:${settings.broker_port ?? 1883}`,
      clientId: settings.client_id ?? "",
      connected: false,
      reason: settings.data_mode === "mock" ? "mock" : "offline",
      updatedAt: new Date().toISOString()
    };
    this.desiredTopics = new Set(await this.loadEnabledTopics());
    this.publishStatus();

    if (settings.data_mode === "mock") {
      this.mockMode = true;
      this.reconnectsEnabled = false;
      return;
    }

    this.mockMode = false;
    const reconnectIntervalMs = Math.max(settings.reconnect_interval ?? 5000, 0);
    this.reconnectsEnabled = reconnectIntervalMs > 0;

    if (!this.acquireRuntimeLease(reconnectIntervalMs)) {
      this.setStatus({
        connected: false,
        reason: "standby"
      });
      this.scheduleLeaseRetry(reconnectIntervalMs);
      return;
    }

    this.startLeaseRenewal(reconnectIntervalMs);

    const client = this.connectFn(buildBrokerUrl(settings), this.buildClientOptions(settings));
    this.client = client;
    this.attachClientHandlers(client);

    try {
      await waitForEvent(client, {
        timeoutMs: Math.max((settings.message_timeout ?? 30) * 1000, 1000)
      });
      this.setStatus({
        connected: true,
        reason: "connected"
      });
      await this.syncSubscriptions();
      this.notifySystemRecovered("MQTT connection restored");
    } catch (error) {
      this.setStatus({
        connected: false,
        reason: error instanceof Error ? error.message : "error"
      });
      this.notifySystemError("MQTT initial connect failed", {
        broker: this.status.broker,
        clientId: this.status.clientId,
        error: error instanceof Error ? error.message : String(error)
      });
      this.stopLeaseRenewal();
      this.releaseRuntimeLease();
      throw error;
    }
  }

  async testConnection(input: TestConnectionInput) {
    if (input.dataMode === "mock") {
      return {
        connected: false,
        message: "Mock mode does not connect to a real broker"
      };
    }

    const settings: MqttSettingsRecord = {
      broker_host: input.host,
      broker_port: input.port,
      username: input.username,
      password: input.password,
      client_id: buildTestConnectionClientId(this.resolveRuntimeClientId(input.clientId)),
      reconnect_interval: input.reconnectInterval,
      message_timeout: input.messageTimeout,
      data_mode: input.dataMode
    };
    const client = this.connectFn(buildBrokerUrl(settings), this.buildClientOptions(settings));

    try {
      await waitForEvent(client, {
        timeoutMs: Math.max(input.messageTimeout * 1000, 1000)
      });
      return {
        connected: true,
        message: "Connected successfully"
      };
    } finally {
      await disconnectClient(client);
    }
  }

  async subscribe(topics: string[]) {
    this.desiredTopics = new Set(
      topics.map((topic) => topic.trim()).filter((topic) => topic.length > 0)
    );

    if (this.mockMode || !this.client || !this.status.connected) {
      return;
    }

    await this.syncSubscriptions();
  }

  async disconnect(options?: { broadcast?: boolean }) {
    this.status.connected = false;
    this.status.reason = this.mockMode ? "mock" : "offline";
    this.status.updatedAt = new Date().toISOString();
    this.reconnectsEnabled = false;
    this.activeTopics.clear();
    this.stopLeaseRenewal();
    this.clearLeaseRetry();
    this.releaseRuntimeLease();

    if (!this.client) {
      if (options?.broadcast !== false) {
        this.publishStatus();
      }
      return;
    }

    const client = this.client;
    this.client = null;
    await disconnectClient(client);

    if (options?.broadcast !== false) {
      this.publishStatus();
    }
  }

  getStatus(): MqttStatus {
    return {
      ...this.status
    };
  }

  private readSettings() {
    const row = this.database
      .prepare(
        `
          SELECT
            broker_host,
            broker_port,
            username,
            password,
            client_id,
            reconnect_interval,
            message_timeout,
            data_mode
          FROM mqtt_settings
          LIMIT 1
        `
      )
      .get() as MqttSettingsRecord | undefined;

    const settings = resolveMqttSettings(process.env, row);

    return {
      ...settings,
      client_id: this.resolveRuntimeClientId(settings.client_id)
    };
  }

  private resolveRuntimeClientId(clientId: string | null | undefined) {
    const normalizedClientId = clientId?.trim() ?? "";
    if (!GENERIC_RUNTIME_CLIENT_IDS.has(normalizedClientId)) {
      return normalizedClientId || "solar-display-player";
    }

    return this.readOrCreateGeneratedClientId();
  }

  private readOrCreateGeneratedClientId() {
    const storedClientId = this.database
      .prepare(
        `
          SELECT value
          FROM system_settings
          WHERE key = ?
          LIMIT 1
        `
      )
      .get(GENERATED_CLIENT_ID_SETTING_KEY) as { value: string | null } | undefined;

    const normalizedStoredClientId = storedClientId?.value?.trim();
    if (normalizedStoredClientId) {
      return normalizedStoredClientId;
    }

    const generatedClientId = this.generatedClientIdFn().trim();
    this.database
      .prepare(
        `
          INSERT INTO system_settings (key, value, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
        `
      )
      .run(GENERATED_CLIENT_ID_SETTING_KEY, generatedClientId);

    return generatedClientId;
  }

  private readRuntimeLease() {
    const row = this.database
      .prepare(
        `
          SELECT value
          FROM system_settings
          WHERE key = ?
          LIMIT 1
        `
      )
      .get(MQTT_RUNTIME_LEASE_SETTING_KEY) as { value: string | null } | undefined;

    const rawLease = row?.value?.trim();
    if (!rawLease) {
      return null;
    }

    try {
      const lease = JSON.parse(rawLease) as {
        acquiredAt?: string;
        expiresAt?: string;
        ownerToken?: string;
        pid?: number;
      };
      if (
        typeof lease.ownerToken !== "string"
        || typeof lease.expiresAt !== "string"
        || typeof lease.acquiredAt !== "string"
      ) {
        return null;
      }

      return {
        acquiredAt: lease.acquiredAt,
        expiresAt: lease.expiresAt,
        ownerToken: lease.ownerToken,
        pid: typeof lease.pid === "number" ? lease.pid : null
      };
    } catch {
      return null;
    }
  }

  private writeRuntimeLease(expiresAt: Date) {
    const existingLease = this.readRuntimeLease();
    const nextLease = JSON.stringify({
      acquiredAt:
        existingLease?.ownerToken === this.runtimeLeaseOwnerToken
          ? existingLease.acquiredAt
          : new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      ownerToken: this.runtimeLeaseOwnerToken,
      pid: process.pid
    });

    this.database
      .prepare(
        `
          INSERT INTO system_settings (key, value, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
        `
      )
      .run(MQTT_RUNTIME_LEASE_SETTING_KEY, nextLease);
  }

  private acquireRuntimeLease(reconnectIntervalMs: number) {
    const nowMs = Date.now();
    const existingLease = this.readRuntimeLease();
    const existingExpiryMs =
      existingLease === null ? null : Date.parse(existingLease.expiresAt);
    const leaseIsActive =
      existingLease !== null
      && existingLease.ownerToken !== this.runtimeLeaseOwnerToken
      && existingExpiryMs !== null
      && existingExpiryMs > nowMs;

    if (leaseIsActive) {
      this.logger.warn(
        {
          activeLease: existingLease,
          broker: this.status.broker,
          clientId: this.status.clientId,
          ownerToken: this.runtimeLeaseOwnerToken
        },
        "MQTT runtime lease already held by another local process"
      );
      return false;
    }

    this.writeRuntimeLease(new Date(nowMs + this.resolveLeaseDurationMs(reconnectIntervalMs)));
    return true;
  }

  private releaseRuntimeLease() {
    const existingLease = this.readRuntimeLease();
    if (existingLease?.ownerToken !== this.runtimeLeaseOwnerToken) {
      return;
    }

    this.database
      .prepare(
        `
          DELETE FROM system_settings
          WHERE key = ?
        `
      )
      .run(MQTT_RUNTIME_LEASE_SETTING_KEY);
  }

  private resolveLeaseDurationMs(reconnectIntervalMs: number) {
    return Math.max(reconnectIntervalMs * 3, 15_000);
  }

  private startLeaseRenewal(reconnectIntervalMs: number) {
    this.stopLeaseRenewal();

    const renewalIntervalMs =
      reconnectIntervalMs > 0 ? Math.min(reconnectIntervalMs, 5_000) : 5_000;
    this.leaseRenewalTimer = setInterval(() => {
      const existingLease = this.readRuntimeLease();
      if (existingLease?.ownerToken !== this.runtimeLeaseOwnerToken) {
        this.logger.error(
          {
            activeLease: existingLease,
            broker: this.status.broker,
            clientId: this.status.clientId,
            ownerToken: this.runtimeLeaseOwnerToken
          },
          "MQTT runtime lease lost to another local process"
        );
        void this.disconnect();
        this.scheduleLeaseRetry(reconnectIntervalMs);
        return;
      }

      this.writeRuntimeLease(new Date(Date.now() + this.resolveLeaseDurationMs(reconnectIntervalMs)));
    }, renewalIntervalMs);
  }

  private stopLeaseRenewal() {
    if (this.leaseRenewalTimer !== null) {
      clearInterval(this.leaseRenewalTimer);
      this.leaseRenewalTimer = null;
    }
  }

  private scheduleLeaseRetry(reconnectIntervalMs: number) {
    if (reconnectIntervalMs <= 0 || this.leaseRetryTimer !== null) {
      return;
    }

    this.leaseRetryTimer = setTimeout(() => {
      this.leaseRetryTimer = null;
      void this.connect().catch((error) => {
        this.logger.warn({ error }, "MQTT standby reconnect attempt failed");
      });
    }, reconnectIntervalMs);
  }

  private clearLeaseRetry() {
    if (this.leaseRetryTimer !== null) {
      clearTimeout(this.leaseRetryTimer);
      this.leaseRetryTimer = null;
    }
  }

  private buildClientOptions(settings: MqttSettingsRecord): IClientOptions {
    return {
      clean: true,
      clientId: settings.client_id ?? undefined,
      connectTimeout: Math.max((settings.message_timeout ?? 30) * 1000, 1000),
      password: settings.password ?? undefined,
      reconnectPeriod: Math.max(settings.reconnect_interval ?? 5000, 0),
      username: settings.username ?? undefined
    };
  }

  private attachClientHandlers(client: MqttClient) {
    client.on("connect", () => {
      this.setStatus({
        connected: true,
        reason: "connected"
      });
      this.notifySystemRecovered("MQTT connection restored");
      void this.syncSubscriptions().catch((error) => {
        this.handleSubscriptionSyncError(error);
      });
    });
    client.on("reconnect", () => {
      this.setStatus({
        connected: false,
        reason: "reconnecting"
      });
      this.logger.debug?.({ broker: this.status.broker }, "MQTT reconnecting");
    });
    client.on("close", () => {
      this.setDisconnectedClientStatus(client);
    });
    client.on("offline", () => {
      this.setDisconnectedClientStatus(client);
    });
    client.on("error", (error) => {
      this.setStatus({
        connected: false,
        reason: error.message
      });
      this.logger.error({ error }, "MQTT client error");
      this.notifySystemError("MQTT client error", {
        broker: this.status.broker,
        clientId: this.status.clientId,
        error: error.message
      });
    });
    client.on("message", (topic, payload) => {
      void this.handleMessage(topic, payload.toString()).catch((error) => {
        this.handleMessageError(topic, error);
      });
    });
  }

  private async syncSubscriptions() {
    if (!this.client || !this.status.connected) {
      return;
    }

    const desiredTopics = [...this.desiredTopics];
    const topicsToRemove = [...this.activeTopics].filter((topic) => !this.desiredTopics.has(topic));
    const topicsToAdd = desiredTopics.filter((topic) => !this.activeTopics.has(topic));

    if (topicsToRemove.length > 0) {
      await callClient(this.client, "unsubscribe", topicsToRemove);
      topicsToRemove.forEach((topic) => {
        this.activeTopics.delete(topic);
      });
    }

    if (topicsToAdd.length > 0) {
      await callClient(this.client, "subscribe", topicsToAdd);
      topicsToAdd.forEach((topic) => {
        this.activeTopics.add(topic);
      });
    }
  }

  private handleSubscriptionSyncError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.setStatus({
      connected: this.client?.connected ?? this.status.connected,
      reason: message
    });
    this.logger.warn(
      {
        broker: this.status.broker,
        clientId: this.status.clientId,
        error
      },
      "MQTT subscription sync failed"
    );
    this.notifySystemError("MQTT subscription sync failed", {
      broker: this.status.broker,
      clientId: this.status.clientId,
      error: message
    });
  }

  private handleMessageError(topic: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(
      {
        broker: this.status.broker,
        clientId: this.status.clientId,
        error,
        topic
      },
      "MQTT message handling failed"
    );
    this.notifySystemError("MQTT message handling failed", {
      broker: this.status.broker,
      clientId: this.status.clientId,
      error: message,
      topic
    });
  }

  private async loadEnabledTopics() {
    const rows = this.database
      .prepare(
        `
          SELECT DISTINCT topic
          FROM topic_mappings
          WHERE enabled = 1 AND TRIM(topic) != ''
        `
      )
      .all() as Array<{ topic: string }>;

    return rows.map((row) => row.topic);
  }

  private async handleMessage(topic: string, rawPayload: string) {
    const mappings = this.database
      .prepare(
        `
          SELECT
            metric_key,
            topic,
            unit,
            value_path,
            multiplier,
            offset,
            decimal_places
          FROM topic_mappings
          WHERE topic = ? AND enabled = 1
        `
      )
      .all(topic) as TopicMappingRecord[];

    if (mappings.length === 0) {
      return;
    }

    const upsertLiveValue = this.database.prepare(`
      INSERT INTO live_metric_values (
        metric_key,
        value,
        unit,
        timestamp,
        quality,
        raw_payload
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
      ON CONFLICT(metric_key) DO UPDATE SET
        value = excluded.value,
        unit = excluded.unit,
        timestamp = CURRENT_TIMESTAMP,
        quality = excluded.quality,
        raw_payload = excluded.raw_payload
    `);

    for (const mapping of mappings) {
      try {
        const parsedPayload = parse(rawPayload, mapping.value_path ?? undefined);
        const adjustedValue =
          parsedPayload.value * (mapping.multiplier ?? 1) + (mapping.offset ?? 0);

        upsertLiveValue.run(
          mapping.metric_key,
          roundValue(adjustedValue, mapping.decimal_places),
          mapping.unit,
          parsedPayload.quality ?? null,
          parsedPayload.raw
        );
      } catch (error) {
        this.logger.warn(
          {
            error,
            metricKey: mapping.metric_key,
            topic
          },
          "Failed to parse MQTT payload"
        );
      }
    }

    const snapshot = readLiveMetricsSnapshot(this.database);
    this.socketService?.emitLiveMetrics(snapshot);

    const circuitMetrics = this.buildCircuitMetricsSnapshot(snapshot, mappings.map((mapping) => mapping.metric_key));
    if (circuitMetrics !== null) {
      this.socketService?.emitCircuitMetrics(circuitMetrics);
    }
  }

  private buildCircuitMetricsSnapshot(
    snapshot: LiveMetricsSnapshot,
    metricKeys: string[]
  ): LiveMetricsSnapshot | null {
    const circuitEntries = metricKeys
      .filter((metricKey) => metricKey.startsWith("factory"))
      .map((metricKey) => [metricKey, snapshot.metrics[metricKey]] as const)
      .filter((entry): entry is [string, LiveMetricsSnapshot["metrics"][string]] => entry[1] !== undefined);

    if (circuitEntries.length === 0) {
      return null;
    }

    return {
      metrics: Object.fromEntries(circuitEntries),
      timestamp: snapshot.timestamp
    };
  }

  private setStatus(next: Pick<MqttStatus, "connected" | "reason">) {
    if (this.status.connected === next.connected && this.status.reason === next.reason) {
      return;
    }

    this.status = {
      ...this.status,
      ...next,
      updatedAt: new Date().toISOString()
    };
    this.publishStatus();
  }

  private setDisconnectedClientStatus(client: MqttClient) {
    this.setStatus({
      connected: false,
      reason: this.client === client && this.reconnectsEnabled ? "reconnecting" : "offline"
    });
  }

  private publishStatus() {
    this.socketService?.emitMqttStatus(this.getStatus());
  }

  private notifySystemError(message: string, details?: Record<string, unknown>) {
    this.hasActiveSystemError = true;
    this.socketService?.emitSystemError({
      details,
      message,
      timestamp: new Date().toISOString()
    });
  }

  private notifySystemRecovered(message: string) {
    if (!this.hasActiveSystemError) {
      return;
    }

    this.hasActiveSystemError = false;
    this.socketService?.emitSystemRecovered({
      message,
      timestamp: new Date().toISOString()
    });
  }
}
