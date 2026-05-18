import type { FastifyPluginAsync } from "fastify";
import { readDisplayOpsAssetReferences, readDisplayOpsSummary } from "../services/displayOpsService.js";

const displayOpsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/display-ops", async () => ({
    summary: readDisplayOpsSummary({
      mqttStatus: app.mqttClientService.getStatus()
    })
  }));

  app.get<{ Params: { id: string } }>("/api/display-ops/assets/:id/references", async (request, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (!Number.isFinite(id)) {
      return reply.status(400).send({
        success: false,
        error: "Invalid image ID",
        timestamp: new Date().toISOString()
      });
    }

    return {
      references: readDisplayOpsAssetReferences(id)
    };
  });
};

export default displayOpsRoute;
