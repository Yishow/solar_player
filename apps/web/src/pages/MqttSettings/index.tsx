import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type DisplayCardDataResponse,
  DEFAULT_WEATHER_SETTINGS,
  type PlaybackPage,
  type WeatherFieldKey,
  type WeatherDiagnostic,
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
  getWeatherDiagnostics,
  getWeatherPreview,
  getWeatherSettings,
  getDisplayCardData,
  getPlaybackPages,
  clearDisplayCardOverride,
  requestJson,
  saveDisplayCardOverride,
  updateWeatherSettings
} from "../../services/api";
import "./mqttSettings.css";
import { MqttSettingsContent } from "./MqttSettingsContent";
import type { CardDataSiteFilter, TopicWorkspaceTab } from "./MqttSettingsContent";
import {
  factoryTopicMetricKeysBySite,
  guanyinFactoryTopicMetricKeys,
  isTopicMetricVisibleForFactorySite,
  jungliFactoryTopicMetricKeys
} from "./factoryTopicSites";
import {
  type ActionState,
  type ConnectionTestFeedback,
  type MqttSettingsForm,
  type MqttStatus,
  type TopicMapping,
  resolveWeatherRefreshFeedback
} from "./viewModel";
import { applyWeatherSettingChange, toggleWeatherFieldKey } from "./weatherFieldPresets";
import { MQTT_SETTINGS_DISPLAY_SYNC_SCOPES } from "../managementDisplaySyncScopes";
import {
  loadEditableSettingsLane,
  refreshDeferredSettingsDiagnostics
} from "../shared/editableSettingsLoader";
import {
  defaultMqttFormState,
  defaultMqttStatus,
  loadMqttEditableModel as loadCachedMqttEditableModel,
  mergePolledTopicMappings,
  readCachedMqttEditableModel,
  toFormState,
  type MqttEditableModel,
  type MqttSettingsResponse,
  type TopicMappingsResponse
} from "./loadModel";

const defaultMetricOptions = [
  "realTimePower",
  "todayGeneration",
  "totalGeneration",
  "todayCo2Reduction",
  "totalCo2Reduction",
  "selfConsumptionEnergy",
  "consumptionEnergy",
  "systemEfficiency",
  "factoryPeakMultiplier",
  "factoryProductionPower",
  "factoryHvacPower",
  "factoryLightingPower",
  "factoryEvGreenPower",
  "factoryInfrastructurePower",
  ...jungliFactoryTopicMetricKeys,
  ...guanyinFactoryTopicMetricKeys,
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

type MqttEditableModelLoadOptions = {
  force?: boolean;
  propagateError?: boolean;
  topicsAsPolling?: boolean;
};

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
    multiplier: 1,
    nameZh: null,
    nameEn: null,
    quality: null,
    rawPayload: null,
    topic: "",
    unit: "",
    updatedAt: null,
    valuePath: ""
  };
}

export async function loadMqttSettingsRoute() {
  try {
    await loadCachedMqttEditableModel();
  } catch {
    // Keep the route reachable; the page surfaces the load failure.
  }
  return null;
}

