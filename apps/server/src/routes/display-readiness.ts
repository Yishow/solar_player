import type { FastifyPluginAsync } from "fastify";
import { requireResolvedDisplayClientContext } from "../plugins/deviceContext.js";
import { readDisplayReadinessReport } from "../services/displayReadinessService.js";

const displayReadinessRoute: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/playback/readiness",
    { preHandler: app.requireDisplayClientContext },
    async (request) => {
      const context = requireResolvedDisplayClientContext(request);

      return {
        context,
        readiness: readDisplayReadinessReport({ siteScope: context.siteScope })
      };
    }
  );

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
