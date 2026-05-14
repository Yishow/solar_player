import type { ReferenceGlyphName } from "../../components/ReferenceGlyph";
import type { ReferenceTone } from "../../components/reference/ReferenceManagement";

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
};

export type TopicMapping = {
  id: number;
  metricKey: string;
  topic: string;
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

type BuildMqttSettingsViewModelArgs = {
  actionState: ActionState;
  errorMessage: string;
  lastConnectionTest: ConnectionTestFeedback;
  message: string;
  settings: MqttSettingsForm;
  status: MqttStatus;
  topics: TopicMapping[];
};

const metricLabelMap: Record<string, { en: string; zh: string; icon: ReferenceGlyphName }> = {
  consumptionEnergy: { en: "Consumption Energy", icon: "plug", zh: "用電量" },
  factoryEvGreenPower: { en: "EV / Green Facility", icon: "leaf", zh: "綠能設施" },
  factoryHvacPower: { en: "HVAC Power", icon: "refresh", zh: "空調設備" },
  factoryInfrastructurePower: { en: "Infrastructure Power", icon: "bars", zh: "基礎設施" },
  factoryLightingPower: { en: "Lighting Power", icon: "sun", zh: "照明系統" },
  factoryOfficePower: { en: "Office Power", icon: "bars", zh: "辦公區域" },
  factoryProductionPower: { en: "Production Power", icon: "bolt", zh: "生產線用電" },
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
  errorMessage,
  lastConnectionTest,
  message,
  settings,
  status,
  topics
}: BuildMqttSettingsViewModelArgs) {
  const connection = resolveConnectionState(settings, status);
  const enabledTopics = topics.filter((topic) => topic.enabled);
  const connectedTopics = enabledTopics.filter((topic) => topic.lastReceivedAt !== null);
  const lastUpdateLabel = buildLastUpdateLabel(topics);
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

  const mappedTopics = topics.map((topic) => {
    const metric = describeMetric(topic.metricKey);

    return {
      ...topic,
      enabledLabel: topic.enabled ? "ON" : "OFF",
      lastReceivedLabel: formatTimestamp(topic.lastReceivedAt),
      metricIcon: metric.icon,
      metricLabelEn: metric.en,
      metricLabelZh: metric.zh,
      runtimeLabel: topic.lastReceivedAt ? "Live" : topic.enabled ? "Idle" : "Disabled",
      runtimeTone: topic.lastReceivedAt
        ? ("connected" as const)
        : topic.enabled
          ? ("connecting" as const)
          : ("disconnected" as const)
    };
  });

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
      const metric = describeMetric(topic.metricKey);

      return {
        icon: metric.icon,
        id: topic.id,
        lastReceivedLabel: formatTimestamp(topic.lastReceivedAt),
        metricKey: topic.metricKey,
        metricLabelEn: metric.en,
        metricLabelZh: metric.zh,
        payloadLabel: topic.rawPayload ?? "尚未收到 payload",
        qualityLabel: topic.quality ? `Quality: ${topic.quality}` : "Quality: --",
        runtimeTone: topic.lastReceivedAt ? ("connected" as const) : ("disconnected" as const),
        runtimeLabel: topic.lastReceivedAt ? "Live" : "Idle",
        topicLabel: topic.topic || "未設定 topic",
        unitLabel: topic.unit,
        valueLabel: formatValue(topic.lastValue)
      };
    }),
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
    topicRows: mappedTopics
  };
}
