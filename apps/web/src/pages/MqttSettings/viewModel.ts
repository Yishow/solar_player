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
    connection: {
      brokerLabel: status.broker || `${settings.host}:${settings.port}`,
      clientIdLabel: status.clientId || settings.clientId,
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
      tone: feedbackTone
    },
    previewCards: enabledTopics.map((topic) => ({
      id: topic.id,
      lastReceivedLabel: formatTimestamp(topic.lastReceivedAt),
      metricKey: topic.metricKey,
      payloadLabel: topic.rawPayload ?? "尚未收到 payload",
      qualityLabel: topic.quality ? `Quality: ${topic.quality}` : "Quality: --",
      runtimeTone: topic.lastReceivedAt ? ("connected" as const) : ("disconnected" as const),
      runtimeLabel: topic.lastReceivedAt ? "Live" : "Idle",
      topicLabel: topic.topic || "未設定 topic",
      unitLabel: topic.unit,
      valueLabel: formatValue(topic.lastValue)
    })),
    summary: {
      connectedTopicCount: connectedTopics.length,
      enabledTopicCount: enabledTopics.length,
      modeLabel: settings.dataMode === "mqtt" ? "MQTT" : "Mock",
      totalTopicCount: topics.length
    },
    topicRows: topics.map((topic) => ({
      ...topic,
      enabledLabel: topic.enabled ? "ON" : "OFF",
      lastReceivedLabel: formatTimestamp(topic.lastReceivedAt),
      runtimeLabel: topic.lastReceivedAt ? "Live" : topic.enabled ? "Idle" : "Disabled",
      runtimeTone: topic.lastReceivedAt
        ? ("connected" as const)
        : topic.enabled
          ? ("connecting" as const)
          : ("disconnected" as const)
    }))
  };
}
