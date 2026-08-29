import type { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/index.js";
import { requireResolvedDisplayClientContext } from "../plugins/deviceContext.js";
import {
  resolveCumulativeCounterHistory,
  resolveDailyEnergySummaryHistory,
  resolveMetricSnapshotHistory,
  type MetricHistoryRange
} from "../services/MetricResolver.js";

function isHistoryRange(value: string): value is MetricHistoryRange {
  return value === "day" || value === "week" || value === "month" || value === "year" || value === "total";
}

const historyRangeError = "Invalid range. Expected day, week, month, year, or total.";

const metricsHistoryRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/metrics/history", { preHandler: app.requireDisplayClientContext }, async (request, reply) => {
    const rangeParam = (request.query as { range?: string }).range ?? "day";

    if (!isHistoryRange(rangeParam)) {
      reply.status(400).send({
        error: historyRangeError,
        success: false,
        timestamp: new Date().toISOString()
      });
      return;
    }
    const metricScope = requireResolvedDisplayClientContext(request).siteScope;

    const database = getDatabase();
    return {
      range: rangeParam,
      snapshots: resolveMetricSnapshotHistory(database, { metricScope, range: rangeParam })
    };
  });

  app.get("/api/metrics/daily-summary", { preHandler: app.requireDisplayClientContext }, async (request, reply) => {
    const rangeParam = (request.query as { range?: string }).range ?? "total";
    if (!isHistoryRange(rangeParam)) {
      reply.status(400).send({
        error: historyRangeError,
        success: false,
        timestamp: new Date().toISOString()
      });
      return;
    }
    const metricScope = requireResolvedDisplayClientContext(request).siteScope;

    const database = getDatabase();
    return {
      summaries: resolveDailyEnergySummaryHistory(database, { metricScope, range: rangeParam })
    };
  });

  app.get("/api/metrics/cumulative", { preHandler: app.requireDisplayClientContext }, async (request) => {
    const metricScope = requireResolvedDisplayClientContext(request).siteScope;
    const database = getDatabase();
    return {
      counters: resolveCumulativeCounterHistory(database, { metricScope })
    };
  });
};

export default metricsHistoryRoute;
