import type { FastifyPluginAsync } from "fastify";
import {
  listCandidates,
  listReceptionProfiles,
  startCapture,
  stopCapture
} from "../services/mqttObservationCatalogService.js";

const mqttCapturesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/settings/mqtt/reception-profiles", async () => ({
    profiles: listReceptionProfiles()
  }));

  app.post("/api/settings/mqtt/captures", async (request, reply) => {
    const body = request.body as {
      connectionRef?: string;
      filter?: string;
      receptionProfileId?: string;
      siteScope?: "cl" | "kn";
    };
    try {
      const session = startCapture({
        connectionRef: body.connectionRef ?? "central",
        filter: body.filter ?? "",
        receptionProfileId: body.receptionProfileId ?? "",
        siteScope: body.siteScope === "kn" ? "kn" : "cl"
      });
      return session;
    } catch (error) {
      const code = (error as { code?: string }).code ?? "CAPTURE_FAILED";
      return reply.code(code === "UNAUTHORIZED_SCOPE" ? 403 : 400).send({
        success: false,
        error: code,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get("/api/settings/mqtt/captures/:id/candidates", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return listCandidates(id);
    } catch (error) {
      const code = (error as { code?: string }).code ?? "CAPTURE_EXPIRED";
      return reply.code(404).send({ success: false, error: code, timestamp: new Date().toISOString() });
    }
  });

  app.delete("/api/settings/mqtt/captures/:id", async (request) => {
    const { id } = request.params as { id: string };
    return stopCapture(id);
  });
};

export default mqttCapturesRoute;
