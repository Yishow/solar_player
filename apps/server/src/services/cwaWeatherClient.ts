import type {
  WeatherCurrentSnapshot,
  WeatherDiagnosticCode,
  WeatherOptionsResponse,
  WeatherStationOption
} from "@solar-display/shared";

type FetchLike = (
  input: string,
  init?: {
    signal?: AbortSignal;
  }
) => Promise<{
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
}>;

type CwaWeatherClientOptions = {
  authorization: string;
  datasetUrl?: string;
  fetchImplementation?: FetchLike;
  requestTimeoutMs?: number;
};

type StationRecord = {
  GeoInfo?: {
    CountyName?: string;
    TownName?: string;
  };
  ObsTime?: {
    DateTime?: string;
  };
  StationId?: string;
  StationName?: string;
  WeatherElement?: {
    AirPressure?: string | number | null;
    AirTemperature?: string | number | null;
    DailyExtreme?: {
      DailyHigh?: {
        TemperatureInfo?: {
          AirTemperature?: string | number | null;
        };
      };
      DailyLow?: {
        TemperatureInfo?: {
          AirTemperature?: string | number | null;
        };
      };
    };
    Precipitation?: string | number | null;
    RelativeHumidity?: string | number | null;
    Weather?: string | null;
    WindDirection?: string | number | null;
    WindSpeed?: string | number | null;
  };
};

const SPECIAL_NUMBER_VALUES = new Set(["-98", "-99", "990", "X"]);
const SPECIAL_TEXT_VALUES = new Set(["", "X", "-98", "-99"]);
const DEFAULT_CWA_DATASET_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001";
const DNS_ERROR_CODES = new Set(["EAI_AGAIN", "ENOTFOUND"]);
const TLS_ERROR_CODES = new Set([
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
]);

const SAFE_SUMMARIES: Record<WeatherDiagnosticCode, string> = {
  WEATHER_CONNECTION_TIMEOUT: "CWA connection timed out",
  WEATHER_DNS_LOOKUP_FAILED: "CWA hostname lookup failed",
  WEATHER_HTTP_ERROR: "CWA returned an HTTP error",
  WEATHER_INVALID_PAYLOAD: "CWA returned an invalid payload",
  WEATHER_REQUEST_TIMEOUT: "CWA request timed out",
  WEATHER_TLS_FAILED: "CWA TLS connection failed",
  WEATHER_UNCONFIGURED: "CWA authorization is not configured",
  WEATHER_UNKNOWN_ERROR: "CWA request failed"
};

export class CwaWeatherRequestError extends Error {
  readonly code: WeatherDiagnosticCode;
  readonly httpStatus: number | null;
  readonly retryable: boolean;
  readonly safeSummary: string;

  constructor(options: {
    code: WeatherDiagnosticCode;
    httpStatus?: number | null;
    retryable: boolean;
  }) {
    const safeSummary = SAFE_SUMMARIES[options.code];
    super(safeSummary);
    this.name = "CwaWeatherRequestError";
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? null;
    this.retryable = options.retryable;
    this.safeSummary = safeSummary;
  }
}

