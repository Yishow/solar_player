import {
  type WeatherCurrentSnapshot,
  type WeatherOptionsResponse,
  type WeatherSettings
} from "@solar-display/shared";
import { CwaWeatherClient } from "./cwaWeatherClient.js";
import { config } from "../config.js";

type WeatherClientLike = Pick<CwaWeatherClient, "readCurrentWeather" | "readOptions">;

type WeatherServiceOptions = {
  authorizationConfigured?: boolean;
  client?: WeatherClientLike;
  now?: () => Date;
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

export class WeatherService {
  private readonly authorizationConfigured: boolean;
  private readonly client: WeatherClientLike;
  private readonly now: () => Date;
  private lastSuccessfulSnapshot: WeatherCurrentSnapshot | null = null;

  constructor(options: WeatherServiceOptions = {}) {
    this.authorizationConfigured = options.authorizationConfigured ?? Boolean(config.cwaAuthorization);
    this.client = options.client ?? new CwaWeatherClient({
      authorization: config.cwaAuthorization ?? "",
      datasetUrl: config.cwaOpenDataUrl,
      requestTimeoutMs: config.weatherRequestTimeoutMs
    });
    this.now = options.now ?? (() => new Date());
  }

  async getCurrentWeather(settings: WeatherSettings): Promise<WeatherCurrentSnapshot> {
    if (!this.authorizationConfigured) {
      return buildEmptySnapshot("unconfigured");
    }

    try {
      const current = await this.client.readCurrentWeather({
        countyName: settings.countyName,
        stationId: settings.locationMode === "station" ? settings.stationId : null
      });
      this.lastSuccessfulSnapshot = {
        ...current,
        fetchState: "fresh",
        staleAt: null
      };
      return this.lastSuccessfulSnapshot;
    } catch {
      if (!this.lastSuccessfulSnapshot) {
        return buildEmptySnapshot("unavailable");
      }

      return {
        ...this.lastSuccessfulSnapshot,
        fetchState: "stale",
        staleAt: this.now().toISOString()
      };
    }
  }

  async getOptions(filters?: { countyName?: string | null }): Promise<WeatherOptionsResponse> {
    if (!this.authorizationConfigured) {
      return buildEmptyOptions("unconfigured");
    }

    return this.client.readOptions(filters);
  }
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
