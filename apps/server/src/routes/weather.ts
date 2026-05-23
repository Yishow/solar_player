import type { FastifyPluginAsync } from "fastify";
import type { WeatherCurrentSnapshot, WeatherHeaderContract, WeatherSettings } from "@solar-display/shared";
import { config } from "../config.js";
import {
  normalizeWeatherSettingsInput,
  readWeatherSettings,
  saveWeatherSettings,
  WeatherSettingsValidationError
} from "../services/weatherSettingsService.js";
import { getWeatherService } from "../services/weatherService.js";

function errorResponse(error: string) {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString()
  };
}

function buildNeutralCurrentWeatherSnapshot(fetchState: WeatherCurrentSnapshot["fetchState"]): WeatherCurrentSnapshot {
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

function buildPublicWeatherHeaderSettings(
  settings: WeatherSettings
): WeatherHeaderContract["settings"] {
  return {
    enabled: settings.enabled,
    fieldKeys: settings.fieldKeys,
    preset: settings.preset
  };
}

const weatherRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/weather/settings", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    return {
      settings: readWeatherSettings()
    };
  });

  app.put<{ Body: Record<string, unknown> }>("/api/weather/settings", async (request, reply) => {
    try {
      const nextSettings = normalizeWeatherSettingsInput(request.body as never);

      if (config.cwaAuthorization) {
        const options = await getWeatherService().getOptions({
          countyName: nextSettings.countyName
        });

        if (
          nextSettings.countyName
          && !options.counties.includes(nextSettings.countyName)
        ) {
          return reply.status(400).send(errorResponse("Weather county does not exist"));
        }

        if (
          nextSettings.stationId
          && !options.stations.some((station) => station.stationId === nextSettings.stationId)
        ) {
          return reply.status(400).send(errorResponse("Weather station does not exist"));
        }
      }

      saveWeatherSettings(nextSettings);

      app.socketService.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: "weather-settings-updated",
        scope: "weather"
      });

      return {
        settings: nextSettings
      };
    } catch (error) {
      if (error instanceof WeatherSettingsValidationError) {
        return reply.status(error.statusCode).send(errorResponse(error.message));
      }

      throw error;
    }
  });

  app.get<{ Querystring: { countyName?: string } }>("/api/weather/options", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    const options = await getWeatherService().getOptions({
      countyName: request.query.countyName ?? null
    });

    return options;
  });

  app.get("/api/weather/current", async () => {
    const settings = readWeatherSettings();
    const current = settings.enabled
      ? await getWeatherService().getCurrentWeather(settings)
      : buildNeutralCurrentWeatherSnapshot("unconfigured");

    return {
      current,
      settings: buildPublicWeatherHeaderSettings(settings)
    };
  });
};

export default weatherRoute;
