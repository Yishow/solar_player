import type { DisplayPageTemplateKey } from "@solar-display/shared";
import type { FastifyPluginAsync } from "fastify";
import {
  archiveDisplayPageInstance,
  createDisplayPageInstance,
  DisplayPageRegistryError,
  listDisplayPageInstances,
  updateDisplayPageInstance
} from "../services/displayPageRegistryService.js";
import { readPlaybackPages } from "../services/displayRotationService.js";

type CreateDisplayPageRegistryBody = {
  displayNameEn?: string;
  displayNameZh?: string;
  displayOrder?: number;
  durationSeconds?: number;
  enabled?: boolean;
  routeSlug?: string;
  templateKey?: DisplayPageTemplateKey;
};

type UpdateDisplayPageRegistryBody = {
  displayNameEn?: string;
  displayNameZh?: string;
  displayOrder?: number;
  durationSeconds?: number;
  enabled?: boolean;
  routeSlug?: string;
};

function sendRegistryError(
  reply: { status: (code: number) => { send: (payload: Record<string, unknown>) => unknown } },
  error: unknown
) {
  if (!(error instanceof DisplayPageRegistryError)) {
    throw error;
  }

  return reply.status(error.statusCode).send({
    success: false,
    error: error.message,
    timestamp: new Date().toISOString()
  });
}

const displayPageRegistryRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/display-page-registry", async () => ({
    pages: listDisplayPageInstances()
  }));

  app.post<{ Body: CreateDisplayPageRegistryBody }>("/api/display-page-registry", async (request, reply) => {
    try {
      const page = createDisplayPageInstance({
        displayNameEn: request.body?.displayNameEn ?? "",
        displayNameZh: request.body?.displayNameZh ?? "",
        displayOrder: request.body?.displayOrder,
        durationSeconds: request.body?.durationSeconds,
        enabled: request.body?.enabled,
        routeSlug: request.body?.routeSlug ?? "",
        templateKey: (request.body?.templateKey ?? "") as DisplayPageTemplateKey
      });

      const pages = readPlaybackPages();
      app.socketService.emitPlaybackSettingsUpdated({ pages });
      app.socketService.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: "display-page-instance-created",
        scope: "display-pages"
      });

      return reply.status(201).send({ page });
    } catch (error) {
      return sendRegistryError(reply, error);
    }
  });

  app.put<{ Body: UpdateDisplayPageRegistryBody; Params: { pageKey: string } }>(
    "/api/display-page-registry/:pageKey",
    async (request, reply) => {
      try {
        const page = updateDisplayPageInstance(request.params.pageKey, request.body ?? {});

        const pages = readPlaybackPages();
        app.socketService.emitPlaybackSettingsUpdated({ pages });
        app.socketService.emitDisplaySync({
          generatedAt: new Date().toISOString(),
          reason: "display-page-instance-updated",
          scope: "display-pages"
        });

        return { page };
      } catch (error) {
        return sendRegistryError(reply, error);
      }
    }
  );

  app.post<{ Params: { pageKey: string } }>("/api/display-page-registry/:pageKey/archive", async (request, reply) => {
    try {
      const page = archiveDisplayPageInstance(request.params.pageKey);

      const pages = readPlaybackPages();
      app.socketService.emitPlaybackSettingsUpdated({ pages });
      app.socketService.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: "display-page-instance-archived",
        scope: "display-pages"
      });

      return { page };
    } catch (error) {
      return sendRegistryError(reply, error);
    }
  });
};

export default displayPageRegistryRoute;
