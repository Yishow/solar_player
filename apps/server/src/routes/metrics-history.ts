import type { FastifyPluginAsync } from "fastify";
import { isMetricScope, type MetricScope } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { requireResolvedDisplayClientContext } from "../plugins/deviceContext.js";
import {
  resolveCumulativeCounterHistory,
  resolveDailyEnergySummaryHistory,
  resolveMetricSnapshotHistory,
  type MetricHistoryRange
} from "../services/MetricResolver.js";

function isHistoryRange(value: unknown): value is MetricHistoryRange {
  return value === "day" || value === "week" || value === "month" || value === "year" || value === "total";
}

const historyRangeError = "Invalid range. Expected day, week, month, year, or total.";
const energyHistoryScopeError = "Energy history metricScope must be cl, kn, or global.";

type EnergyHistoryQuery = {
  metricScope?: unknown;
  range?: unknown;
};

function readEnergyHistory(
  metricScope: MetricScope,
  range: MetricHistoryRange
) {
  const database = getDatabase();
  return {
    counters: resolveCumulativeCounterHistory(database, { metricScope }),
    metricScope,
    range,
    snapshots: resolveMetricSnapshotHistory(database, { metricScope, range }),
    summaries: resolveDailyEnergySummaryHistory(database, { metricScope, range })
  };
}

const metricsHistoryRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: EnergyHistoryQuery }>("/api/data-hub/energy-history", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    if (!isMetricScope(request.query.metricScope)) {
      return reply.status(400).send({
        code: "INVALID_METRIC_SCOPE",
        error: energyHistoryScopeError,
        success: false,
        timestamp: new Date().toISOString()
      });
    }

    if (!isHistoryRange(request.query.range)) {
      return reply.status(400).send({
        code: "INVALID_HISTORY_RANGE",
        error: historyRangeError,
        success: false,
        timestamp: new Date().toISOString()
      });
    }

    return readEnergyHistory(request.query.metricScope, request.query.range);
  });

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
