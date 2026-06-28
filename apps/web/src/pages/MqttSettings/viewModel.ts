import type {
  DisplayReadinessReport,
  WeatherFieldKey,
  WeatherHeaderContract,
  WeatherOptionsResponse,
  WeatherSettings
} from "@solar-display/shared";
import type { ReferenceGlyphName } from "../../components/ReferenceGlyph";
import type { ReferenceTone } from "../../components/reference/ReferenceManagement";
import { resolveHeaderWeatherMeta } from "../../components/headerWeatherMeta";
import type { LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";
import { weatherFieldKeys } from "@solar-display/shared";
import { weatherFieldPresetOptions } from "./weatherFieldPresets";

export type DataMode = "mqtt" | "mock";

export type MqttSettingsForm = {
  dataMode: DataMode;
  host: string;
  port: string;
  username: string;
  password: string;
  clientId: string;
  reconnectInterval: string;
  messageTimeout: string;
};

export type MqttStatus = {
  connected: boolean;
  broker: string;
  clientId: string;
  reason: string | null;
  updatedAt: string | null;
};

export type TopicMapping = {
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

export type ActionState = {
  isLoadingSettings: boolean;
  isLoadingTopics: boolean;
  isSavingSettings: boolean;
  isSavingTopics: boolean;
  isTestingConnection: boolean;
  isReloadingTopics: boolean;
};

export type ConnectionTestFeedback = {
  connected: boolean;
  message: string;
} | null;

type DraftSections = {
  broker: boolean;
  topic: boolean;
  weather: boolean;
};

type BuildMqttSettingsViewModelArgs = {
  actionState: ActionState;
  draftSections?: DraftSections;
  errorMessage: string;
  lastConnectionTest: ConnectionTestFeedback;
  liveMetricsConnectionState: SocketConnectionState["status"];
  liveMetricsSnapshot: LiveMetricsSnapshot | null;
  message: string;
  readiness: DisplayReadinessReport | null;
  settings: MqttSettingsForm;
  status: MqttStatus;
  topics: TopicMapping[];
  weatherOptions: WeatherOptionsResponse | null;
  weatherOptionsErrorMessage: string;
  weatherPreviewContract: WeatherHeaderContract | null;
  weatherPreviewErrorMessage: string;
  weatherSettings: WeatherSettings;
};

type SectionGuide = {
  detail: string;
  title: string;
  tone: "ready" | "warning" | "error";
};

type TopicImpactGroup = {
  items: Array<{
    detail: string;
    metricLabelZh: string;
    storyLabel: string;
  }>;
  summary: string;
  title: string;
  tone: "ready" | "warning" | "error";
};

const weatherFieldLabelMap: Record<WeatherFieldKey, string> = {
  airPressure: "氣壓",
  airTemperature: "溫度",
  dailyHigh: "最高溫",
  dailyLow: "最低溫",
  observationTime: "觀測時間",
  precipitation: "降雨量",
  relativeHumidity: "相對濕度",
  weather: "天氣現象",
  windDirection: "風向",
  windSpeed: "風速"
};

const metricLabelMap: Record<string, { en: string; zh: string; icon: ReferenceGlyphName }> = {
  consumptionEnergy: { en: "Consumption Energy", icon: "plug", zh: "用電量" },
  factoryEvGreenPower: { en: "EV / Green Facility", icon: "leaf", zh: "綠能設施" },
  factoryHvacPower: { en: "HVAC Power", icon: "refresh", zh: "空調設備" },
  factoryInfrastructurePower: { en: "Infrastructure Power", icon: "bars", zh: "基礎設施" },
  factoryLightingPower: { en: "Lighting Power", icon: "sun", zh: "照明系統" },
  factoryOfficePower: { en: "Office Power", icon: "bars", zh: "辦公區域" },
  factoryProductionPower: { en: "Production Power", icon: "bolt", zh: "生產線用電" },
  phaseRCurrent: { en: "R-Phase Current", icon: "bolt", zh: "R 相電流" },
  phaseRPower: { en: "R-Phase Power", icon: "bolt", zh: "R 相功率" },
  phaseRVoltage: { en: "R-Phase Voltage", icon: "bolt", zh: "R 相電壓" },
  phaseSCurrent: { en: "S-Phase Current", icon: "bolt", zh: "S 相電流" },
  phaseSPower: { en: "S-Phase Power", icon: "bolt", zh: "S 相功率" },
  phaseSVoltage: { en: "S-Phase Voltage", icon: "bolt", zh: "S 相電壓" },
  phaseTCurrent: { en: "T-Phase Current", icon: "bolt", zh: "T 相電流" },
  phaseTPower: { en: "T-Phase Power", icon: "bolt", zh: "T 相功率" },
  phaseTVoltage: { en: "T-Phase Voltage", icon: "bolt", zh: "T 相電壓" },
  realTimePower: { en: "Real-time Power", icon: "bolt", zh: "即時發電功率" },
  selfConsumptionEnergy: { en: "Self Consumption", icon: "plug", zh: "自發自用量" },
  systemEfficiency: { en: "System Efficiency", icon: "sun", zh: "系統效率" },
  todayCo2Reduction: { en: "Today's CO2 Reduction", icon: "co2", zh: "今日減碳量" },
  todayGeneration: { en: "Today's Generation", icon: "sun", zh: "今日發電量" },
  totalCo2Reduction: { en: "Total CO2 Reduction", icon: "leaf", zh: "累積減碳量" },
  totalGeneration: { en: "Total Generation", icon: "bars", zh: "累積發電量" }
};

function describeMetric(metricKey: string) {
  return (
    metricLabelMap[metricKey] ?? {
      en: metricKey,
      icon: "bars",
      zh: metricKey
    }
  );
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "尚未收到";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-TW", {
    hour12: false
  });
}

