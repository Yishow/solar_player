import type {
  DisplayPageConfigEnvelope,
  DisplayPageDraftSaveConflictResponse,
  DisplayPageFreeformObject,
  DisplayPageId,
  ValidationFinding
} from "@solar-display/shared";
import {
  createEmptyDisplayPageConfig,
  isDisplayPageFreeformObjectShape,
  normalizeDisplayPageFreeformObjects
} from "@solar-display/shared";
import type { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/index.js";
import { readDisplayPageInstance } from "../services/displayPageRegistryService.js";
import {
  ManagementDraftSaveConflictError,
  readStageConfig,
  writeStageConfig,
  issuePublishPreflight,
  publishDraft,
  rollbackToVersion,
  getPublishHistory,
  readFallbackStatus,
  validateDisplayPageMetricBindings
} from "../services/displayPagePublishingService.js";
import {
  collectDisplayPageAssetFindings,
  collectDisplayPageMediaPlacementIssues,
  computeDisplayPageAssetHealthReport,
  normalizeDisplayPageRegionsForStorage,
  resolveDisplayPageRegions
} from "../services/displayPageAssetService.js";
import { readDisplayRotationPreview } from "../services/displayRotationService.js";
import {
  DisplayPreviewContextServiceError,
  resolveDisplayPreviewContext
} from "../services/displayPreviewContextService.js";
import { readDisplayDataPreview } from "../services/displayDataPreviewService.js";

type DisplayPageRouteParams = { pageId: string };
type DisplayPageConfigBody = {
  baseVersion?: number;
  freeformObjects?: DisplayPageFreeformObject[];
  regions?: Record<string, unknown>;
};
type PublishRequestBody = {
  expectedVersion?: number;
  preflightToken?: string;
  publishedBy?: string;
  unsavedBindings?: boolean;
};
type RollbackRequestBody = { targetVersion: number; publishedBy?: string };

type DisplayPageConfigRow = {
  config_json: string;
  updated_at: string | null;
};

function assertDisplayPageId(pageId: string): DisplayPageId {
  if (!readDisplayPageInstance(pageId)) {
    const error = new Error(`Unknown display page: ${pageId}`);
    // @ts-expect-error fastify reads statusCode
    error.statusCode = 404;
    throw error;
  }
  return pageId;
}

function parseRegions(raw: string | null | undefined) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if ("regions" in parsed && parsed.regions && typeof parsed.regions === "object" && !Array.isArray(parsed.regions)) {
        return parsed.regions as Record<string, unknown>;
      }
      return parsed as Record<string, unknown>;
    }
  } catch { /* fall through */ }
  return {};
}

function parseFreeformObjects(raw: string | null | undefined) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray(parsed.freeformObjects)) {
      return normalizeDisplayPageFreeformObjects(parsed.freeformObjects);
    }
  } catch {
    return [];
  }

  return [];
}

function sendPlacementValidationError(
  reply: { status: (code: number) => { send: (payload: Record<string, unknown>) => unknown } },
  details: string[]
) {
  return reply.status(400).send({
    success: false,
    error: "Display page media placement is invalid",
    details,
    timestamp: new Date().toISOString()
  });
}

function sendMetricBindingValidationError(
  reply: { status: (code: number) => { send: (payload: Record<string, unknown>) => unknown } },
  findings: ValidationFinding[]
) {
  return reply.status(422).send({
    success: false,
    error: "Metric binding validation failed",
    validation: { canPublish: false, findings },
    timestamp: new Date().toISOString()
  });
}

function readStoredDisplayPageConfig(pageId: DisplayPageId): DisplayPageConfigEnvelope {
  const database = getDatabase();
  const row = database
    .prepare(`SELECT config_json, updated_at FROM display_page_configs WHERE page_key = ?`)
    .get(pageId) as DisplayPageConfigRow | undefined;

  if (!row) return createEmptyDisplayPageConfig(pageId);

  return {
    freeformObjects: parseFreeformObjects(row.config_json),
    pageId,
    regions: parseRegions(row.config_json),
    updatedAt: row.updated_at,
    version: 1
  };
}

function resolveEnvelope<TRegions extends Record<string, unknown>>(
  envelope: DisplayPageConfigEnvelope<TRegions>
) {
  return {
    ...envelope,
    assetFindings: collectDisplayPageAssetFindings(
      envelope.pageId,
      envelope.regions,
      envelope.freeformObjects ?? []
    ),
    regions: resolveDisplayPageRegions(envelope.regions)
  };
}

const displayPagesRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Body: unknown }>("/api/display-pages/preview-context/resolve", async (request, reply) => {
    try {
      return { context: resolveDisplayPreviewContext(request.body) };
    } catch (error) {
      if (!(error instanceof DisplayPreviewContextServiceError)) throw error;
      return reply.status(error.statusCode).send({
        code: error.code,
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post<{ Body: unknown; Params: DisplayPageRouteParams }>(
    "/api/display-pages/:pageId/data-preview",
    async (request, reply) => {
      const pageId = assertDisplayPageId(request.params.pageId);
      try {
        return { preview: readDisplayDataPreview(pageId, request.body) };
      } catch (error) {
        if (!(error instanceof DisplayPreviewContextServiceError)) throw error;
        return reply.status(error.statusCode).send({
          code: error.code,
          error: error.message,
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // --- Legacy routes (backward compatible) ---

  app.get<{ Params: DisplayPageRouteParams }>("/api/display-pages/:pageId/config", async (request) => {
    const pageId = assertDisplayPageId(request.params.pageId);
    return { config: resolveEnvelope(readStoredDisplayPageConfig(pageId)) };
  });

  app.put<{ Body: DisplayPageConfigBody; Params: DisplayPageRouteParams }>(
    "/api/display-pages/:pageId/config",
    async (request, reply) => {
      const pageId = assertDisplayPageId(request.params.pageId);
      const regions = request.body?.regions;
      const freeformObjects = request.body?.freeformObjects ?? [];

      if (regions === undefined || regions === null || Array.isArray(regions) || typeof regions !== "object") {
        const error = new Error("Display page config regions must be an object");
        // @ts-expect-error fastify reads statusCode
        error.statusCode = 400;
        throw error;
      }

      if (!Array.isArray(freeformObjects) || freeformObjects.some((object) => !isDisplayPageFreeformObjectShape(object))) {
        const error = new Error("Display page freeformObjects must be an array of display objects");
        // @ts-expect-error fastify reads statusCode
        error.statusCode = 400;
        throw error;
      }

      const placementIssues = collectDisplayPageMediaPlacementIssues(regions);
      if (placementIssues.length > 0) {
        return sendPlacementValidationError(
          reply,
          placementIssues.map((issue) => issue.message)
        );
      }
      const metricBindingFindings = validateDisplayPageMetricBindings(pageId, regions);
      if (metricBindingFindings.length > 0) {
        return sendMetricBindingValidationError(reply, metricBindingFindings);
      }

      const database = getDatabase();
      const normalizedRegions = normalizeDisplayPageRegionsForStorage(regions);
      database
        .prepare(
          `INSERT INTO display_page_configs (page_key, config_json, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(page_key) DO UPDATE SET
             config_json = excluded.config_json,
             updated_at = CURRENT_TIMESTAMP`
        )
        .run(pageId, JSON.stringify({ freeformObjects, regions: normalizedRegions }));
      app.socketService.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: "display-page-config-updated",
        scope: "display-pages"
      });

      return { config: resolveEnvelope(readStoredDisplayPageConfig(pageId)) };
    }
  );

  // --- Stage-aware draft routes ---

  app.get<{ Params: DisplayPageRouteParams }>("/api/display-pages/:pageId/draft", async (request) => {
    const pageId = assertDisplayPageId(request.params.pageId);
    return { config: resolveEnvelope(readStageConfig(pageId, "draft")) };
  });

  app.put<{ Body: DisplayPageConfigBody; Params: DisplayPageRouteParams }>(
    "/api/display-pages/:pageId/draft",
    async (request, reply) => {
      const pageId = assertDisplayPageId(request.params.pageId);
      const regions = request.body?.regions;
      const freeformObjects = request.body?.freeformObjects ?? [];

      if (regions === undefined || regions === null || Array.isArray(regions) || typeof regions !== "object") {
        const error = new Error("Display page config regions must be an object");
        // @ts-expect-error fastify reads statusCode
        error.statusCode = 400;
        throw error;
      }

      if (!Array.isArray(freeformObjects) || freeformObjects.some((object) => !isDisplayPageFreeformObjectShape(object))) {
        const error = new Error("Display page freeformObjects must be an array of display objects");
        // @ts-expect-error fastify reads statusCode
        error.statusCode = 400;
        throw error;
      }

      const placementIssues = collectDisplayPageMediaPlacementIssues(regions);
      if (placementIssues.length > 0) {
        return sendPlacementValidationError(
          reply,
          placementIssues.map((issue) => issue.message)
        );
      }
      const metricBindingFindings = validateDisplayPageMetricBindings(pageId, regions);
      if (metricBindingFindings.length > 0) {
        return sendMetricBindingValidationError(reply, metricBindingFindings);
      }

      try {
        const config = resolveEnvelope(
          writeStageConfig(pageId, "draft", regions, freeformObjects, {
            baseVersion: request.body?.baseVersion
          })
        );
        app.socketService.emitDisplaySync({
          generatedAt: new Date().toISOString(),
          reason: "display-page-draft-updated",
          scope: "display-pages"
        });
        return { config };
      } catch (error) {
        if (error instanceof ManagementDraftSaveConflictError) {
          const conflictResponse: DisplayPageDraftSaveConflictResponse = {
            code: error.code,
            conflict: {
              ...error.conflict,
              latestEnvelope: resolveEnvelope(error.conflict.latestEnvelope)
            },
            error: error.message,
            success: false,
            timestamp: new Date().toISOString()
          };
          return reply.status(409).send(conflictResponse);
        }

        throw error;
      }
    }
  );

  // --- Live config read ---

  app.get<{ Params: DisplayPageRouteParams }>("/api/display-pages/:pageId/live", async (request) => {
    const pageId = assertDisplayPageId(request.params.pageId);
    return { config: resolveEnvelope(readStageConfig(pageId, "live")) };
  });

  // --- Publish draft to live ---

  app.post<{ Params: DisplayPageRouteParams; Body: PublishRequestBody }>(
    "/api/display-pages/:pageId/publish",
    async (request, reply) => {
      const pageId = assertDisplayPageId(request.params.pageId);
      const { live, validation } = publishDraft(pageId, {
        expectedVersion: request.body?.expectedVersion,
        preflightToken: request.body?.preflightToken,
        publishedBy: request.body?.publishedBy,
        unsavedBindings: request.body?.unsavedBindings === true
      });

      if (!validation.canPublish) {
        return reply.status(422).send({
          success: false,
          error: "Validation failed",
          validation,
          timestamp: new Date().toISOString()
        });
      }
      app.socketService.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: "display-page-published",
        scope: "display-pages"
      });

      return { config: resolveEnvelope(live), validation };
    }
  );

  // --- Validate draft without publishing ---

  app.post<{ Params: DisplayPageRouteParams; Body: { unsavedBindings?: boolean } }>(
    "/api/display-pages/:pageId/validate",
    async (request) => {
      const pageId = assertDisplayPageId(request.params.pageId);
      return issuePublishPreflight(pageId, request.body?.unsavedBindings === true);
    }
  );

  // --- Rollback to previous version ---

  app.post<{ Params: DisplayPageRouteParams; Body: RollbackRequestBody }>(
    "/api/display-pages/:pageId/rollback",
    async (request, reply) => {
      const pageId = assertDisplayPageId(request.params.pageId);
      const { targetVersion, publishedBy } = request.body ?? {};

      if (typeof targetVersion !== "number" || targetVersion < 1) {
        const error = new Error("targetVersion must be a positive number");
        // @ts-expect-error fastify reads statusCode
        error.statusCode = 400;
        throw error;
      }

      try {
        const config = rollbackToVersion(pageId, targetVersion, publishedBy);
        app.socketService.emitDisplaySync({
          generatedAt: new Date().toISOString(),
          reason: "display-page-rolled-back",
          scope: "display-pages"
        });
        return { config: resolveEnvelope(config) };
      } catch (err) {
        if (err instanceof Error && "statusCode" in err && err.statusCode === 404) {
          return reply.status(404).send({
            success: false,
            error: err.message,
            timestamp: new Date().toISOString()
          });
        }
        throw err;
      }
    }
  );

  // --- Publish history ---

  app.get<{ Params: DisplayPageRouteParams }>("/api/display-pages/:pageId/history", async (request) => {
    const pageId = assertDisplayPageId(request.params.pageId);
    return { history: getPublishHistory(pageId) };
  });

  app.get<{ Params: DisplayPageRouteParams }>("/api/display-pages/:pageId/fallback", async (request) => {
    const pageId = assertDisplayPageId(request.params.pageId);
    return { fallback: readFallbackStatus(pageId) };
  });

  app.get("/api/display-pages/asset-health", async () => {
    return { health: computeDisplayPageAssetHealthReport() };
  });

  app.get("/api/display-pages/rotation-preview", async () => ({
    preview: readDisplayRotationPreview({
      mqttStatus: app.mqttClientService.getStatus(),
      siteScope: "cl"
    })
  }));
};

export default displayPagesRoute;
