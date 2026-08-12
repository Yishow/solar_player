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

const fallbackModes = new Set(["display-placeholder", "skip", "use-cover"]);

function validationError(error: string) {
  return {
    error,
    success: false,
    timestamp: new Date().toISOString()
  };
}

function isRecordBody(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidDuration(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isValidDisplayOrder(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function validatePlaylistEntryBody(body: unknown) {
  if (!isRecordBody(body)) {
    return "Playlist entry body must be an object";
  }
  if (body.durationSeconds !== undefined && !isValidDuration(body.durationSeconds)) {
    return "durationSeconds must be a finite number greater than or equal to zero";
  }
  if (body.displayOrder !== undefined && !isValidDisplayOrder(body.displayOrder)) {
    return "displayOrder must be a non-negative integer";
  }
  if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
    return "enabled must be a boolean";
  }
  if (
    body.assetId !== undefined
    && body.assetId !== null
    && (!Number.isInteger(body.assetId) || (body.assetId as number) <= 0)
  ) {
    return "assetId must be a positive integer or null";
  }
  if (
    body.fallbackMode !== undefined
    && (typeof body.fallbackMode !== "string" || !fallbackModes.has(body.fallbackMode))
  ) {
    return "fallbackMode is invalid";
  }
  if (
    body.tags !== undefined
    && (!Array.isArray(body.tags) || body.tags.some((tag) => typeof tag !== "string"))
  ) {
    return "tags must be an array of strings";
  }

  for (const field of ["area", "capturedAt", "description", "title"] as const) {
    const value = body[field];
    if (value !== undefined && value !== null && typeof value !== "string") {
      return `${field} must be a string or null`;
    }
  }

  return null;
}

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

  app.put<{ Body: PlaylistSettingsBody }>("/api/image-playlist/settings", async (request, reply) => {
    if (!isRecordBody(request.body)) {
      return reply.status(400).send(validationError("Playlist settings body must be an object"));
    }
    if (request.body.shuffle !== undefined && typeof request.body.shuffle !== "boolean") {
      return reply.status(400).send(validationError("shuffle must be a boolean"));
    }

    updateImagePlaylistSettings({
      shuffle: request.body.shuffle as boolean | undefined
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

  app.put<{ Body: PlaylistDurationAllBody }>("/api/image-playlist/duration-all", async (request, reply) => {
    if (!isRecordBody(request.body)) {
      return reply.status(400).send(validationError("Playlist duration body must be an object"));
    }
    const durationSeconds = request.body.durationSeconds;
    if (!isValidDuration(durationSeconds)) {
      return reply.status(400).send(
        validationError("durationSeconds must be a finite number greater than or equal to zero")
      );
    }

    updateAllImagePlaylistDurations(durationSeconds);
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
    async (request, reply) => {
      const bodyValidationError = validatePlaylistEntryBody(request.body);
      if (bodyValidationError) {
        return reply.status(400).send(validationError(bodyValidationError));
      }

      updateImagePlaylistEntry(request.params.entryId, request.body);
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

  app.put<{ Body: ReorderBody }>("/api/image-playlist/reorder", async (request, reply) => {
    if (!isRecordBody(request.body) || !Array.isArray(request.body.entries)) {
      return reply.status(400).send(validationError("entries must be an array"));
    }

    const entries = request.body.entries;
    const invalidEntry = entries.find((entry) => (
      !entry
      || typeof entry !== "object"
      || typeof entry.entryId !== "string"
      || entry.entryId.trim().length === 0
      || !isValidDisplayOrder(entry.displayOrder)
      || (entry.durationSeconds !== undefined && !isValidDuration(entry.durationSeconds))
      || (entry.enabled !== undefined && typeof entry.enabled !== "boolean")
    ));
    if (invalidEntry) {
      return reply.status(400).send(validationError("Invalid playlist reorder entry"));
    }

    reorderImagePlaylist(entries);
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