function formatValue(value: number | null) {
  if (value === null) {
    return "--";
  }

  const maximumFractionDigits = Number.isInteger(value) ? 0 : 1;

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits
  });
}

function buildLastUpdateLabel(topics: TopicMapping[]) {
  const candidateValues = topics.flatMap((topic) => [topic.lastReceivedAt, topic.updatedAt]).filter(
    (value): value is string => Boolean(value)
  );

  if (candidateValues.length === 0) {
    return "尚未收到更新";
  }

  const latest = candidateValues
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  return latest
    ? latest.toLocaleString("zh-TW", {
        hour12: false
      })
    : "尚未收到更新";
}

function resolveTopicRuntime(
  topic: TopicMapping,
  status: MqttStatus,
  liveMetricsSnapshot: LiveMetricsSnapshot | null,
  liveMetricsConnectionState: SocketConnectionState["status"]
) {
  const liveReading = liveMetricsSnapshot?.metrics[topic.metricKey];
  const shouldPreferLiveReading =
    liveReading !== undefined &&
    (topic.lastReceivedAt === null || liveReading.timestamp >= topic.lastReceivedAt);
  const lastReceivedAt = shouldPreferLiveReading ? liveReading.timestamp : topic.lastReceivedAt;
  const lastValue = shouldPreferLiveReading ? liveReading.value : topic.lastValue;
  const quality = shouldPreferLiveReading ? liveReading.quality : topic.quality;
  const unit = shouldPreferLiveReading ? (liveReading.unit ?? topic.unit) : topic.unit;

  let runtimeLabel = "Disconnected";
  let runtimeTone: "connected" | "connecting" | "disconnected" = "disconnected";

  if (!topic.enabled) {
    runtimeLabel = "Disabled";
  } else if (shouldPreferLiveReading || lastReceivedAt !== null) {
    runtimeLabel = shouldPreferLiveReading || liveMetricsConnectionState === "connected" ? "Live" : "Fallback";
    runtimeTone =
      shouldPreferLiveReading || liveMetricsConnectionState === "connected" ? "connected" : "connecting";
  } else if (status.connected) {
    runtimeLabel = "Idle";
    runtimeTone = "connecting";
  }

  return {
    ...topic,
    lastReceivedAt,
    lastValue,
    quality,
    runtimeLabel,
    runtimeTone,
    runtimeUnit: unit
  };
}

