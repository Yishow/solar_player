import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_WEATHER_SETTINGS,
  type WeatherFieldKey,
  type WeatherHeaderContract,
  type WeatherOptionsResponse,
  type WeatherSettings
} from "@solar-display/shared";
import { RemoteSyncBanner } from "../../components/management/RemoteSyncBanner";
import {
  hasDisplaySyncDraftChanges,
  useDisplaySyncDraftGuard
} from "../../hooks/displaySyncDraftGuard";
import { useDisplayReadiness } from "../../hooks/useDisplayReadiness";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { useMqttStatus } from "../../hooks/useMqttStatus";
import {
  getWeatherOptions,
  getWeatherPreview,
  getWeatherSettings,
  requestJson,
  updateWeatherSettings
} from "../../services/api";
import "./mqttSettings.css";
import { MqttSettingsContent } from "./MqttSettingsContent";
import { type ActionState, type ConnectionTestFeedback, type DataMode, type MqttSettingsForm, type MqttStatus, type TopicMapping } from "./viewModel";
import { applyWeatherSettingChange, toggleWeatherFieldKey } from "./weatherFieldPresets";
import { MQTT_SETTINGS_DISPLAY_SYNC_SCOPES } from "../managementDisplaySyncScopes";
import {
  loadEditableSettingsLane,
  refreshDeferredSettingsDiagnostics
} from "../shared/editableSettingsLoader";

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
  "factoryInfrastructurePower",
  "phaseRVoltage",
  "phaseRCurrent",
  "phaseRPower",
  "phaseSVoltage",
  "phaseSCurrent",
  "phaseSPower",
  "phaseTVoltage",
  "phaseTCurrent",
  "phaseTPower"
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
  status: MqttStatus;
  topics: TopicMapping[];
};

