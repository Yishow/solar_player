import type { FastifyPluginAsync } from "fastify";
import { readDisplayReadinessReport } from "../services/displayReadinessService.js";

const displayReadinessRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/display-readiness", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    return {
      readiness: readDisplayReadinessReport()
    };
  });
};

export default displayReadinessRoute;