export function MqttSettings() {
  const initialEditableModel = useMemo(() => readCachedMqttEditableModel(), []);
  const [settings, setSettings] = useState<MqttSettingsForm>(initialEditableModel?.settings ?? defaultMqttFormState);
  const [lastSyncedSettings, setLastSyncedSettings] = useState<MqttSettingsForm>(initialEditableModel?.settings ?? defaultMqttFormState);
  const [status, setStatus] = useState<MqttStatus>(initialEditableModel?.status ?? defaultMqttStatus);
  const [topics, setTopics] = useState<TopicMapping[]>(initialEditableModel?.topics ?? []);
  const [lastSyncedTopics, setLastSyncedTopics] = useState<TopicMapping[]>(initialEditableModel?.topics ?? []);
  const lastSyncedTopicsRef = useRef(lastSyncedTopics);
  const [topicPublishDrafts, setTopicPublishDrafts] = useState<Record<string, string>>({});
  const [publishingTopicKey, setPublishingTopicKey] = useState<string | null>(null);
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>({});
  const [savingOverrideTargetId, setSavingOverrideTargetId] = useState<string | null>(null);
  const [activeTopicWorkspaceTab, setActiveTopicWorkspaceTab] = useState<TopicWorkspaceTab>("topic");
  const [activeCardDataSite, setActiveCardDataSite] = useState<CardDataSiteFilter>("jungli");
  const [highlightedTopicMetricKey, setHighlightedTopicMetricKey] = useState<string | null>(null);
  const [cardData, setCardData] = useState<DisplayCardDataResponse | null>(null);
  const [cardDataErrorMessage, setCardDataErrorMessage] = useState("");
  const [playbackPages, setPlaybackPages] = useState<PlaybackPage[]>([]);
  const [weatherSettings, setWeatherSettings] = useState<WeatherSettings>(initialEditableModel?.weatherSettings ?? DEFAULT_WEATHER_SETTINGS);
  const [lastSyncedWeatherSettings, setLastSyncedWeatherSettings] =
    useState<WeatherSettings>(initialEditableModel?.weatherSettings ?? DEFAULT_WEATHER_SETTINGS);
  const [weatherOptions, setWeatherOptions] = useState<WeatherOptionsResponse | null>(null);
  const [weatherDiagnostic, setWeatherDiagnostic] = useState<WeatherDiagnostic | null>(null);
  const [weatherOptionsErrorMessage, setWeatherOptionsErrorMessage] = useState("");
  const [weatherPreviewContract, setWeatherPreviewContract] = useState<WeatherHeaderContract | null>(null);
  const [weatherPreviewErrorMessage, setWeatherPreviewErrorMessage] = useState("");
  const [lastConnectionTest, setLastConnectionTest] = useState<ConnectionTestFeedback>(null);
  const [message, setMessage] = useState("正在載入 MQTT 設定...");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionState, setActionState] = useState<ActionState>({
    isLoadingSettings: initialEditableModel === null,
    isLoadingTopics: initialEditableModel === null,
    isReloadingTopics: false,
    isSavingSettings: false,
    isSavingTopics: false,
    isTestingConnection: false,
    isLoadingCardData: false,
    isRefreshingWeather: false
  });
  const [hasLoadedMqttSettings, setHasLoadedMqttSettings] = useState(initialEditableModel !== null);
  const [hasLoadedTopics, setHasLoadedTopics] = useState(initialEditableModel !== null);
  const [hasLoadedWeatherSettings, setHasLoadedWeatherSettings] = useState(initialEditableModel !== null);
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

  useEffect(() => {
    lastSyncedTopicsRef.current = lastSyncedTopics;
  }, [lastSyncedTopics]);

  const metricOptions = useMemo(() => {
    const optionSet = new Set<string>(defaultMetricOptions);
    topics.forEach((topic) => optionSet.add(topic.metricKey));
    return [...optionSet];
  }, [topics]);

  const applyMqttEditableModel = (model: MqttEditableModel) => {
    setSettings(model.settings);
    setLastSyncedSettings(model.settings);
    setStatus(model.status);
    setTopics(model.topics);
    setLastSyncedTopics(model.topics);
    lastSyncedTopicsRef.current = model.topics;
    setWeatherSettings(model.weatherSettings);
    setLastSyncedWeatherSettings(model.weatherSettings);
    setHasLoadedMqttSettings(true);
    setHasLoadedTopics(true);
    setHasLoadedWeatherSettings(true);
    setLastConnectionTest(null);
    setMessage("MQTT 設定已同步。");
    setErrorMessage("");
    setActionState((current) => ({
      ...current,
      isLoadingSettings: false,
      isLoadingTopics: false
    }));
  };

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
      if (isPolling) {
        setTopics((current) => mergePolledTopicMappings(current, lastSyncedTopicsRef.current, response.topics));
      } else {
        setTopics(response.topics);
      }
      setLastSyncedTopics(response.topics);
      lastSyncedTopicsRef.current = response.topics;
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

  const loadWeatherDiagnostic = useCallback(async () => {
    try {
      setWeatherDiagnostic(await getWeatherDiagnostics());
    } catch {
      // Keep the latest visible diagnostic when a refresh request itself fails.
    }
  }, []);

  const loadPlaybackPages = useCallback(async () => {
    try {
      setPlaybackPages(await getPlaybackPages());
    } catch {
      setPlaybackPages([]);
    }
  }, []);

  const loadMqttEditableModel = async ({
    force = false,
    propagateError = false,
    topicsAsPolling = false
  }: MqttEditableModelLoadOptions = {}) => {
    if (topicsAsPolling) {
      await loadEditableSettingsLane([
        () => loadSettings({ propagateError }),
        () => loadTopics({ isPolling: true, propagateError }),
        () => loadWeatherSettings({ propagateError })
      ]);
      return;
    }

    try {
      const model = await loadCachedMqttEditableModel({ force });
      applyMqttEditableModel(model);
    } catch (error) {
      if (propagateError) {
        throw error instanceof Error ? error : new Error("載入 MQTT 設定失敗。");
      }
      setErrorMessage(error instanceof Error ? error.message : "載入 MQTT 設定失敗。");
      setActionState((current) => ({
        ...current,
        isLoadingSettings: false,
        isLoadingTopics: false
      }));
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadMqttEditableModel({ force: initialEditableModel !== null });
        await loadPlaybackPages();
        await loadWeatherDiagnostic();
      } catch {
        // individual loaders surface their own errors
      }
    };
    void bootstrap();

  }, [initialEditableModel, loadPlaybackPages, loadWeatherDiagnostic]);

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

  const loadCardData = useCallback(async () => {
    setActionState((current) => ({ ...current, isLoadingCardData: true }));
    try {
      setCardData(await getDisplayCardData());
      setCardDataErrorMessage("");
    } catch (error) {
      setCardDataErrorMessage(error instanceof Error ? error.message : "載入卡片資料診斷失敗。");
    } finally {
      setActionState((current) => ({ ...current, isLoadingCardData: false }));
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedMqttEditableModel || activeTopicWorkspaceTab !== "card-data") {
      return;
    }

    void loadCardData();
  }, [activeTopicWorkspaceTab, hasLoadedMqttEditableModel, loadCardData]);

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
      } finally {
        if (active) {
          void loadWeatherDiagnostic();
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [hasLoadedWeatherSettings, weatherSettings.countyName, loadWeatherDiagnostic]);

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

  const handleTopicPublishDraftChange = useCallback((metricKey: string, value: string) => {
    setTopicPublishDrafts((current) => ({ ...current, [metricKey]: value }));
  }, []);

  const handleOverrideDraftChange = useCallback((targetId: string, value: string) => {
    setOverrideDrafts((current) => ({ ...current, [targetId]: value }));
  }, []);

  const handleConfigureTopicMetric = useCallback((metricKey: string) => {
    setHighlightedTopicMetricKey(metricKey);
    setActiveTopicWorkspaceTab("topic");
  }, []);

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

  const refreshWeather = useCallback(async () => {
    setActionState((current) => ({ ...current, isRefreshingWeather: true }));
    try {
      const response = await requestJson<WeatherHeaderContract & { diagnostic: WeatherDiagnostic }>("/api/weather/refresh", {
        method: "POST"
      });
      setWeatherPreviewContract(response);
      setWeatherDiagnostic(response.diagnostic);
      setWeatherPreviewErrorMessage("");
      const feedback = resolveWeatherRefreshFeedback(response.diagnostic);
      setMessage(feedback.message);
      setErrorMessage(feedback.errorMessage);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "手動更新天氣失敗。");
    } finally {
      await loadWeatherDiagnostic();
      setActionState((current) => ({ ...current, isRefreshingWeather: false }));
    }
  }, [loadWeatherDiagnostic]);

  const copyWeatherDiagnostic = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("天氣診斷已複製。");
      setErrorMessage("");
    } catch {
      setErrorMessage("無法複製天氣診斷，請手動選取內容。");
    }
  }, []);

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

  const publishTopicValue = useCallback(async (metricKey: string, value: number) => {
    setPublishingTopicKey(metricKey);
    try {
      const response = await requestJson<{
        status: MqttStatus;
      }>(`/api/settings/mqtt/topics/${encodeURIComponent(metricKey)}/publish`, {
        body: JSON.stringify({ value }),
        method: "POST"
      });
      setStatus(response.status);
      setMessage(`MQTT 測試值已發佈：${metricKey}`);
      setErrorMessage("");
      await loadTopics({ isPolling: true });
      if (activeTopicWorkspaceTab === "card-data") {
        await loadCardData();
      }
      refreshDeferredSettingsDiagnostics([reloadReadiness]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "發佈 MQTT 測試值失敗。");
    } finally {
      setPublishingTopicKey(null);
    }
  }, [activeTopicWorkspaceTab, loadCardData, reloadReadiness]);

  const saveDisplayOverride = useCallback(async (targetId: string, value: number) => {
    if (!Number.isFinite(value)) {
      setErrorMessage("展示覆寫值必須是數字。");
      return;
    }

    setSavingOverrideTargetId(targetId);
    try {
      await saveDisplayCardOverride(targetId, value);
      setOverrideDrafts((current) => ({ ...current, [targetId]: "" }));
      setMessage(`展示覆寫已套用：${targetId}`);
      setErrorMessage("");
      await loadCardData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "套用展示覆寫失敗。");
    } finally {
      setSavingOverrideTargetId(null);
    }
  }, [loadCardData]);

  const clearDisplayOverride = useCallback(async (targetId: string) => {
    setSavingOverrideTargetId(targetId);
    try {
      await clearDisplayCardOverride(targetId);
      setOverrideDrafts((current) => ({ ...current, [targetId]: "" }));
      setMessage(`展示覆寫已清除：${targetId}`);
      setErrorMessage("");
      await loadCardData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "清除展示覆寫失敗。");
    } finally {
      setSavingOverrideTargetId(null);
    }
  }, [loadCardData]);

  const saveTopicMappings = useCallback(async () => {
    setActionState((current) => ({ ...current, isSavingTopics: true }));
    try {
      const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/topics", {
        body: JSON.stringify({
          topics: topics.map((topic) => ({
            enabled: topic.enabled,
            metricKey: topic.metricKey,
            multiplier: topic.multiplier ?? 1,
            nameZh: topic.nameZh?.trim() ?? "",
            nameEn: topic.nameEn?.trim() ?? "",
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
      lastSyncedTopicsRef.current = response.topics;
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
      lastSyncedTopicsRef.current = response.topics;
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
    const activeMetricOptions = metricOptions.filter((option) =>
      isTopicMetricVisibleForFactorySite(option, activeCardDataSite)
    );
    const activeFactoryMetricOptions = factoryTopicMetricKeysBySite[activeCardDataSite].filter((option) =>
      activeMetricOptions.includes(option)
    );
    const addableMetricOptions = [...activeFactoryMetricOptions, ...activeMetricOptions.filter(
      (option) => !activeFactoryMetricOptions.includes(option)
    )];
    const nextMetricKey =
      addableMetricOptions.find((option) => !topics.some((topic) => topic.metricKey === option)) ??
      addableMetricOptions[0];
    if (!nextMetricKey) return;
    markDirty("已新增一筆 topic mapping，尚未儲存。");
    setTopics((current) => [...current, createEmptyMapping(nextMetricKey)]);
  }, [activeCardDataSite, metricOptions, topics, markDirty]);

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
      await loadPlaybackPages();
      refreshDeferredSettingsDiagnostics([reloadReadiness]);
    }
  });

  useDisplaySyncRefresh(syncDraftGuard.handleDisplaySync, MQTT_SETTINGS_DISPLAY_SYNC_SCOPES);

  const enabledCardDataSites = useMemo<CardDataSiteFilter[]>(() => {
    const enabledPageKeys = new Set(
      playbackPages.filter((page) => page.enabled).map((page) => page.pageKey)
    );
    const sites: CardDataSiteFilter[] = [];
    if (enabledPageKeys.has("factory-circuit")) sites.push("jungli");
    if (enabledPageKeys.has("factory-circuit-guanyin")) sites.push("guanyin");
    return sites.length > 0 ? sites : ["jungli", "guanyin"];
  }, [playbackPages]);

  useEffect(() => {
    if (!enabledCardDataSites.includes(activeCardDataSite)) {
      setActiveCardDataSite(enabledCardDataSites[0] ?? "jungli");
    }
  }, [activeCardDataSite, enabledCardDataSites]);

  return (
    <MqttSettingsContent
      actionState={actionState}
      activeCardDataSite={activeCardDataSite}
      activeTopicWorkspaceTab={activeTopicWorkspaceTab}
      addTopicMapping={addTopicMapping}
      cardDataErrorMessage={cardDataErrorMessage}
      cardDataRows={cardData?.rows ?? []}
      copyWeatherDiagnostic={copyWeatherDiagnostic}
      clearDisplayOverride={clearDisplayOverride}
      draftSections={draftSections}
      enabledCardDataSites={enabledCardDataSites}
      errorMessage={errorMessage}
      handleSettingChange={handleSettingChange}
      handleCardDataSiteChange={setActiveCardDataSite}
      handleConfigureTopicMetric={handleConfigureTopicMetric}
      handleOverrideDraftChange={handleOverrideDraftChange}
      handleTopicChange={handleTopicChange}
      handleTopicPublishDraftChange={handleTopicPublishDraftChange}
      handleTopicWorkspaceTabChange={setActiveTopicWorkspaceTab}
      lastConnectionTest={lastConnectionTest}
      liveMetricsConnectionState={liveMetricsConnectionState}
      liveMetricsSnapshot={liveMetricsSnapshot}
      isLoadingCardData={actionState.isLoadingCardData}
      highlightedTopicMetricKey={highlightedTopicMetricKey}
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
      publishTopicValue={publishTopicValue}
      publishingTopicKey={publishingTopicKey}
      overrideDrafts={overrideDrafts}
      saveSettings={saveSettings}
      saveDisplayOverride={saveDisplayOverride}
      saveTopicMappings={saveTopicMappings}
      savingOverrideTargetId={savingOverrideTargetId}
      settings={settings}
      status={status}
      testConnection={testConnection}
      toggleWeatherField={toggleWeatherField}
      topicPublishDrafts={topicPublishDrafts}
      topics={topics}
      handleWeatherSettingChange={handleWeatherSettingChange}
      weatherOptions={weatherOptions}
      weatherDiagnostic={weatherDiagnostic}
      weatherOptionsErrorMessage={weatherOptionsErrorMessage}
      weatherPreviewContract={weatherPreviewContract}
      weatherPreviewErrorMessage={weatherPreviewErrorMessage}
      weatherSettings={weatherSettings}
      refreshWeather={refreshWeather}
    />
  );
}
