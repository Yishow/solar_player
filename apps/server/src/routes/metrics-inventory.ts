import type { FastifyPluginAsync } from "fastify";
import {
  parseMetricInventoryScope,
  readMetricInventory,
  type MetricInventoryScope
} from "../services/metricInventoryService.js";
import { getDatabase } from "../db/index.js";

type MetricsInventoryQuery = {
  scope?: string;
};

const scopeError = "scope must be cl, kn, global, or all";

const metricsInventoryRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: MetricsInventoryQuery }>(
    "/api/data-hub/metrics",
    async (request, reply) => {
      if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
        return app.managementAccess.deny(reply);
      }

      const scope = parseMetricInventoryScope(request.query.scope);
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
        metrics: readMetricInventory(getDatabase(), scope as MetricInventoryScope),
        scope
      };
    }
  );
};

export default metricsInventoryRoute;
