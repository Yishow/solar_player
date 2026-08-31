import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useLoaderData } from "react-router-dom";
import type {
  WeatherDiagnostic,
  WeatherFieldKey,
  WeatherHeaderContract,
  WeatherOptionsResponse,
  WeatherSettings
} from "@solar-display/shared";
import { RemoteSyncBanner } from "../../components/management/RemoteSyncBanner";
import {
  hasDisplaySyncDraftChanges,
  useDisplaySyncDraftGuard
} from "../../hooks/displaySyncDraftGuard";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import {
  getWeatherDiagnostics,
  getWeatherOptions,
  getWeatherPreview,
  getWeatherSettings,
  requestJson
} from "../../services/api";
import {
  applyWeatherSettingChange,
  resolveWeatherRefreshFeedback,
  resolveWeatherValidationFeedback,
  toggleWeatherFieldKey
} from "../MqttSettings/weatherFieldPresets";
import { DataHubSectionState } from "./sectionState";
import {
  buildWeatherViewModel,
  getWeatherPresetOptions,
  saveDataHubWeatherSettings,
  type DataHubWeatherRouteModel
} from "./WeatherModel";
import {
  WeatherConfigCard,
  WeatherDiagnosticCard,
  WeatherPreviewCard,
  type WeatherChangeHandler
} from "./WeatherCards";

const WEATHER_DISPLAY_SYNC_SCOPES = ["weather"] as const;

export type DataHubWeatherContentProps = {
  diagnosticErrorMessage?: string;
  errorMessage: string;
  isDirty: boolean;
  isLoading: boolean;
  isRefreshing?: boolean;
  isSaving: boolean;
  message: string;
  onChange: WeatherChangeHandler;
  onCopyDiagnostic?: (text: string) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  onToggleField: (fieldKey: WeatherFieldKey, enabled: boolean) => void;
  options: WeatherOptionsResponse | null;
  optionsErrorMessage: string;
  preview: WeatherHeaderContract | null;
  previewErrorMessage: string;
  remoteSyncBanner?: ReactNode;
  settings: WeatherSettings;
  weatherDiagnostic?: WeatherDiagnostic | null;
};

