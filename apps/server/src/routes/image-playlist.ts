import type { FastifyPluginAsync } from "fastify";
import {
  bootstrapImagePlaylistGovernance,
  readImagePlaylist,
  readImagePlaylistGovernanceSnapshot,
  readImagePlaylistSnapshot,
  reorderImagePlaylist,
  updateImagePlaylistEntry
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

const imagePlaylistRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { activeIndex?: string; bootstrap?: string } }>("/api/image-playlist", async (request) => ({
    playlist: request.query.bootstrap === "false"
      ? readImagePlaylistSnapshot(Number.parseInt(request.query.activeIndex ?? "0", 10) || 0, {
          bootstrapEntries: false
        })
      : readImagePlaylist(Number.parseInt(request.query.activeIndex ?? "0", 10) || 0)
  }));

  app.get("/api/image-playlist/governance", async () => ({
    playlist: readImagePlaylistGovernanceSnapshot({
      bootstrapEntries: false
    })
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
