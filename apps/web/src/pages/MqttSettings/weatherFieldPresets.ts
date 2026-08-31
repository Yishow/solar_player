import {
  DEFAULT_WEATHER_FIELD_KEYS,
  type WeatherDiagnostic,
  type WeatherFieldKey,
  weatherFieldKeys,
  type WeatherFieldPreset,
  type WeatherSettings,
  type WeatherStationOption
} from "@solar-display/shared";

type WeatherFieldPresetOption = {
  description: string;
  fieldKeys: WeatherFieldKey[] | null;
  label: string;
  value: WeatherFieldPreset;
};

export const weatherFieldPresetOptions: WeatherFieldPresetOption[] = [
  {
    description: "主資訊只保留天氣現象與溫度。",
    fieldKeys: ["weather", "airTemperature"],
    label: "精簡",
    value: "compact"
  },
  {
    description: "保留目前 header 預設的天氣、溫度、濕度與觀測時間。",
    fieldKeys: DEFAULT_WEATHER_FIELD_KEYS,
    label: "標準",
    value: "standard"
  },
  {
    description: "顯示所有可用的 weather metadata 欄位。",
    fieldKeys: [...weatherFieldKeys],
    label: "完整",
    value: "complete"
  },
  {
    description: "自行挑選欄位組合。",
    fieldKeys: null,
    label: "自訂",
    value: "custom"
  }
];

