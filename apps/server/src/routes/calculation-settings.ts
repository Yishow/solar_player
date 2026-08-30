import type { FastifyPluginAsync } from "fastify";
import {
  CalculationSettingsValidationError,
  readCalculationSettings,
  saveCalculationSettings
} from "../services/calculationSettingsService.js";
import { evaluateDerivedMetrics } from "../services/derivedMetricRegistryService.js";

function errorResponse(error: string) {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString()
  };
}

const calculationSettingsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/calculation-settings", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    return {
      settings: readCalculationSettings()
    };
  });

  app.put<{ Body: Record<string, unknown> }>("/api/calculation-settings", async (request, reply) => {
    try {
      const previousSettings = readCalculationSettings();
      const settings = saveCalculationSettings(request.body as never);
      const changedSettings = Object.keys(request.body).filter((key) => {
        const settingKey = key as keyof typeof settings;
        return Object.prototype.hasOwnProperty.call(settings, settingKey)
          && previousSettings[settingKey] !== settings[settingKey];
      });
      evaluateDerivedMetrics(undefined, new Date(), { changedSettings });

      app.socketService.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: "calculation-settings-updated",
        scope: "display-pages"
      });

      return { settings };
    } catch (error) {
      if (error instanceof CalculationSettingsValidationError) {
        return reply.status(error.statusCode).send(errorResponse(error.message));
      }

      throw error;
    }
  });
};

export default calculationSettingsRoute;
