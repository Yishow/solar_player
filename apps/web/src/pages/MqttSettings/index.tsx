import { useEffect, useMemo, useState } from "react";
import { requestJson } from "../../services/api";
import "./mqttSettings.css";
import {
  buildMqttSettingsViewModel,
  type ActionState,
  type ConnectionTestFeedback,
  type DataMode,
  type MqttSettingsForm,
  type MqttStatus,
  type TopicMapping
} from "./viewModel";

const PREVIEW_ICON_GLYPHS: Record<string, string> = {
  bars: "▤",
  bolt: "⚡",
  co2: "CO₂",
  leaf: "🌱",
  plug: "⌁",
  refresh: "↻",
  sun: "☀"
};

const defaultMetricOptions = [
  "realTimePower",
  "todayGeneration",
  "totalGeneration",
  "todayCo2Reduction",
  "totalCo2Reduction",
  "selfConsumptionEnergy",
  "consumptionEnergy",
  "systemEfficiency",
  "factoryProductionPower",
  "factoryHvacPower",
  "factoryLightingPower",
  "factoryOfficePower",
  "factoryEvGreenPower",
  "factoryInfrastructurePower"
] as const;

type MqttSettingsResponse = {
  settings: {
    dataMode: DataMode;
    host: string;
    port: number;
    username: string;
    password: string;
    clientId: string;
    reconnectInterval: number;
    messageTimeout: number;
  };
  status: MqttStatus;
};

type TopicMappingsResponse = {
  topics: TopicMapping[];
};

const defaultFormState: MqttSettingsForm = {
  clientId: "solar-display-player",
  dataMode: "mqtt",
  host: "localhost",
  messageTimeout: "30",
  password: "",
  port: "1883",
  reconnectInterval: "5000",
  username: ""
};

function toFormState(settings: MqttSettingsResponse["settings"]): MqttSettingsForm {
  return {
    clientId: settings.clientId,
    dataMode: settings.dataMode,
    host: settings.host,
    messageTimeout: String(settings.messageTimeout),
    password: settings.password,
    port: String(settings.port),
    reconnectInterval: String(settings.reconnectInterval),
    username: settings.username
  };
}

function buildSettingsPayload(settings: MqttSettingsForm) {
  return {
    clientId: settings.clientId.trim(),
    dataMode: settings.dataMode,
    host: settings.host.trim(),
    messageTimeout: Number.parseInt(settings.messageTimeout, 10) || 30,
    password: settings.password,
    port: Number.parseInt(settings.port, 10) || 1883,
    reconnectInterval: Number.parseInt(settings.reconnectInterval, 10) || 5000,
    username: settings.username.trim()
  };
}

function createEmptyMapping(metricKey: string): TopicMapping {
  return {
    enabled: true,
    id: -Date.now(),
    lastReceivedAt: null,
    lastValue: null,
    metricKey,
    quality: null,
    rawPayload: null,
    topic: "",
    unit: "",
    updatedAt: null,
    valuePath: ""
  };
}

type ConnStatusVariant = "is-connected" | "is-warning" | "is-error";

function resolveConnStatus(args: {
  feedbackTone: string;
  feedbackVisualTone: string;
  statusTone: "connected" | "connecting" | "disconnected";
}): ConnStatusVariant {
  if (args.feedbackVisualTone === "danger" || args.feedbackTone === "error") {
    return "is-error";
  }
  if (args.statusTone === "connected") {
    return "is-connected";
  }
  if (args.statusTone === "disconnected") {
    return "is-error";
  }
  return "is-warning";
}