const pageLabelMap: Record<string, string> = {
  factoryCircuit: "Factory Circuit",
  images: "Images",
  overview: "Overview",
  solar: "Solar",
  sustainability: "Sustainability"
};

function resolveRuntimePreviewStatus(
  status: MqttStatus,
  liveMetricsConnectionState: SocketConnectionState["status"],
  hasLiveTopicActivity: boolean
) {
  if (liveMetricsConnectionState === "connected") {
    return {
      statusDetail: "Socket live updates 會優先覆蓋舊的 poll snapshot，topic 活動會近即時反映在畫面上。",
      statusLabel: "即時串流中",
      statusTone: "connected" as const
    };
  }

  if (hasLiveTopicActivity || status.connected) {
    return {
      statusDetail: "目前改用 bootstrap / poll fallback 顯示最近一次 topic 狀態，等待 socket 即時串流恢復。",
      statusLabel: "Polling fallback",
      statusTone: "connecting" as const
    };
  }

  return {
    statusDetail: "Socket 與 broker 都尚未提供可用的即時 preview，請先檢查串流與連線狀態。",
    statusLabel: "串流不可用",
    statusTone: "disconnected" as const
  };
}

function resolveWeatherValidationFeedback(weatherSettings: WeatherSettings) {
  if (!weatherSettings.enabled) {
    return "";
  }

  if (!weatherSettings.countyName) {
    return "請先選擇縣市，才能決定 header 會顯示哪個地區。";
  }

  if (weatherSettings.locationMode === "station" && !weatherSettings.stationId) {
    return "請先選擇測站，才能確認 header 會顯示哪個站點。";
  }

  if (weatherSettings.preset === "custom" && weatherSettings.fieldKeys.length === 0) {
    return "至少勾選一個天氣欄位，header 才有可顯示的 weather metadata。";
  }

  return "";
}

function resolvePageLabel(pageId: string | null) {
  if (!pageId) {
    return "Mapped Runtime";
  }

  return pageLabelMap[pageId] ?? pageId;
}

function buildTopicImpactGroups(args: {
  coverageRows: Array<{
    detail: string | null;
    metricLabelZh: string;
    pageId: string | null;
    requirementKey: string;
    stateLabel: string;
  }>;
  mappedTopics: Array<{
    enabled: boolean;
    lastReceivedAt: string | null;
    metricLabelZh: string;
    topic: string;
  }>;
}): TopicImpactGroup[] {
  const mappingGapItems = args.coverageRows
    .filter((row) => row.stateLabel === "Mapping Gap")
    .map((row) => ({
      detail: row.detail,
      metricLabelZh: row.metricLabelZh,
      storyLabel: resolvePageLabel(row.pageId)
    }));
  const idleRuntimeItems = args.coverageRows
    .filter((row) => row.stateLabel === "Idle Runtime" || row.stateLabel === "Broker Disconnected")
    .map((row) => ({
      detail: row.detail,
      metricLabelZh: row.metricLabelZh,
      storyLabel: resolvePageLabel(row.pageId)
    }));
  const healthyItems = args.mappedTopics
    .filter((topic) => topic.enabled && topic.topic.trim() !== "" && topic.lastReceivedAt !== null)
    .map((topic) => ({
      detail: "已收到最新 topic runtime，可直接對照播放 surface。",
      metricLabelZh: topic.metricLabelZh,
      storyLabel: "Mapped Runtime"
    }));

  return [
    mappingGapItems.length > 0
      ? {
          items: mappingGapItems,
          summary: `${mappingGapItems.length} 個 display story 仍缺少 mapping`,
          title: "Mapping Gap Priority",
          tone: "error" as const
        }
      : null,
    idleRuntimeItems.length > 0
      ? {
          items: idleRuntimeItems,
          summary: `${idleRuntimeItems.length} 個已映射 metrics 正等待新收值`,
          title: "Idle Runtime",
          tone: "warning" as const
        }
      : null,
    healthyItems.length > 0
      ? {
          items: healthyItems,
          summary: `${healthyItems.length} 筆 mapping 已可供 display surface 使用`,
          title: "Healthy Mapping",
          tone: "ready" as const
        }
      : null
  ].filter((group): group is TopicImpactGroup => group !== null);
}

