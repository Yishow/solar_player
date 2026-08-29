import type { FastifyPluginAsync } from "fastify";
import { isMetricScope, type MetricScope, type RuntimeMqttStatus } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { normalizeMetricTimestamp } from "../metrics/metricTimestamp.js";
import { type MqttSettingsRow, resolveMqttSettings } from "../mqtt/settings-source.js";
import { readDisplayReadinessReport } from "../services/displayReadinessService.js";
import { resetFactoryGenerationBaseline } from "../services/factoryGenerationAggregateService.js";

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
  metricScope: MetricScope;
  metricKey: string;
  topic: string;
  nameZh: string | null;
  nameEn: string | null;
  unit: string;
  valuePath: string;
  multiplier: number;
  enabled: boolean;
  updatedAt: string | null;
  lastReceivedAt: string | null;
  lastValue: number | null;
  quality: string | null;
  rawPayload: string | null;
};

type SettingsBody = Partial<MqttSettingsResponse>;
type TestConnectionBody = SettingsBody;
type PublishTopicValueBody = {
  metricScope?: unknown;
  value?: unknown;
};
type ResetFactoryGenerationBaselineBody = {
  expectedTotalMwh?: unknown;
};

type TopicMappingInput = {
  metricKey: string;
  metricScope?: unknown;
  topic: string;
  nameZh?: string;
  nameEn?: string;
  unit?: string;
  valuePath?: string;
  multiplier?: number;
  enabled?: boolean;
};

type ExistingTopicMappingRow = {
  created_at: string | null;
  decimal_places: number | null;
  metric_key: string;
  metric_scope: MetricScope;
  multiplier: number | null;
  name_en: string | null;
  name_zh: string | null;
  offset: number | null;
};

const factorySummaryMetricKeyPattern = /^factoryGeneration\.(todayMwh|monthMwh|totalMwh)$/u;
const factorySummaryFieldBySuffix = {
  monthMwh: "month_mwh",
  todayMwh: "today_mwh",
  totalMwh: "total_mwh"
} as const;

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

function resolveMultiplier(input: number | undefined, existing: number) {
  return typeof input === "number" && Number.isFinite(input) ? input : existing;
}

function canonicalizeMetricUnit(unit: string | undefined) {
  const trimmed = unit?.trim();
  if (!trimmed) {
    return null;
  }

  switch (trimmed.toLowerCase()) {
    case "kw":
      return "kW";
    case "kwh":
      return "kWh";
    case "mwh":
      return "MWh";
    case "gwh":
      return "GWh";
    case "wh":
      return "Wh";
    case "kg":
      return "kg";
    case "t":
      return "t";
    case "%":
      return "%";
    default:
      return trimmed;
  }
}

