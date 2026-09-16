import type Database from "better-sqlite3";
import type { FastifyPluginAsync } from "fastify";
import type { SingleSourceCreateRequest, SingleSourceDeleteRequest, SingleSourceMutationRequest } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { listEnabledGenericTopics } from "../mqtt/MqttClientService.js";
import {
  createSingleSourceMapping,
  deleteSingleSourceMapping,
  getTopicMappingBySourceRef,
  saveSingleSourceMapping,
  toSourceEditDomainError,
  toConfiguration
} from "../services/sourceEditTransactionService.js";

function failure(error: string, extra: Record<string, unknown> = {}) {
  return { error, success: false, timestamp: new Date().toISOString(), ...extra };
}

function sourceEditFailure(error: unknown) {
  const domainError = toSourceEditDomainError(error);
  if (!domainError) return null;
  const { code, statusCode, ...details } = domainError;
  return { body: { ...failure(code, details), code }, statusCode };
}

const dataHubSourceMappingsRoute: FastifyPluginAsync<{ database?: Database.Database }> = async (app, options) => {
  const getDb = () => options.database ?? getDatabase();

  const reconcileSubscriptions = async () => {
    try {
      await app.mqttClientService.subscribe(listEnabledGenericTopics(getDb()));
      app.socketService.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: "mqtt-topics-updated",
        scope: "mqtt"
      });
      return true;
    } catch {
      return false;
    }
  };

  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/api/data-hub/capabilities" && request.method === "GET") {
      return;
    }
    const allowed = request.method === "GET" || request.method === "HEAD"
      ? app.managementAccess.isTrustedManagementReadRequest(request)
      : app.managementAccess.isTrustedManagementMutationRequest(request);
    if (!allowed) {
      return app.managementAccess.deny(reply);
    }
  });

  app.get("/api/data-hub/capabilities", async () => ({
    capabilities: {
      legacyReplaceSupported: true,
      versionedSourceEditing: true
    },
    success: true,
    timestamp: new Date().toISOString()
  }));

  app.get<{ Params: { sourceRef: string } }>(
    "/api/data-hub/source-mappings/:sourceRef",
    async (request, reply) => {
      const db = getDb();
      const row = getTopicMappingBySourceRef(db, request.params.sourceRef);
      if (!row) {
        return reply.code(404).send(failure("SOURCE_NOT_FOUND"));
      }
      return {
        configuration: toConfiguration(row),
        revision: row.config_revision ?? 1,
        sourceRef: row.source_ref ?? request.params.sourceRef,
        success: true,
        timestamp: new Date().toISOString()
      };
    }
  );

  app.post<{ Body: SingleSourceCreateRequest }>(
    "/api/data-hub/source-mappings",
    async (request, reply) => {
      const db = getDb();
      const body = request.body;
      if (!body || !body.source) {
        return reply.code(400).send(failure("MISSING_SOURCE_PAYLOAD"));
      }
      try {
        const result = await createSingleSourceMapping(
          db,
          {
            authScope: "all",
            idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : undefined,
            source: body.source
          },
          reconcileSubscriptions
        );
        return reply.code(result.statusCode).send(result.body);
      } catch (error: unknown) {
        const mapped = sourceEditFailure(error);
        if (!mapped) throw error;
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    }
  );

  app.patch<{ Body: SingleSourceMutationRequest; Params: { sourceRef: string } }>(
    "/api/data-hub/source-mappings/:sourceRef",
    async (request, reply) => {
      const db = getDb();
      const body = request.body;
      if (!body || typeof body.expectedRevision !== "number" || !body.patch) {
        return reply.code(400).send(failure("INVALID_MUTATION_REQUEST"));
      }
      try {
        const result = await saveSingleSourceMapping(
          db,
          {
            authScope: "all",
            expectedRevision: body.expectedRevision,
            idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : undefined,
            patch: body.patch,
            sourceRef: request.params.sourceRef
          },
          reconcileSubscriptions
        );
        return reply.code(result.statusCode).send(result.body);
      } catch (error: unknown) {
        const mapped = sourceEditFailure(error);
        if (!mapped) throw error;
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    }
  );

  app.delete<{ Body?: SingleSourceDeleteRequest; Params: { sourceRef: string } }>(
    "/api/data-hub/source-mappings/:sourceRef",
    async (request, reply) => {
      const db = getDb();
      const body = request.body;
      const expectedRevision = typeof body?.expectedRevision === "number"
        ? body.expectedRevision
        : Number.parseInt(String(request.headers["if-match"] ?? ""), 10);
      if (!Number.isFinite(expectedRevision)) {
        return reply.code(400).send(failure("EXPECTED_REVISION_REQUIRED"));
      }
      try {
        const result = await deleteSingleSourceMapping(
          db,
          {
            authScope: "all",
            expectedRevision,
            idempotencyKey: typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : undefined,
            sourceRef: request.params.sourceRef
          },
          reconcileSubscriptions
        );
        return reply.code(result.statusCode).send(result.body);
      } catch (error: unknown) {
        const mapped = sourceEditFailure(error);
        if (!mapped) throw error;
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    }
  );
};

export default dataHubSourceMappingsRoute;
