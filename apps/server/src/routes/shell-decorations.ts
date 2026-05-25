import type {
  ManagementDraftSaveConflictResponse,
  ShellDecorationChannel,
  ShellDecorationEnvelope
} from "@solar-display/shared";
import { isShellDecorationObjectShape } from "@solar-display/shared";
import type { FastifyPluginAsync } from "fastify";
import {
  publishShellDecorationDraft,
  readPublicShellDecorationConfig,
  readShellDecorationStage,
  ShellDecorationDraftSaveConflictError,
  writeShellDecorationDraft
} from "../services/shellDecorationService.js";

type ShellDecorationDraftBody = {
  baseVersion?: number;
  footerObjects?: unknown;
  headerObjects?: unknown;
};

type ShellDecorationPublishBody = { publishedBy?: string };

function badRequest(message: string): Error {
  const error = new Error(message);
  // @ts-expect-error fastify reads statusCode
  error.statusCode = 400;
  return error;
}

function assertObjectArray(value: unknown, mount: "footer" | "header") {
  if (!Array.isArray(value)) {
    throw badRequest(`Shell decoration channel requires headerObjects and footerObjects arrays`);
  }
  value.forEach((item, index) => {
    if (!isShellDecorationObjectShape(item)) {
      throw badRequest(`Shell decoration ${mount}Objects[${index}] is not a valid object`);
    }
  });
  return value;
}

function assertChannelBody(body: ShellDecorationDraftBody | undefined): ShellDecorationChannel {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Shell decoration channel must be an object");
  }
  return {
    footerObjects: assertObjectArray(body.footerObjects, "footer"),
    headerObjects: assertObjectArray(body.headerObjects, "header")
  };
}

const shellDecorationsRoute: FastifyPluginAsync = async (app) => {
  // Public-safe runtime read. Corruption details stay server-side only.
  app.get("/api/shell-decorations", async (request, reply) => {
    try {
      return { config: readPublicShellDecorationConfig() };
    } catch (error) {
      request.log.error({ err: error }, "Failed to read public shell decoration config");
      return reply.status(500).send({
        error: "Internal Server Error",
        success: false,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Management draft read/write
  app.get("/api/shell-decorations/draft", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    return { config: readShellDecorationStage("draft") };
  });

  app.put<{ Body: ShellDecorationDraftBody }>("/api/shell-decorations/draft", async (request, reply) => {
    const channel = assertChannelBody(request.body);
    try {
      return { config: writeShellDecorationDraft(channel, request.body?.baseVersion as number) };
    } catch (error) {
      if (error instanceof ShellDecorationDraftSaveConflictError) {
        const conflictResponse: ManagementDraftSaveConflictResponse<ShellDecorationEnvelope> = {
          code: error.code,
          conflict: error.conflict,
          error: error.message,
          success: false,
          timestamp: new Date().toISOString()
        };
        return reply.status(409).send(conflictResponse);
      }
      throw error;
    }
  });

  // Management live read
  app.get("/api/shell-decorations/live", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }
    return { config: readShellDecorationStage("live") };
  });

  // Publish draft to live
  app.post<{ Body: ShellDecorationPublishBody }>("/api/shell-decorations/publish", async (request, reply) => {
    const { live, validation } = publishShellDecorationDraft(request.body?.publishedBy);

    if (!validation.canPublish) {
      return reply.status(422).send({
        error: "Validation failed",
        success: false,
        timestamp: new Date().toISOString(),
        validation
      });
    }

    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "shell-decoration-published",
      scope: "display-pages"
    });

    return { config: live, validation };
  });
};

export default shellDecorationsRoute;
