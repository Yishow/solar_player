import type { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/index.js";
import {
  listEngineeringSources,
  previewEngineeringSource,
  applyEngineeringSource,
  getEngineeringSourceByRef
} from "../services/engineeringSourceService.js";
import {
  admitDailyEngineeringReport,
  batchImportDailyReports,
  getEngineeringReportHistory,
  readEngineeringPeriodResult
} from "../services/engineeringReportService.js";
import { isKnEngineeringId } from "@solar-display/shared";
import { listEnabledGenericTopics } from "../mqtt/MqttClientService.js";

function safeEngineeringError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Conflict")) {
    return { code: "ENGINEERING_SOURCE_CONFLICT", statusCode: 409 };
  }
  if (message.includes("previewToken mismatch")) {
    return { code: "ENGINEERING_SOURCE_TOKEN_MISMATCH", statusCode: 400 };
  }
  if (message.includes("Batch size") || message.includes("4 MiB")) {
    return { code: "ENGINEERING_IMPORT_BOUNDS", statusCode: 400 };
  }
  if (message.startsWith("Invalid engineering source:")) {
    return { code: fallback, statusCode: 400 };
  }
  return null;
}

const engineeringSourcesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/data-hub/engineering-sources", async (_request, reply) => {
    const db = getDatabase();
    const sources = listEngineeringSources(db);
    return reply.send({ success: true, sources });
  });

  app.get<{ Params: { sourceRef: string } }>(
    "/api/data-hub/engineering-sources/:sourceRef",
    async (request, reply) => {
      const db = getDatabase();
      const source = getEngineeringSourceByRef(db, request.params.sourceRef);
      if (!source) {
        return reply.status(404).send({ success: false, error: "Engineering source not found" });
      }
      return reply.send({ success: true, source });
    }
  );

  app.post<{ Body: any }>("/api/data-hub/engineering-sources/preview", async (request, reply) => {
    try {
      const preview = previewEngineeringSource((request.body as any) || {});
      return reply.send({ success: true, ...preview });
    } catch (error) {
      const failure = safeEngineeringError(error, "ENGINEERING_SOURCE_INVALID");
      if (!failure) throw error;
      return reply.status(failure.statusCode).send({ success: false, error: failure.code });
    }
  });

  app.post<{
    Body: { previewToken: string; expectedRevision: number; draft: any };
  }>("/api/data-hub/engineering-sources/apply", async (request, reply) => {
    const { previewToken, expectedRevision, draft } = request.body || {};
    if (!previewToken || typeof expectedRevision !== "number" || !draft) {
      return reply.status(400).send({
        success: false,
        error: "Missing required fields: previewToken, expectedRevision, draft"
      });
    }

    try {
      const db = getDatabase();
      const res = applyEngineeringSource(db, {
        previewToken,
        expectedRevision,
        draft
      });
      await app.mqttClientService.subscribe(listEnabledGenericTopics(db));
      return reply.send({ success: true, source: res.source });
    } catch (error) {
      const failure = safeEngineeringError(error, "ENGINEERING_SOURCE_APPLY_FAILED");
      if (!failure) throw error;
      return reply.status(failure.statusCode).send({ success: false, error: failure.code });
    }
  });

  app.get<{
    Querystring: { scope?: string; engineeringId?: string; periodStart?: string; periodEnd?: string };
  }>("/api/data-hub/engineering-results", async (request, reply) => {
    const { scope, engineeringId, periodStart, periodEnd } = request.query;
    if (scope && scope !== "kn") {
      return reply.status(400).send({ success: false, error: 'Scope must be "kn"' });
    }

    const db = getDatabase();
    const periodResult = periodStart && periodEnd
      ? readEngineeringPeriodResult(db, {
        periodStart,
        periodEnd,
        expectedEngineeringIds: engineeringId && isKnEngineeringId(engineeringId)
          ? [engineeringId]
          : undefined
      })
      : null;
    if (engineeringId && isKnEngineeringId(engineeringId) && periodStart && periodEnd) {
      const history = getEngineeringReportHistory(db, {
        site: "kn",
        engineeringId,
        periodStart,
        periodEnd
      });
      return reply.send({ success: true, reports: history, periodSummary: periodResult?.summary });
    }

    // Default: read latest heads
    let sql = "SELECT * FROM engineering_report_heads WHERE site = 'kn'";
    const params: any[] = [];
    if (engineeringId && isKnEngineeringId(engineeringId)) {
      sql += " AND engineering_id = ?";
      params.push(engineeringId);
    }
    sql += " ORDER BY period_start DESC LIMIT 100";

    const heads = db.prepare(sql).all(...params);
    return reply.send({ success: true, heads, ...(periodResult ? { periodSummary: periodResult.summary } : {}) });
  });

  app.post<{
    Body: { records: any[]; explicitApprovalForOldReplay?: boolean };
  }>("/api/data-hub/engineering-reports/import", async (request, reply) => {
    const { records, explicitApprovalForOldReplay } = request.body || {};
    if (!Array.isArray(records)) {
      return reply.status(400).send({ success: false, error: "records array is required" });
    }

    try {
      const db = getDatabase();
      const res = batchImportDailyReports(db, records, { explicitApprovalForOldReplay });
      return reply.send({ success: true, ...res });
    } catch (error) {
      const failure = safeEngineeringError(error, "ENGINEERING_REPORT_IMPORT_FAILED");
      if (!failure) throw error;
      return reply.status(failure.statusCode).send({ success: false, error: failure.code });
    }
  });
};

export default engineeringSourcesRoute;
