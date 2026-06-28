import type { FastifyPluginAsync } from "fastify";
import type { RuntimeMqttStatus } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { type MqttSettingsRow, resolveMqttSettings } from "../mqtt/settings-source.js";
import { readDisplayReadinessReport } from "../services/displayReadinessService.js";

type MqttSettingsResponse = {
  dataMode: "mqtt" | "mock";
  host: string;
  port: number;
  username: string;
  password: string;
  clientId: string;
  reconnectInterval: number;
  messageTimeout: number;
};

type TopicMappingResponse = {
  id: number;
  metricKey: string;
  topic: string;
  nameZh: string | null;
  nameEn: string | null;
  unit: string;
  valuePath: string;
  enabled: boolean;
  updatedAt: string | null;
  lastReceivedAt: string | null;
  lastValue: number | null;
  quality: string | null;
  rawPayload: string | null;
};

type SettingsBody = Partial<MqttSettingsResponse>;
type TestConnectionBody = SettingsBody;

type TopicMappingInput = {
  metricKey: string;
  topic: string;
  nameZh?: string;
  nameEn?: string;
  unit?: string;
  valuePath?: string;
  enabled?: boolean;
};

type ExistingTopicMappingRow = {
  created_at: string | null;
  decimal_places: number | null;
  metric_key: string;
  multiplier: number | null;
  name_en: string | null;
  name_zh: string | null;
  offset: number | null;
};

function toBoolean(value: unknown) {
  return value === true || value === 1;
}

/**
 * 解析 topic 自訂名稱:input 未帶(undefined)時保留既有值;
 * 帶空字串視為清除(NULL);帶非空字串則去除前後空白後存入。
 */
function resolveCustomName(input: string | undefined, existing: string | null) {
  if (input === undefined) {
    return existing;
  }

  return input.trim() || null;
}

function getSettingsRow() {
  const database = getDatabase();
  const row = database
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
    .get() as MqttSettingsRow | undefined;

  return row;
}

function serializeSettings(row: MqttSettingsRow): MqttSettingsResponse {
  return {
    clientId: row.client_id ?? "",
    dataMode: row.data_mode === "mock" ? "mock" : "mqtt",
    host: row.broker_host ?? "localhost",
    messageTimeout: row.message_timeout ?? 30,
    password: "****",
    port: row.broker_port ?? 1883,
    reconnectInterval: row.reconnect_interval ?? 5000,
    username: row.username ?? ""
  };
}

function resolveSettingsBody(body: SettingsBody | undefined, current: MqttSettingsRow) {
  const nextDataMode = body?.dataMode === "mock" ? "mock" : "mqtt";
  const nextPassword =
    body?.password === undefined || body.password === "****"
      ? current.password ?? ""
      : body.password;

  return {
    clientId: body?.clientId?.trim() || current.client_id || "solar-display-player",
    dataMode: nextDataMode,
    host: body?.host?.trim() || current.broker_host || "localhost",
    messageTimeout:
      typeof body?.messageTimeout === "number"
        ? body.messageTimeout
        : current.message_timeout || 30,
    password: nextPassword,
    port: typeof body?.port === "number" ? body.port : current.broker_port || 1883,
    reconnectInterval:
      typeof body?.reconnectInterval === "number"
        ? body.reconnectInterval
        : current.reconnect_interval || 5000,
    username: body?.username ?? current.username ?? ""
  };
}

function readTopicMappings() {
  const database = getDatabase();
  return database
    .prepare(
      `
        SELECT
          topic_mappings.id,
          topic_mappings.metric_key,
          topic_mappings.topic,
          topic_mappings.name_zh,
          topic_mappings.name_en,
          topic_mappings.unit,
          topic_mappings.value_path,
          topic_mappings.enabled,
          topic_mappings.updated_at,
          live_metric_values.timestamp AS last_received_at,
          live_metric_values.value AS last_value,
          live_metric_values.quality,
          live_metric_values.raw_payload
        FROM topic_mappings
        LEFT JOIN live_metric_values
          ON live_metric_values.metric_key = topic_mappings.metric_key
        ORDER BY topic_mappings.id ASC
      `
    )
    .all() as Array<{
    id: number;
    metric_key: string;
    topic: string;
    name_zh: string | null;
    name_en: string | null;
    unit: string | null;
    value_path: string | null;
    enabled: number;
    updated_at: string | null;
    last_received_at: string | null;
    last_value: number | null;
    quality: string | null;
    raw_payload: string | null;
  }>;
}

function serializeTopicMappings(): TopicMappingResponse[] {
  return readTopicMappings().map((mapping) => ({
    enabled: toBoolean(mapping.enabled),
    id: mapping.id,
    lastReceivedAt: mapping.last_received_at,
    lastValue: mapping.last_value,
    metricKey: mapping.metric_key,
    nameEn: mapping.name_en,
    nameZh: mapping.name_zh,
    quality: mapping.quality,
    rawPayload: mapping.raw_payload,
    topic: mapping.topic,
    unit: mapping.unit ?? "",
    updatedAt: mapping.updated_at,
    valuePath: mapping.value_path ?? ""
  }));
}

