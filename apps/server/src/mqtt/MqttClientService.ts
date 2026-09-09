import type Database from "better-sqlite3";
import { randomBytes } from "node:crypto";
import {
  hasLiveMetricRequirementsData,
  resolveLiveMetricRequirementsForPage,
  type DisplayPageTemplateKey,
  type GuidedMappingReception,
  type MeterReadingChangeEvent
} from "@solar-display/shared";
import type { MetricScope } from "@solar-display/shared";
import {
  connect,
  type IClientOptions,
  type IPublishPacket,
  type MqttClient
} from "mqtt";
import {
  ingestMappedMeterReading,
  type MappedMeterIngestResult
} from "../services/mqttMeterIngest.js";
import {
  PowerReceptionEvidenceStore,
  type PowerReceptionSourceIdentity
} from "./powerReceptionEvidence.js";
import { tapProductionObservation } from "../services/mqttObservationCatalogService.js";
import {
  decideReviewedPowerObservation,
  type PersistedLivePowerObservation
} from "./reviewedPowerObservationOrdering.js";
import { matchesMqttTopicFilter } from "./topicFilter.js";
import { getDatabase } from "../db/index.js";
import {
  type LiveMetricsSnapshot,
  readAuthoritativeScopedLiveMetricsSnapshot,
  readScopedLiveMetricsSnapshot
} from "../metrics/liveMetrics.js";
import type { SocketService } from "../realtime/SocketService.js";
import { updateFactoryGenerationAggregate } from "../services/factoryGenerationAggregateService.js";
import {
  evaluateDerivedMetrics,
  type DerivedMetricChange
} from "../services/derivedMetricRegistryService.js";
import type { ManagedSourceAdapter } from "./ManagedSourceAdapter.js";
import { parse } from "./PayloadParser.js";
import {
  SolarSourceAdapter,
  type SolarMetricMessage
} from "./SolarSourceAdapter.js";
import { type MqttSettingsRow, resolveMqttSettings } from "./settings-source.js";

type LoggerLike = {
  debug?: (payload: unknown, message?: string) => void;
  info: (payload: unknown, message?: string) => void;
  warn: (payload: unknown, message?: string) => void;
  error: (payload: unknown, message?: string) => void;
};

type MqttSettingsRecord = MqttSettingsRow;

type TopicMappingRecord = {
  metric_scope: MetricScope;
  metric_key: string;
  topic: string;
  unit: string | null;
  value_path: string | null;
  selector_json: string | null;
  multiplier: number | null;
  offset: number | null;
  decimal_places: number | null;
};

type ConnectFunction = typeof connect;
type ProcessAliveFunction = (pid: number) => boolean;

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

export type MqttClientServiceOptions = {
  connectionRef?: string;
  logger: LoggerLike;
  database?: Database.Database;
  generatedClientIdFn?: () => string;
  connectFn?: ConnectFunction;
  managedSourceAdapters?: readonly ManagedSourceAdapter[];
  runtimeProcessAliveFn?: ProcessAliveFunction;
  socketService?: Pick<
    SocketService,
    | "emitCircuitMetrics"
    | "emitDisplaySync"
    | "emitLiveMetrics"
    | "emitMqttStatus"
    | "emitSystemError"
    | "emitSystemRecovered"
  >;
  meterReadingEventSink?: (event: MeterReadingChangeEvent) => void;
};

export type MqttStatus = {
  connected: boolean;
  broker: string;
  clientId: string;
  reason: string | null;
  updatedAt: string;
};

export type MqttPublishResult =
  | {
      mode: "mock" | "mqtt";
      payload: string;
      success: true;
      topic: string;
    }
  | {
      message: string;
      payload: string;
      reason: "disconnected" | "publish-error";
      success: false;
      topic: string;
    };

const MQTT31_CLIENT_ID_LIMIT = 23;
const TEST_CONNECTION_CLIENT_ID_SUFFIX = "-probe";
const GENERIC_RUNTIME_CLIENT_IDS = new Set(["", "solar-display", "solar-display-player"]);
const RUNTIME_CLIENT_ID_PREFIX = "solar-display-";
const GENERATED_CLIENT_ID_SETTING_KEY = "mqtt_generated_client_id";
const MQTT_RUNTIME_LEASE_SETTING_KEY = "mqtt_runtime_lease";
const playbackRuntimeMetricTemplateKeys: DisplayPageTemplateKey[] = [
  "overview",
  "solar",
  "factory-circuit",
  "sustainability"
];

