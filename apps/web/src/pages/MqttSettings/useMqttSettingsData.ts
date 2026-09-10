import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  getPlaybackPages,
  getWeatherDiagnostics,
  getWeatherSettings,
  requestJson
} from "../../services/api";
import {
  loadEditableSettingsLane
} from "../shared/editableSettingsLoader";
import {
  defaultMqttFormState,
  defaultMqttStatus,
  loadMqttEditableModel as loadCachedMqttEditableModel,
  mergePolledTopicMappings,
  toFormState,
  type MqttEditableModel,
  type MqttSettingsResponse,
  type TopicMappingsResponse
} from "./loadModel";
import {
  readCachedMqttConnectionModel,
  rememberMqttConnectionModel
} from "./mqttSettingsRouteModel";
import type {
  ActionState,
  ConnectionTestFeedback,
  MqttSettingsForm,
  MqttStatus,
  TopicMapping
} from "./viewModel";
import {
  DEFAULT_WEATHER_SETTINGS,
  type PlaybackPage,
  type WeatherDiagnostic,
  type WeatherSettings
} from "@solar-display/shared";
import {
  hasDisplaySyncDraftChanges,
  type DisplaySyncReloadResult
} from "../../hooks/displaySyncDraftGuard";

export type MqttEditableModelLoadOptions = {
  force?: boolean;
  propagateError?: boolean;
  topicsAsPolling?: boolean;
  weatherDiscard?: boolean;
};

export type WeatherSettingsLoadOutcome = DisplaySyncReloadResult;

export type MqttSettingsDataController = {
  actionState: ActionState;
  errorMessage: string;
  hasLoadedMqttEditableModel: boolean;
  hasLoadedMqttSettings: boolean;
  hasLoadedTopics: boolean;
  hasLoadedWeatherSettings: boolean;
  weatherReloadResult: WeatherSettingsLoadOutcome | null;
  lastConnectionTest: ConnectionTestFeedback;
  lastSyncedSettings: MqttSettingsForm;
  lastSyncedTopics: TopicMapping[];
  lastSyncedTopicsRef: { current: TopicMapping[] };
  lastSyncedWeatherSettings: WeatherSettings;
  loadMqttEditableModel: (options?: MqttEditableModelLoadOptions) => Promise<WeatherSettingsLoadOutcome>;
  loadPlaybackPages: () => Promise<void>;
  loadSettings: (options?: { propagateError?: boolean }) => Promise<void>;
  loadTopics: (options: { isPolling: boolean; propagateError?: boolean }) => Promise<void>;
  loadWeatherDiagnostic: () => Promise<void>;
  loadWeatherSettings: (options?: {
    propagateError?: boolean;
    discardDraft?: boolean;
  }) => Promise<WeatherSettingsLoadOutcome>;
  markDirty: (nextMessage: string) => void;
  message: string;
  playbackPages: PlaybackPage[];
  setActionState: Dispatch<SetStateAction<ActionState>>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setLastConnectionTest: Dispatch<SetStateAction<ConnectionTestFeedback>>;
  setLastSyncedSettings: Dispatch<SetStateAction<MqttSettingsForm>>;
  setLastSyncedTopics: Dispatch<SetStateAction<TopicMapping[]>>;
  setLastSyncedWeatherSettings: Dispatch<SetStateAction<WeatherSettings>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setSettings: Dispatch<SetStateAction<MqttSettingsForm>>;
  setStatus: Dispatch<SetStateAction<MqttStatus>>;
  setTopics: Dispatch<SetStateAction<TopicMapping[]>>;
  setWeatherDiagnostic: Dispatch<SetStateAction<WeatherDiagnostic | null>>;
  setWeatherSettings: Dispatch<SetStateAction<WeatherSettings>>;
  settings: MqttSettingsForm;
  status: MqttStatus;
  topics: TopicMapping[];
  weatherDiagnostic: WeatherDiagnostic | null;
  weatherSettings: WeatherSettings;
};

type UseMqttSettingsDataOptions = {
  connectionsOnly: boolean;
  initialConnectionModel: ReturnType<typeof readCachedMqttConnectionModel>;
  initialEditableModel: MqttEditableModel | null;
};