function getEnabledTopics() {
  return serializeTopicMappings()
    .filter((mapping) => mapping.enabled && mapping.topic.trim() !== "")
    .map((mapping) => mapping.topic);
}

const settingsMqttRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/runtime/mqtt-status", async () => ({
    status: app.mqttClientService.getStatus() satisfies RuntimeMqttStatus
  }));

  app.get("/api/settings/mqtt", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    return {
      settings: serializeSettings(resolveMqttSettings(process.env, getSettingsRow())),
      status: app.mqttClientService.getStatus(),
      readiness: readDisplayReadinessReport()
    };
  });

  app.put<{ Body: SettingsBody }>("/api/settings/mqtt", async (request) => {
    const database = getDatabase();
    const current = getSettingsRow() ?? resolveMqttSettings({}, null);
    const next = resolveSettingsBody(request.body, current);

    database.transaction(() => {
      database.prepare("DELETE FROM mqtt_settings").run();
      database
        .prepare(
          `
            INSERT INTO mqtt_settings (
              broker_host,
              broker_port,
              username,
              password,
              client_id,
              reconnect_interval,
              message_timeout,
              data_mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .run(
          next.host,
          next.port,
          next.username,
          next.password,
          next.clientId,
          next.reconnectInterval,
          next.messageTimeout,
          next.dataMode
        );
      database
        .prepare(
          `
            INSERT INTO system_settings (key, value, updated_at)
            VALUES ('data_mode', ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              updated_at = CURRENT_TIMESTAMP
          `
        )
        .run(next.dataMode);
    })();

    await app.mqttClientService.connect();
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "mqtt-settings-updated",
      scope: "mqtt"
    });

    return {
      settings: serializeSettings(resolveMqttSettings(process.env, getSettingsRow())),
      status: app.mqttClientService.getStatus(),
      readiness: readDisplayReadinessReport()
    };
  });

  app.post<{ Body: TestConnectionBody }>("/api/settings/mqtt/test", async (request) => {
    const resolved = resolveSettingsBody(request.body, getSettingsRow() ?? resolveMqttSettings({}, null));
    const result = await app.mqttClientService.testConnection(resolved);

    return {
      ...result,
      status: app.mqttClientService.getStatus()
    };
  });

  app.get("/api/settings/mqtt/topics", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    return {
      status: app.mqttClientService.getStatus(),
      topics: serializeTopicMappings(),
      readiness: readDisplayReadinessReport()
    };
  });

  app.put<{ Body: { topics?: TopicMappingInput[] } }>("/api/settings/mqtt/topics", async (request) => {
    const database = getDatabase();
    const topics = request.body?.topics ?? [];
    const existingMappings = new Map<string, ExistingTopicMappingRow>(
      (
        database
          .prepare(
            `
              SELECT
                metric_key,
                multiplier,
                offset,
                decimal_places,
                name_zh,
                name_en,
                created_at
              FROM topic_mappings
            `
          )
          .all() as ExistingTopicMappingRow[]
      ).map((mapping) => [mapping.metric_key, mapping])
    );

    database.transaction(() => {
      database.prepare("DELETE FROM topic_mappings").run();

      const insertMapping = database.prepare(`
        INSERT INTO topic_mappings (
          metric_key,
          topic,
          name_zh,
          name_en,
          unit,
          value_path,
          multiplier,
          offset,
          decimal_places,
          enabled,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (const topic of topics) {
        const existingMapping = existingMappings.get(topic.metricKey);
        insertMapping.run(
          topic.metricKey,
          topic.topic,
          resolveCustomName(topic.nameZh, existingMapping?.name_zh ?? null),
          resolveCustomName(topic.nameEn, existingMapping?.name_en ?? null),
          topic.unit?.trim() || null,
          topic.valuePath?.trim() || null,
          existingMapping?.multiplier ?? 1,
          existingMapping?.offset ?? 0,
          existingMapping?.decimal_places ?? (topic.unit?.trim() === "%" ? 1 : 2),
          topic.enabled === false ? 0 : 1,
          existingMapping?.created_at ?? new Date().toISOString()
        );
      }
    })();

    await app.mqttClientService.subscribe(getEnabledTopics());
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "mqtt-topics-updated",
      scope: "mqtt"
    });

    return {
      status: app.mqttClientService.getStatus(),
      topics: serializeTopicMappings(),
      readiness: readDisplayReadinessReport()
    };
  });

  app.post("/api/settings/mqtt/reload", async () => {
    await app.mqttClientService.subscribe(getEnabledTopics());
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "mqtt-topics-reloaded",
      scope: "mqtt"
    });

    return {
      status: app.mqttClientService.getStatus(),
      topics: serializeTopicMappings(),
      readiness: readDisplayReadinessReport()
    };
  });
};

export default settingsMqttRoute;
