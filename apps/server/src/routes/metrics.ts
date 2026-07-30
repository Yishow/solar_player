import type { FastifyPluginAsync } from "fastify";
import { readAuthoritativeLiveMetricsSnapshot } from "../metrics/liveMetrics.js";

const metricsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/metrics/live", async () => readAuthoritativeLiveMetricsSnapshot());
};

export default metricsRoute;