export const weatherFieldLabelMap: Record<WeatherFieldKey, string> = {
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

export type WeatherDiagnosticModel = {
  code: WeatherDiagnostic["code"];
  copyText: string;
  httpStatusLabel: string | null;
  lastSuccessAtLabel: string;
  occurredAtLabel: string;
  operationLabel: string;
  retryableLabel: string;
  safeSummary: string;
  source: WeatherDiagnostic["source"];
  sourceLabel: string;
  stage: string | null;
  stageLabel: string | null;
  state: WeatherDiagnostic["state"];
  stateLabel: string;
  tone: "error" | "muted" | "ready" | "warning";
};

const WEATHER_DIAGNOSTIC_SUMMARY_LIMIT = 240;
const WEATHER_DIAGNOSTIC_COPY_LIMIT = 512;

function formatWeatherDiagnosticTimestamp(value: string | null) {
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

function boundWeatherDiagnosticSummary(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, WEATHER_DIAGNOSTIC_SUMMARY_LIMIT);
}

export function resolveWeatherRefreshFeedback(diagnostic: WeatherDiagnostic) {
  if (diagnostic.state === "ok" && diagnostic.source === "upstream") {
    return {
      errorMessage: "",
      message: "天氣資訊已立即更新。"
    };
  }

  const code = diagnostic.code ? `（${diagnostic.code}）` : "";
  const sourceDetail = {
    cache: "本次只取得快取資料。",
    stale: "目前顯示舊資料。",
    unavailable: "目前沒有可用天氣資料。",
    upstream: "請查看下方診斷。"
  }[diagnostic.source];
  const outcome = diagnostic.state === "error" ? "失敗" : "未完成";

  return {
    errorMessage: `天氣即時更新${outcome}${code}；${sourceDetail}`,
    message: ""
  };
}

export function buildWeatherDiagnosticModel(diagnostic: WeatherDiagnostic | null): WeatherDiagnosticModel {
  const value: WeatherDiagnostic = diagnostic ?? {
    code: null,
    httpStatus: null,
    lastSuccessAt: null,
    occurredAt: null,
    operation: null,
    retryable: false,
    safeSummary: "尚未執行天氣資料請求",
    source: "unavailable",
    state: "never-attempted"
  };
  const stateMeta = {
    error: { label: "取得失敗", tone: "error" as const },
    "never-attempted": { label: "尚未執行", tone: "muted" as const },
    ok: { label: "取得成功", tone: "ready" as const },
    unconfigured: { label: "尚未設定", tone: "warning" as const }
  }[value.state];
  const sourceLabel = {
    cache: "快取資料",
    stale: "使用舊資料",
    unavailable: "無可用資料",
    upstream: "即時上游"
  }[value.source];
  const stage = (() => {
    switch (value.code) {
      case "WEATHER_UNCONFIGURED": return { id: "configuration", label: "Configuration" };
      case "WEATHER_DNS_LOOKUP_FAILED": return { id: "dns", label: "DNS" };
      case "WEATHER_CONNECTION_TIMEOUT": return { id: "connect", label: "Connect" };
      case "WEATHER_TLS_FAILED": return { id: "tls", label: "TLS" };
      case "WEATHER_HTTP_ERROR":
      case "WEATHER_REQUEST_TIMEOUT": return { id: "http", label: "HTTP" };
      case "WEATHER_INVALID_PAYLOAD": return { id: "payload", label: "Payload" };
      case "WEATHER_UNKNOWN_ERROR": return { id: "unknown", label: "Unknown" };
      default: return null;
    }
  })();
  const safeSummary = boundWeatherDiagnosticSummary(value.safeSummary);
  const copyText = [
    "Weather diagnostic",
    `State: ${value.state}`,
    `Source: ${value.source}`,
    `Stage: ${stage?.id ?? "-"}`,
    `Code: ${value.code ?? "-"}`,
    `Operation: ${value.operation ?? "-"}`,
    `Occurred at: ${value.occurredAt ?? "-"}`,
    `Last success at: ${value.lastSuccessAt ?? "-"}`,
    `Retryable: ${value.retryable}`,
    `HTTP status: ${value.httpStatus ?? "-"}`,
    `Summary: ${safeSummary}`
  ].join("\n").slice(0, WEATHER_DIAGNOSTIC_COPY_LIMIT);

  return {
    code: value.code,
    copyText,
    httpStatusLabel: value.httpStatus === null ? null : String(value.httpStatus),
    lastSuccessAtLabel: value.lastSuccessAt
      ? formatWeatherDiagnosticTimestamp(value.lastSuccessAt)
      : "尚無成功紀錄",
    occurredAtLabel: value.occurredAt
      ? formatWeatherDiagnosticTimestamp(value.occurredAt)
      : "尚未執行",
    operationLabel: value.operation === "current"
      ? "目前天氣"
      : value.operation === "options"
        ? "測站／縣市選項"
        : "尚未執行",
    retryableLabel: value.retryable ? "可重試" : "不可重試",
    safeSummary,
    source: value.source,
    sourceLabel,
    stage: stage?.id ?? null,
    stageLabel: stage?.label ?? null,
    state: value.state,
    stateLabel: stateMeta.label,
    tone: stateMeta.tone
  };
}

function sortFieldKeys(fieldKeys: readonly WeatherFieldKey[]) {
  const order = new Map(weatherFieldKeys.map((fieldKey, index) => [fieldKey, index] as const));
  return [...fieldKeys].sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
}

export function resolveWeatherFieldKeysForPreset(preset: WeatherFieldPreset): WeatherFieldKey[] {
  const option = weatherFieldPresetOptions.find((candidate) => candidate.value === preset);
  if (!option?.fieldKeys) {
    return DEFAULT_WEATHER_FIELD_KEYS;
  }

  return [...option.fieldKeys];
}

export function matchWeatherFieldPreset(fieldKeys: readonly WeatherFieldKey[]): WeatherFieldPreset {
  const normalized = sortFieldKeys(Array.from(new Set(fieldKeys)));

  for (const option of weatherFieldPresetOptions) {
    if (!option.fieldKeys) {
      continue;
    }

    const candidate = sortFieldKeys(option.fieldKeys);
    if (candidate.length === normalized.length && candidate.every((fieldKey, index) => fieldKey === normalized[index])) {
      return option.value;
    }
  }

  return "custom";
}

export function applyWeatherSettingChange<Key extends keyof WeatherSettings>(
  current: WeatherSettings,
  key: Key,
  value: WeatherSettings[Key],
  stations: readonly WeatherStationOption[] = []
): WeatherSettings {
  if (key === "preset") {
    const preset = value as WeatherFieldPreset;
    return {
      ...current,
      fieldKeys: preset === "custom" ? current.fieldKeys : resolveWeatherFieldKeysForPreset(preset),
      preset
    };
  }

  if (key === "countyName") {
    const countyName = value as WeatherSettings["countyName"];
    const stationStillValid =
      current.stationId !== null
      && stations.some(
        (station) =>
          station.stationId === current.stationId
          && (!countyName || station.countyName === countyName)
      );
    return {
      ...current,
      countyName,
      stationId: stationStillValid ? current.stationId : null
    };
  }

  return { ...current, [key]: value };
}

export function toggleWeatherFieldKey(
  current: WeatherSettings,
  fieldKey: WeatherFieldKey,
  enabled: boolean
): WeatherSettings {
  const nextFieldKeys = enabled
    ? sortFieldKeys(Array.from(new Set([...current.fieldKeys, fieldKey])))
    : current.fieldKeys.filter((key) => key !== fieldKey);

  return {
    ...current,
    fieldKeys: nextFieldKeys
  };
}

export function resolveWeatherValidationFeedback(weatherSettings: WeatherSettings) {
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
