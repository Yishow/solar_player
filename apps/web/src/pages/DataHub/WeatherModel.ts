import type { LoaderFunctionArgs } from "react-router-dom";
import type {
  HeaderWeatherMeta,
  WeatherCurrentSnapshot,
  WeatherDiagnostic,
  WeatherFieldKey,
  WeatherHeaderContract,
  WeatherLocationMode,
  WeatherOptionsResponse,
  WeatherSettings,
  WeatherStationOption
} from "@solar-display/shared";
import { weatherFieldKeys } from "@solar-display/shared";
import { resolveHeaderWeatherMeta } from "../../components/headerWeatherMeta";
import {
  buildWeatherDiagnosticModel,
  resolveWeatherValidationFeedback,
  weatherFieldLabelMap,
  weatherFieldPresetOptions
} from "../MqttSettings/weatherFieldPresets";
import {
  getWeatherDiagnostics,
  getWeatherOptions,
  getWeatherPreview,
  getWeatherSettings,
  updateWeatherSettings
} from "../../services/api";

export type WeatherSelectOption = {
  label: string;
  value: string;
};

export const weatherUpdateIntervalOptions: readonly WeatherSelectOption[] = [
  { label: "10 分鐘", value: "10" },
  { label: "30 分鐘", value: "30" },
  { label: "1 小時", value: "60" },
  { label: "3 小時", value: "180" },
  { label: "6 小時", value: "360" },
  { label: "12 小時", value: "720" },
  { label: "手動更新", value: "0" }
];

export const weatherLocationOptions: readonly WeatherSelectOption[] = [
  { label: "指定測站", value: "station" },
  { label: "依縣市", value: "county" }
];

export type WeatherFieldOption = {
  checked: boolean;
  label: string;
  value: WeatherFieldKey;
};

export type DataHubWeatherViewModel = {
  countyOptions: string[];
  customFieldOptions: WeatherFieldOption[];
  currentStatus: WeatherCurrentStatusModel;
  diagnostic: ReturnType<typeof buildWeatherDiagnosticModel>;
  localValidationFeedback: string;
  locationOptions: readonly WeatherSelectOption[];
  preview: HeaderWeatherMeta;
  previewFeedback: string;
  stationFeedback: string;
  stationOptions: WeatherStationOption[];
};

export type WeatherCurrentStatusModel = {
  fetchState: WeatherCurrentSnapshot["fetchState"];
  label: string;
  sourceLabel: string;
  staleAtLabel: string;
  tone: "error" | "muted" | "ready" | "warning";
  updatedAtLabel: string;
};

export type BuildWeatherViewModelArgs = {
  /**
   * Reference instant for preview staleness. Production leaves it unset so the
   * preview ages against the real clock; a caller that must stay independent of
   * when it runs supplies a fixed instant.
   */
  now?: Date;
  options: WeatherOptionsResponse | null;
  optionsErrorMessage?: string;
  preview: WeatherHeaderContract | null;
  previewErrorMessage: string;
  weatherDiagnostic?: WeatherDiagnostic | null;
  settings: WeatherSettings;
};

export type DataHubWeatherRouteModel = {
  errorMessage: string;
  settings: WeatherSettings | null;
  initialOptions?: WeatherOptionsResponse | null;
  initialPreview?: WeatherHeaderContract | null;
  initialDiagnostic?: WeatherDiagnostic | null;
};

export function buildWeatherViewModel({
  now,
  options,
  optionsErrorMessage = "",
  preview,
  previewErrorMessage,
  weatherDiagnostic = null,
  settings
}: BuildWeatherViewModelArgs): DataHubWeatherViewModel {
  const stationOptions = (options?.stations ?? []).filter((station) =>
    !settings.countyName || station.countyName === settings.countyName
  );
  const localValidationFeedback = resolveWeatherValidationFeedback(settings);
  const diagnostic = buildWeatherDiagnosticModel(weatherDiagnostic);
  const current = preview?.current ?? null;
  const currentState = current?.fetchState ?? "unavailable";
  const currentStateMeta = {
    fresh: { label: "最新資料", tone: "ready" as const },
    stale: { label: "舊資料", tone: "warning" as const },
    unconfigured: { label: "尚未設定", tone: "warning" as const },
    unavailable: { label: "無可用資料", tone: "error" as const }
  }[currentState];
  const currentSourceLabel = weatherDiagnostic?.operation === "current"
    ? diagnostic.sourceLabel
    : currentState === "unconfigured"
      ? "尚未設定"
      : currentState === "unavailable"
        ? "無可用資料"
        : "來源未明";

  return {
    countyOptions: options?.counties ?? [],
    customFieldOptions: settings.preset === "custom"
      ? weatherFieldKeys.map((fieldKey) => ({
          checked: settings.fieldKeys.includes(fieldKey),
          label: weatherFieldLabelMap[fieldKey],
          value: fieldKey
        }))
      : [],
    currentStatus: {
      fetchState: currentState,
      label: currentStateMeta.label,
      sourceLabel: currentSourceLabel,
      staleAtLabel: current?.staleAt ?? "—",
      tone: currentStateMeta.tone,
      updatedAtLabel: current?.updatedAt ?? "—"
    },
    diagnostic,
    localValidationFeedback,
    locationOptions: weatherLocationOptions,
    preview: resolveHeaderWeatherMeta({
      current: preview?.current ?? null,
      ...(now ? { now } : {}),
      isHydrated: Boolean(preview) || previewErrorMessage.trim().length > 0,
      settings: {
        enabled: settings.enabled,
        fieldKeys: settings.fieldKeys,
        locationMode: settings.locationMode,
        preset: settings.preset,
        updateIntervalMinutes: settings.updateIntervalMinutes
      }
    }),
    previewFeedback: previewErrorMessage,
    stationFeedback: optionsErrorMessage || (
      settings.locationMode === "station"
      && options !== null
      && stationOptions.length === 0
      && options?.fetchState !== "unconfigured"
        ? "目前沒有符合縣市的測站選項。"
        : ""
    ),
    stationOptions
  };
}

export function getWeatherPresetOptions() {
  return weatherFieldPresetOptions;
}

export function resolveWeatherLocationMode(value: string): WeatherLocationMode {
  return value === "county" ? "county" : "station";
}

export async function loadDataHubWeatherRoute({ request }: LoaderFunctionArgs): Promise<DataHubWeatherRouteModel> {
  void request;
  try {
    return {
      errorMessage: "",
      settings: await getWeatherSettings()
    };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : "Weather 設定同步失敗。",
      settings: null
    };
  }
}

export async function saveDataHubWeatherSettings(settings: WeatherSettings) {
  return updateWeatherSettings(settings);
}
