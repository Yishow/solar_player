import type { DisplayPageConfigEnvelope, DisplayPageKey } from "@solar-display/shared";
import {
  createEmptyDisplayPageConfig,
  isDisplayPageKey
} from "@solar-display/shared";
import type { FastifyPluginAsync } from "fastify";
import { getDatabase } from "../db/index.js";

type DisplayPageRouteParams = {
  pageId: string;
};

type DisplayPageConfigBody = {
  regions?: Record<string, unknown>;
};

type DisplayPageConfigRow = {
  config_json: string;
  updated_at: string | null;
};

function assertDisplayPageKey(pageId: string): DisplayPageKey {
  if (!isDisplayPageKey(pageId)) {
    const error = new Error(`Unknown display page: ${pageId}`);
    // @ts-expect-error fastify reads statusCode from thrown errors.
    error.statusCode = 404;
    throw error;
  }

  return pageId;
}

function parseRegions(raw: string | null | undefined) {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through to the empty object
  }

  return {};
}

function readDisplayPageConfig(pageId: DisplayPageKey): DisplayPageConfigEnvelope {
  const database = getDatabase();
  const row = database
    .prepare(
      `
        SELECT config_json, updated_at
        FROM display_page_configs
        WHERE page_key = ?
      `
    )
    .get(pageId) as DisplayPageConfigRow | undefined;

  if (!row) {
    return createEmptyDisplayPageConfig(pageId);
  }

  return {
    pageId,
    regions: parseRegions(row.config_json),
    updatedAt: row.updated_at,
    version: 1
  };
}

const displayPagesRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: DisplayPageRouteParams }>("/api/display-pages/:pageId/config", async (request) => {
    const pageId = assertDisplayPageKey(request.params.pageId);
    return {
      config: readDisplayPageConfig(pageId)
    };
  });

  app.put<{ Body: DisplayPageConfigBody; Params: DisplayPageRouteParams }>(
    "/api/display-pages/:pageId/config",
    async (request) => {
      const pageId = assertDisplayPageKey(request.params.pageId);
      const regions = request.body?.regions;

      if (regions === undefined || regions === null || Array.isArray(regions) || typeof regions !== "object") {
        const error = new Error("Display page config regions must be an object");
        // @ts-expect-error fastify reads statusCode from thrown errors.
        error.statusCode = 400;
        throw error;
      }

      const database = getDatabase();
      database
        .prepare(
          `
            INSERT INTO display_page_configs (page_key, config_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(page_key) DO UPDATE SET
              config_json = excluded.config_json,
              updated_at = CURRENT_TIMESTAMP
          `
        )
        .run(pageId, JSON.stringify(regions));

      return {
        config: readDisplayPageConfig(pageId)
      };
    }
  );
};

export default displayPagesRoute;
