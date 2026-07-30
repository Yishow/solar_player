import type { FastifyPluginAsync } from "fastify";
import type { PlaybackSettings } from "@solar-display/shared";
import { requireResolvedDisplayClientContext } from "../plugins/deviceContext.js";
import { readDisplayOpsSummary } from "../services/displayOpsService.js";
import {
  readEffectiveDisplayRotationSnapshot,
  readEffectiveRotationEvaluationCount,
  readDisplayRotationPreview,
  readDisplayRotationPlan,
  readPlaybackPages,
  readPlaybackSettings,
  type PlaybackPageUpdateInput,
  updateDisplayRotationPlan,
  updatePlaybackPages,
  updatePlaybackSettings
} from "../services/displayRotationService.js";

type PlaybackSettingsUpdateBody = Partial<PlaybackSettings>;

type PlaybackPagesUpdateBody = {
  pages: PlaybackPageUpdateInput[];
};

const playbackRoute: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/playback/runtime",
    { preHandler: app.requireDisplayClientContext },
    async (request, reply) => {
      const context = requireResolvedDisplayClientContext(request);
      const snapshot = readEffectiveDisplayRotationSnapshot({
        mqttStatus: app.mqttClientService.getStatus(),
        profileId: context.profileId,
        siteScope: context.siteScope
      });
      if (process.env.PHASE1_ACCEPTANCE_METRICS === "1") {
        reply.header(
          "x-solar-rotation-evaluations",
          readEffectiveRotationEvaluationCount()
        );
      }

      return {
        context,
        ...snapshot
      };
    }
  );

  // ---------- GET /api/playback/settings ----------
  app.get("/api/playback/settings", async () => ({
    settings: readPlaybackSettings(),
    displayOps: readDisplayOpsSummary({
      mqttStatus: app.mqttClientService.getStatus()
    })
  }));

  // ---------- PUT /api/playback/settings ----------
  app.put<{ Body: PlaybackSettingsUpdateBody }>(
    "/api/playback/settings",
    async (request) => {
      const updatedSettings = updatePlaybackSettings(request.body ?? {});

      app.socketService.emitPlaybackSettingsUpdated({ settings: updatedSettings });
      app.socketService.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: "playback-settings-updated",
        scope: "playback"
      });

      return {
        settings: updatedSettings,
        displayOps: readDisplayOpsSummary({
          mqttStatus: app.mqttClientService.getStatus()
        })
      };
    }
  );

  // ---------- GET /api/playback/pages ----------
  app.get("/api/playback/pages", async () => ({
    pages: readPlaybackPages(),
    displayOps: readDisplayOpsSummary({
      mqttStatus: app.mqttClientService.getStatus()
    })
  }));

  // ---------- PUT /api/playback/pages ----------
  app.put<{ Body: PlaybackPagesUpdateBody }>(
    "/api/playback/pages",
    async (request) => {
      const updatedPages = updatePlaybackPages(request.body?.pages ?? []);

      app.socketService.emitPlaybackSettingsUpdated({ pages: updatedPages });
      app.socketService.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: "playback-pages-updated",
        scope: "playback"
      });

      return {
        pages: updatedPages,
        displayOps: readDisplayOpsSummary({
          mqttStatus: app.mqttClientService.getStatus()
        })
      };
    }
  );

  app.get("/api/playback/rotation-plan", async () => ({
    rotationPlan: readDisplayRotationPlan()
  }));

  app.put<{ Body: PlaybackPagesUpdateBody }>("/api/playback/rotation-plan", async (request) => ({
    rotationPlan: updateDisplayRotationPlan(request.body?.pages ?? [])
  }));
};

export default playbackRoute;
