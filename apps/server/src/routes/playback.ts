import type { FastifyPluginAsync } from "fastify";
import { createHash } from "node:crypto";
import type { PlaybackSettings } from "@solar-display/shared";
import { requireResolvedDisplayClientContext } from "../plugins/deviceContext.js";
import { readDisplayOpsSummary } from "../services/displayOpsService.js";
import {
  readEffectiveDisplayRotationSnapshot,
  evaluatePlaybackSnapshot,
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
import { synchronizeDefaultPlaybackProfileDraft } from "../services/playbackProfileGovernanceService.js";
import { readDeviceProfileRollout } from "../services/deviceProfileRolloutService.js";

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
      const profileRollout = readDeviceProfileRollout(context.deviceId);
      const snapshot = profileRollout.desired
        ? {
            effectiveRotationRevision:
              `profile-version:${profileRollout.desired.id}:${context.siteScope}`,
            preview: evaluatePlaybackSnapshot({
              mqttStatus: app.mqttClientService.getStatus(),
              pages: profileRollout.desired.snapshot.pages,
              settings: profileRollout.desired.snapshot.settings,
              siteScope: context.siteScope
            }),
            settings: profileRollout.desired.snapshot.settings
          }
        : readEffectiveDisplayRotationSnapshot({
            mqttStatus: app.mqttClientService.getStatus(),
            profileId: context.profileId,
            siteScope: context.siteScope
          });
      const response = {
        context,
        profileRollout,
        ...snapshot
      };
      const etagPayload = {
        ...response,
        preview: {
          ...response.preview,
          evaluatedAt: undefined
        }
      };
      const etag = `"${createHash("sha256")
        .update(JSON.stringify(etagPayload))
        .digest("base64url")}"`;
      reply.header("cache-control", "private, no-cache");
      reply.header("etag", etag);
      reply.header("vary", "Cookie");
      if (request.headers["if-none-match"] === etag) {
        return reply.status(304).send();
      }
      if (process.env.PHASE1_ACCEPTANCE_METRICS === "1") {
        reply.header(
          "x-solar-rotation-evaluations",
          readEffectiveRotationEvaluationCount()
        );
      }

      return response;
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
      synchronizeDefaultPlaybackProfileDraft();

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
      synchronizeDefaultPlaybackProfileDraft();

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

  app.put<{ Body: PlaybackPagesUpdateBody }>("/api/playback/rotation-plan", async (request) => {
    const rotationPlan = updateDisplayRotationPlan(request.body?.pages ?? []);
    synchronizeDefaultPlaybackProfileDraft();
    return { rotationPlan };
  });
};

export default playbackRoute;