export function DataHubWeatherContent({
  diagnosticErrorMessage = "",
  errorMessage,
  isDirty,
  isLoading,
  isRefreshing = false,
  isSaving,
  message,
  onChange,
  onCopyDiagnostic = () => undefined,
  onRefresh = () => undefined,
  onSave,
  onToggleField,
  options,
  optionsErrorMessage,
  preview,
  previewErrorMessage,
  remoteSyncBanner,
  settings,
  weatherDiagnostic = null
}: DataHubWeatherContentProps) {
  const viewModel = buildWeatherViewModel({
    options,
    optionsErrorMessage,
    preview,
    previewErrorMessage,
    weatherDiagnostic,
    settings
  });
  const presetOptions = getWeatherPresetOptions();
  const stationOptions = [
    { label: "請選擇測站", value: "" },
    ...viewModel.stationOptions.map((station) => ({
      label: station.townName ? `${station.stationName}（${station.townName}）` : station.stationName,
      value: station.stationId
    }))
  ];
  const countyOptions = [
    { label: "請選擇縣市", value: "" },
    ...viewModel.countyOptions.map((county) => ({ label: county, value: county }))
  ];

  if (isLoading) {
    return <DataHubSectionState status="loading" />;
  }

  return (
    <div className="space-y-6" data-data-hub-section="external-weather">
      {remoteSyncBanner}
      {errorMessage ? <div className="mgmt-status is-error" role="alert">{errorMessage}</div> : null}
      {message ? <div className="mgmt-status is-success" role="status">{message}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 左欄：頂欄預覽與天氣診斷 (佔 5 欄) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          <WeatherPreviewCard
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
            optionsErrorMessage={optionsErrorMessage}
            settings={settings}
            viewModel={viewModel}
          />

          <WeatherDiagnosticCard
            diagnosticErrorMessage={diagnosticErrorMessage}
            onCopyDiagnostic={onCopyDiagnostic}
            viewModel={viewModel}
          />
        </div>

        {/* 右欄：天氣設定表單 (佔 7 欄) */}
        <div className="lg:col-span-7 h-full">
          <WeatherConfigCard
            countyOptions={countyOptions}
            isDirty={isDirty}
            isSaving={isSaving}
            onChange={onChange}
            onSave={onSave}
            onToggleField={onToggleField}
            optionsLoaded={Boolean(options)}
            optionsErrorMessage={optionsErrorMessage}
            presetOptions={presetOptions}
            settings={settings}
            stationOptions={stationOptions}
            viewModel={viewModel}
          />
        </div>
      </div>
    </div>
  );
}

let cachedWeatherOptions: WeatherOptionsResponse | null = null;
let cachedWeatherPreview: WeatherHeaderContract | null = null;
let cachedWeatherDiagnostic: WeatherDiagnostic | null = null;

export function DataHubWeather() {
  const routeModel = useLoaderData() as DataHubWeatherRouteModel;
  const initialSettings = routeModel.settings;
  const [settings, setSettings] = useState<WeatherSettings | null>(initialSettings);
  const [lastSyncedSettings, setLastSyncedSettings] = useState<WeatherSettings | null>(initialSettings);
  const [options, setOptions] = useState<WeatherOptionsResponse | null>(() => cachedWeatherOptions);
  const [preview, setPreview] = useState<WeatherHeaderContract | null>(() => cachedWeatherPreview);
  const [weatherDiagnostic, setWeatherDiagnostic] = useState<WeatherDiagnostic | null>(() => cachedWeatherDiagnostic);
  const [optionsErrorMessage, setOptionsErrorMessage] = useState("");
  const [previewErrorMessage, setPreviewErrorMessage] = useState("");
  const [diagnosticErrorMessage, setDiagnosticErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const loadedCountyRef = useRef<string | null>(null);

  useEffect(() => {
    setSettings(routeModel.settings);
    setLastSyncedSettings(routeModel.settings);
    setOptionsErrorMessage("");
    setPreviewErrorMessage("");
    setMessage("");
    setErrorMessage(routeModel.errorMessage);
  }, [routeModel]);

  const dirty = useMemo(
    () => settings !== null && lastSyncedSettings !== null && hasDisplaySyncDraftChanges(settings, lastSyncedSettings),
    [lastSyncedSettings, settings]
  );
  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const shouldLeave = window.confirm("尚有未儲存的天氣設定，確定離開嗎？");
    if (shouldLeave) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const reloadWeather = useCallback(async () => {
    const nextSettings = await getWeatherSettings();
    setSettings(nextSettings);
    setLastSyncedSettings(nextSettings);
    setMessage("Weather 設定已同步。");
    setErrorMessage("");
  }, []);

  const reloadWeatherDiagnostic = useCallback(async () => {
    try {
      const diag = await getWeatherDiagnostics();
      cachedWeatherDiagnostic = diag;
      setWeatherDiagnostic(diag);
      setDiagnosticErrorMessage("");
    } catch (error) {
      setDiagnosticErrorMessage(
        error instanceof Error ? error.message : "目前無法取得天氣診斷。"
      );
    }
  }, []);

  useEffect(() => {
    if (!initialSettings) return;
    void reloadWeatherDiagnostic();
  }, [initialSettings, reloadWeatherDiagnostic]);

  const syncDraftGuard = useDisplaySyncDraftGuard({
    isDirty: dirty,
    relevantScopes: WEATHER_DISPLAY_SYNC_SCOPES,
    reloadNow: reloadWeather
  });
  useDisplaySyncRefresh(syncDraftGuard.handleDisplaySync, WEATHER_DISPLAY_SYNC_SCOPES);

  useEffect(() => {
    if (!settings?.countyName) return;
    if (loadedCountyRef.current === settings.countyName && options !== null) {
      return;
    }
    let active = true;
    setOptionsErrorMessage("");
    void getWeatherOptions(settings.countyName)
      .then((nextOptions) => {
        if (active) {
          cachedWeatherOptions = nextOptions;
          setOptions(nextOptions);
          loadedCountyRef.current = settings.countyName;
        }
      })
      .catch((error) => {
        if (active) {
          setOptionsErrorMessage(error instanceof Error ? error.message : "目前無法載入測站選項。");
        }
      })
      .finally(() => {
        if (active) {
          void reloadWeatherDiagnostic();
        }
      });
    return () => {
      active = false;
    };
  }, [reloadWeatherDiagnostic, settings?.countyName]);

  useEffect(() => {
    if (!settings) return;
    let active = true;
    setPreviewErrorMessage("");
    void getWeatherPreview(settings)
      .then((nextPreview) => {
        if (active) {
          cachedWeatherPreview = nextPreview;
          setPreview(nextPreview);
        }
      })
      .catch((error) => {
        if (active) {
          setPreview(null);
          setPreviewErrorMessage(error instanceof Error ? error.message : "目前無法取得 weather preview。");
        }
      });
    return () => {
      active = false;
    };
  }, [settings?.countyName, settings?.enabled, settings?.locationMode, settings?.stationId]);

  const handleChange = useCallback<WeatherChangeHandler>((key, value) => {
    setSettings((current) => current
      ? applyWeatherSettingChange(current, key, value, options?.stations ?? [])
      : current);
    setMessage("天氣設定已變更，尚未儲存。");
    setErrorMessage("");
  }, [options?.stations]);

  const handleToggleField = useCallback((fieldKey: WeatherFieldKey, enabled: boolean) => {
    setSettings((current) => current ? toggleWeatherFieldKey(current, fieldKey, enabled) : current);
    setMessage("天氣欄位已變更，尚未儲存。");
    setErrorMessage("");
  }, []);

  const refreshWeather = useCallback(async () => {
    const currentSettings = settingsRef.current;
    if (!currentSettings || !currentSettings.enabled || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const response = await requestJson<WeatherHeaderContract & { diagnostic: WeatherDiagnostic }>(
        "/api/weather/refresh",
        { method: "POST" }
      );
      setPreview(response);
      setWeatherDiagnostic(response.diagnostic);
      setPreviewErrorMessage("");
      const feedback = resolveWeatherRefreshFeedback(response.diagnostic);
      setMessage(feedback.message);
      setErrorMessage(feedback.errorMessage);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "手動更新失敗，請查看下方診斷。");
      setMessage("");
    } finally {
      await reloadWeatherDiagnostic();
      setIsRefreshing(false);
    }
  }, [isRefreshing, reloadWeatherDiagnostic]);

  const copyWeatherDiagnostic = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("天氣診斷已複製。");
      setErrorMessage("");
    } catch {
      setErrorMessage("無法複製天氣診斷，請手動選取內容。");
      setMessage("");
    }
  }, []);

  const save = useCallback(async () => {
    const currentSettings = settingsRef.current;
    if (!currentSettings) return;
    const validationFeedback = resolveWeatherValidationFeedback(currentSettings);
    if (validationFeedback) {
      setErrorMessage(validationFeedback);
      setMessage("");
      return;
    }
    setIsSaving(true);
    try {
      const savedSettings = await saveDataHubWeatherSettings(currentSettings);
      setSettings(savedSettings);
      setLastSyncedSettings(savedSettings);
      setMessage("天氣設定已儲存。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存天氣設定失敗。");
      setMessage("");
    } finally {
      setIsSaving(false);
    }
  }, []);

  if (!settings) {
    return <DataHubSectionState message={routeModel.errorMessage || "Weather 設定同步失敗。"} status={routeModel.errorMessage ? "error" : "loading"} />;
  }

  return (
    <DataHubWeatherContent
      errorMessage={errorMessage}
      isDirty={dirty}
      isLoading={false}
      isRefreshing={isRefreshing}
      isSaving={isSaving}
      message={message}
      onChange={handleChange}
      onCopyDiagnostic={copyWeatherDiagnostic}
      onRefresh={refreshWeather}
      onSave={save}
      onToggleField={handleToggleField}
      options={options}
      optionsErrorMessage={optionsErrorMessage}
      preview={preview}
      previewErrorMessage={previewErrorMessage}
      remoteSyncBanner={syncDraftGuard.hasPendingRemoteChange ? (
        <RemoteSyncBanner
          onKeepEditing={syncDraftGuard.keepEditing}
          onReloadNow={syncDraftGuard.discardAndReload}
        />
      ) : null}
      settings={settings}
      diagnosticErrorMessage={diagnosticErrorMessage}
      weatherDiagnostic={weatherDiagnostic}
    />
  );
}