function buildTopicPublishPayload(
  value: number,
  mapping: { metric_key: string; metric_scope: MetricScope; value_path: string | null }
) {
  const factorySummaryMatch = mapping.metric_key.match(factorySummaryMetricKeyPattern);
  if (factorySummaryMatch) {
    const [, suffix] = factorySummaryMatch;
    const prefix = "factoryGeneration.";
    const rows = getDatabase()
      .prepare(`
        SELECT metric_key, value
        FROM live_metric_values
        WHERE metric_scope = ? AND metric_key IN (?, ?, ?)
      `)
      .all(mapping.metric_scope, `${prefix}todayMwh`, `${prefix}monthMwh`, `${prefix}totalMwh`) as Array<{
      metric_key: string;
      value: number | null;
    }>;
    const summary = Object.fromEntries(
      rows
        .filter((row): row is { metric_key: string; value: number } => typeof row.value === "number" && Number.isFinite(row.value))
        .map((row) => [
          factorySummaryFieldBySuffix[row.metric_key.slice(prefix.length) as keyof typeof factorySummaryFieldBySuffix],
          row.value
        ])
    ) as Partial<Record<(typeof factorySummaryFieldBySuffix)[keyof typeof factorySummaryFieldBySuffix], number>>;
    const field = factorySummaryFieldBySuffix[suffix as keyof typeof factorySummaryFieldBySuffix];
    summary[field] = value;
    return JSON.stringify({ ...summary, timestamp: new Date().toISOString() });
  }

  const valuePath = mapping.value_path;
  const path = valuePath?.trim().replace(/^\$\./u, "") ?? "";
  const keys = path.split(".").filter(Boolean);
  if (keys.length === 0) {
    return JSON.stringify({ value });
  }

  const payload: Record<string, unknown> = {};
  let target = payload;
  for (const key of keys.slice(0, -1)) {
    const nested: Record<string, unknown> = {};
    target[key] = nested;
    target = nested;
  }
  target[keys[keys.length - 1]!] = value;
  return JSON.stringify(payload);
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
          topic_mappings.metric_scope,
          topic_mappings.metric_key,
          topic_mappings.topic,
          topic_mappings.name_zh,
          topic_mappings.name_en,
          topic_mappings.unit,
          topic_mappings.value_path,
          topic_mappings.multiplier,
          topic_mappings.enabled,
          topic_mappings.updated_at,
          live_metric_values.timestamp AS last_received_at,
          live_metric_values.value AS last_value,
          live_metric_values.quality,
          live_metric_values.raw_payload
        FROM topic_mappings
        LEFT JOIN live_metric_values
          ON live_metric_values.metric_scope = topic_mappings.metric_scope
         AND live_metric_values.metric_key = topic_mappings.metric_key
        ORDER BY topic_mappings.id ASC
      `
    )
    .all() as Array<{
    id: number;
    metric_scope: MetricScope;
    metric_key: string;
    topic: string;
    name_zh: string | null;
    name_en: string | null;
    unit: string | null;
    value_path: string | null;
    multiplier: number | null;
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
    metricScope: mapping.metric_scope,
    // Same normalization as the live metrics read path: the MQTT settings view
    // compares this against a live reading as a string, so a mixed form would
    // make that comparison independent of the actual instant.
    lastReceivedAt:
      mapping.last_received_at === null
        ? null
        : normalizeMetricTimestamp(mapping.last_received_at),
    lastValue: mapping.last_value,
    metricKey: mapping.metric_key,
    multiplier: mapping.multiplier ?? 1,
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

function getTopicMapping(metricScope: MetricScope, metricKey: string) {
  const database = getDatabase();
  return database
    .prepare(
      `
        SELECT metric_scope, metric_key, topic, value_path, enabled
        FROM topic_mappings
        WHERE metric_scope = ? AND metric_key = ?
        LIMIT 1
      `
    )
    .get(metricScope, metricKey) as
    | {
        enabled: number;
        metric_key: string;
        metric_scope: MetricScope;
        topic: string | null;
        value_path: string | null;
      }
    | undefined;
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

    void app.mqttClientService.connect().catch(() => undefined);
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

  app.post<{ Body: ResetFactoryGenerationBaselineBody }>(
    "/api/settings/mqtt/factory-generation/reset-baseline",
    async (request, reply) => {
      const expectedTotalMwh = request.body?.expectedTotalMwh;
      if (
        typeof expectedTotalMwh !== "number"
        || !Number.isFinite(expectedTotalMwh)
        || expectedTotalMwh < 0
      ) {
        return reply.status(400).send({
          code: "INVALID_FACTORY_GENERATION_RESET_CONFIRMATION",
          success: false
        });
      }

      const result = resetFactoryGenerationBaseline(getDatabase(), expectedTotalMwh);
      if (!result.ok) {
        return reply.status(409).send({
          code: "FACTORY_GENERATION_BASELINE_RESET_REJECTED",
          reason: result.reason,
          success: false
        });
      }

      app.socketService.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: "factory-generation-baseline-reset",
        scope: "mqtt"
      });
      return {
        reset: {
          acceptedTotalMwh: result.acceptedTotalMwh,
          previousTotalMwh: result.previousTotalMwh,
          updatedAt: result.updatedAt
        },
        success: true
      };
    }
  );

  app.post<{ Body: PublishTopicValueBody; Params: { metricKey: string } }>(
    "/api/settings/mqtt/topics/:metricKey/publish",
    async (request, reply) => {
      const value = request.body?.value;
      const metricScope = request.body?.metricScope;
      if (!isMetricScope(metricScope)) {
        return reply.status(400).send({
          error: "Publish metricScope must be cl, kn, or global",
          success: false,
          timestamp: new Date().toISOString()
        });
      }
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return reply.status(400).send({
          error: "Publish value must be a finite number",
          success: false,
          timestamp: new Date().toISOString()
        });
      }

      const mapping = getTopicMapping(metricScope, request.params.metricKey);
      if (!mapping) {
        return reply.status(404).send({
          error: "MQTT topic mapping not found",
          success: false,
          timestamp: new Date().toISOString()
        });
      }

      const topic = mapping.topic?.trim() ?? "";
      if (mapping.enabled !== 1 || topic === "") {
        return reply.status(409).send({
          error: "MQTT topic mapping is not publishable",
          success: false,
          timestamp: new Date().toISOString()
        });
      }

      const payload = buildTopicPublishPayload(value, mapping);
      const publishResult = await app.mqttClientService.publish(topic, payload);
      if (!publishResult.success) {
        return reply.status(409).send({
          error: publishResult.message,
          success: false,
          timestamp: new Date().toISOString()
        });
      }

      return {
        metricKey: mapping.metric_key,
        payload,
        status: app.mqttClientService.getStatus(),
        success: true,
        topic
      };
    }
  );

  app.put<{ Body: { topics?: TopicMappingInput[] } }>("/api/settings/mqtt/topics", async (request, reply) => {
    const database = getDatabase();
    const topics = request.body?.topics ?? [];
    const existingMappings = new Map<string, ExistingTopicMappingRow>(
      (
        database
          .prepare(
            `
              SELECT
                metric_key,
                metric_scope,
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
      ).map((mapping) => [`${mapping.metric_scope}:${mapping.metric_key}`, mapping])
    );

    const resolvedTopics: Array<TopicMappingInput & { metricScope: MetricScope }> = [];
    const seen = new Set<string>();
    for (const topic of topics) {
      const candidates = [...existingMappings.values()].filter(
        (mapping) => mapping.metric_key === topic.metricKey
      );
      const metricScope = topic.metricScope === undefined && candidates.length === 1
        ? candidates[0]?.metric_scope
        : topic.metricScope;
      if (!isMetricScope(metricScope)) {
        return reply.status(400).send({
          code: "INVALID_METRIC_SCOPE",
          success: false
        });
      }
      const identity = `${metricScope}:${topic.metricKey}`;
      if (seen.has(identity)) {
        return reply.status(400).send({
          code: "DUPLICATE_METRIC_IDENTITY",
          error: `Duplicate topic mapping identity: ${identity}`,
          success: false
        });
      }
      seen.add(identity);
      resolvedTopics.push({ ...topic, metricScope });
    }

    database.transaction(() => {
      database.prepare("DELETE FROM topic_mappings").run();

      const insertMapping = database.prepare(`
        INSERT INTO topic_mappings (
          metric_scope,
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (const topic of resolvedTopics) {
        const existingMapping = existingMappings.get(`${topic.metricScope}:${topic.metricKey}`);
        const unit = canonicalizeMetricUnit(topic.unit);
        insertMapping.run(
          topic.metricScope,
          topic.metricKey,
          topic.topic,
          resolveCustomName(topic.nameZh, existingMapping?.name_zh ?? null),
          resolveCustomName(topic.nameEn, existingMapping?.name_en ?? null),
          unit,
          topic.valuePath?.trim() || null,
          resolveMultiplier(topic.multiplier, existingMapping?.multiplier ?? 1),
          existingMapping?.offset ?? 0,
          existingMapping?.decimal_places ?? (unit === "%" ? 1 : 2),
          topic.enabled === false ? 0 : 1,
          existingMapping?.created_at ?? new Date().toISOString()
        );
        database
          .prepare(
            `
              UPDATE live_metric_values
              SET unit = ?
              WHERE metric_scope = ? AND metric_key = ?
            `
          )
          .run(unit, topic.metricScope, topic.metricKey);
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
