import type Database from "better-sqlite3";
import {
  connect,
  type IClientOptions,
  type MqttClient
} from "mqtt";
import { getDatabase } from "../db/index.js";
import { parse } from "./PayloadParser.js";

type LoggerLike = {
  info: (payload: unknown, message?: string) => void;
  warn: (payload: unknown, message?: string) => void;
  error: (payload: unknown, message?: string) => void;
};

type MqttSettingsRecord = {
  broker_host: string | null;
  broker_port: number | null;
  username: string | null;
  password: string | null;
  client_id: string | null;
  reconnect_interval: number | null;
  message_timeout: number | null;
  data_mode: string | null;
};

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
  connectFn?: ConnectFunction;
};

export type MqttStatus = {
  connected: boolean;
  broker: string;
  clientId: string;
};

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

export class MqttClientService {
  private readonly database: Database.Database;
  private readonly logger: LoggerLike;
  private readonly connectFn: ConnectFunction;
  private client: MqttClient | null = null;
  private desiredTopics = new Set<string>();
  private activeTopics = new Set<string>();
  private status: MqttStatus = {
    broker: "",
    clientId: "",
    connected: false
  };
  private mockMode = false;

  constructor(options: MqttClientServiceOptions) {
    this.database = options.database ?? getDatabase();
    this.logger = options.logger;
    this.connectFn = options.connectFn ?? connect;
  }

  async connect() {
    const settings = this.readSettings();
    this.status = {
      broker: `${settings.broker_host ?? "localhost"}:${settings.broker_port ?? 1883}`,
      clientId: settings.client_id ?? "",
      connected: false
    };
    this.desiredTopics = new Set(await this.loadEnabledTopics());

    await this.disconnect();

    if (settings.data_mode === "mock") {
      this.mockMode = true;
      return;
    }

    this.mockMode = false;

    const client = this.connectFn(buildBrokerUrl(settings), this.buildClientOptions(settings));
    this.client = client;
    this.attachClientHandlers(client);

    await waitForEvent(client, {
      timeoutMs: Math.max((settings.message_timeout ?? 30) * 1000, 1000)
    });
    this.status.connected = true;
    await this.syncSubscriptions();
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
      client_id: input.clientId,
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

  async disconnect() {
    this.status.connected = false;
    this.activeTopics.clear();

    if (!this.client) {
      return;
    }

    const client = this.client;
    this.client = null;
    await disconnectClient(client);
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

    if (!row) {
      return {
        broker_host: "localhost",
        broker_port: 1883,
        username: "",
        password: "",
        client_id: "solar-display-player",
        reconnect_interval: 5000,
        message_timeout: 30,
        data_mode: "mqtt"
      } satisfies MqttSettingsRecord;
    }

    return row;
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
      this.status.connected = true;
      void this.syncSubscriptions();
    });
    client.on("reconnect", () => {
      this.status.connected = false;
      this.logger.info({ broker: this.status.broker }, "MQTT reconnecting");
    });
    client.on("close", () => {
      this.status.connected = false;
    });
    client.on("offline", () => {
      this.status.connected = false;
    });
    client.on("error", (error) => {
      this.status.connected = false;
      this.logger.error({ error }, "MQTT client error");
    });
    client.on("message", (topic, payload) => {
      void this.handleMessage(topic, payload.toString());
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
  }
}
