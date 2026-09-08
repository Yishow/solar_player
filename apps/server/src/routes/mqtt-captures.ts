import type { FastifyPluginAsync } from "fastify";
import type { CaptureMode } from "@solar-display/shared";
import {
  listCandidates,
  listReceptionProfiles,
  openCaptureDiscovery,
  readCaptureSample,
  startCapture,
  stopCapture
} from "../services/mqttObservationCatalogService.js";

const mqttCapturesRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const trusted = request.method === "GET" || request.method === "HEAD"
      ? app.managementAccess.isTrustedManagementReadRequest(request)
      : app.managementAccess.isTrustedManagementMutationRequest(request);
    if (!trusted) return app.managementAccess.deny(reply);
  });
  app.get("/api/settings/mqtt/reception-profiles", async () => ({
    profiles: listReceptionProfiles()
  }));

  app.post("/api/settings/mqtt/captures", async (request, reply) => {
    const body = request.body as {
      connectionRef?: string;
      filter?: string;
      mode?: CaptureMode;
      receptionProfileId?: string;
      siteScope?: "cl" | "kn";
    };
    if (!body || (body.siteScope !== "cl" && body.siteScope !== "kn")) {
      return reply.code(400).send({ success: false, error: "INVALID_SCOPE", timestamp: new Date().toISOString() });
    }
    try {
      const session = startCapture({
        connectionRef: body.connectionRef ?? "central",
        filter: body.filter ?? "",
        mode: body.mode,
        receptionProfileId: body.receptionProfileId ?? "",
        siteScope: body.siteScope
      });
      return session.mode === "active" ? openCaptureDiscovery(session.captureId) : session;
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

  app.get("/api/settings/mqtt/captures/:id/samples/:sampleId", async (request, reply) => {
    const { id, sampleId } = request.params as { id: string; sampleId: string };
    try {
      return readCaptureSample(id, sampleId);
    } catch (error) {
      const code = (error as { code?: string }).code ?? "CAPTURE_REFRESH_REQUIRED";
      return reply.code(404).send({ success: false, error: code, timestamp: new Date().toISOString() });
    }
  });

  app.delete("/api/settings/mqtt/captures/:id", async (request) => {
    const { id } = request.params as { id: string };
    return stopCapture(id);
  });
};

export default mqttCapturesRoute;