export function MqttSettings() {
  const [settings, setSettings] = useState<MqttSettingsForm>(defaultFormState);
  const [status, setStatus] = useState<MqttStatus>({
    broker: "",
    clientId: "",
    connected: false
  });
  const [topics, setTopics] = useState<TopicMapping[]>([]);
  const [lastConnectionTest, setLastConnectionTest] = useState<ConnectionTestFeedback>(null);
  const [message, setMessage] = useState("正在載入 MQTT 設定...");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionState, setActionState] = useState<ActionState>({
    isLoadingSettings: true,
    isLoadingTopics: true,
    isReloadingTopics: false,
    isSavingSettings: false,
    isSavingTopics: false,
    isTestingConnection: false
  });

  const metricOptions = useMemo(() => {
    const optionSet = new Set<string>(defaultMetricOptions);
    topics.forEach((topic) => optionSet.add(topic.metricKey));
    return [...optionSet];
  }, [topics]);

  const markDirty = (nextMessage: string) => {
    setLastConnectionTest(null);
    setMessage(nextMessage);
    setErrorMessage("");
  };

  const loadSettings = async () => {
    setActionState((current) => ({ ...current, isLoadingSettings: true }));
    try {
      const response = await requestJson<MqttSettingsResponse>("/api/settings/mqtt");
      setSettings(toFormState(response.settings));
      setStatus(response.status);
      setLastConnectionTest(null);
      setMessage("MQTT 設定已同步。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入 MQTT 設定失敗。");
    } finally {
      setActionState((current) => ({ ...current, isLoadingSettings: false }));
    }
  };

  const loadTopics = async (isPolling: boolean) => {
    if (!isPolling) {
      setActionState((current) => ({ ...current, isLoadingTopics: true }));
    }
    try {
      const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/topics");
      setTopics(response.topics);
      if (!isPolling) {
        setLastConnectionTest(null);
        setMessage("Topic mappings 已同步。");
        setErrorMessage("");
      }
    } catch (error) {
      if (!isPolling) {
        setErrorMessage(error instanceof Error ? error.message : "載入 topic mappings 失敗。");
      }
    } finally {
      if (!isPolling) {
        setActionState((current) => ({ ...current, isLoadingTopics: false }));
      }
    }
  };

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        await Promise.all([loadSettings(), loadTopics(false)]);
      } catch {
        // individual loaders surface their own errors
      }
    };
    void bootstrap();

    const pollTimer = window.setInterval(() => {
      if (active) {
        void loadTopics(true);
      }
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(pollTimer);
    };
  }, []);

  const handleSettingChange = <Key extends keyof MqttSettingsForm>(
    key: Key,
    value: MqttSettingsForm[Key]
  ) => {
    markDirty("Broker 設定已變更，尚未儲存。");
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleTopicChange = <Key extends keyof TopicMapping>(
    rowId: number,
    key: Key,
    value: TopicMapping[Key]
  ) => {
    markDirty("Topic mappings 已變更，尚未儲存。");
    setTopics((current) =>
      current.map((topic) => (topic.id === rowId ? { ...topic, [key]: value } : topic))
    );
  };

  const saveSettings = async () => {
    setActionState((current) => ({ ...current, isSavingSettings: true }));
    try {
      const response = await requestJson<MqttSettingsResponse>("/api/settings/mqtt", {
        body: JSON.stringify(buildSettingsPayload(settings)),
        method: "PUT"
      });
      setSettings(toFormState(response.settings));
      setStatus(response.status);
      setLastConnectionTest(null);
      setMessage("MQTT broker 設定已儲存並重新連線。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存 MQTT 設定失敗。");
    } finally {
      setActionState((current) => ({ ...current, isSavingSettings: false }));
    }
  };

  const testConnection = async () => {
    setActionState((current) => ({ ...current, isTestingConnection: true }));
    try {
      const response = await requestJson<{
        connected: boolean;
        message: string;
        status: MqttStatus;
      }>("/api/settings/mqtt/test", {
        body: JSON.stringify(buildSettingsPayload(settings)),
        method: "POST"
      });
      setStatus(response.status);
      setLastConnectionTest({ connected: response.connected, message: response.message });
      setMessage(response.message);
      setErrorMessage("");
    } catch (error) {
      setLastConnectionTest(null);
      setErrorMessage(error instanceof Error ? error.message : "測試連線失敗。");
    } finally {
      setActionState((current) => ({ ...current, isTestingConnection: false }));
    }
  };

  const saveTopicMappings = async () => {
    setActionState((current) => ({ ...current, isSavingTopics: true }));
    try {
      const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/topics", {
        body: JSON.stringify({
          topics: topics.map((topic) => ({
            enabled: topic.enabled,
            metricKey: topic.metricKey,
            topic: topic.topic.trim(),
            unit: topic.unit.trim(),
            valuePath: topic.valuePath.trim()
          }))
        }),
        method: "PUT"
      });
      setTopics(response.topics);
      setLastConnectionTest(null);
      setMessage("Topic mappings 已更新並重新載入訂閱。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存 topic mappings 失敗。");
    } finally {
      setActionState((current) => ({ ...current, isSavingTopics: false }));
    }
  };

  const reloadTopics = async () => {
    setActionState((current) => ({ ...current, isReloadingTopics: true }));
    try {
      const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/reload", {
        method: "POST"
      });
      setTopics(response.topics);
      setLastConnectionTest(null);
      setMessage("MQTT 訂閱清單已重新載入。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "重新載入 topic mappings 失敗。");
    } finally {
      setActionState((current) => ({ ...current, isReloadingTopics: false }));
    }
  };

  const addTopicMapping = () => {
    const nextMetricKey =
      metricOptions.find((option) => !topics.some((topic) => topic.metricKey === option)) ??
      metricOptions[0];
    if (!nextMetricKey) return;
    markDirty("已新增一筆 topic mapping，尚未儲存。");
    setTopics((current) => [...current, createEmptyMapping(nextMetricKey)]);
  };

  const removeTopicMapping = (rowId: number) => {
    markDirty("已移除一筆 topic mapping，尚未儲存。");
    setTopics((current) => current.filter((topic) => topic.id !== rowId));
  };

  const viewModel = buildMqttSettingsViewModel({
    actionState,
    errorMessage,
    lastConnectionTest,
    message,
    settings,
    status,
    topics
  });

  const connStatusVariant = resolveConnStatus({
    feedbackTone: viewModel.feedbackBanner.tone,
    feedbackVisualTone: viewModel.feedbackBanner.visualTone,
    statusTone: viewModel.connection.statusTone
  });

  return (
    <div className="mqtt-settings-page">
      <section className="mqtt-title">
        <h1>
          資料來源與 <em>MQTT</em> 設定
        </h1>
        <p>Data Source &amp; MQTT Settings</p>
      </section>

      <button
        type="button"
        className="mgmt-action mqtt-test-conn"
        disabled={viewModel.actions.testConnectionDisabled}
        onClick={() => void testConnection()}
      >
        {viewModel.actions.testConnectionLabel}
        <small>Test Connection</small>
      </button>
      <button
        type="button"
        className="mgmt-action primary mqtt-save"
        disabled={viewModel.actions.saveSettingsDisabled}
        onClick={() => void saveSettings()}
      >
        {viewModel.actions.saveSettingsLabel}
        <small>Save Settings</small>
      </button>

      {/* mode + broker fields card */}
      <section className="settings-card mqtt-mode">
        <div className="settings-card__title">
          資料來源模式
          <small>Data Mode</small>
        </div>

        <div className="seg" role="tablist">
          {viewModel.modeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={option.isActive}
              className={option.isActive ? "active" : ""}
              onClick={() => handleSettingChange("dataMode", option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="broker-fields">
          {viewModel.brokerFields.map((field) => (
            <label key={field.key} className="text-field">
              <span className="field-label">{field.label}</span>
              <input
                type={field.type}
                disabled={field.disabled}
                inputMode={field.inputMode === "numeric" ? "numeric" : undefined}
                value={field.value}
                onChange={(event) =>
                  handleSettingChange(
                    field.key as keyof MqttSettingsForm,
                    event.target.value as MqttSettingsForm[keyof MqttSettingsForm]
                  )
                }
              />
            </label>
          ))}
        </div>

        <div className={`conn-status ${connStatusVariant}`} role="status">
          <span className="conn-status__dot" aria-hidden />
          {viewModel.feedbackBanner.title}
          <small>{viewModel.feedbackBanner.detail}</small>
        </div>
      </section>

      {/* live topic list */}
      <section className="settings-card mqtt-topic">
        <div className="settings-card__title">
          即時 Topic 清單
          <small>Live Topic List</small>
        </div>

        {viewModel.liveTopicRows.length === 0 ? (
          <div className="empty-block">
            尚未建立 topic mapping，新增後這裡會顯示 broker 的即時收值。
          </div>
        ) : (
          <div className="topic-list">
            {viewModel.liveTopicRows.map((topic) => {
              const dotState = !topic.enabled
                ? "is-disabled"
                : topic.runtimeTone === "connected"
                  ? ""
                  : "is-idle";
              return (
                <div className="topic-row" key={`live-${topic.id}`}>
                  <span className={`topic-row__dot ${dotState}`} aria-hidden />
                  <div className="topic-row__topic">{topic.topic || "未設定 topic"}</div>
                  <small className="topic-row__meta">
                    {topic.metricLabelZh}　·　{topic.runtimeLabel}　·　最後收值 {topic.lastReceivedLabel}
                  </small>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* topic mapping editor */}
      <section className="settings-card mqtt-map">
        <div className="settings-card__title">
          Topic 對應設定
          <small>Topic Mapping</small>
        </div>

        <div className="map-list">
          {viewModel.mappingRows.length === 0 ? (
            <div className="empty-block">尚未設定任何 topic mapping。</div>
          ) : (
            viewModel.mappingRows.map((topic) => (
              <div className="map-row" key={`map-${topic.id}`}>
                <label className="map-row__label">
                  {topic.metricLabelZh}
                  <small>{topic.metricLabelEn}</small>
                </label>
                <div className="map-row__fields">
                  <input
                    type="text"
                    placeholder="topic"
                    value={topic.topic}
                    onChange={(event) => handleTopicChange(topic.id, "topic", event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="unit"
                    value={topic.unit}
                    onChange={(event) => handleTopicChange(topic.id, "unit", event.target.value)}
                  />
                </div>
                <div className="map-row__controls">
                  <label className="map-row__toggle">
                    <input
                      type="checkbox"
                      checked={topic.enabled}
                      onChange={(event) => handleTopicChange(topic.id, "enabled", event.target.checked)}
                    />
                    啟用 ({topic.enabledLabel})
                  </label>
                  <button
                    type="button"
                    className="map-row__remove"
                    onClick={() => removeTopicMapping(topic.id)}
                  >
                    移除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="map-actions">
          <button type="button" className="map-add" onClick={addTopicMapping}>
            ＋ 新增 mapping
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="map-add"
              disabled={viewModel.actions.reloadTopicsDisabled}
              onClick={() => void reloadTopics()}
            >
              {viewModel.actions.reloadTopicsLabel}
            </button>
            <button
              type="button"
              className="map-save"
              disabled={viewModel.actions.saveMappingsDisabled}
              onClick={() => void saveTopicMappings()}
            >
              {viewModel.actions.saveMappingsLabel}
            </button>
          </div>
        </div>
      </section>

      {/* live data preview */}
      <section className="settings-card mqtt-preview">
        <div className="settings-card__title">
          即時資料預覽
          <small>Live Data Preview</small>
        </div>

        {viewModel.emptyState ? (
          <div className="empty-block">
            {viewModel.emptyState.title}
            <br />
            <span style={{ display: "inline-block", marginTop: 8, fontSize: 13 }}>
              {viewModel.emptyState.description}
            </span>
          </div>
        ) : (
          <div className="preview-list">
            {viewModel.previewCards.map((topic) => (
              <div className="preview-row" key={`preview-${topic.id}`}>
                <span
                  className={`preview-row__icon ${topic.runtimeTone === "connected" ? "is-live" : ""}`}
                  aria-hidden
                >
                  {PREVIEW_ICON_GLYPHS[topic.icon] ?? "·"}
                </span>
                <label className="preview-row__label">
                  {topic.metricLabelZh}
                  <small>{topic.metricLabelEn}</small>
                </label>
                <b className="preview-row__value">
                  {topic.valueLabel}
                  <small>{topic.unitLabel || "--"}</small>
                </b>
              </div>
            ))}
          </div>
        )}

        <p className="last-update">最後更新時間 {viewModel.connection.lastUpdateLabel}</p>
      </section>
    </div>
  );
}
