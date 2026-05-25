import type {
  DisplayPageConfigEnvelope,
  DisplayPageDraftSaveConflictResponse,
  DisplayPageFreeformObject,
  DisplayPageId
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
  publishDraft,
  rollbackToVersion,
  getPublishHistory,
  readFallbackStatus
} from "../services/displayPagePublishingService.js";
import {
  collectDisplayPageAssetFindings,
  collectDisplayPageMediaPlacementIssues,
  computeDisplayPageAssetHealthReport,
  normalizeDisplayPageRegionsForStorage,
  resolveDisplayPageRegions
} from "../services/displayPageAssetService.js";
import { readDisplayRotationPreview } from "../services/displayRotationService.js";

type DisplayPageRouteParams = { pageId: string };
type DisplayPageConfigBody = {
  baseVersion?: number;
  freeformObjects?: DisplayPageFreeformObject[];
  regions?: Record<string, unknown>;
};
type PublishRequestBody = { publishedBy?: string };
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
      const { live, validation } = publishDraft(pageId, request.body?.publishedBy);

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

  app.post<{ Params: DisplayPageRouteParams }>("/api/display-pages/:pageId/validate", async (request, reply) => {
    const pageId = assertDisplayPageId(request.params.pageId);
    const draft = readStageConfig(pageId, "draft");
    const { validateConfigDraft, checkImageReferences } = await import("../services/displayPagePublishingService.js");
    const validation = validateConfigDraft(draft.regions, draft.freeformObjects ?? []);
    const imageWarnings = checkImageReferences(draft.regions);
    if (imageWarnings.length > 0) validation.findings.push(...imageWarnings);
    const assetFindings = collectDisplayPageAssetFindings(pageId, draft.regions);
    if (assetFindings.length > 0) {
      validation.findings.push(
        ...assetFindings.map((finding) => ({
          code: "ASSET_REFERENCE_MISSING",
          message: finding.message,
          regionId: finding.bindingId,
          severity: "warning" as const
        }))
      );
    }

    return { validation };
  });

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
      mqttStatus: app.mqttClientService.getStatus()
    })
  }));
};

export default displayPagesRoute;