type MqttEditableModelLoadOptions = {
  propagateError?: boolean;
  topicsAsPolling?: boolean;
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

export function MqttSettings() {
  const [settings, setSettings] = useState<MqttSettingsForm>(defaultFormState);
  const [lastSyncedSettings, setLastSyncedSettings] = useState<MqttSettingsForm>(defaultFormState);
  const [status, setStatus] = useState<MqttStatus>({
    broker: "",
    clientId: "",
    connected: false,
    reason: null,
    updatedAt: null
  });
  const [topics, setTopics] = useState<TopicMapping[]>([]);
  const [lastSyncedTopics, setLastSyncedTopics] = useState<TopicMapping[]>([]);
  const [weatherSettings, setWeatherSettings] = useState<WeatherSettings>(DEFAULT_WEATHER_SETTINGS);
  const [lastSyncedWeatherSettings, setLastSyncedWeatherSettings] =
    useState<WeatherSettings>(DEFAULT_WEATHER_SETTINGS);
  const [weatherOptions, setWeatherOptions] = useState<WeatherOptionsResponse | null>(null);
  const [weatherOptionsErrorMessage, setWeatherOptionsErrorMessage] = useState("");
  const [weatherPreviewContract, setWeatherPreviewContract] = useState<WeatherHeaderContract | null>(null);
  const [weatherPreviewErrorMessage, setWeatherPreviewErrorMessage] = useState("");
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
  const [hasLoadedMqttSettings, setHasLoadedMqttSettings] = useState(false);
  const [hasLoadedTopics, setHasLoadedTopics] = useState(false);
  const [hasLoadedWeatherSettings, setHasLoadedWeatherSettings] = useState(false);
  const hasLoadedMqttEditableModel = hasLoadedMqttSettings && hasLoadedTopics && hasLoadedWeatherSettings;
  const {
    errorMessage: readinessErrorMessage,
    readiness,
    reload: reloadReadiness
  } = useDisplayReadiness({ enabled: hasLoadedMqttEditableModel });
  const { connectionState: liveMetricsConnectionState, snapshot: liveMetricsSnapshot } = useLiveMetrics({ enabled: hasLoadedMqttEditableModel });
  const mqttStatusStream = useMqttStatus(undefined, { enabled: hasLoadedMqttEditableModel });

  useEffect(() => {
    if (!mqttStatusStream.isHydrated) {
      return;
    }

    setStatus(mqttStatusStream.status);
  }, [mqttStatusStream.isHydrated, mqttStatusStream.status]);

  const metricOptions = useMemo(() => {
    const optionSet = new Set<string>(defaultMetricOptions);
    topics.forEach((topic) => optionSet.add(topic.metricKey));
    return [...optionSet];
  }, [topics]);

  const markDirty = useCallback((nextMessage: string) => {
    setLastConnectionTest(null);
    setMessage(nextMessage);
    setErrorMessage("");
  }, []);

  const loadSettings = async ({ propagateError = false }: { propagateError?: boolean } = {}) => {
    setActionState((current) => ({ ...current, isLoadingSettings: true }));
    try {
      const response = await requestJson<MqttSettingsResponse>("/api/settings/mqtt");
      const nextSettings = toFormState(response.settings);
      setSettings(nextSettings);
      setLastSyncedSettings(nextSettings);
      setStatus(response.status);
      setLastConnectionTest(null);
      setHasLoadedMqttSettings(true);
      setMessage("MQTT 設定已同步。");
      setErrorMessage("");
    } catch (error) {
      const nextError = error instanceof Error ? error : new Error("載入 MQTT 設定失敗。");
      setErrorMessage(nextError.message);
      if (propagateError) {
        throw nextError;
      }
    } finally {
      setActionState((current) => ({ ...current, isLoadingSettings: false }));
    }
  };

  const loadTopics = async ({
    isPolling,
    propagateError = false
  }: {
    isPolling: boolean;
    propagateError?: boolean;
  }) => {
    if (!isPolling) {
      setActionState((current) => ({ ...current, isLoadingTopics: true }));
    }
    try {
      const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/topics");
      setStatus(response.status);
      setTopics(response.topics);
      setLastSyncedTopics(response.topics);
      setHasLoadedTopics(true);
      if (!isPolling) {
        setLastConnectionTest(null);
        setMessage("Topic mappings 已同步。");
        setErrorMessage("");
      }
    } catch (error) {
      const nextError = error instanceof Error ? error : new Error("載入 topic mappings 失敗。");
      if (!isPolling) {
        setErrorMessage(nextError.message);
      }
      if (propagateError) {
        throw nextError;
      }
    } finally {
      if (!isPolling) {
        setActionState((current) => ({ ...current, isLoadingTopics: false }));
      }
    }
  };

  const loadWeatherSettings = async ({ propagateError = false }: { propagateError?: boolean } = {}) => {
    try {
      const nextWeatherSettings = await getWeatherSettings();
      setWeatherSettings(nextWeatherSettings);
      setLastSyncedWeatherSettings(nextWeatherSettings);
      setHasLoadedWeatherSettings(true);
    } catch (error) {
      if (propagateError) {
        throw error instanceof Error ? error : new Error("載入天氣設定失敗。");
      }
    }
  };

  const loadMqttEditableModel = async ({
    propagateError = false,
    topicsAsPolling = false
  }: MqttEditableModelLoadOptions = {}) => {
    await loadEditableSettingsLane([
      () => loadSettings({ propagateError }),
      () => loadTopics({ isPolling: topicsAsPolling, propagateError }),
      () => loadWeatherSettings({ propagateError })
    ]);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadMqttEditableModel();
      } catch {
        // individual loaders surface their own errors
      }
    };
    void bootstrap();

  }, []);

  useEffect(() => {
    if (!hasLoadedTopics) {
      return;
    }

    let active = true;
    const pollTimer = window.setInterval(() => {
      if (active) {
        void loadTopics({ isPolling: true });
      }
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(pollTimer);
    };
  }, [hasLoadedTopics]);

  useEffect(() => {
    if (!hasLoadedWeatherSettings) {
      return;
    }

    let active = true;
    void (async () => {
      try {
        const options = await getWeatherOptions(weatherSettings.countyName);
        if (active) {
          setWeatherOptions(options);
          setWeatherOptionsErrorMessage("");
        }
      } catch (error) {
        if (active) {
          setWeatherOptionsErrorMessage(
            error instanceof Error ? error.message : "目前無法載入測站選項。"
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [hasLoadedWeatherSettings, weatherSettings.countyName]);

  useEffect(() => {
    if (!hasLoadedWeatherSettings) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const contract = await getWeatherPreview(weatherSettings);
          if (active) {
            setWeatherPreviewContract(contract);
            setWeatherPreviewErrorMessage("");
          }
        } catch (error) {
          if (active) {
            setWeatherPreviewContract(null);
            setWeatherPreviewErrorMessage(
              error instanceof Error ? error.message : "目前無法取得 weather preview。"
            );
          }
        }
      })();
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // Preview only depends on the server-resolved location snapshot; field/preset
    // composition is applied locally in the view model.
  }, [
    hasLoadedWeatherSettings,
    weatherSettings.enabled,
    weatherSettings.locationMode,
    weatherSettings.countyName,
    weatherSettings.stationId
  ]);

  const handleSettingChange = useCallback(<Key extends keyof MqttSettingsForm>(
    key: Key,
    value: MqttSettingsForm[Key]
  ) => {
    markDirty("Broker 設定已變更，尚未儲存。");
    setSettings((current) => ({ ...current, [key]: value }));
  }, [markDirty]);

  const handleTopicChange = useCallback(<Key extends keyof TopicMapping>(
    rowId: number,
    key: Key,
    value: TopicMapping[Key]
  ) => {
    markDirty("Topic mappings 已變更，尚未儲存。");
    setTopics((current) =>
      current.map((topic) => (topic.id === rowId ? { ...topic, [key]: value } : topic))
    );
  }, [markDirty]);

  const handleWeatherSettingChange = useCallback(<Key extends keyof WeatherSettings>(
    key: Key,
    value: WeatherSettings[Key]
  ) => {
    markDirty("天氣設定已變更，尚未儲存。");
    setWeatherSettings((current) =>
      applyWeatherSettingChange(current, key, value, weatherOptions?.stations ?? [])
    );
  }, [markDirty, weatherOptions]);

  const toggleWeatherField = useCallback((fieldKey: WeatherFieldKey, enabled: boolean) => {
    markDirty("天氣顯示欄位已變更，尚未儲存。");
    setWeatherSettings((current) => toggleWeatherFieldKey(current, fieldKey, enabled));
  }, [markDirty]);

  const saveSettings = useCallback(async () => {
    setActionState((current) => ({ ...current, isSavingSettings: true }));
    try {
      const response = await requestJson<MqttSettingsResponse>("/api/settings/mqtt", {
        body: JSON.stringify(buildSettingsPayload(settings)),
        method: "PUT"
      });
      const nextSettings = toFormState(response.settings);
      const savedWeatherSettings = await updateWeatherSettings(weatherSettings);
      setSettings(nextSettings);
      setLastSyncedSettings(nextSettings);
      setStatus(response.status);
      setWeatherSettings(savedWeatherSettings);
      setLastSyncedWeatherSettings(savedWeatherSettings);
      setLastConnectionTest(null);
      setMessage("MQTT broker 與天氣設定已儲存並重新連線。");
      setErrorMessage("");
      refreshDeferredSettingsDiagnostics([reloadReadiness]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存設定失敗。");
    } finally {
      setActionState((current) => ({ ...current, isSavingSettings: false }));
    }
  }, [settings, weatherSettings, reloadReadiness]);

  const testConnection = useCallback(async () => {
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
  }, [settings]);

  const saveTopicMappings = useCallback(async () => {
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
      setStatus(response.status);
      setTopics(response.topics);
      setLastSyncedTopics(response.topics);
      setLastConnectionTest(null);
      setMessage("Topic mappings 已更新並重新載入訂閱。");
      setErrorMessage("");
      refreshDeferredSettingsDiagnostics([reloadReadiness]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存 topic mappings 失敗。");
    } finally {
      setActionState((current) => ({ ...current, isSavingTopics: false }));
    }
  }, [topics, reloadReadiness]);

  const reloadTopics = useCallback(async () => {
    setActionState((current) => ({ ...current, isReloadingTopics: true }));
    try {
      const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/reload", {
        method: "POST"
      });
      setStatus(response.status);
      setTopics(response.topics);
      setLastSyncedTopics(response.topics);
      setLastConnectionTest(null);
      setMessage("MQTT 訂閱清單已重新載入。");
      setErrorMessage("");
      refreshDeferredSettingsDiagnostics([reloadReadiness]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "重新載入 topic mappings 失敗。");
    } finally {
      setActionState((current) => ({ ...current, isReloadingTopics: false }));
    }
  }, [reloadReadiness]);

  const addTopicMapping = useCallback(() => {
    const nextMetricKey =
      metricOptions.find((option) => !topics.some((topic) => topic.metricKey === option)) ??
      metricOptions[0];
    if (!nextMetricKey) return;
    markDirty("已新增一筆 topic mapping，尚未儲存。");
    setTopics((current) => [...current, createEmptyMapping(nextMetricKey)]);
  }, [metricOptions, topics, markDirty]);

  const removeTopicMapping = useCallback((rowId: number) => {
    markDirty("已移除一筆 topic mapping，尚未儲存。");
    setTopics((current) => current.filter((topic) => topic.id !== rowId));
  }, [markDirty]);

  const draftSections = useMemo(
    () => ({
      broker: hasDisplaySyncDraftChanges(settings, lastSyncedSettings),
      topic: hasDisplaySyncDraftChanges(topics, lastSyncedTopics),
      weather: hasDisplaySyncDraftChanges(weatherSettings, lastSyncedWeatherSettings)
    }),
    [lastSyncedSettings, lastSyncedTopics, lastSyncedWeatherSettings, settings, topics, weatherSettings]
  );
  const isDirty = useMemo(
    () => draftSections.broker || draftSections.topic || draftSections.weather,
    [draftSections]
  );
  const syncDraftGuard = useDisplaySyncDraftGuard({
    isDirty: isDirty,
    relevantScopes: MQTT_SETTINGS_DISPLAY_SYNC_SCOPES,
    reloadNow: async () => {
      await loadMqttEditableModel({ propagateError: true, topicsAsPolling: true });
      refreshDeferredSettingsDiagnostics([reloadReadiness]);
    }
  });

  useDisplaySyncRefresh(syncDraftGuard.handleDisplaySync, MQTT_SETTINGS_DISPLAY_SYNC_SCOPES);

  return (
    <MqttSettingsContent
      actionState={actionState}
      addTopicMapping={addTopicMapping}
      draftSections={draftSections}
      errorMessage={errorMessage}
      handleSettingChange={handleSettingChange}
      handleTopicChange={handleTopicChange}
      lastConnectionTest={lastConnectionTest}
      liveMetricsConnectionState={liveMetricsConnectionState}
      liveMetricsSnapshot={liveMetricsSnapshot}
      message={message}
      readiness={readiness}
      readinessErrorMessage={readinessErrorMessage}
      reloadTopics={reloadTopics}
      remoteSyncBanner={
        syncDraftGuard.hasPendingRemoteChange ? (
          <RemoteSyncBanner
            onKeepEditing={syncDraftGuard.keepEditing}
            onReloadNow={() => syncDraftGuard.discardAndReload().catch(() => {})}
          />
        ) : null
      }
      removeTopicMapping={removeTopicMapping}
      saveSettings={saveSettings}
      saveTopicMappings={saveTopicMappings}
      settings={settings}
      status={status}
      testConnection={testConnection}
      toggleWeatherField={toggleWeatherField}
      topics={topics}
      handleWeatherSettingChange={handleWeatherSettingChange}
      weatherOptions={weatherOptions}
      weatherOptionsErrorMessage={weatherOptionsErrorMessage}
      weatherPreviewContract={weatherPreviewContract}
      weatherPreviewErrorMessage={weatherPreviewErrorMessage}
      weatherSettings={weatherSettings}
    />
  );
}
