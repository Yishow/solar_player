import type {
  HeaderWeatherMeta,
  WeatherCurrentSnapshot,
  WeatherFieldKey,
  WeatherSettings
} from "@solar-display/shared";

type HeaderWeatherSettings = Pick<WeatherSettings, "enabled" | "fieldKeys" | "locationMode" | "preset">;

type ResolveHeaderWeatherMetaInput = {
  current: WeatherCurrentSnapshot | null;
  isHydrated: boolean;
  settings?: HeaderWeatherSettings | null;
};

const LOADING_META: HeaderWeatherMeta = {
  primaryText: "天氣資料同步中",
  secondaryText: "",
  state: "loading"
};

const DISABLED_META: HeaderWeatherMeta = {
  primaryText: "天氣未啟用",
  secondaryText: "",
  state: "disabled"
};

const UNAVAILABLE_META: HeaderWeatherMeta = {
  primaryText: "天氣暫不可用",
  secondaryText: "",
  state: "unavailable"
};

function normalizeText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatTemperature(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  const rounded = Number.isInteger(value) ? value : Math.round(value);
  return `${rounded}°C`;
}

function formatTime(value: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return `${parsed.getHours().toString().padStart(2, "0")}:${parsed.getMinutes().toString().padStart(2, "0")}`;
}

function formatNumber(value: number | null, unit: string) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  const normalized = Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, "");
  return `${normalized}${unit}`;
}

function buildPrimaryParts(snapshot: WeatherCurrentSnapshot, settings: HeaderWeatherSettings) {
  const locationLabel = settings.locationMode === "county"
    ? normalizeText(snapshot.countyName) ?? normalizeText(snapshot.stationName)
    : normalizeText(snapshot.stationName) ?? normalizeText(snapshot.countyName);

  return [
    locationLabel,
    normalizeText(snapshot.weather),
    formatTemperature(snapshot.airTemperature)
  ].filter((part): part is string => Boolean(part));
}

function formatSecondaryField(fieldKey: WeatherFieldKey, snapshot: WeatherCurrentSnapshot) {
  switch (fieldKey) {
    case "weather":
    case "airTemperature":
      return null;
    case "relativeHumidity":
      return snapshot.relativeHumidity === null ? null : `濕度 ${Math.round(snapshot.relativeHumidity)}%`;
    case "observationTime": {
      const time = formatTime(snapshot.observationTime);
      return time ? `觀測 ${time}` : null;
    }
    case "windSpeed": {
      const value = formatNumber(snapshot.windSpeed, " m/s");
      return value ? `風速 ${value}` : null;
    }
    case "windDirection":
      return snapshot.windDirection === null ? null : `風向 ${Math.round(snapshot.windDirection)}°`;
    case "airPressure": {
      const value = formatNumber(snapshot.airPressure, " hPa");
      return value ? `氣壓 ${value}` : null;
    }
    case "precipitation": {
      const value = formatNumber(snapshot.precipitation, " mm");
      return value ? `降雨 ${value}` : null;
    }
    case "dailyHigh": {
      const value = formatTemperature(snapshot.dailyHigh);
      return value ? `高溫 ${value}` : null;
    }
    case "dailyLow": {
      const value = formatTemperature(snapshot.dailyLow);
      return value ? `低溫 ${value}` : null;
    }
    default:
      return null;
  }
}

export function resolveHeaderWeatherMeta(input: ResolveHeaderWeatherMetaInput): HeaderWeatherMeta {
  if (!input.isHydrated) {
    return LOADING_META;
  }

  if (input.settings && !input.settings.enabled) {
    return DISABLED_META;
  }

  if (
    !input.current
    || !input.settings
    || input.current.fetchState === "unavailable"
    || input.current.fetchState === "unconfigured"
  ) {
    return UNAVAILABLE_META;
  }

  const primaryParts = buildPrimaryParts(input.current, input.settings);
  const secondaryParts = input.settings.fieldKeys
    .map((fieldKey) => formatSecondaryField(fieldKey, input.current!))
    .filter((part): part is string => Boolean(part));

  const isStale = input.current.fetchState === "stale";
  if (isStale) {
    secondaryParts.push("資料延遲");
  }

  return {
    primaryText: primaryParts.join(" ") || UNAVAILABLE_META.primaryText,
    secondaryText: secondaryParts.join("・"),
    state: isStale ? "stale" : "ready"
  };
}
