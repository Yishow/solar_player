import type { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/index.js";
import { applyProfile, getActiveProfile, previewProfile } from "../services/siteEnergyProfileService.js";
import { applyGuidedMapping, previewGuidedMapping } from "../services/guidedMqttMappingService.js";
import { listMeterSources, listReceivedTags } from "../services/meterSourceCatalogService.js";
import { readSourceImpact } from "../services/sourceImpactService.js";
import { suggestMappings, type MappingPreviewDraft, type ObservedTag, type SiteEnergyScope } from "@solar-display/shared";

const siteEnergyProfilesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/data-hub/sites/:scope/energy-profile", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    const { scope } = request.params as { scope: string };
    if (scope !== "cl" && scope !== "kn") {
      return reply.code(422).send({ success: false, error: "INVALID_SCOPE", timestamp: new Date().toISOString() });
    }
    const database = getDatabase();
    return {
      meters: listMeterSources(database, scope as SiteEnergyScope),
      profile: getActiveProfile(database, scope as SiteEnergyScope),
      receivedTags: listReceivedTags(database, scope as SiteEnergyScope)
    };
  });

  app.get("/api/data-hub/source-impact", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    const query = request.query as { confirmResolved?: string; metricKey?: string; metricScope?: string };
    if (!query.metricKey || (query.metricScope !== "cl" && query.metricScope !== "kn" && query.metricScope !== "global" && query.metricScope !== "all")) {
      return reply.code(400).send({ success: false, error: "INVALID_SOURCE_IMPACT_QUERY", timestamp: new Date().toISOString() });
    }
    return readSourceImpact(getDatabase(), {
      confirmResolved: query.confirmResolved === "true",
      metricKey: query.metricKey,
      metricScope: query.metricScope
    });
  });

  app.post("/api/data-hub/mqtt-mappings/suggest", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    const body = request.body as { metricScope?: "cl" | "kn"; observations?: ObservedTag[] };
    if (body.metricScope !== "cl" && body.metricScope !== "kn") {
      return reply.code(422).send({ success: false, error: "INVALID_SCOPE", timestamp: new Date().toISOString() });
    }
    return { suggestions: suggestMappings({ metricScope: body.metricScope, observations: body.observations ?? [] }) };
  });

  app.post("/api/data-hub/sites/:scope/energy-profile/preview", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    const { scope } = request.params as { scope: SiteEnergyScope };
    try {
      return previewProfile(getDatabase(), scope, request.body as never);
    } catch (error) {
      const code = (error as { code?: string; statusCode?: number }).code ?? "PROFILE_INVALID";
      const statusCode = (error as { statusCode?: number }).statusCode ?? 422;
      return reply.code(statusCode).send({ success: false, error: code, timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/data-hub/mqtt-mappings/preview", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    try {
      return previewGuidedMapping(getDatabase(), request.body as MappingPreviewDraft);
    } catch (error) {
      const code = (error as { code?: string }).code ?? "MAPPING_PREVIEW_FAILED";
      return reply.code(422).send({ success: false, error: code, timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/data-hub/mqtt-mappings/apply", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    const body = request.body as {
      canonicalDraft: MappingPreviewDraft;
      idempotencyKey: string;
      meterId: string;
      previewToken: string;
      source: Parameters<typeof applyGuidedMapping>[1]["source"];
    };
    try {
      return applyGuidedMapping(getDatabase(), body);
    } catch (error) {
      const code = (error as { code?: string }).code ?? "MAPPING_APPLY_FAILED";
      return reply.code(code === "PREVIEW_DRAFT_MISMATCH" || code === "PREVIEW_EXPIRED" ? 409 : 422).send({
        success: false,
        error: code,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post("/api/data-hub/sites/:scope/energy-profile/apply", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    const { scope } = request.params as { scope: SiteEnergyScope };
    try {
      return applyProfile(getDatabase(), scope, request.body as never);
    } catch (error) {
      const code = (error as { code?: string; statusCode?: number }).code ?? "PROFILE_INVALID";
      const statusCode = (error as { statusCode?: number }).statusCode ?? 409;
      return reply.code(statusCode).send({ success: false, error: code, timestamp: new Date().toISOString() });
    }
  });
};

export default siteEnergyProfilesRoute;
