import {
  type WeatherCurrentSnapshot,
  type WeatherDiagnostic,
  type WeatherDiagnosticOperation,
  type WeatherOptionsResponse,
  type WeatherSettings
} from "@solar-display/shared";
import { CwaWeatherClient, CwaWeatherRequestError } from "./cwaWeatherClient.js";
import { config } from "../config.js";

type WeatherClientLike = Pick<CwaWeatherClient, "readCurrentWeather" | "readOptions">;
type LoggerLike = {
  warn: (payload: unknown, message?: string) => void;
};

type WeatherServiceOptions = {
  authorizationConfigured?: boolean;
  client?: WeatherClientLike;
  logger?: LoggerLike;
  now?: () => Date;
};

type CachedWeatherEntry = {
  expiresAt: Date;
  snapshot: WeatherCurrentSnapshot;
};

function buildEmptySnapshot(fetchState: WeatherCurrentSnapshot["fetchState"]): WeatherCurrentSnapshot {
  return {
    airPressure: null,
    airTemperature: null,
    countyName: null,
    dailyHigh: null,
    dailyLow: null,
    fetchState,
    observationTime: null,
    precipitation: null,
    relativeHumidity: null,
    staleAt: null,
    stationId: null,
    stationName: null,
    townName: null,
    updatedAt: null,
    weather: null,
    windDirection: null,
    windSpeed: null
  };
}

function buildEmptyOptions(fetchState: WeatherOptionsResponse["fetchState"]): WeatherOptionsResponse {
  return {
    counties: [],
    fetchState,
    stations: [],
    updatedAt: null
  };
}

