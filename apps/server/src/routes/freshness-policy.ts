import type { FastifyPluginAsync } from "fastify";
import {
  readFreshnessPolicy,
  updateFreshnessPolicy
} from "../services/freshnessPolicyService.js";

const freshnessPolicyRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/freshness-policy", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    return readFreshnessPolicy();
  });

  app.put<{ Body: unknown }>("/api/freshness-policy", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    const result = updateFreshnessPolicy(request.body);
    if ("valid" in result && !result.valid) {
      return reply.status(400).send({
        code: result.error,
        error: "Freshness Policy thresholds must be positive and strictly increasing",
        success: false,
        timestamp: new Date().toISOString()
      });
    }
    return result;
  });
};

export default freshnessPolicyRoute;