export function useMqttSettingsData({
  connectionsOnly,
  initialConnectionModel,
  initialEditableModel
}: UseMqttSettingsDataOptions): MqttSettingsDataController {
  const initialSettings = initialConnectionModel?.settings ?? initialEditableModel?.settings ?? defaultMqttFormState;
  const initialWeatherSettings = initialEditableModel?.weatherSettings ?? DEFAULT_WEATHER_SETTINGS;
  const [settings, setSettings] = useState<MqttSettingsForm>(initialSettings);
  const [lastSyncedSettings, setLastSyncedSettings] = useState<MqttSettingsForm>(initialSettings);
  const [status, setStatus] = useState<MqttStatus>(initialConnectionModel?.status ?? initialEditableModel?.status ?? defaultMqttStatus);
  const [topics, setTopics] = useState<TopicMapping[]>(initialEditableModel?.topics ?? []);
  const [lastSyncedTopics, setLastSyncedTopics] = useState<TopicMapping[]>(initialEditableModel?.topics ?? []);
  const lastSyncedTopicsRef = useRef(lastSyncedTopics);
  const [weatherSettings, setWeatherSettingsState] = useState<WeatherSettings>(initialWeatherSettings);
  const [lastSyncedWeatherSettings, setLastSyncedWeatherSettings] = useState<WeatherSettings>(initialWeatherSettings);
  const weatherSettingsRef = useRef(initialWeatherSettings);
  const lastSyncedWeatherSettingsRef = useRef(initialWeatherSettings);
  const weatherRequestGenerationRef = useRef(0);
  const weatherMutationGenerationRef = useRef(0);
  const settingsRequestGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const [weatherReloadResult, setWeatherReloadResult] = useState<WeatherSettingsLoadOutcome | null>(null);
  const [playbackPages, setPlaybackPages] = useState<PlaybackPage[]>([]);
  const [weatherDiagnostic, setWeatherDiagnostic] = useState<WeatherDiagnostic | null>(null);
  const [lastConnectionTest, setLastConnectionTest] = useState<ConnectionTestFeedback>(null);
  const [message, setMessage] = useState("正在載入 MQTT 設定...");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionState, setActionState] = useState<ActionState>({
    isLoadingSettings: initialConnectionModel === null && initialEditableModel === null,
    isLoadingTopics: connectionsOnly ? false : initialEditableModel === null,
    isReloadingTopics: false,
    isSavingSettings: false,
    isSavingTopics: false,
    isTestingConnection: false,
    isLoadingCardData: false,
    isRefreshingWeather: false
  });
  const [hasLoadedMqttSettings, setHasLoadedMqttSettings] = useState(
    initialConnectionModel !== null || initialEditableModel !== null
  );
  const [hasLoadedTopics, setHasLoadedTopics] = useState(!connectionsOnly && initialEditableModel !== null);
  const [hasLoadedWeatherSettings, setHasLoadedWeatherSettings] = useState(!connectionsOnly && initialEditableModel !== null);
  const hasLoadedMqttEditableModel = hasLoadedMqttSettings && hasLoadedTopics && hasLoadedWeatherSettings;

  useEffect(() => {
    lastSyncedTopicsRef.current = lastSyncedTopics;
  }, [lastSyncedTopics]);

  useEffect(() => {
    weatherSettingsRef.current = weatherSettings;
  }, [weatherSettings]);

  useEffect(() => {
    lastSyncedWeatherSettingsRef.current = lastSyncedWeatherSettings;
  }, [lastSyncedWeatherSettings]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      weatherRequestGenerationRef.current += 1;
    };
  }, []);

  const setWeatherSettings = useCallback<Dispatch<SetStateAction<WeatherSettings>>>((update) => {
    weatherMutationGenerationRef.current += 1;
    const nextWeatherSettings = typeof update === "function"
      ? update(weatherSettingsRef.current)
      : update;
    weatherSettingsRef.current = nextWeatherSettings;
    setWeatherSettingsState(nextWeatherSettings);
  }, []);

  const beginWeatherRequest = useCallback((discardDraft: boolean) => ({
    discardDraft,
    mutationGeneration: weatherMutationGenerationRef.current,
    operationToken: ++weatherRequestGenerationRef.current,
    startedDirty: hasDisplaySyncDraftChanges(
      weatherSettingsRef.current,
      lastSyncedWeatherSettingsRef.current
    )
  }), []);

  const commitWeatherSettings = useCallback((
    request: ReturnType<typeof beginWeatherRequest>,
    nextWeatherSettings: WeatherSettings,
    publishReloadResult = true
  ): WeatherSettingsLoadOutcome => {
    if (!mountedRef.current || request.operationToken !== weatherRequestGenerationRef.current) {
      return { operationToken: request.operationToken, outcome: "stale" };
    }
    if (
      request.mutationGeneration !== weatherMutationGenerationRef.current
      || (request.startedDirty && !request.discardDraft)
    ) {
      const result = { operationToken: request.operationToken, outcome: "deferred" } as const;
      if (publishReloadResult) {
        setWeatherReloadResult(result);
      }
      return result;
    }
    weatherSettingsRef.current = nextWeatherSettings;
    lastSyncedWeatherSettingsRef.current = nextWeatherSettings;
    setWeatherSettingsState(nextWeatherSettings);
    setLastSyncedWeatherSettings(nextWeatherSettings);
    setHasLoadedWeatherSettings(true);
    const result = { operationToken: request.operationToken, outcome: "committed" } as const;
    if (publishReloadResult) {
      setWeatherReloadResult(result);
    }
    return result;
  }, [beginWeatherRequest]);

  const markDirty = useCallback((nextMessage: string) => {
    setLastConnectionTest(null);
    setMessage(nextMessage);
    setErrorMessage("");
  }, []);

  const applyMqttEditableModel = useCallback((
    model: MqttEditableModel,
    weatherRequest: ReturnType<typeof beginWeatherRequest>
  ) => {
    setSettings(model.settings);
    setLastSyncedSettings(model.settings);
    setStatus(model.status);
    setTopics(model.topics);
    setLastSyncedTopics(model.topics);
    lastSyncedTopicsRef.current = model.topics;
    setHasLoadedMqttSettings(true);
    setHasLoadedTopics(true);
    setLastConnectionTest(null);
    setMessage("MQTT 設定已同步。");
    setErrorMessage("");
    setActionState((current) => ({
      ...current,
      isLoadingSettings: false,
      isLoadingTopics: false
    }));
    return commitWeatherSettings(weatherRequest, model.weatherSettings);
  }, [commitWeatherSettings]);

  const loadSettings = useCallback(async ({ propagateError = false }: { propagateError?: boolean } = {}) => {
    const requestGeneration = ++settingsRequestGenerationRef.current;
    setActionState((current) => ({ ...current, isLoadingSettings: true }));
    try {
      const response = await requestJson<MqttSettingsResponse>("/api/settings/mqtt");
      if (!mountedRef.current || requestGeneration !== settingsRequestGenerationRef.current) {
        return;
      }
      const nextSettings = toFormState(response.settings);
      if (connectionsOnly) {
        rememberMqttConnectionModel({ settings: nextSettings, status: response.status });
      }
      setSettings(nextSettings);
      setLastSyncedSettings(nextSettings);
      setStatus(response.status);
      setLastConnectionTest(null);
      setHasLoadedMqttSettings(true);
      setMessage("MQTT 設定已同步。");
      setErrorMessage("");
    } catch (error) {
      const nextError = error instanceof Error ? error : new Error("載入 MQTT 設定失敗。");
      if (!mountedRef.current || requestGeneration !== settingsRequestGenerationRef.current) {
        return;
      }
      setErrorMessage(nextError.message);
      if (propagateError) {
        throw nextError;
      }
    } finally {
      if (mountedRef.current && requestGeneration === settingsRequestGenerationRef.current) {
        setActionState((current) => ({ ...current, isLoadingSettings: false }));
      }
    }
  }, [connectionsOnly]);

  const loadTopics = useCallback(async ({
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
  }, []);

  const loadWeatherSettings = useCallback(async ({
    propagateError = false,
    discardDraft = false,
    publishReloadResult = true
  }: {
    propagateError?: boolean;
    discardDraft?: boolean;
    publishReloadResult?: boolean;
  } = {}): Promise<WeatherSettingsLoadOutcome> => {
    const weatherRequest = beginWeatherRequest(discardDraft);
    try {
      const nextWeatherSettings = await getWeatherSettings();
      return commitWeatherSettings(weatherRequest, nextWeatherSettings, publishReloadResult);
    } catch (error) {
      if (!mountedRef.current || weatherRequest.operationToken !== weatherRequestGenerationRef.current) {
        return { operationToken: weatherRequest.operationToken, outcome: "stale" };
      }
      const nextError = error instanceof Error ? error : new Error("載入天氣設定失敗。");
      if (publishReloadResult) {
        setWeatherReloadResult({ operationToken: weatherRequest.operationToken, outcome: "deferred" });
      }
      setErrorMessage(nextError.message);
      if (propagateError) {
        throw nextError;
      }
      return { operationToken: weatherRequest.operationToken, outcome: "deferred" };
    }
  }, [beginWeatherRequest, commitWeatherSettings]);

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

  const loadMqttEditableModel = useCallback(async ({
    force = false,
    propagateError = false,
    topicsAsPolling = false,
    weatherDiscard = false
  }: MqttEditableModelLoadOptions = {}): Promise<WeatherSettingsLoadOutcome> => {
    if (topicsAsPolling) {
      let aggregateError: unknown;
      let weatherOutcome: WeatherSettingsLoadOutcome = {
        operationToken: weatherRequestGenerationRef.current,
        outcome: "stale"
      };
      const captureFailure = async (load: () => Promise<void>) => {
        try {
          await load();
        } catch (error) {
          aggregateError ??= error;
        }
      };
      await loadEditableSettingsLane([
        () => captureFailure(() => loadSettings({ propagateError: true })),
        () => captureFailure(() => loadTopics({ isPolling: true, propagateError: true })),
        async () => {
          const weatherLoad = loadWeatherSettings({
            discardDraft: weatherDiscard,
            propagateError: true,
            publishReloadResult: false
          });
          const operationToken = weatherRequestGenerationRef.current;
          try {
            weatherOutcome = await weatherLoad;
          } catch (error) {
            weatherOutcome = { operationToken, outcome: "failed" };
            aggregateError ??= error;
          }
        }
      ]);
      if (aggregateError !== undefined) {
        if (
          weatherOutcome.outcome === "stale"
          || weatherOutcome.operationToken !== weatherRequestGenerationRef.current
        ) {
          return { operationToken: weatherOutcome.operationToken, outcome: "stale" };
        }
        const failedResult = {
          operationToken: weatherOutcome.operationToken,
          outcome: "failed"
        } as const;
        const nextError = aggregateError instanceof Error
          ? aggregateError
          : new Error("載入 MQTT 設定失敗。");
        setWeatherReloadResult(failedResult);
        setErrorMessage(nextError.message);
        if (propagateError) {
          throw nextError;
        }
        return failedResult;
      }
      if (
        weatherOutcome.outcome === "stale"
        || weatherOutcome.operationToken !== weatherRequestGenerationRef.current
      ) {
        return { operationToken: weatherOutcome.operationToken, outcome: "stale" };
      }
      setWeatherReloadResult(weatherOutcome);
      return weatherOutcome;
    }

    const weatherRequest = beginWeatherRequest(weatherDiscard);
    try {
      const model = await loadCachedMqttEditableModel({ force });
      if (!mountedRef.current) {
        return { operationToken: weatherRequest.operationToken, outcome: "stale" };
      }
      return applyMqttEditableModel(model, weatherRequest);
    } catch (error) {
      if (!mountedRef.current || weatherRequest.operationToken !== weatherRequestGenerationRef.current) {
        return { operationToken: weatherRequest.operationToken, outcome: "stale" };
      }
      if (propagateError) {
        throw error instanceof Error ? error : new Error("載入 MQTT 設定失敗。");
      }
      setErrorMessage(error instanceof Error ? error.message : "載入 MQTT 設定失敗。");
      setActionState((current) => ({
        ...current,
        isLoadingSettings: false,
        isLoadingTopics: false
      }));
      return { operationToken: weatherRequest.operationToken, outcome: "failed" };
    }
  }, [applyMqttEditableModel, beginWeatherRequest, loadSettings, loadTopics, loadWeatherSettings]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (connectionsOnly) {
          if (initialConnectionModel === null) {
            await loadSettings();
          }
          return;
        }
        await loadMqttEditableModel({ force: initialEditableModel !== null });
        await loadPlaybackPages();
        await loadWeatherDiagnostic();
      } catch {
        // individual loaders surface their own errors
      }
    };
    void bootstrap();
  }, [connectionsOnly, initialConnectionModel, initialEditableModel, loadMqttEditableModel, loadPlaybackPages, loadSettings, loadWeatherDiagnostic]);

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
  }, [hasLoadedTopics, loadTopics]);

  return {
    actionState,
    errorMessage,
    hasLoadedMqttEditableModel,
    hasLoadedMqttSettings,
    hasLoadedTopics,
    hasLoadedWeatherSettings,
    lastConnectionTest,
    lastSyncedSettings,
    lastSyncedTopics,
    lastSyncedTopicsRef,
    lastSyncedWeatherSettings,
    loadMqttEditableModel,
    loadPlaybackPages,
    loadSettings,
    loadTopics,
    loadWeatherDiagnostic,
    loadWeatherSettings,
    markDirty,
    message,
    playbackPages,
    setActionState,
    setErrorMessage,
    setLastConnectionTest,
    setLastSyncedSettings,
    setLastSyncedTopics,
    setLastSyncedWeatherSettings,
    setMessage,
    setSettings,
    setStatus,
    setTopics,
    setWeatherDiagnostic,
    setWeatherSettings,
    settings,
    status,
    topics,
    weatherDiagnostic,
    weatherReloadResult,
    weatherSettings
  };
}