function readErrorField(error: unknown, field: "code" | "name"): string | null {
  let current = error;
  for (let depth = 0; depth < 3 && current && typeof current === "object"; depth += 1) {
    const value = (current as Record<string, unknown>)[field];
    if (typeof value === "string") {
      return value;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

function classifyRequestFailure(error: unknown) {
  if (error instanceof CwaWeatherRequestError) {
    return error;
  }
  if (error instanceof SyntaxError) {
    return new CwaWeatherRequestError({
      code: "WEATHER_INVALID_PAYLOAD",
      retryable: true
    });
  }

  const name = readErrorField(error, "name");
  const code = readErrorField(error, "code");
  if (name === "AbortError") {
    return new CwaWeatherRequestError({ code: "WEATHER_REQUEST_TIMEOUT", retryable: true });
  }
  if (code && DNS_ERROR_CODES.has(code)) {
    return new CwaWeatherRequestError({ code: "WEATHER_DNS_LOOKUP_FAILED", retryable: true });
  }
  if (code === "ETIMEDOUT") {
    return new CwaWeatherRequestError({ code: "WEATHER_CONNECTION_TIMEOUT", retryable: true });
  }
  if (code && TLS_ERROR_CODES.has(code)) {
    return new CwaWeatherRequestError({ code: "WEATHER_TLS_FAILED", retryable: true });
  }

  return new CwaWeatherRequestError({ code: "WEATHER_UNKNOWN_ERROR", retryable: true });
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (SPECIAL_TEXT_VALUES.has(trimmed)) {
    return null;
  }

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (SPECIAL_NUMBER_VALUES.has(trimmed)) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStationOption(station: StationRecord): WeatherStationOption | null {
  const stationId = normalizeText(station.StationId);
  const stationName = normalizeText(station.StationName);
  const countyName = normalizeText(station.GeoInfo?.CountyName);
  const townName = normalizeText(station.GeoInfo?.TownName);

  if (!stationId || !stationName || !countyName || !townName) {
    return null;
  }

  return {
    countyName,
    stationId,
    stationName,
    townName
  };
}

function normalizeCurrentSnapshot(station: StationRecord, updatedAt: string): WeatherCurrentSnapshot {
  return {
    airPressure: normalizeNumber(station.WeatherElement?.AirPressure),
    airTemperature: normalizeNumber(station.WeatherElement?.AirTemperature),
    countyName: normalizeText(station.GeoInfo?.CountyName),
    dailyHigh: normalizeNumber(station.WeatherElement?.DailyExtreme?.DailyHigh?.TemperatureInfo?.AirTemperature),
    dailyLow: normalizeNumber(station.WeatherElement?.DailyExtreme?.DailyLow?.TemperatureInfo?.AirTemperature),
    fetchState: "fresh",
    observationTime: normalizeText(station.ObsTime?.DateTime),
    precipitation: normalizeNumber(station.WeatherElement?.Precipitation),
    relativeHumidity: normalizeNumber(station.WeatherElement?.RelativeHumidity),
    staleAt: null,
    stationId: normalizeText(station.StationId),
    stationName: normalizeText(station.StationName),
    townName: normalizeText(station.GeoInfo?.TownName),
    updatedAt,
    weather: normalizeText(station.WeatherElement?.Weather),
    windDirection: normalizeNumber(station.WeatherElement?.WindDirection),
    windSpeed: normalizeNumber(station.WeatherElement?.WindSpeed)
  };
}

function readStations(payload: unknown): StationRecord[] {
  const stations = (payload as { records?: { Station?: unknown } })?.records?.Station;
  if (!Array.isArray(stations)) {
    throw new CwaWeatherRequestError({
      code: "WEATHER_INVALID_PAYLOAD",
      retryable: true
    });
  }
  return stations as StationRecord[];
}

export class CwaWeatherClient {
  private readonly authorization: string;
  private readonly datasetUrl: string;
  private readonly fetchImplementation: FetchLike;
  private readonly requestTimeoutMs: number;

  constructor(options: CwaWeatherClientOptions) {
    this.authorization = options.authorization;
    this.datasetUrl = options.datasetUrl ?? DEFAULT_CWA_DATASET_URL;
    this.fetchImplementation = options.fetchImplementation ?? (globalThis.fetch.bind(globalThis) as FetchLike);
    this.requestTimeoutMs = options.requestTimeoutMs ?? 5_000;
  }

  async readOptions(filters?: { countyName?: string | null }): Promise<WeatherOptionsResponse> {
    const payload = await this.fetchDataset();
    const updatedAt = new Date().toISOString();
    const allStations = readStations(payload)
      .map((station) => normalizeStationOption(station))
      .filter((station): station is WeatherStationOption => station !== null);
    const counties = Array.from(new Set(allStations.map((station) => station.countyName))).sort((left, right) =>
      left.localeCompare(right)
    );
    const stations = filters?.countyName
      ? allStations.filter((station) => station.countyName === filters.countyName)
      : allStations;

    return {
      counties,
      fetchState: "fresh",
      stations,
      updatedAt
    };
  }

  async readCurrentWeather(filters?: {
    countyName?: string | null;
    stationId?: string | null;
  }): Promise<WeatherCurrentSnapshot> {
    const payload = await this.fetchDataset(filters?.stationId ?? undefined);
    const stations = readStations(payload);
    const updatedAt = new Date().toISOString();
    const station = filters?.stationId
      ? stations.find((candidate) => normalizeText(candidate.StationId) === filters.stationId)
      : stations.find((candidate) => {
          const countyName = normalizeText(candidate.GeoInfo?.CountyName);
          return filters?.countyName ? countyName === filters.countyName : true;
        }) ?? stations[0];

    if (!station) {
      throw new CwaWeatherRequestError({
        code: "WEATHER_INVALID_PAYLOAD",
        retryable: true
      });
    }

    return normalizeCurrentSnapshot(station, updatedAt);
  }

  private async fetchDataset(stationId?: string) {
    const url = new URL(this.datasetUrl);
    url.searchParams.set("Authorization", this.authorization);
    url.searchParams.set("format", "JSON");
    if (stationId) {
      url.searchParams.set("StationId", stationId);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.requestTimeoutMs);

    try {
      const response = await this.fetchImplementation(url.toString(), {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new CwaWeatherRequestError({
          code: "WEATHER_HTTP_ERROR",
          httpStatus: response.status,
          retryable: response.status === 408
            || response.status === 425
            || response.status === 429
            || response.status >= 500
        });
      }

      return await response.json();
    } catch (error) {
      throw classifyRequestFailure(error);
    } finally {
      clearTimeout(timeout);
    }
  }
}
