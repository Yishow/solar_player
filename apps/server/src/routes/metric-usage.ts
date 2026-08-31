import type { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/index.js";
import {
  parseMetricUsageScope,
  readMetricUsage
} from "../services/metricUsageService.js";

type MetricUsageQuery = {
  metricKey?: string;
  scope?: string;
};

const scopeError = "scope must be cl, kn, global, or all";

const metricUsageRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: MetricUsageQuery }>(
    "/api/data-hub/usage",
    async (request, reply) => {
      if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
        return app.managementAccess.deny(reply);
      }

      const scope = parseMetricUsageScope(request.query.scope);
      if (!scope) {
        return reply.status(400).send({
          code: "INVALID_METRIC_SCOPE",
          error: scopeError,
          success: false,
          timestamp: new Date().toISOString()
        });
      }

      return {
        generatedAt: new Date().toISOString(),
        scope,
        usage: readMetricUsage(getDatabase(), {
          metricKey: request.query.metricKey,
          scope
        })
      };
    }
  );
};

export default metricUsageRoute;
