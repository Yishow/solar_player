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
import { getActiveProfile } from "../services/siteEnergyProfileService.js";
import {
  monthDateKeys,
  monthKeyFromProfile,
  periodSelectionFromRange,
  resolveDailyConsumptionPoints,
  tryResolvePersistedPeriodConsumption
} from "../services/periodConsumptionService.js";
import { resolvePersistedDepartmentShares } from "../services/departmentSharesService.js";

function isHistoryRange(value: unknown): value is MetricHistoryRange {
  return value === "day" || value === "week" || value === "month" || value === "year" || value === "total";
}

const historyRangeError = "Invalid range. Expected day, week, month, year, or total.";

/**
 * The requested range owns the response's date set. Only a month request may additionally expose
 * the profile month's full calendar curve; every other range keeps exactly the dates the daily
 * summary range contract selected, so consumption is overlaid rather than substituted.
 */
function requestedConsumptionDates(
  summaries: Array<{ date: string }>,
  range: MetricHistoryRange,
  profileMonth: string
) {
  const summaryDates = summaries.map((summary) => summary.date);
  if (range !== "month") {
    return summaryDates;
  }
  const dates = monthDateKeys(profileMonth);
  const known = new Set(dates);
  for (const date of summaryDates) {
    if (!known.has(date)) {
      known.add(date);
      dates.push(date);
    }
  }
  return dates;
}
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
  const asOf = new Date().toISOString();
  return {
    counters: resolveCumulativeCounterHistory(database, { metricScope }),
    metricScope,
    periodSummary: tryResolvePersistedPeriodConsumption(database, metricScope, range, asOf),
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
    const asOf = new Date().toISOString();
    return {
      periodSummary: tryResolvePersistedPeriodConsumption(database, metricScope, rangeParam, asOf),
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
    const asOf = new Date().toISOString();
    const summaries = resolveDailyEnergySummaryHistory(database, { metricScope, range: rangeParam });
    if (metricScope !== "cl" && metricScope !== "kn") {
      return { summaries };
    }
    const profile = getActiveProfile(database, metricScope);
    if (!profile) {
      return { summaries };
    }
    const dates = requestedConsumptionDates(summaries, rangeParam, monthKeyFromProfile(asOf, profile));
    const points = new Map(
      (resolveDailyConsumptionPoints(database, metricScope, dates, asOf) ?? []).map((point) => [point.date, point])
    );
    const existing = new Map(summaries.map((summary) => [summary.date, summary]));
    return {
      summaries: dates.map((date) => {
        const summary = existing.get(date);
        const point = points.get(date);
        const valueKwh = point?.valueKwh ?? null;
        return {
          co2Total: summary?.co2Total ?? null,
          consumptionTotal: valueKwh === null ? null : Number(valueKwh),
          date,
          generationTotal: summary?.generationTotal ?? null,
          peakConsumption: summary?.peakConsumption ?? null,
          peakConsumptionTime: summary?.peakConsumptionTime ?? null,
          peakGeneration: summary?.peakGeneration ?? null,
          peakGenerationTime: summary?.peakGenerationTime ?? null,
          quality: point?.quality ?? "unavailable",
          selfConsumptionTotal: summary?.selfConsumptionTotal ?? null,
          valueKwh
        };
      })
    };
  });

  app.get("/api/metrics/cumulative", { preHandler: app.requireDisplayClientContext }, async (request) => {
    const metricScope = requireResolvedDisplayClientContext(request).siteScope;
    const database = getDatabase();
    return {
      counters: resolveCumulativeCounterHistory(database, { metricScope })
    };
  });

  app.get("/api/metrics/department-shares", { preHandler: app.requireDisplayClientContext }, async (request, reply) => {
    const rangeParam = (request.query as { range?: string }).range ?? "month";
    if (!isHistoryRange(rangeParam)) {
      reply.status(400).send({
        error: historyRangeError,
        success: false,
        timestamp: new Date().toISOString()
      });
      return;
    }
    const metricScope = requireResolvedDisplayClientContext(request).siteScope;
    if (metricScope !== "cl" && metricScope !== "kn") {
      return { quality: "unavailable", shares: [] };
    }
    const database = getDatabase();
    const asOf = new Date().toISOString();
    const profile = getActiveProfile(database, metricScope);
    const period = profile ? periodSelectionFromRange(rangeParam, asOf, profile.siteTimeZone) : null;
    if (!period) {
      return { quality: "unavailable", shares: [] };
    }
    return resolvePersistedDepartmentShares(database, metricScope, period, asOf) ?? { quality: "unavailable", shares: [] };
  });
};

export default metricsHistoryRoute;
