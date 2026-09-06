import type { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/index.js";
import { applyProfile, getActiveProfile, previewProfile } from "../services/siteEnergyProfileService.js";
import type { SiteEnergyScope } from "@solar-display/shared";

const siteEnergyProfilesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/data-hub/sites/:scope/energy-profile", async (request, reply) => {
    const { scope } = request.params as { scope: string };
    if (scope !== "cl" && scope !== "kn") {
      return reply.code(422).send({ success: false, error: "INVALID_SCOPE", timestamp: new Date().toISOString() });
    }
    return { profile: getActiveProfile(getDatabase(), scope as SiteEnergyScope) };
  });

  app.post("/api/data-hub/sites/:scope/energy-profile/preview", async (request, reply) => {
    const { scope } = request.params as { scope: SiteEnergyScope };
    try {
      return previewProfile(getDatabase(), scope, request.body as never);
    } catch (error) {
      const code = (error as { code?: string; statusCode?: number }).code ?? "PROFILE_INVALID";
      const statusCode = (error as { statusCode?: number }).statusCode ?? 422;
      return reply.code(statusCode).send({ success: false, error: code, timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/data-hub/sites/:scope/energy-profile/apply", async (request, reply) => {
    const { scope } = request.params as { scope: SiteEnergyScope };
    try {
      return applyProfile(getDatabase(), scope, request.body as never);
    } catch (error) {
      const code = (error as { code?: string; statusCode?: number }).code ?? "PROFILE_INVALID";
      const statusCode = (error as { statusCode?: number }).statusCode ?? 409;
      return reply.code(statusCode).send({ success: false, error: code, timestamp: new Date().toISOString() });
    }
  });
};

export default siteEnergyProfilesRoute;
