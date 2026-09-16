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
  configRevision?: number;
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
  sourceRef?: string;
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
  capabilities?: {
    legacyReplaceSupported: boolean;
    versionedSourceEditing: boolean;
  };
  collectionRevision?: number;
  solar: {
    errors: SolarSourceContractError[];
    sources: SolarManagedSource[];
    zones: SolarManagedZone[];
  };
  status: MqttSourceStatus;
  topics: GenericMqttMapping[];
};

type TopicMappingsResponse = {
  capabilities?: {
    legacyReplaceSupported: boolean;
    versionedSourceEditing: boolean;
  };
  collectionRevision?: number;
  status: MqttSourceStatus;
  topics: Array<GenericMqttMapping & { rawPayload?: string | null }>;
};

export type SourceMappingMutationResponse = {
  configuration?: Partial<GenericMqttMapping> | null;
  persistence?: "committed";
  revision?: number;
  runtime?: string;
  sourceRef?: string;
  success?: true;
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
  if (code === "SOURCE_REVISION_CONFLICT" || code === "COLLECTION_REVISION_CONFLICT") {
    return "此資料來源已被其他操作者更新，為避免覆蓋最新設定，已取消儲存。請重新整理或檢視最新版本。";
  }
  if (code === "LEGACY_WRITE_REQUIRES_REVISION") {
    return "伺服器已啟用版本化來源管理，不允許無版本寫入。請升級用戶端或以單筆方式儲存。";
  }
  if (code === "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD") {
    return "請求金鑰已被使用於不同的變更內容，請重新操作。";
  }
  if (code === "E1_SOURCE_IMPACT_UNKNOWN") {
    return "無法確認引用影響，未知影響不能當成沒有引用。";
  }
  if (code === "E1_SOURCE_IN_USE") {
    return "這個來源仍被引用，已阻擋變更或刪除。";
  }
  if (code === "E1_SOURCE_REVISION_REQUIRED") {
    return "此來源屬於受審核的正式電錶，若需修改語意或計量單位，請走審核修訂流程。";
  }
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

function definedEntries(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

/**
 * Mutation responses return the editable configuration separately from the
 * source identity envelope. Keep the existing row metadata while merging both
 * parts so a local save cannot lose its id, sourceRef, or revision.
 */
export function normalizeSavedTopicMapping(
  response: SourceMappingMutationResponse,
  previous: GenericMqttMapping
): GenericMqttMapping {
  const configuration = response.configuration && typeof response.configuration === "object"
    ? definedEntries(response.configuration as Record<string, unknown>)
    : {};
  const identity = {
    ...(typeof response.revision === "number" && Number.isInteger(response.revision) && response.revision > 0
      ? { configRevision: response.revision }
      : {}),
    ...(typeof response.sourceRef === "string" && response.sourceRef.trim()
      ? { sourceRef: response.sourceRef }
      : {})
  };
  return normalizeTopicMapping({
    ...previous,
    ...configuration,
    ...identity
  } as TopicMappingsResponse["topics"][number]);
}

export async function saveSingleSourceMappingApi({
  sourceRef,
  expectedRevision,
  patch,
  idempotencyKey
}: {
  expectedRevision: number;
  idempotencyKey?: string;
  patch: GenericMappingPatch;
  sourceRef: string;
}) {
  return requestJson<SourceMappingMutationResponse>(`/api/data-hub/source-mappings/${encodeURIComponent(sourceRef)}`, {
    body: JSON.stringify({
      expectedRevision,
      idempotencyKey: idempotencyKey ?? `save_${sourceRef}_${Date.now()}`,
      patch
    }),
    method: "PATCH"
  });
}

export async function deleteSingleSourceMappingApi({
  sourceRef,
  expectedRevision,
  idempotencyKey
}: {
  expectedRevision: number;
  idempotencyKey?: string;
  sourceRef: string;
}) {
  return requestJson<{
    deleted: true;
    persistence: "committed";
    runtime: string;
    sourceRef: string;
    success: true;
  }>(`/api/data-hub/source-mappings/${encodeURIComponent(sourceRef)}`, {
    body: JSON.stringify({
      expectedRevision,
      idempotencyKey: idempotencyKey ?? `del_${sourceRef}_${Date.now()}`
    }),
    method: "DELETE"
  });
}

export async function createSingleSourceMappingApi({
  source,
  idempotencyKey
}: {
  idempotencyKey?: string;
  source: GenericMqttMapping;
}) {
  return requestJson<SourceMappingMutationResponse>("/api/data-hub/source-mappings", {
    body: JSON.stringify({
      idempotencyKey: idempotencyKey ?? `create_${Date.now()}`,
      source: {
        decimalPlaces: source.unit === "%" ? 1 : 2,
        enabled: source.enabled,
        metricKey: source.metricKey,
        metricScope: source.metricScope,
        multiplier: source.multiplier ?? 1,
        nameEn: source.nameEn ?? "",
        nameZh: source.nameZh ?? "",
        offset: 0,
        topic: source.topic,
        unit: source.unit,
        valuePath: source.valuePath
      }
    }),
    method: "POST"
  });
}

export async function fetchDataHubCapabilities(): Promise<{ legacyReplaceSupported: boolean; versionedSourceEditing: boolean }> {
  try {
    const res = await requestJson<{ capabilities: { legacyReplaceSupported: boolean; versionedSourceEditing: boolean } }>(
      "/api/data-hub/capabilities"
    );
    return res.capabilities;
  } catch {
    return {
      legacyReplaceSupported: true,
      versionedSourceEditing: true
    };
  }
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
      capabilities: topics?.capabilities ?? {
        legacyReplaceSupported: true,
        versionedSourceEditing: true
      },
      collectionRevision: topics?.collectionRevision ?? 1,
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
