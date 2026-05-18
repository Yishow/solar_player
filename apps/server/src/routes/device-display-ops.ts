import type { DeviceDisplayDiagnosticAction } from "@solar-display/shared";
import type { FastifyPluginAsync } from "fastify";
import {
  readDeviceDisplayOpsSummary,
  runDeviceDisplayDiagnostic
} from "../services/deviceDisplayOpsService.js";

const deviceDisplayOpsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/device-display-ops", async () => ({
    summary: readDeviceDisplayOpsSummary({
      mqttStatus: app.mqttClientService.getStatus()
    })
  }));

  app.post<{ Body: { action?: DeviceDisplayDiagnosticAction } }>(
    "/api/device-display-ops/diagnostics",
    async (request, reply) => {
      const action = request.body?.action;

      if (action !== "export-summary" && action !== "refresh-readiness") {
        return reply.status(400).send({
          success: false,
          error: "Unsupported diagnostic action",
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        data: runDeviceDisplayDiagnostic({
          action,
          mqttStatus: app.mqttClientService.getStatus()
        }),
        timestamp: new Date().toISOString()
      };
    }
  );
};

export default deviceDisplayOpsRoute;