function resolveConnectionState(settings: MqttSettingsForm, status: MqttStatus) {
  if (settings.dataMode === "mock") {
    return {
      detail: "目前使用 Mock mode，仍保留 broker/topic mapping 契約供切回 MQTT 時直接套用。",
      label: "Mock mode",
      tone: "connecting" as const
    };
  }

  if (status.connected) {
    return {
      detail: `Broker ${status.broker || `${settings.host}:${settings.port}`} 已連線，可即時測試 topic 收值。`,
      label: "Broker 已連線",
      tone: "connected" as const
    };
  }

  return {
    detail: `目前尚未連上 ${status.broker || `${settings.host}:${settings.port}` }，請先檢查 broker 主機、port 與認證資訊。`,
    label: "Broker 未連線",
    tone: "disconnected" as const
  };
}

export function buildMqttSettingsViewModel({
  actionState,
  draftSections,
  errorMessage,
  lastConnectionTest,
  liveMetricsConnectionState,
  liveMetricsSnapshot,
  message,
  readiness,
  settings,
  status,
  topics,
  weatherOptions,
  weatherOptionsErrorMessage,
  weatherPreviewContract,
  weatherPreviewErrorMessage,
  weatherSettings
}: BuildMqttSettingsViewModelArgs) {
  const connection = resolveConnectionState(settings, status);
  const mappedTopics = topics.map((topic) => {
    const metric = describeMetric(topic.metricKey);
    const runtimeTopic = resolveTopicRuntime(
      topic,
      status,
      liveMetricsSnapshot,
      liveMetricsConnectionState
    );

    return {
      ...runtimeTopic,
      enabledLabel: topic.enabled ? "ON" : "OFF",
      lastReceivedLabel: formatTimestamp(runtimeTopic.lastReceivedAt),
      metricIcon: metric.icon,
      metricLabelEn: topic.nameEn ?? metric.en,
      metricLabelZh: topic.nameZh ?? metric.zh
    };
  });
  const enabledTopics = mappedTopics.filter((topic) => topic.enabled);
  const connectedTopics = enabledTopics.filter((topic) => topic.lastReceivedAt !== null);
  const lastUpdateLabel = buildLastUpdateLabel(mappedTopics);
  const runtimePreview = resolveRuntimePreviewStatus(
    status,
    liveMetricsConnectionState,
    connectedTopics.length > 0
  );
  const feedbackTone = errorMessage
    ? "error"
    : actionState.isTestingConnection
      ? "testing"
      : lastConnectionTest
        ? lastConnectionTest.connected
          ? "ready"
          : "error"
      : actionState.isSavingSettings || actionState.isSavingTopics
        ? "saving"
        : actionState.isLoadingSettings || actionState.isLoadingTopics
          ? "loading"
          : "ready";

  const feedbackToneMap: Record<typeof feedbackTone, ReferenceTone> = {
    error: "danger",
    loading: "muted",
    ready: "success",
    saving: "accent",
    testing: "warning"
  };

  const coverageRows = (readiness?.findings ?? [])
    .filter((finding) => finding.sourceType === "mqtt-metric")
    .map((finding) => {
      const topic = mappedTopics.find((candidate) => candidate.metricKey === finding.requirementKey);
      const metric = describeMetric(finding.requirementKey);

      if (!topic || !topic.enabled || topic.topic.trim() === "") {
        return {
          detail: finding.reason,
          metricLabelZh: metric.zh,
          pageId: finding.pageId,
          requirementKey: finding.requirementKey,
          stateLabel: "Mapping Gap",
          stateTone: "disconnected" as const
        };
      }

      if (topic.lastReceivedAt === null) {
        return {
          detail: status.connected ? finding.reason : "Broker 目前未連線，topic runtime 無法提供即時收值。",
          metricLabelZh: metric.zh,
          pageId: finding.pageId,
          requirementKey: finding.requirementKey,
          stateLabel: status.connected ? "Idle Runtime" : "Broker Disconnected",
          stateTone: status.connected ? ("connecting" as const) : ("disconnected" as const)
        };
      }

      return {
        detail: null,
        metricLabelZh: metric.zh,
        pageId: finding.pageId,
        requirementKey: finding.requirementKey,
        stateLabel: "Ready",
        stateTone: "connected" as const
      };
    });

  const coverageByMetricKey = new Map(
    coverageRows.map((row) => [row.requirementKey, row] as const)
  );

  const topicWorkspaceRows = mappedTopics.map((topic) => {
    const coverage = coverageByMetricKey.get(topic.metricKey) ?? null;

    return {
      ...topic,
      coverageDetail: coverage?.detail ?? null,
      coverageStateLabel: coverage?.stateLabel ?? null,
      lastUpdatedLabel: formatTimestamp(topic.updatedAt),
      qualityLabel: topic.quality ? `Quality: ${topic.quality}` : "Quality: --",
      valueLabel: formatValue(topic.lastValue)
    };
  });

  const stationOptions = (weatherOptions?.stations ?? []).filter((station) => {
    if (!weatherSettings.countyName) {
      return true;
    }

    return station.countyName === weatherSettings.countyName;
  });
  const weatherPreview = resolveHeaderWeatherMeta({
    current: weatherPreviewContract?.current ?? null,
    isHydrated: Boolean(weatherPreviewContract) || weatherPreviewErrorMessage.trim().length > 0,
    settings: {
      enabled: weatherSettings.enabled,
      fieldKeys: weatherSettings.fieldKeys,
      locationMode: weatherSettings.locationMode,
      preset: weatherSettings.preset
    }
  });
  const customFieldOptions = weatherSettings.preset === "custom"
    ? weatherFieldKeys.map((fieldKey) => ({
        checked: weatherSettings.fieldKeys.includes(fieldKey),
        label: weatherFieldLabelMap[fieldKey],
        value: fieldKey
      }))
    : [];
  const stationFeedback = weatherOptionsErrorMessage
    || (
      weatherSettings.locationMode === "station"
      && stationOptions.length === 0
      && weatherOptions?.fetchState !== "unconfigured"
        ? "目前無可用測站，請重新選擇縣市或稍後再試。"
        : ""
    );
  const configFeedback = weatherOptions?.fetchState === "unconfigured"
    ? "天氣資料來源（CWA 中央氣象署）尚未設定，因此無法載入縣市與測站清單。請在伺服器 .env 設定 CWA_AUTHORIZATION 後重新啟動服務。"
    : "";
  const localWeatherValidationFeedback = resolveWeatherValidationFeedback(weatherSettings);
  const topicImpactGroups = buildTopicImpactGroups({
    coverageRows,
    mappedTopics
  });
  const sectionGuides: Record<keyof DraftSections, SectionGuide> = {
    broker: draftSections?.broker
      ? {
          detail: `目前草稿尚未儲存；runtime 狀態仍為 ${connection.label}。`,
          title: "Broker 草稿待儲存",
          tone: connection.tone === "disconnected" ? "error" : "warning"
        }
      : {
          detail: connection.detail,
          title: connection.label,
          tone: connection.tone === "disconnected" ? "error" : "ready"
        },
    topic: draftSections?.topic
      ? {
          detail:
            topicImpactGroups[0]?.summary
            ?? "topic row 草稿尚未儲存，請確認 coverage 與 runtime 狀態後再存檔。",
          title: "Topic Workspace 有未儲存變更",
          tone: topicImpactGroups[0]?.tone ?? "warning"
        }
      : {
          detail: runtimePreview.statusDetail,
          title: runtimePreview.statusLabel,
          tone: runtimePreview.statusTone === "disconnected"
            ? "error"
            : runtimePreview.statusTone === "connecting"
              ? "warning"
              : "ready"
        },
    weather: draftSections?.weather
      ? {
          detail:
            localWeatherValidationFeedback
            || `儲存後 header 預計顯示：${weatherPreview.primaryText}`,
          title: "Header Contract 草稿待儲存",
          tone: localWeatherValidationFeedback ? "error" : "warning"
        }
      : {
          detail: `目前 header 顯示：${weatherPreview.primaryText}`,
          title: "Header Contract 已同步",
          tone: weatherPreview.state === "unavailable" ? "warning" : "ready"
        }
  };
  const weatherContractDetail = localWeatherValidationFeedback
    ? `${localWeatherValidationFeedback} 目前預覽：${weatherPreview.primaryText}`
    : `${draftSections?.weather ? "儲存後 header 預計顯示：" : "目前 header 顯示："}${weatherPreview.primaryText}`;

  return {
    actions: {
      reloadTopicsDisabled: actionState.isReloadingTopics,
      reloadTopicsLabel: actionState.isReloadingTopics ? "Reloading..." : "Reload topics",
      saveMappingsDisabled: actionState.isSavingTopics,
      saveMappingsLabel: actionState.isSavingTopics ? "Saving..." : "Save mappings",
      saveSettingsDisabled: actionState.isSavingSettings,
      saveSettingsLabel: actionState.isSavingSettings ? "Saving..." : "Save settings",
      testConnectionDisabled: actionState.isTestingConnection,
      testConnectionLabel: actionState.isTestingConnection ? "Testing..." : "Test connection"
    },
    brokerFields: [
      {
        disabled: actionState.isLoadingSettings || actionState.isSavingSettings,
        inputMode: "text",
        key: "host",
        label: "Broker 主機",
        subtitle: "Broker Host",
        type: "text",
        value: settings.host
      },
      {
        disabled: actionState.isLoadingSettings || actionState.isSavingSettings,
        inputMode: "numeric",
        key: "port",
        label: "連接埠",
        subtitle: "Port",
        type: "text",
        value: settings.port
      },
      {
        disabled: actionState.isLoadingSettings || actionState.isSavingSettings,
        inputMode: "text",
        key: "clientId",
        label: "Client ID",
        subtitle: "Client Identifier",
        type: "text",
        value: settings.clientId
      },
      {
        disabled: actionState.isLoadingSettings || actionState.isSavingSettings,
        inputMode: "text",
        key: "username",
        label: "使用者名稱",
        subtitle: "Username",
        type: "text",
        value: settings.username
      },
      {
        disabled: actionState.isLoadingSettings || actionState.isSavingSettings,
        inputMode: "text",
        key: "password",
        label: "密碼",
        subtitle: "Password",
        type: "password",
        value: settings.password
      },
      {
        disabled: actionState.isLoadingSettings || actionState.isSavingSettings,
        inputMode: "numeric",
        key: "reconnectInterval",
        label: "重新連線間隔",
        subtitle: "Reconnect Interval",
        type: "text",
        value: settings.reconnectInterval
      },
      {
        disabled: actionState.isLoadingSettings || actionState.isSavingSettings,
        inputMode: "numeric",
        key: "messageTimeout",
        label: "訊息逾時",
        subtitle: "Message Timeout",
        type: "text",
        value: settings.messageTimeout
      }
    ],
    connection: {
      brokerLabel: status.broker || `${settings.host}:${settings.port}`,
      clientIdLabel: status.clientId || settings.clientId,
      lastUpdateLabel,
      statusDetail: connection.detail,
      statusLabel: connection.label,
      statusTone: connection.tone
    },
    emptyState:
      topics.length === 0
        ? {
            description: "保留 broker config、topic mapping 與 live preview 版位，等待第一批 metric/topic 對應建立。",
            title: "尚未設定 topic mappings"
          }
        : enabledTopics.length === 0
          ? {
              description: "目前所有 topic mapping 都是停用狀態，因此即時資料預覽不會顯示任何卡片。",
              title: "尚未啟用任何 topic"
            }
          : null,
    feedbackBanner: {
      detail: errorMessage || lastConnectionTest?.message || message,
      title:
        errorMessage ||
        (lastConnectionTest
          ? lastConnectionTest.connected
            ? "Test connection 成功"
            : "Test connection 失敗"
          : connection.label),
      tone: feedbackTone,
      visualTone: feedbackToneMap[feedbackTone]
    },
    sectionGuides,
    coverageRows,
    topicWorkspaceRows,
    topicWorkspaceSummary: {
      coverageCount: coverageRows.length,
      impactGroups: topicImpactGroups,
      runtimeStatusDetail: runtimePreview.statusDetail,
      runtimeStatusLabel: runtimePreview.statusLabel,
      runtimeStatusTone: runtimePreview.statusTone
    },
    liveTopicRows: mappedTopics,
    mappingRows: mappedTopics,
    modeOptions: [
      {
        isActive: settings.dataMode === "mqtt",
        label: "MQTT",
        value: "mqtt" as DataMode
      },
      {
        isActive: settings.dataMode === "mock",
        label: "Mock",
        value: "mock" as DataMode
      }
    ],
    previewCards: enabledTopics.map((topic) => {
      return {
        icon: topic.metricIcon,
        id: topic.id,
        lastReceivedLabel: formatTimestamp(topic.lastReceivedAt),
        metricKey: topic.metricKey,
        metricLabelEn: topic.metricLabelEn,
        metricLabelZh: topic.metricLabelZh,
        payloadLabel: topic.rawPayload ?? "尚未收到 payload",
        qualityLabel: topic.quality ? `Quality: ${topic.quality}` : "Quality: --",
        runtimeTone: topic.runtimeTone,
        runtimeLabel: topic.runtimeLabel,
        topicLabel: topic.topic || "未設定 topic",
        unitLabel: topic.runtimeUnit,
        valueLabel: formatValue(topic.lastValue)
      };
    }),
    runtimePreview,
    summary: {
      connectedTopicCount: connectedTopics.length,
      enabledTopicCount: enabledTopics.length,
      modeLabel: settings.dataMode === "mqtt" ? "MQTT" : "Mock",
      totalTopicCount: topics.length
    },
    summaryCards: [
      {
        helper: "切換 MQTT 或 Mock，維持同一組展示資料契約",
        icon: "refresh" as ReferenceGlyphName,
        id: "mode",
        subtitle: "Data Mode",
        title: "資料模式",
        tone: settings.dataMode === "mock" ? ("accent" as ReferenceTone) : ("success" as ReferenceTone),
        value: settings.dataMode === "mqtt" ? "MQTT" : "Mock"
      },
      {
        helper: "目前 topic mapping 列數",
        icon: "bars" as ReferenceGlyphName,
        id: "totalTopics",
        subtitle: "Topic Rows",
        title: "映射總數",
        tone: "default" as ReferenceTone,
        value: String(topics.length)
      },
      {
        helper: "會進入播放器資料流的 topic 數量",
        icon: "bolt" as ReferenceGlyphName,
        id: "enabledTopics",
        subtitle: "Enabled Topics",
        title: "已啟用 Topic",
        tone: enabledTopics.length > 0 ? ("success" as ReferenceTone) : ("muted" as ReferenceTone),
        value: String(enabledTopics.length)
      },
      {
        helper: `最後更新：${lastUpdateLabel}`,
        icon: "leaf" as ReferenceGlyphName,
        id: "liveTopics",
        subtitle: "Live Topics",
        title: "即時收值",
        tone: connectedTopics.length > 0 ? ("accent" as ReferenceTone) : ("muted" as ReferenceTone),
        value: String(connectedTopics.length)
      }
    ],
    topicRows: mappedTopics,
    weatherCard: {
      configFeedback,
      contractStatusDetail: weatherContractDetail,
      contractStatusTitle: sectionGuides.weather.title,
      countyOptions: weatherOptions?.counties ?? [],
      customFieldOptions,
      enabled: weatherSettings.enabled,
      localValidationFeedback: localWeatherValidationFeedback,
      locationMode: weatherSettings.locationMode,
      locationOptions: [
        { label: "指定測站", value: "station" as const },
        { label: "依縣市", value: "county" as const }
      ],
      preset: weatherSettings.preset,
      presetOptions: weatherFieldPresetOptions,
      preview: weatherPreview,
      previewFeedback: weatherPreviewErrorMessage,
      stationFeedback,
      stationOptions
    }
  };
}
