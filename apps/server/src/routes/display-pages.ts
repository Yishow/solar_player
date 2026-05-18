import type { DisplayPageConfigEnvelope, DisplayPageKey } from "@solar-display/shared";
import {
  createEmptyDisplayPageConfig,
  isDisplayPageKey
} from "@solar-display/shared";
import type { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/index.js";
import {
  readStageConfig,
  writeStageConfig,
  publishDraft,
  rollbackToVersion,
  getPublishHistory,
  readFallbackStatus
} from "../services/displayPagePublishingService.js";
import {
  collectDisplayPageAssetFindings,
  normalizeDisplayPageRegionsForStorage,
  resolveDisplayPageRegions
} from "../services/displayPageAssetService.js";

type DisplayPageRouteParams = { pageId: string };
type DisplayPageConfigBody = { regions?: Record<string, unknown> };
type PublishRequestBody = { publishedBy?: string };
type RollbackRequestBody = { targetVersion: number; publishedBy?: string };

type DisplayPageConfigRow = {
  config_json: string;
  updated_at: string | null;
};

function assertDisplayPageKey(pageId: string): DisplayPageKey {
  if (!isDisplayPageKey(pageId)) {
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
      return parsed as Record<string, unknown>;
    }
  } catch { /* fall through */ }
  return {};
}

function readStoredDisplayPageConfig(pageId: DisplayPageKey): DisplayPageConfigEnvelope {
  const database = getDatabase();
  const row = database
    .prepare(`SELECT config_json, updated_at FROM display_page_configs WHERE page_key = ?`)
    .get(pageId) as DisplayPageConfigRow | undefined;

  if (!row) return createEmptyDisplayPageConfig(pageId);

  return { pageId, regions: parseRegions(row.config_json), updatedAt: row.updated_at, version: 1 };
}

function resolveEnvelope<TRegions extends Record<string, unknown>>(
  envelope: DisplayPageConfigEnvelope<TRegions>
) {
  return {
    ...envelope,
    assetFindings: collectDisplayPageAssetFindings(envelope.pageId, envelope.regions),
    regions: resolveDisplayPageRegions(envelope.regions)
  };
}

const displayPagesRoute: FastifyPluginAsync = async (app) => {
  // --- Legacy routes (backward compatible) ---

  app.get<{ Params: DisplayPageRouteParams }>("/api/display-pages/:pageId/config", async (request) => {
    const pageId = assertDisplayPageKey(request.params.pageId);
    return { config: resolveEnvelope(readStoredDisplayPageConfig(pageId)) };
  });

  app.put<{ Body: DisplayPageConfigBody; Params: DisplayPageRouteParams }>(
    "/api/display-pages/:pageId/config",
    async (request) => {
      const pageId = assertDisplayPageKey(request.params.pageId);
      const regions = request.body?.regions;

      if (regions === undefined || regions === null || Array.isArray(regions) || typeof regions !== "object") {
        const error = new Error("Display page config regions must be an object");
        // @ts-expect-error fastify reads statusCode
        error.statusCode = 400;
        throw error;
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
        .run(pageId, JSON.stringify(normalizedRegions));

      return { config: resolveEnvelope(readStoredDisplayPageConfig(pageId)) };
    }
  );

  // --- Stage-aware draft routes ---

  app.get<{ Params: DisplayPageRouteParams }>("/api/display-pages/:pageId/draft", async (request) => {
    const pageId = assertDisplayPageKey(request.params.pageId);
    return { config: resolveEnvelope(readStageConfig(pageId, "draft")) };
  });

  app.put<{ Body: DisplayPageConfigBody; Params: DisplayPageRouteParams }>(
    "/api/display-pages/:pageId/draft",
    async (request) => {
      const pageId = assertDisplayPageKey(request.params.pageId);
      const regions = request.body?.regions;

      if (regions === undefined || regions === null || Array.isArray(regions) || typeof regions !== "object") {
        const error = new Error("Display page config regions must be an object");
        // @ts-expect-error fastify reads statusCode
        error.statusCode = 400;
        throw error;
      }

      return { config: resolveEnvelope(writeStageConfig(pageId, "draft", regions)) };
    }
  );

  // --- Live config read ---

  app.get<{ Params: DisplayPageRouteParams }>("/api/display-pages/:pageId/live", async (request) => {
    const pageId = assertDisplayPageKey(request.params.pageId);
    return { config: resolveEnvelope(readStageConfig(pageId, "live")) };
  });

  // --- Publish draft to live ---

  app.post<{ Params: DisplayPageRouteParams; Body: PublishRequestBody }>(
    "/api/display-pages/:pageId/publish",
    async (request, reply) => {
      const pageId = assertDisplayPageKey(request.params.pageId);
      const { live, validation } = publishDraft(pageId, request.body?.publishedBy);

      if (!validation.canPublish) {
        return reply.status(422).send({
          success: false,
          error: "Validation failed",
          validation,
          timestamp: new Date().toISOString()
        });
      }

      return { config: resolveEnvelope(live), validation };
    }
  );

  // --- Validate draft without publishing ---

  app.post<{ Params: DisplayPageRouteParams }>("/api/display-pages/:pageId/validate", async (request, reply) => {
    const pageId = assertDisplayPageKey(request.params.pageId);
    const draft = readStageConfig(pageId, "draft");
    const { validateConfigDraft, checkImageReferences } = await import("../services/displayPagePublishingService.js");
    const validation = validateConfigDraft(draft.regions);
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
      const pageId = assertDisplayPageKey(request.params.pageId);
      const { targetVersion, publishedBy } = request.body ?? {};

      if (typeof targetVersion !== "number" || targetVersion < 1) {
        const error = new Error("targetVersion must be a positive number");
        // @ts-expect-error fastify reads statusCode
        error.statusCode = 400;
        throw error;
      }

      try {
        const config = rollbackToVersion(pageId, targetVersion, publishedBy);
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
    const pageId = assertDisplayPageKey(request.params.pageId);
    return { history: getPublishHistory(pageId) };
  });

  app.get<{ Params: DisplayPageRouteParams }>("/api/display-pages/:pageId/fallback", async (request) => {
    const pageId = assertDisplayPageKey(request.params.pageId);
    return { fallback: readFallbackStatus(pageId) };
  });
};

export default displayPagesRoute;
