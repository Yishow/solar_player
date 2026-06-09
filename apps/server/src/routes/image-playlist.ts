import type { FastifyPluginAsync } from "fastify";
import {
  bootstrapImagePlaylistGovernance,
  readImagePlaylist,
  readImagePlaylistGovernanceSnapshot,
  reorderImagePlaylist,
  updateAllImagePlaylistDurations,
  updateImagePlaylistEntry,
  updateImagePlaylistSettings
} from "../services/imagePlaylistService.js";

type PlaylistEntryBody = Partial<{
  area: string | null;
  assetId: number | null;
  capturedAt: string | null;
  description: string | null;
  displayOrder: number;
  durationSeconds: number;
  enabled: boolean;
  fallbackMode: "display-placeholder" | "skip" | "use-cover";
  tags: string[];
  title: string | null;
}>;

type ReorderBody = {
  entries?: Array<{
    displayOrder: number;
    durationSeconds?: number;
    enabled?: boolean;
    entryId: string;
  }>;
};

type PlaylistSettingsBody = {
  shuffle?: unknown;
};

type PlaylistDurationAllBody = {
  durationSeconds?: unknown;
};

const imagePlaylistRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { activeIndex?: string } }>("/api/image-playlist", async (request) => ({
    playlist: readImagePlaylist(Number.parseInt(request.query.activeIndex ?? "0", 10) || 0)
  }));

  app.get("/api/image-playlist/governance", async () => ({
    playlist: readImagePlaylistGovernanceSnapshot()
  }));

  app.post("/api/image-playlist/governance/bootstrap", async () => {
    const playlist = bootstrapImagePlaylistGovernance();
    app.socketService.emitImagesUpdated({ action: "playlist-governance-bootstrapped", playlist });
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "image-playlist-governance-bootstrapped",
      scope: "images"
    });
    return { playlist };
  });

  app.put<{ Body: PlaylistSettingsBody }>("/api/image-playlist/settings", async (request) => {
    updateImagePlaylistSettings({
      shuffle: typeof request.body?.shuffle === "boolean" ? request.body.shuffle : undefined
    });
    const playlist = readImagePlaylist();
    app.socketService.emitImagesUpdated({ action: "playlist-settings-updated", playlist });
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "image-playlist-settings-updated",
      scope: "images"
    });
    return { playlist };
  });

  app.put<{ Body: PlaylistDurationAllBody }>("/api/image-playlist/duration-all", async (request) => {
    updateAllImagePlaylistDurations(Number(request.body?.durationSeconds));
    const playlist = readImagePlaylist();
    app.socketService.emitImagesUpdated({ action: "playlist-duration-all-updated", playlist });
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "image-playlist-duration-all-updated",
      scope: "images"
    });
    return { playlist };
  });

  app.put<{ Params: { entryId: string }; Body: PlaylistEntryBody }>(
    "/api/image-playlist/:entryId",
    async (request) => {
      updateImagePlaylistEntry(request.params.entryId, request.body ?? {});
      const playlist = readImagePlaylist();
      app.socketService.emitImagesUpdated({ action: "playlist-updated", playlist });
      app.socketService.emitDisplaySync({
        generatedAt: new Date().toISOString(),
        reason: "image-playlist-updated",
        scope: "images"
      });
      return { playlist };
    }
  );

  app.put<{ Body: ReorderBody }>("/api/image-playlist/reorder", async (request) => {
    reorderImagePlaylist(request.body?.entries ?? []);
    const playlist = readImagePlaylist();
    app.socketService.emitImagesUpdated({ action: "playlist-reordered", playlist });
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "image-playlist-reordered",
      scope: "images"
    });
    return { playlist };
  });
};

export default imagePlaylistRoute;
