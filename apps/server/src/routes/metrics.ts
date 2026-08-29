import type { FastifyPluginAsync } from "fastify";
import { readAuthoritativeScopedLiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import { requireResolvedDisplayClientContext } from "../plugins/deviceContext.js";

const metricsRoute: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/metrics/live",
    { preHandler: app.requireDisplayClientContext },
    async (request) => {
      const context = requireResolvedDisplayClientContext(request);
      const globalSnapshot = readAuthoritativeScopedLiveMetricsSnapshot("global");
      return {
        ...readAuthoritativeScopedLiveMetricsSnapshot(context.siteScope),
        globalSnapshot: {
          ...globalSnapshot,
          metricScope: "global" as const
        },
        metricScope: context.siteScope
      };
    }
  );
};

export default metricsRoute;
