import type { MetricScope } from "@solar-display/shared";
import { requestJson } from "../../services/api";

export type MqttSourceStatus = {
  broker: string;
  clientId: string;
  connected: boolean;
  reason: string | null;
  updatedAt: string | null;
};

export type GenericMqttMapping = {
  enabled: boolean;
  id: number;
  lastReceivedAt: string | null;
  lastValue: number | null;
  metricKey: string;
  metricScope: MetricScope;
  multiplier?: number;
  nameEn: string | null;
  nameZh: string | null;
  quality: string | null;
  topic: string;
  unit: string;
  updatedAt: string | null;
  valuePath: string;
};

export type SolarSourceContractError = {
  code: string;
  message: string;
  observedAt: string;
  sourceTopic: string;
};

export type SolarManagedSource = {
  discoveredZoneCount: number;
  health: "healthy" | "stale" | "unhealthy" | "unknown";
  lastAlert: string | null;
  lastError: SolarSourceContractError | null;
  lastGoodSummaryAt: string | null;
  lastHeartbeatAt: string | null;
  lastStatus: string | null;
  metricScope: MetricScope;
  ownership: "managed";
  sourceId: "solar-collector";
  sourceTimestamp: string | null;
  sourceTopic: string;
};

export type SolarManagedZone = {
  displayName: string | null;
  lastObservedFields: string[];
  metricScope: MetricScope;
  sourceTimestamp: string;
  sourceTopic: string;
  zoneId: string;
};

export type DataHubSourcesModel = {
  solar: {
    errors: SolarSourceContractError[];
    sources: SolarManagedSource[];
    zones: SolarManagedZone[];
  };
  status: MqttSourceStatus;
  topics: GenericMqttMapping[];
};

type TopicMappingsResponse = {
  status: MqttSourceStatus;
  topics: Array<GenericMqttMapping & { rawPayload?: string | null }>;
};

type SolarSourcesResponse = DataHubSourcesModel["solar"];

export type SourceHealth = {
  label: string;
  tone: "success" | "warning" | "danger" | "default";
};

export type SourceResource = {
  label: string;
  detail: string;
  metrics: string[];
};

export type ManagedSourceRow = {
  activity: string;
  health: SourceHealth;
  id: string;
  kind: "managed";
  metricKey?: never;
  metricScope: MetricScope;
  ownedMetrics: string[];
  ownership: "managed";
  resources: SourceResource[];
  sourceType: string;
  sourceTopic: string;
};

export type GenericSourceRow = {
  activity: string;
  editable: boolean;
  health: SourceHealth;
  id: string;
  isManagedIdentity: boolean;
  kind: "generic";
  mapping: GenericMqttMapping;
  metricKey: string;
  metricScope: MetricScope;
  ownedMetrics: string[];
  ownership: "managed" | "operator";
  resources: SourceResource[];
  sourceType: string;
  sourceTopic: string;
};

export type SourceRow = ManagedSourceRow | GenericSourceRow;

const factorySourceMetricKeys = [
  "factoryGeneration.powerKw",
  "factoryGeneration.todayMwh",
  "factoryGeneration.monthMwh",
  "factoryGeneration.totalMwh"
] as const;

const zoneMetricSuffixes: Record<string, string> = {
  capacity_kwp: "capacityKwp",
  month_mwh: "monthMwh",
  power_kw: "powerKw",
  today_hours: "todayHours",
  today_kwh: "todayKwh",
  total_mwh: "totalMwh"
};

const metricScopeLabels: Record<MetricScope, string> = {
  cl: "CL",
  global: "Global",
  kn: "KN"
};

export function getMetricScopeLabel(scope: MetricScope) {
  return metricScopeLabels[scope];
}

const healthLabels: Record<SolarManagedSource["health"], string> = {
  healthy: "正常 (Healthy)",
  stale: "過期 (Stale)",
  unhealthy: "異常 (Unhealthy)",
  unknown: "未知 (Unknown)"
};

const healthTones: Record<SolarManagedSource["health"], SourceHealth["tone"]> = {
  healthy: "success",
  stale: "warning",
  unhealthy: "danger",
  unknown: "default"
};

export const defaultMqttStatus: MqttSourceStatus = {
  broker: "",
  clientId: "",
  connected: false,
  reason: null,
  updatedAt: null
};

