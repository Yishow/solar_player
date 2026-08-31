import type { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/index.js";
import {
  parseMetricProvenanceQuery,
  readMetricProvenance
} from "../services/metricProvenanceService.js";

type MetricProvenanceQuerystring = {
  maxDepth?: string;
  maxNodes?: string;
  metricKey?: string;
  scope?: string;
};

const metricProvenanceRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: MetricProvenanceQuerystring }>(
    "/api/data-hub/provenance",
    async (request, reply) => {
      if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
        return app.managementAccess.deny(reply);
      }

      const parsed = parseMetricProvenanceQuery(request.query);
      if (!parsed.ok) {
        return reply.status(400).send({
          code: parsed.error.code,
          error: parsed.error.message,
          success: false,
          timestamp: new Date().toISOString()
        });
      }

      const graph = readMetricProvenance(getDatabase(), parsed.query);
      if (!graph) {
        return reply.status(404).send({
          code: "METRIC_PROVENANCE_NOT_FOUND",
          error: "Metric provenance root not found",
          success: false,
          timestamp: new Date().toISOString()
        });
      }

      return {
        generatedAt: new Date().toISOString(),
        ...graph
      };
    }
  );
};

export default metricProvenanceRoute;
