import type {
  PlaybackPage,
  PlaybackSettings
} from "@solar-display/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  archivePlaybackProfile,
  createPlaybackProfile,
  listPlaybackProfiles,
  listPlaybackProfileVersions,
  PlaybackProfileGovernanceError,
  previewPlaybackProfileDraft,
  publishPlaybackProfile,
  readPlaybackProfileDraft,
  readPlaybackProfileVersion,
  renamePlaybackProfile,
  rollbackPlaybackProfile,
  savePlaybackProfileDraft
} from "../services/playbackProfileGovernanceService.js";

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new PlaybackProfileGovernanceError(
      "profile_not_found",
      "Invalid Playback Profile id",
      404
    );
  }
  return id;
}

function sendError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof PlaybackProfileGovernanceError)) {
    throw error;
  }
  return reply.status(error.statusCode).send({
    code: error.code,
    ...(error.currentRevision === undefined
      ? {}
      : { currentRevision: error.currentRevision }),
    error: error.message,
    success: false,
    timestamp: new Date().toISOString()
  });
}

function requireRead(app: FastifyRequest["server"], request: FastifyRequest, reply: FastifyReply) {
  if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
    app.managementAccess.deny(reply);
    return false;
  }
  return true;
}

function requireMutation(
  app: FastifyRequest["server"],
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
    app.managementAccess.deny(reply);
    return false;
  }
  return true;
}

const playbackProfilesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/playback-profiles", async (request, reply) => {
    if (!requireRead(app, request, reply)) return reply;
    return { data: listPlaybackProfiles(), success: true };
  });

  app.post<{ Body: { name?: unknown } }>(
    "/api/playback-profiles",
    async (request, reply) => {
      if (!requireMutation(app, request, reply)) return reply;
      try {
        return reply.status(201).send({
          data: createPlaybackProfile({
            name: typeof request.body?.name === "string" ? request.body.name : ""
          }),
          success: true
        });
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.put<{ Body: { name?: unknown }; Params: { id: string } }>(
    "/api/playback-profiles/:id",
    async (request, reply) => {
      if (!requireMutation(app, request, reply)) return reply;
      try {
        return {
          data: renamePlaybackProfile(
            parseId(request.params.id),
            typeof request.body?.name === "string" ? request.body.name : ""
          ),
          success: true
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/playback-profiles/:id/archive",
    async (request, reply) => {
      if (!requireMutation(app, request, reply)) return reply;
      try {
        return {
          data: archivePlaybackProfile(parseId(request.params.id)),
          success: true
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/api/playback-profiles/:id/draft",
    async (request, reply) => {
      if (!requireRead(app, request, reply)) return reply;
      try {
        return {
          data: readPlaybackProfileDraft(parseId(request.params.id)),
          success: true
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.put<{
    Body: {
      expectedRevision?: unknown;
      pages?: unknown;
      settings?: unknown;
    };
    Params: { id: string };
  }>("/api/playback-profiles/:id/draft", async (request, reply) => {
    if (!requireMutation(app, request, reply)) return reply;
    try {
      if (
        !Number.isInteger(request.body?.expectedRevision)
        || !Array.isArray(request.body?.pages)
        || typeof request.body?.settings !== "object"
        || request.body.settings === null
      ) {
        throw new PlaybackProfileGovernanceError(
          "profile_draft_invalid",
          "Draft requires expectedRevision, settings, and pages",
          400
        );
      }
      return {
        data: savePlaybackProfileDraft(parseId(request.params.id), {
          expectedRevision: request.body.expectedRevision as number,
          pages: request.body.pages as PlaybackPage[],
          settings: request.body.settings as PlaybackSettings
        }),
        success: true
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post<{ Params: { id: string } }>(
    "/api/playback-profiles/:id/preview",
    async (request, reply) => {
      if (!requireRead(app, request, reply)) return reply;
      try {
        return {
          data: previewPlaybackProfileDraft(parseId(request.params.id), {
            mqttStatus: app.mqttClientService.getStatus()
          }),
          success: true
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post<{ Body: { expectedRevision?: unknown }; Params: { id: string } }>(
    "/api/playback-profiles/:id/publish",
    async (request, reply) => {
      if (!requireMutation(app, request, reply)) return reply;
      try {
        if (!Number.isInteger(request.body?.expectedRevision)) {
          throw new PlaybackProfileGovernanceError(
            "profile_draft_invalid",
            "Publish requires expectedRevision",
            400
          );
        }
        return reply.status(201).send({
          data: publishPlaybackProfile(parseId(request.params.id), {
            createdBy: "management-trusted",
            expectedRevision: request.body.expectedRevision as number,
            mqttStatus: app.mqttClientService.getStatus()
          }),
          success: true
        });
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post<{
    Body: { versionId?: unknown };
    Params: { id: string };
  }>("/api/playback-profiles/:id/rollback", async (request, reply) => {
    if (!requireMutation(app, request, reply)) return reply;
    try {
      if (!Number.isInteger(request.body?.versionId)) {
        throw new PlaybackProfileGovernanceError(
          "profile_version_not_found",
          "Rollback requires a valid Profile Version id",
          404
        );
      }
      return reply.status(201).send({
        data: rollbackPlaybackProfile(parseId(request.params.id), {
          createdBy: "management-trusted",
          versionId: request.body.versionId as number
        }),
        success: true
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get<{ Params: { id: string } }>(
    "/api/playback-profiles/:id/versions",
    async (request, reply) => {
      if (!requireRead(app, request, reply)) return reply;
      try {
        return {
          data: listPlaybackProfileVersions(parseId(request.params.id)),
          success: true
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get<{ Params: { id: string; versionId: string } }>(
    "/api/playback-profiles/:id/versions/:versionId",
    async (request, reply) => {
      if (!requireRead(app, request, reply)) return reply;
      try {
        return {
          data: readPlaybackProfileVersion(
            parseId(request.params.id),
            parseId(request.params.versionId)
          ),
          success: true
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );
};

export default playbackProfilesRoute;