function hasPlaybackRuntimeMetricsForTemplate(
  snapshot: LiveMetricsSnapshot,
  templateKey: DisplayPageTemplateKey
) {
  return hasLiveMetricRequirementsData({
    metrics: snapshot.metrics,
    requirements: resolveLiveMetricRequirementsForPage(templateKey)
  });
}

function didPlaybackRuntimeAvailabilityChange(
  previousSnapshot: LiveMetricsSnapshot,
  nextSnapshot: LiveMetricsSnapshot
) {
  return playbackRuntimeMetricTemplateKeys.some(
    (templateKey) =>
      hasPlaybackRuntimeMetricsForTemplate(previousSnapshot, templateKey)
      !== hasPlaybackRuntimeMetricsForTemplate(nextSnapshot, templateKey)
  );
}

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

function hasPayloadTimestamp(rawPayload: string) {
  try {
    return typeof (JSON.parse(rawPayload) as { timestamp?: unknown }).timestamp === "string";
  } catch {
    return false;
  }
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

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : null;
    if (code === "EPERM") {
      return true;
    }

    return false;
  }
}

/** Generic (non managed-adapter) topics production reception is configured for. */
export function listEnabledGenericTopics(database: Database.Database) {
  return (
    database
      .prepare(
        `
          SELECT DISTINCT topic
          FROM topic_mappings
          WHERE enabled = 1 AND TRIM(topic) != ''
        `
      )
      .all() as Array<{ topic: string }>
  ).map((row) => row.topic);
}

export class MqttClientService {
  private readonly database: Database.Database;
  private readonly logger: LoggerLike;
  private readonly connectFn: ConnectFunction;
  private readonly generatedClientIdFn: () => string;
  private readonly managedSourceAdapters: readonly ManagedSourceAdapter[];
  private readonly solarSourceAdapter: SolarSourceAdapter | null;
  private readonly runtimeProcessAliveFn: ProcessAliveFunction;
  private readonly socketService: MqttClientServiceOptions["socketService"];
  private readonly meterReadingEventSink: MqttClientServiceOptions["meterReadingEventSink"];
  private readonly connectionRef: string;
  private readonly powerReceptionEvidence: PowerReceptionEvidenceStore;
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
    this.connectionRef = options.connectionRef?.trim() || "central";
    this.database = options.database ?? getDatabase();
    this.powerReceptionEvidence = new PowerReceptionEvidenceStore(this.database);
    this.logger = options.logger;
    this.connectFn = options.connectFn ?? connect;
    this.socketService = options.socketService;
    this.meterReadingEventSink = options.meterReadingEventSink;
    this.generatedClientIdFn =
      options.generatedClientIdFn
      ?? (() => `${RUNTIME_CLIENT_ID_PREFIX}${randomBytes(4).toString("hex")}`);
    this.managedSourceAdapters = options.managedSourceAdapters
      ?? [new SolarSourceAdapter({
        database: this.database,
        onMetricsPersisted: (message) => this.handleManagedSourceMetricsPersisted(message)
      })];
    this.solarSourceAdapter = this.managedSourceAdapters.find(
      (adapter): adapter is SolarSourceAdapter => adapter instanceof SolarSourceAdapter
    ) ?? null;
    this.runtimeProcessAliveFn = options.runtimeProcessAliveFn ?? isProcessAlive;
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
    this.desiredTopics = this.buildDesiredTopics(await this.loadEnabledTopics());
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

  /**
   * Topics the broker has acknowledged for this connection. Read-only: the
   * runtime stays the single owner of the production subscription list.
   */
  getActiveTopics() {
    return [...this.activeTopics];
  }