export const emptySolarSources: SolarSourcesResponse = {
  errors: [],
  sources: [],
  zones: []
};

let cachedDataHubSourcesModel: DataHubSourcesModel | null = null;
let cachedDataHubSourcesErrorMessage = "";

function formatTimestamp(value: string | null) {
  return value ?? "尚未收到";
}

function isBadQuality(quality: string | null) {
  return Boolean(quality && ["bad", "error", "invalid", "stale"].includes(quality.toLowerCase()));
}

function resolveGenericHealth(topic: GenericMqttMapping, status: MqttSourceStatus): SourceHealth {
  if (!topic.enabled) {
    return { label: "已停用 (Disabled)", tone: "warning" };
  }
  if (!status.connected) {
    return { label: "Broker 離線 (Broker offline)", tone: "danger" };
  }
  if (isBadQuality(topic.quality)) {
    return { label: "品質異常 (Degraded)", tone: "warning" };
  }
  if (topic.lastReceivedAt) {
    return { label: "正常接收 (Active)", tone: "success" };
  }
  return { label: "等待資料 (Waiting for data)", tone: "warning" };
}

export function isSolarAdapterManagedMetricIdentity(metricScope: MetricScope, metricKey: string) {
  return metricScope !== "global"
    && (metricKey.startsWith("factoryGeneration.") || metricKey.startsWith("solarZone."));
}

function buildZoneResource(zone: SolarManagedZone): SourceResource {
  const metrics = zone.lastObservedFields.flatMap((field) => {
    const suffix = zoneMetricSuffixes[field];
    return suffix ? [`solarZone.${zone.zoneId}.${suffix}`] : [];
  });

  return {
    detail: `${zone.sourceTopic} · ${formatTimestamp(zone.sourceTimestamp)}`,
    label: zone.displayName?.trim() || `Zone ${zone.zoneId}`,
    metrics
  };
}

function buildManagedSourceRow(
  source: SolarManagedSource,
  zones: SolarManagedZone[]
): ManagedSourceRow {
  const scopedZones = zones.filter((zone) => zone.metricScope === source.metricScope);
  return {
    activity: [
      `Heartbeat ${formatTimestamp(source.lastHeartbeatAt)}`,
      `Summary ${formatTimestamp(source.lastGoodSummaryAt)}`
    ].join(" · "),
    health: {
      label: healthLabels[source.health],
      tone: healthTones[source.health]
    },
    id: `${source.sourceId}:${source.metricScope}`,
    kind: "managed",
    metricScope: source.metricScope,
    ownedMetrics: [...factorySourceMetricKeys],
    ownership: "managed",
    resources: scopedZones.map(buildZoneResource),
    sourceType: "Solar Collector",
    sourceTopic: source.sourceTopic
  };
}

function buildGenericSourceRow(
  topic: GenericMqttMapping,
  status: MqttSourceStatus
): GenericSourceRow {
  const isManagedIdentity = isSolarAdapterManagedMetricIdentity(topic.metricScope, topic.metricKey);
  const health = resolveGenericHealth(topic, status);
  return {
    activity: topic.lastReceivedAt
      ? `Last value ${topic.lastValue ?? "--"} ${topic.unit || ""} · ${formatTimestamp(topic.lastReceivedAt)}`.trim()
      : "尚未收到資料",
    editable: !isManagedIdentity,
    health,
    id: `mqtt:${topic.metricScope}:${topic.metricKey}:${topic.id}`,
    isManagedIdentity,
    kind: "generic",
    mapping: topic,
    metricKey: topic.metricKey,
    metricScope: topic.metricScope,
    ownedMetrics: [topic.metricKey],
    ownership: isManagedIdentity ? "managed" : "operator",
    resources: [
      {
        detail: topic.valuePath || "$.value",
        label: "MQTT topic",
        metrics: [topic.metricKey]
      }
    ],
    sourceType: "Generic MQTT mapping",
    sourceTopic: topic.topic || "尚未設定 topic"
  };
}

export function buildSourceRows(model: DataHubSourcesModel): SourceRow[] {
  const managedRows = model.solar.sources.map((source) =>
    buildManagedSourceRow(source, model.solar.zones)
  );
  const genericRows = model.topics.map((topic) => buildGenericSourceRow(topic, model.status));
  return [...managedRows, ...genericRows];
}

