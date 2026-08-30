import type { DerivedMetricDefinition, MetricScope } from "@solar-display/shared";
import type { FastifyPluginAsync } from "fastify";
import {
  DerivedMetricRegistryError,
  listDerivedMetricDefinitions,
  previewDerivedMetricDefinition,
  readDerivedMetricRegistryDiagnostics,
  readDerivedMetricDefinition,
  readDerivedMetricEvaluation,
  saveDerivedMetricDefinition,
  setDerivedMetricEnabled
} from "../services/derivedMetricRegistryService.js";

function sendRegistryError(reply: { status: (code: number) => { send: (body: unknown) => unknown } }, error: unknown) {
  if (!(error instanceof DerivedMetricRegistryError)) throw error;
  return reply.status(error.statusCode).send({
    code: error.code,
    errors: error.errors,
    success: false
  });
}

function isObjectBody(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sendInvalidDefinition(reply: { status: (code: number) => { send: (body: unknown) => unknown } }) {
  return reply.status(422).send({
    code: "derived_metric_validation_failed",
    errors: [{ code: "invalid-definition", message: "Invalid derived metric definition" }],
    success: false
  });
}

const derivedMetricsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/derived-metrics", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    return {
      definitions: listDerivedMetricDefinitions(),
      diagnostics: readDerivedMetricRegistryDiagnostics()
    };
  });

  app.get<{ Params: { metricKey: string }; Querystring: { scope?: MetricScope } }>(
    "/api/derived-metrics/:metricKey",
    async (request, reply) => {
      if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
        return app.managementAccess.deny(reply);
      }
      try {
        const definition = readDerivedMetricDefinition(request.params.metricKey);
        return {
          definition,
          evaluation: request.query.scope
            ? readDerivedMetricEvaluation(request.query.scope, definition.metricKey)
            : null
        };
      } catch (error) {
        return sendRegistryError(reply, error);
      }
    }
  );

  app.post<{ Body: DerivedMetricDefinition }>("/api/derived-metrics", async (request, reply) => {
    try {
      return reply.status(201).send({ definition: saveDerivedMetricDefinition(request.body) });
    } catch (error) {
      return sendRegistryError(reply, error);
    }
  });

  app.put<{ Body: DerivedMetricDefinition; Params: { metricKey: string } }>(
    "/api/derived-metrics/:metricKey",
    async (request, reply) => {
      if (!isObjectBody(request.body)) {
        return sendInvalidDefinition(reply);
      }
      if (request.body.metricKey !== request.params.metricKey) {
        return reply.status(400).send({
          code: "derived_metric_key_mismatch",
          errors: [],
          success: false
        });
      }
      try {
        return { definition: saveDerivedMetricDefinition(request.body) };
      } catch (error) {
        return sendRegistryError(reply, error);
      }
    }
  );

  app.patch<{ Body: { enabled: boolean }; Params: { metricKey: string } }>(
    "/api/derived-metrics/:metricKey/enabled",
    async (request, reply) => {
      if (typeof request.body?.enabled !== "boolean") {
        return reply.status(400).send({
          code: "derived_metric_enabled_required",
          errors: [],
          success: false
        });
      }
      try {
        return {
          definition: setDerivedMetricEnabled(request.params.metricKey, request.body.enabled)
        };
      } catch (error) {
        return sendRegistryError(reply, error);
      }
    }
  );

  app.post<{ Body: { definition: DerivedMetricDefinition; metricScope: MetricScope } }>(
    "/api/derived-metrics/preview",
    async (request, reply) => {
      if (!isObjectBody(request.body) || !isObjectBody(request.body.definition)) {
        return sendInvalidDefinition(reply);
      }
      try {
        return {
          evaluation: previewDerivedMetricDefinition(
            request.body.definition,
            request.body.metricScope
          )
        };
      } catch (error) {
        return sendRegistryError(reply, error);
      }
    }
  );
};

export default derivedMetricsRoute;
