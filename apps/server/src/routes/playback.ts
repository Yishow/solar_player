import type { FastifyPluginAsync } from "fastify";
import type { PlaybackSettings } from "@solar-display/shared";
import {
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
  // ---------- GET /api/playback/settings ----------
  app.get("/api/playback/settings", async () => ({
    settings: readPlaybackSettings()
  }));

  // ---------- PUT /api/playback/settings ----------
  app.put<{ Body: PlaybackSettingsUpdateBody }>(
    "/api/playback/settings",
    async (request) => {
      const updatedSettings = updatePlaybackSettings(request.body ?? {});

      app.socketService.emitPlaybackSettingsUpdated({ settings: updatedSettings });

      return { settings: updatedSettings };
    }
  );

  // ---------- GET /api/playback/pages ----------
  app.get("/api/playback/pages", async () => ({
    pages: readPlaybackPages()
  }));

  // ---------- PUT /api/playback/pages ----------
  app.put<{ Body: PlaybackPagesUpdateBody }>(
    "/api/playback/pages",
    async (request) => {
      const updatedPages = updatePlaybackPages(request.body?.pages ?? []);

      app.socketService.emitPlaybackSettingsUpdated({ pages: updatedPages });

      return { pages: updatedPages };
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
