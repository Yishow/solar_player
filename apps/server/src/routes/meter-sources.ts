import type Database from "better-sqlite3";
import type { FastifyPluginAsync } from "fastify";
import { validateMeterSourceWrite, type MeterSourceDefinition } from "@solar-display/shared";
import { readSourceImpact } from "../services/sourceImpactService.js";
import { getDatabase } from "../db/index.js";
import { getMeterSource, listMeterSources, saveMeterSource, syncSourceTopicMapping } from "../services/meterSourceCatalogService.js";

function failure(error: string, fields?: string[]) {
  return { success: false, error, timestamp: new Date().toISOString(), ...(fields ? { fields } : {}) };
}

const meterSourcesRoute: FastifyPluginAsync<{ database?: Database.Database }> = async (app, options) => {
  app.addHook("onRequest", async (request, reply) => {
    const allowed = request.method === "GET" || request.method === "HEAD"
      ? app.managementAccess.isTrustedManagementReadRequest(request)
      : app.managementAccess.isTrustedManagementMutationRequest(request);
    if (!allowed) return app.managementAccess.deny(reply);
    const { scope } = request.params as { scope: string };
    if (scope !== "cl" && scope !== "kn") return reply.code(422).send(failure("INVALID_SCOPE"));
  });
  const base = "/api/data-hub/sites/:scope/meter-sources";
  app.get(base, async (request) => {
    const { scope } = request.params as { scope: "cl" | "kn" };
    return { sources: listMeterSources(options.database ?? getDatabase(), scope) };
  });
  app.get(`${base}/:channelId`, async (request, reply) => {
    const { scope, channelId } = request.params as { scope: "cl" | "kn"; channelId: string };
    const source = getMeterSource(options.database ?? getDatabase(), scope, channelId);
    return source ? { source } : reply.code(404).send(failure("E1_SOURCE_NOT_FOUND"));
  });
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    app.route({ method, url: method === "POST" ? base : `${base}/:channelId`, handler: async (request, reply) => {
      const { scope, channelId } = request.params as { scope: "cl" | "kn"; channelId?: string };
      const body = request.body as { source?: Record<string, unknown>; reason?: string; expectedRevision?: number } | null;
      if (!body || typeof body.reason !== "string" || !body.reason.trim() || body.reason.length > 500) {
        return reply.code(422).send(failure("E1_REASON_REQUIRED", ["reason"]));
      }
      const database = options.database ?? getDatabase();
      try {
        const source = database.transaction(() => {
          const previous = channelId ? getMeterSource(database, scope, channelId) : undefined;
          if (method !== "POST" && !previous) throw Object.assign(new Error(), { code: "E1_SOURCE_NOT_FOUND", statusCode: 404 });
          const draft: Record<string, unknown> | undefined = method === "DELETE" ? { ...previous!, enabled: false }
            : body.source && { timestampPolicy: "source-required", ...body.source };
          if (method === "DELETE" && body.expectedRevision !== previous!.sourceRevision) {
            throw Object.assign(new Error(), { code: "E1_SOURCE_REVISION_CONFLICT", statusCode: 409 });
          }
          const validation = validateMeterSourceWrite(draft as Record<string, unknown>);
          if (!validation.ok) throw Object.assign(new Error(validation.message), validation);
          if (draft!.metricScope !== scope || (channelId && draft!.channelId !== channelId)) {
            throw Object.assign(new Error(), { code: "E1_SOURCE_SCOPE_MISMATCH", fields: ["metricScope", "channelId"] });
          }
          if (method === "POST" && getMeterSource(database, scope, draft!.channelId as string)) {
            throw Object.assign(new Error(), { code: "E1_SOURCE_EXISTS", statusCode: 409 });
          }
          if (previous && ((!draft!.enabled && previous.enabled) || draft!.metricKey !== previous.metricKey)) {
            const impact = readSourceImpact(database, { metricKey: previous.metricKey, metricScope: scope });
            if (!impact.canMutate) throw Object.assign(new Error(), {
              code: impact.unknown ? "E1_SOURCE_IMPACT_UNKNOWN" : "E1_SOURCE_IN_USE", statusCode: 409
            });
          }
          const saved = saveMeterSource(database, draft as Record<string, unknown> & MeterSourceDefinition, {
            actor: "management", reason: body.reason!.trim()
          });
          syncSourceTopicMapping(database, scope, saved, previous?.metricKey);
          return saved;
        }).immediate();
        return reply.code(method === "POST" ? 201 : 200).send({ source });
      } catch (error: unknown) {
        const known = error as { code?: string; fields?: string[]; statusCode?: number };
        if (known.code?.startsWith("E1_")) return reply.code(known.statusCode ?? 422).send(failure(known.code, known.fields));
        throw error;
      }
    } });
  }
};
export default meterSourcesRoute;
