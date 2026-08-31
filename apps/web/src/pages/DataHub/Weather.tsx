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
import { CustomSelect } from "../../components/management";
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
  resolveWeatherLocationMode,
  saveDataHubWeatherSettings,
  weatherUpdateIntervalOptions,
  type DataHubWeatherRouteModel,
  type WeatherSelectOption
} from "./WeatherModel";

const WEATHER_DISPLAY_SYNC_SCOPES = ["weather"] as const;

type WeatherChangeHandler = <Key extends keyof WeatherSettings>(
  key: Key,
  value: WeatherSettings[Key]
) => void;

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

function renderSelectOptions(options: readonly WeatherSelectOption[]) {
  return options.map(({ label, value }) => ({ label, value }));
}

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
    <div className="space-y-5 px-5 pb-8" data-data-hub-section="external-weather">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[#687169]">Data Hub / External Data</p>
        <h2 className="text-2xl font-semibold text-[#27322b]">Weather</h2>
        <p className="mt-1 max-w-3xl text-sm text-[#687169]">
          管理 Header 天氣的啟用狀態、定位、欄位預設與更新頻率；這些設定不依賴 MQTT broker 管理。
        </p>
      </header>

      {remoteSyncBanner}
      {errorMessage ? <div className="mgmt-status is-error" role="alert">{errorMessage}</div> : null}
      {message ? <div className="mgmt-status is-success" role="status">{message}</div> : null}

      <section className="mgmt-card space-y-5 p-5" data-weather-management>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#687169]">External Data</p>
            <h3 className="text-lg font-semibold text-[#27322b]">天氣設定</h3>
          </div>
          <button
            className="mgmt-action mgmt-action-primary"
            data-weather-action="save"
            disabled={isSaving || !isDirty}
            onClick={() => void onSave()}
            type="button"
          >
            {isSaving ? "儲存中..." : "儲存天氣設定"}
          </button>
        </div>

        <div className="mgmt-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-[#4d554f]">
          <label className="flex items-center gap-2" data-weather-control="enabled">
            <input
              checked={settings.enabled}
              onChange={(event) => onChange("enabled", event.target.checked)}
              type="checkbox"
            />
            啟用天氣顯示
          </label>
          <span className={`mgmt-chip ${isDirty ? "is-warning" : "is-success"}`} data-weather-dirty={isDirty}>
            {isDirty ? "尚未儲存" : "已同步"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2" data-weather-control="preset" role="tablist" aria-label="天氣欄位預設">
          {presetOptions.map((option) => (
            <button
              aria-selected={settings.preset === option.value}
              className={settings.preset === option.value ? "mgmt-action mgmt-action-primary" : "mgmt-action"}
              data-weather-preset={option.value}
              key={option.value}
              onClick={() => onChange("preset", option.value)}
              role="tab"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-[#4d554f]" data-weather-control="location-mode">
            定位方式
            <CustomSelect
              onChange={(value) => onChange("locationMode", resolveWeatherLocationMode(value))}
              options={renderSelectOptions(viewModel.locationOptions)}
              value={settings.locationMode}
            />
          </label>
          <label className="grid gap-1 text-sm text-[#4d554f]" data-weather-control="interval">
            更新頻率
            <CustomSelect
              onChange={(value) => onChange("updateIntervalMinutes", Number(value))}
              options={renderSelectOptions(weatherUpdateIntervalOptions)}
              value={String(settings.updateIntervalMinutes)}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-[#4d554f]" data-weather-control="county">
            縣市
            <CustomSelect
              onChange={(value) => onChange("countyName", value || null)}
              options={countyOptions}
              value={settings.countyName ?? ""}
            />
          </label>
          {settings.locationMode === "station" ? (
            <label className="grid gap-1 text-sm text-[#4d554f]" data-weather-control="station">
              測站
              <CustomSelect
                onChange={(value) => onChange("stationId", value || null)}
                options={stationOptions}
                value={settings.stationId ?? ""}
              />
            </label>
          ) : null}
        </div>

        {viewModel.customFieldOptions.length > 0 ? (
          <fieldset className="space-y-2" data-weather-control="custom-fields">
            <legend className="text-sm font-semibold text-[#4d554f]">自訂欄位</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {viewModel.customFieldOptions.map((option) => (
                <label className="flex items-center gap-2 text-sm text-[#4d554f]" key={option.value}>
                  <input
                    checked={option.checked}
                    onChange={(event) => onToggleField(option.value, event.target.checked)}
                    type="checkbox"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {viewModel.stationFeedback ? <div className="mgmt-status is-error" role="alert">{viewModel.stationFeedback}</div> : null}
        {!options && !optionsErrorMessage ? (
          <div className="mgmt-status" role="status">正在載入測站／縣市選項...</div>
        ) : null}
        {viewModel.localValidationFeedback ? (
          <div className="mgmt-status is-error" data-weather-validation role="alert">
            {viewModel.localValidationFeedback}
          </div>
        ) : null}
      </section>

      <section className="mgmt-card space-y-2 p-5" data-weather-preview data-weather-preview-state={viewModel.preview.state}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#687169]">Header Preview</p>
            <h3 className="text-lg font-semibold text-[#27322b]">目前設定預覽</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="mgmt-chip">{viewModel.preview.state}</span>
            <button
              className="mgmt-action"
              data-weather-action="refresh"
              disabled={isRefreshing || !settings.enabled}
              onClick={() => void onRefresh()}
              type="button"
            >
              {isRefreshing ? "更新中..." : "立即更新"}
            </button>
          </div>
        </div>
        <p className="text-base text-[#27322b]">{viewModel.preview.primaryText}</p>
        {viewModel.preview.secondaryText ? <small className="text-sm text-[#687169]">{viewModel.preview.secondaryText}</small> : null}
        <div
          className={`mgmt-status ${viewModel.currentStatus.tone === "error" ? "is-error" : viewModel.currentStatus.tone === "warning" ? "is-warning" : ""}`}
          data-weather-current-source={viewModel.currentStatus.sourceLabel}
          data-weather-current-state={viewModel.currentStatus.fetchState}
        >
          <strong>資料狀態：{viewModel.currentStatus.label}</strong>
          <span>來源：{viewModel.currentStatus.sourceLabel}</span>
          <span>updatedAt：{viewModel.currentStatus.updatedAtLabel}</span>
          <span>staleAt：{viewModel.currentStatus.staleAtLabel}</span>
        </div>
        {viewModel.previewFeedback ? <div className="mgmt-status is-error" role="alert">{viewModel.previewFeedback}</div> : null}
        {optionsErrorMessage ? <div className="mgmt-status is-error" role="alert">{optionsErrorMessage}</div> : null}
      </section>

      <section
        className={`mgmt-card space-y-3 p-5 ${viewModel.diagnostic.tone === "error" ? "is-error" : viewModel.diagnostic.tone === "warning" ? "is-warning" : ""}`}
        data-weather-diagnostic
        data-weather-diagnostic-source={viewModel.diagnostic.source}
        data-weather-diagnostic-stage={viewModel.diagnostic.stage}
        data-weather-diagnostic-state={viewModel.diagnostic.state}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#687169]">Weather Diagnostic</p>
            <h3 className="text-lg font-semibold text-[#27322b]">最近一次天氣資料診斷</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="mgmt-chip">{viewModel.diagnostic.stateLabel}</span>
            <button
              className="mgmt-action"
              data-weather-diagnostic-copy
              onClick={() => void onCopyDiagnostic(viewModel.diagnostic.copyText)}
              type="button"
            >
              複製診斷
            </button>
          </div>
        </div>
        <p>{viewModel.diagnostic.safeSummary}</p>
        <dl className="grid gap-2 text-sm text-[#4d554f] sm:grid-cols-2">
          <div><dt>錯誤碼</dt><dd>{viewModel.diagnostic.code ?? "—"}</dd></div>
          <div><dt>來源</dt><dd>{viewModel.diagnostic.sourceLabel}</dd></div>
          {viewModel.diagnostic.stageLabel ? <div><dt>失敗階段</dt><dd>{viewModel.diagnostic.stageLabel}</dd></div> : null}
          <div><dt>操作</dt><dd>{viewModel.diagnostic.operationLabel}</dd></div>
          <div><dt>發生時間</dt><dd>{viewModel.diagnostic.occurredAtLabel}</dd></div>
          <div><dt>上次成功</dt><dd>{viewModel.diagnostic.lastSuccessAtLabel}</dd></div>
          <div><dt>重試</dt><dd>{viewModel.diagnostic.retryableLabel}</dd></div>
          {viewModel.diagnostic.httpStatusLabel ? <div><dt>HTTP</dt><dd>{viewModel.diagnostic.httpStatusLabel}</dd></div> : null}
        </dl>
        {diagnosticErrorMessage ? <div className="mgmt-status is-error" role="alert">{diagnosticErrorMessage}</div> : null}
      </section>
    </div>
  );
}

export function DataHubWeather() {
  const routeModel = useLoaderData() as DataHubWeatherRouteModel;
  const initialSettings = routeModel.settings;
  const [settings, setSettings] = useState<WeatherSettings | null>(initialSettings);
  const [lastSyncedSettings, setLastSyncedSettings] = useState<WeatherSettings | null>(initialSettings);
  const [options, setOptions] = useState<WeatherOptionsResponse | null>(null);
  const [preview, setPreview] = useState<WeatherHeaderContract | null>(null);
  const [weatherDiagnostic, setWeatherDiagnostic] = useState<WeatherDiagnostic | null>(null);
  const [optionsErrorMessage, setOptionsErrorMessage] = useState("");
  const [previewErrorMessage, setPreviewErrorMessage] = useState("");
  const [diagnosticErrorMessage, setDiagnosticErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    setSettings(routeModel.settings);
    setLastSyncedSettings(routeModel.settings);
    setOptions(null);
    setPreview(null);
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
      setWeatherDiagnostic(await getWeatherDiagnostics());
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
    if (!settings) return;
    let active = true;
    setOptionsErrorMessage("");
    void getWeatherOptions(settings.countyName)
      .then((nextOptions) => {
        if (active) setOptions(nextOptions);
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
        if (active) setPreview(nextPreview);
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