export type GenericMappingPatch = Partial<Pick<
  GenericMqttMapping,
  "enabled" | "metricKey" | "metricScope" | "nameEn" | "nameZh" | "multiplier" | "topic" | "unit" | "valuePath"
>>;

export function updateGenericMapping(
  topics: GenericMqttMapping[],
  id: number,
  patch: GenericMappingPatch
) {
  return topics.map((topic) => {
    if (topic.id !== id) {
      return topic;
    }

    const nextTopic = { ...topic, ...patch };
    return isSolarAdapterManagedMetricIdentity(nextTopic.metricScope, nextTopic.metricKey)
      ? topic
      : nextTopic;
  });
}

export function buildTopicMappingsSavePayload(topics: GenericMqttMapping[]) {
  return topics.map((topic) => ({
    enabled: topic.enabled,
    metricKey: topic.metricKey,
    metricScope: topic.metricScope,
    multiplier: topic.multiplier ?? 1,
    nameEn: topic.nameEn?.trim() ?? "",
    nameZh: topic.nameZh?.trim() ?? "",
    topic: topic.topic.trim(),
    unit: topic.unit.trim(),
    valuePath: topic.valuePath.trim()
  }));
}

export function resolveSourcesSaveErrorMessage(error: unknown) {
  const code = (error as { body?: { code?: unknown } } | null)?.body?.code;
  if (code === "MANAGED_SOURCE_METRIC_CONFLICT") {
    return "此 metric identity 已由 Solar adapter 管理，無法儲存 generic mapping。";
  }
  if (code === "DERIVED_METRIC_IDENTITY_CONFLICT") {
    return "此 metric identity 已由 derived metric 管理，無法儲存 generic mapping。";
  }
  if (code === "DUPLICATE_METRIC_IDENTITY") {
    return "相同 scope 的 metric identity 不可重複，請調整後再儲存。";
  }
  return error instanceof Error ? error.message : "Generic MQTT mappings 儲存失敗。";
}

export function normalizeTopicMapping(topic: TopicMappingsResponse["topics"][number]): GenericMqttMapping {
  const { rawPayload: _rawPayload, ...safeTopic } = topic;
  return safeTopic;
}

export async function fetchDataHubSourcesModel() {
  const [topicsResult, solarResult] = await Promise.allSettled([
    requestJson<TopicMappingsResponse>("/api/settings/mqtt/topics"),
    requestJson<SolarSourcesResponse>("/api/settings/mqtt/solar-sources")
  ]);
  const errors: string[] = [];

  const topics = topicsResult.status === "fulfilled" ? topicsResult.value : null;
  if (!topics) {
    const error = topicsResult.status === "rejected" ? topicsResult.reason : null;
    errors.push(error instanceof Error ? error.message : "Generic MQTT mappings 同步失敗。");
  }

  const solar = solarResult.status === "fulfilled" ? solarResult.value : emptySolarSources;
  if (solarResult.status === "rejected") {
    const error = solarResult.reason;
    errors.push(error instanceof Error ? error.message : "Solar managed sources 同步失敗。");
  }

  if (!topics && solarResult.status === "rejected") {
    throw new Error(errors.join("；"));
  }

  return {
    errorMessage: errors.join("；"),
    model: {
      solar,
      status: topics?.status ?? defaultMqttStatus,
      topics: topics?.topics.map(normalizeTopicMapping) ?? []
    } satisfies DataHubSourcesModel
  };
}

export function readCachedDataHubSourcesModel() {
  return cachedDataHubSourcesModel;
}

export function readCachedDataHubSourcesErrorMessage() {
  return cachedDataHubSourcesErrorMessage;
}

export function rememberDataHubSourcesModel(model: DataHubSourcesModel, errorMessage = "") {
  cachedDataHubSourcesModel = model;
  cachedDataHubSourcesErrorMessage = errorMessage;
}

export async function loadDataHubSourcesRoute() {
  try {
    const result = await fetchDataHubSourcesModel();
    rememberDataHubSourcesModel(result.model, result.errorMessage);
  } catch (error) {
    cachedDataHubSourcesModel = null;
    cachedDataHubSourcesErrorMessage = error instanceof Error
      ? error.message
      : "Sources 資料同步失敗。";
  }
  return null;
}