const initialDiagnostic: WeatherDiagnostic = {
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

function buildFailureDiagnostic(
  error: unknown,
  operation: WeatherDiagnosticOperation,
  occurredAt: string,
  lastSuccessAt: string | null,
  source: WeatherDiagnostic["source"]
): WeatherDiagnostic {
  if (error instanceof CwaWeatherRequestError) {
    const summaryByCode = {
      WEATHER_CONNECTION_TIMEOUT: "CWA 連線逾時",
      WEATHER_DNS_LOOKUP_FAILED: "無法解析 CWA 主機名稱",
      WEATHER_HTTP_ERROR: "CWA 回傳 HTTP 錯誤",
      WEATHER_INVALID_PAYLOAD: "CWA 回傳資料格式無效",
      WEATHER_REQUEST_TIMEOUT: "CWA 請求逾時",
      WEATHER_TLS_FAILED: "CWA TLS 連線失敗",
      WEATHER_UNCONFIGURED: "CWA 授權尚未設定",
      WEATHER_UNKNOWN_ERROR: "CWA 請求失敗"
    } as const;
    return {
      code: error.code,
      httpStatus: error.httpStatus,
      lastSuccessAt,
      occurredAt,
      operation,
      retryable: error.retryable,
      safeSummary: summaryByCode[error.code],
      source,
      state: "error"
    };
  }

  return {
    code: "WEATHER_UNKNOWN_ERROR",
    httpStatus: null,
    lastSuccessAt,
    occurredAt,
    operation,
    retryable: true,
    safeSummary: "CWA 請求失敗",
    source,
    state: "error"
  };
}

function weatherCacheKey(settings: WeatherSettings) {
  return JSON.stringify([
    settings.locationMode,
    settings.countyName ?? "",
    settings.locationMode === "station" ? settings.stationId ?? "" : ""
  ]);
}

export class WeatherService {
  private readonly authorizationConfigured: boolean;
  private readonly client: WeatherClientLike;
  private logger: LoggerLike | null;
  private readonly now: () => Date;
  private readonly lastSuccessfulSnapshots = new Map<string, WeatherCurrentSnapshot>();
  private readonly cachedSnapshots = new Map<string, CachedWeatherEntry>();
  private diagnostic: WeatherDiagnostic = initialDiagnostic;
  private mqttPublish: ((topic: string, payload: string) => void) | null = null;

  constructor(options: WeatherServiceOptions = {}) {
    this.authorizationConfigured = options.authorizationConfigured ?? Boolean(config.cwaAuthorization);
    this.client = options.client ?? new CwaWeatherClient({
      authorization: config.cwaAuthorization ?? "",
      datasetUrl: config.cwaOpenDataUrl,
      requestTimeoutMs: config.weatherRequestTimeoutMs
    });
    this.logger = options.logger ?? null;
    this.now = options.now ?? (() => new Date());
  }

  setLogger(logger: LoggerLike) {
    this.logger = logger;
  }

  setMqttPublisher(publishFn: (topic: string, payload: string) => void) {
    this.mqttPublish = publishFn;
  }

  clearCache() {
    this.cachedSnapshots.clear();
  }

  getDiagnostic(): WeatherDiagnostic {
    return { ...this.diagnostic };
  }

  private recordUnconfigured(operation: WeatherDiagnosticOperation) {
    this.diagnostic = {
      code: "WEATHER_UNCONFIGURED",
      httpStatus: null,
      lastSuccessAt: this.diagnostic.lastSuccessAt,
      occurredAt: this.now().toISOString(),
      operation,
      retryable: false,
      safeSummary: "CWA 授權尚未設定",
      source: "unavailable",
      state: "unconfigured"
    };
  }

  private recordSuccess(operation: WeatherDiagnosticOperation, occurredAt: string) {
    this.diagnostic = {
      code: null,
      httpStatus: null,
      lastSuccessAt: occurredAt,
      occurredAt,
      operation,
      retryable: false,
      safeSummary: "CWA 天氣資料取得成功",
      source: "upstream",
      state: "ok"
    };
  }

  async getCurrentWeather(settings: WeatherSettings): Promise<WeatherCurrentSnapshot> {
    if (!this.authorizationConfigured) {
      this.recordUnconfigured("current");
      return buildEmptySnapshot("unconfigured");
    }

    const nowTime = this.now();
    const cacheKey = weatherCacheKey(settings);
    const cached = this.cachedSnapshots.get(cacheKey);
    if (cached && nowTime < cached.expiresAt) {
      if (cached.snapshot.fetchState === "fresh") {
        this.diagnostic = {
          ...this.diagnostic,
          source: "cache"
        };
      }
      return cached.snapshot;
    }

    try {
      const current = await this.client.readCurrentWeather({
        countyName: settings.countyName,
        stationId: settings.locationMode === "station" ? settings.stationId : null
      });
      const freshSnapshot = {
        ...current,
        fetchState: "fresh",
        staleAt: null
      } satisfies WeatherCurrentSnapshot;
      this.lastSuccessfulSnapshots.set(cacheKey, freshSnapshot);
      this.recordSuccess("current", nowTime.toISOString());

      const intervalMinutes = settings.updateIntervalMinutes > 0 ? settings.updateIntervalMinutes : 30;
      this.cachedSnapshots.set(cacheKey, {
        expiresAt: new Date(nowTime.getTime() + intervalMinutes * 60 * 1000),
        snapshot: freshSnapshot
      });

      if (this.mqttPublish) {
        try {
          this.mqttPublish("solar/weather/current", JSON.stringify(freshSnapshot));
        } catch {
          // Keep CWA logic resilient to MQTT broadcast failures
        }
      }

      return freshSnapshot;
    } catch (error) {
      const lastSuccessfulSnapshot = this.lastSuccessfulSnapshots.get(cacheKey) ?? null;
      this.diagnostic = buildFailureDiagnostic(
        error,
        "current",
        nowTime.toISOString(),
        this.diagnostic.lastSuccessAt,
        lastSuccessfulSnapshot ? "stale" : "unavailable"
      );
      this.logger?.warn({ error: serializeWeatherFetchError(error) }, "CWA weather fetch failed");

      if (!lastSuccessfulSnapshot) {
        return buildEmptySnapshot("unavailable");
      }

      const staleSnapshot = {
        ...lastSuccessfulSnapshot,
        fetchState: "stale",
        staleAt: nowTime.toISOString()
      } satisfies WeatherCurrentSnapshot;

      this.cachedSnapshots.set(cacheKey, {
        expiresAt: new Date(nowTime.getTime() + 5 * 60 * 1000),
        snapshot: staleSnapshot
      });

      return staleSnapshot;
    }
  }

  async getOptions(filters?: { countyName?: string | null }): Promise<WeatherOptionsResponse> {
    if (!this.authorizationConfigured) {
      this.recordUnconfigured("options");
      return buildEmptyOptions("unconfigured");
    }

    const nowTime = this.now();
    try {
      const options = await this.client.readOptions(filters);
      this.recordSuccess("options", nowTime.toISOString());
      return options;
    } catch (error) {
      this.diagnostic = buildFailureDiagnostic(
        error,
        "options",
        nowTime.toISOString(),
        this.diagnostic.lastSuccessAt,
        "unavailable"
      );
      throw error;
    }
  }
}

function serializeWeatherFetchError(error: unknown) {
  if (error instanceof CwaWeatherRequestError) {
    return {
      code: error.code,
      message: error.safeSummary,
      name: "WeatherRequestError"
    };
  }

  return {
    code: "WEATHER_UNKNOWN_ERROR",
    message: "CWA request failed",
    name: "WeatherRequestError"
  };
}

let weatherServiceSingleton: WeatherService | null = null;

export function getWeatherService() {
  if (!weatherServiceSingleton) {
    weatherServiceSingleton = new WeatherService();
  }

  return weatherServiceSingleton;
}

export function resetWeatherServiceForTests() {
  weatherServiceSingleton = null;
}
