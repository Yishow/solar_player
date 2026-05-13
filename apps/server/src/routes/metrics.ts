import type { FastifyPluginAsync } from "fastify";
import { readLiveMetricsSnapshot } from "../metrics/liveMetrics.js";

const metricsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/metrics/live", async () => readLiveMetricsSnapshot());
};

export default metricsRoute;