  async subscribe(topics: string[]) {
    this.desiredTopics = this.buildDesiredTopics(topics);

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

  readPowerReceptionEvidence(source: PowerReceptionSourceIdentity): GuidedMappingReception {
    return this.powerReceptionEvidence.read(source);
  }

  readSolarSourceManagementSnapshot() {
    return {
      errors: this.solarSourceAdapter?.readContractErrors() ?? [],
      sources: this.solarSourceAdapter?.readSourceDiagnostics() ?? [],
      zones: this.solarSourceAdapter?.readDiscoveredZones() ?? []
    };
  }

  async publish(topic: string, payload: string, options: { retain?: boolean } = {}): Promise<MqttPublishResult> {
    if (this.mockMode) {
      this.logger.debug?.({ retain: options.retain === true, topic, payload }, "MQTT mock publish");
      return { mode: "mock", payload, success: true, topic };
    }
    if (!this.client || !this.status.connected) {
      const message = "Cannot publish, MQTT client not connected";
      this.logger.warn(
        { broker: this.status.broker, clientId: this.status.clientId, topic },
        message
      );
      return { message, payload, reason: "disconnected", success: false, topic };
    }

    const client = this.client;
    return new Promise<MqttPublishResult>((resolve) => {
      client.publish(topic, payload, { retain: options.retain === true }, (error) => {
        if (error) {
          const message = "MQTT publish failed";
          this.logger.error(
            { broker: this.status.broker, clientId: this.status.clientId, error, topic },
            message
          );
          resolve({ message, payload, reason: "publish-error", success: false, topic });
          return;
        }

        resolve({ mode: "mqtt", payload, success: true, topic });
      });
    });
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
    const existingOwnerIsAlive =
      existingLease?.pid === null || (
        typeof existingLease?.pid === "number"
        && this.runtimeProcessAliveFn(existingLease.pid)
      );
    const leaseIsActive =
      existingLease !== null
      && existingLease.ownerToken !== this.runtimeLeaseOwnerToken
      && existingExpiryMs !== null
      && existingExpiryMs > nowMs
      && existingOwnerIsAlive;

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
      this.activeTopics.clear();
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
    client.on("message", (topic, payload, packet) => {
      void this.handleMessage(topic, payload.toString(), packet).catch((error) => {
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
    return listEnabledGenericTopics(this.database);
  }

  private buildDesiredTopics(genericTopics: readonly string[]) {
    return new Set(
      [
        ...genericTopics,
        ...this.managedSourceAdapters.flatMap(({ subscriptionFilters }) => subscriptionFilters)
      ]
        .map((topic) => topic.trim())
        .filter((topic) => topic.length > 0)
    );
  }

  private async handleMessage(topic: string, rawPayload: string, packet?: IPublishPacket) {
    const receivedAt = new Date().toISOString();
    tapProductionObservation({
      connectionRef: this.connectionRef,
      dup: packet?.dup ?? null,
      exactTopic: topic,
      origin: "mqtt",
      qos: packet?.qos ?? null,
      receivedAt,
      retain: packet?.retain ?? null,
      sourceTimestampEvidence: null
    }, rawPayload);
    await Promise.all(
      this.managedSourceAdapters
        .filter(({ subscriptionFilters }) =>
          subscriptionFilters.some((filter) => matchesMqttTopicFilter(filter, topic))
        )
        .map(async (adapter) => {
          try {
            await adapter.handleMessage(topic, rawPayload);
          } catch (error) {
            this.logger.warn(
              { error, topic },
              "Managed source adapter rejected MQTT payload"
            );
          }
        })
    );

    const mappings = this.database
      .prepare(
        `
          SELECT
            metric_scope,
            metric_key,
            topic,
            unit,
            value_path,
            selector_json,
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

    const affectedMetricScopes = new Set(mappings.map((mapping) => mapping.metric_scope));
    if (mappings.some((mapping) => mapping.metric_key.startsWith("factoryGeneration."))) {
      affectedMetricScopes.add("global");
    }
    const previousSnapshots = new Map(
      [...affectedMetricScopes].map((metricScope) => [
        metricScope,
        readScopedLiveMetricsSnapshot(metricScope, this.database)
      ])
    );
    const upsertLiveValue = this.database.prepare(`
      INSERT INTO live_metric_values (
        metric_scope,
        metric_key,
        value,
        unit,
        timestamp,
        quality,
        raw_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        value = excluded.value,
        unit = excluded.unit,
        timestamp = excluded.timestamp,
        quality = excluded.quality,
        raw_payload = excluded.raw_payload
    `);
    const readPersistedLivePowerObservation = this.database.prepare(`
      SELECT value, unit, timestamp
      FROM live_metric_values
      WHERE metric_scope = ? AND metric_key = ?
    `);
    const upsertLegacyLiveValue = this.database.prepare(`
      INSERT INTO live_metric_values (
        metric_scope,
        metric_key,
        value,
        unit,
        timestamp,
        quality,
        raw_payload
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        value = excluded.value,
        unit = excluded.unit,
        timestamp = CURRENT_TIMESTAMP,
        quality = excluded.quality,
        raw_payload = excluded.raw_payload
    `);
    let persistedMetricCount = 0;
    const changedMetrics: DerivedMetricChange[] = [];

    for (const mapping of mappings) {
      const pendingMeterEvents: MeterReadingChangeEvent[] = [];
      try {
        let mapped: MappedMeterIngestResult | null = null;
        let mappedLiveUpdated = false;
        this.database.transaction(() => {
          mapped = ingestMappedMeterReading(
            this.database,
            mapping,
            rawPayload,
            packet,
            receivedAt,
            { emitMeterReadingChange: (event) => pendingMeterEvents.push(event) }
          );
          if (
            !mapped?.handled
            || mapped.status !== "accepted"
            || mapped.liveUpdated !== true
            || mapped.liveValueDecimal === null
          ) {
            return;
          }
          const normalizedValue = Number(mapped.liveValueDecimal);
          if (!Number.isFinite(normalizedValue)) {
            this.logger.warn(
              {
                metricKey: mapping.metric_key,
                metricScope: mapping.metric_scope,
                value: mapped.liveValueDecimal,
                topic
              },
              "Accepted meter reading is not representable in generic live metrics"
            );
            return;
          }
          if (mapped.measurementKind === "power-gauge") {
            const candidateTimestamp = mapped.sourceTimestamp ?? receivedAt;
            const prior = readPersistedLivePowerObservation.get(
              mapping.metric_scope,
              mapping.metric_key
            ) as PersistedLivePowerObservation | undefined;
            const decision = decideReviewedPowerObservation(
              { timestamp: candidateTimestamp, unit: mapped.liveUnit, value: normalizedValue },
              prior
            );
            if (decision !== "update") {
              if (decision === "late" || decision === "conflict") {
                this.logger.warn(
                  {
                    candidateTimestamp,
                    candidateUnit: mapped.liveUnit,
                    candidateValue: normalizedValue,
                    code: decision === "late"
                      ? "REVIEWED_POWER_LATE_OBSERVATION"
                      : "REVIEWED_POWER_EQUAL_INSTANT_CONFLICT",
                    metricKey: mapping.metric_key,
                    metricScope: mapping.metric_scope,
                    persistedTimestamp: prior?.timestamp ?? null,
                    persistedUnit: prior?.unit ?? null,
                    persistedValue: prior?.value ?? null,
                    topic
                  },
                  decision === "late"
                    ? "Ignored late reviewed power observation"
                    : "Ignored conflicting reviewed power observation"
                );
              }
              return;
            }
          }
          upsertLiveValue.run(
            mapping.metric_scope,
            mapping.metric_key,
            normalizedValue,
            mapped.liveUnit,
            mapped.sourceTimestamp ?? receivedAt,
            mapped.timestampQuality,
            rawPayload
          );
          mappedLiveUpdated = true;
        })();
        const mappedResult = mapped as MappedMeterIngestResult | null;
        if (mappedResult?.handled) {
          if (
            mappedLiveUpdated
            && mappedResult.measurementKind === "power-gauge"
            && mappedResult.sourceIdentity
          ) {
            this.powerReceptionEvidence.record(mappedResult.sourceIdentity, receivedAt);
          }
          if (mappedLiveUpdated) {
            persistedMetricCount += 1;
            changedMetrics.push({
              metricKey: mapping.metric_key,
              metricScope: mapping.metric_scope
            });
          }
          for (const event of pendingMeterEvents) {
            this.socketService?.emitDisplaySync({
              generatedAt: event.receivedAt,
              metricScope: event.metricScope,
              reason: "meter-readings-changed",
              scope: "monitoring-history"
            });
            try {
              this.meterReadingEventSink?.(event);
            } catch (error) {
              this.logger.warn(
                { error, event },
                "Meter-reading change event sink rejected an admitted sample"
              );
            }
          }
          continue;
        }
        const parsedPayload = parse(rawPayload, mapping.value_path ?? undefined);
        const adjustedValue =
          parsedPayload.value * (mapping.multiplier ?? 1) + (mapping.offset ?? 0);

        upsertLegacyLiveValue.run(
          mapping.metric_scope,
          mapping.metric_key,
          roundValue(adjustedValue, mapping.decimal_places),
          mapping.unit,
          parsedPayload.quality ?? null,
          parsedPayload.raw
        );
        persistedMetricCount += 1;
        changedMetrics.push({
          metricKey: mapping.metric_key,
          metricScope: mapping.metric_scope
        });
      } catch (error) {
        pendingMeterEvents.length = 0;
        this.logger.warn(
          {
            error,
            metricKey: mapping.metric_key,
            metricScope: mapping.metric_scope,
            topic
          },
          "Failed to parse MQTT payload"
        );
      }
    }

    let didWriteGlobalAggregate = false;
    const didPersistFactoryGeneration = changedMetrics.some(({ metricKey }) =>
      metricKey.startsWith("factoryGeneration.")
    );
    if (
      persistedMetricCount > 0
      && didPersistFactoryGeneration
    ) {
      const aggregateStatus = updateFactoryGenerationAggregate(this.database, new Date(), {
        changedMetrics
      });
      didWriteGlobalAggregate = aggregateStatus.state === "ready";
      if (aggregateStatus.state !== "ready") {
        this.logger.warn(
          { issues: aggregateStatus.issues, state: aggregateStatus.state },
          "CL+KN generation aggregate is not ready"
        );
      }
    } else if (persistedMetricCount > 0) {
      evaluateDerivedMetrics(this.database, new Date(), {
        changedMetrics
      });
    }

    const updatedMetricScopes = new Set(mappings.map((mapping) => mapping.metric_scope));
    if (didWriteGlobalAggregate) updatedMetricScopes.add("global");
    for (const metricScope of updatedMetricScopes) {
      const snapshot = readAuthoritativeScopedLiveMetricsSnapshot(metricScope, this.database);
      this.socketService?.emitLiveMetrics(metricScope, snapshot);
      const circuitMetrics = this.buildCircuitMetricsSnapshot(
        snapshot,
        mappings
          .filter((mapping) => mapping.metric_scope === metricScope)
          .map((mapping) => mapping.metric_key)
      );
      if (circuitMetrics !== null) {
        this.socketService?.emitCircuitMetrics(metricScope, circuitMetrics);
      }
    }
    const didFactoryGenerationUpdate =
      hasPayloadTimestamp(rawPayload)
      && didPersistFactoryGeneration;
    const didRuntimeAvailabilityChange = [...affectedMetricScopes].some((metricScope) =>
      didPlaybackRuntimeAvailabilityChange(
        previousSnapshots.get(metricScope) ?? { metrics: {}, timestamp: null },
        readScopedLiveMetricsSnapshot(metricScope, this.database)
      )
    );
    if (
      persistedMetricCount > 0
      && (didFactoryGenerationUpdate || didRuntimeAvailabilityChange)
    ) {
      this.socketService?.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: didFactoryGenerationUpdate
          ? "mqtt-factory-generation-updated"
          : "mqtt-live-runtime-availability-updated",
        scope: "mqtt"
      });
    }

  }

  private handleManagedSourceMetricsPersisted(message: SolarMetricMessage) {
    const changedMetrics: DerivedMetricChange[] = message.readings.map(({ metricKey }) => ({
      metricScope: message.metricScope,
      metricKey
    }));
    if (message.sourceType !== "summary") {
      evaluateDerivedMetrics(this.database, new Date(), {
        changedMetrics
      });
    }
    const sourceSnapshot = readAuthoritativeScopedLiveMetricsSnapshot(
      message.metricScope,
      this.database
    );
    this.socketService?.emitLiveMetrics(message.metricScope, sourceSnapshot);
    const circuitMetrics = this.buildCircuitMetricsSnapshot(
      sourceSnapshot,
      message.readings.map(({ metricKey }) => metricKey)
    );
    if (circuitMetrics !== null) {
      this.socketService?.emitCircuitMetrics(message.metricScope, circuitMetrics);
    }

    if (message.sourceType !== "summary") {
      return;
    }
    const aggregateStatus = updateFactoryGenerationAggregate(this.database, new Date(), {
      changedMetrics
    });
    if (aggregateStatus.state === "ready") {
      this.socketService?.emitLiveMetrics(
        "global",
        readAuthoritativeScopedLiveMetricsSnapshot("global", this.database)
      );
    } else {
      this.logger.warn(
        { issues: aggregateStatus.issues, state: aggregateStatus.state },
        "CL+KN generation aggregate is not ready"
      );
    }
    this.socketService?.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "mqtt-factory-generation-updated",
      scope: "mqtt"
    });
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
      freshnessPolicy: snapshot.freshnessPolicy,
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
    if (this.mockMode) {
      this.setStatus({
        connected: false,
        reason: "mock"
      });
      return;
    }

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
