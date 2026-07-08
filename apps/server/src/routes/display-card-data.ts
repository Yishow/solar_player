import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { readDisplayCardData } from "../services/displayCardDataService.js";
import {
  clearDisplayValueOverride,
  saveDisplayValueOverride
} from "../services/displayValueOverrideService.js";

type SaveDisplayOverrideBody = {
  displayValue?: unknown;
  expiresAt?: unknown;
  reason?: unknown;
  unit?: unknown;
};

function readTargetRow(targetId: string) {
  return readDisplayCardData().rows.find((row) => row.cardId === targetId) ?? null;
}

function emitOverrideSync(app: FastifyInstance) {
  app.socketService.emitDisplaySync({
    generatedAt: new Date().toISOString(),
    reason: "display-card-override-updated",
    scope: "display-pages"
  });
}

const displayCardDataRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/display-card-data", async (request, reply) => {
    if (!app.managementAccess.isTrustedManagementReadRequest(request)) {
      return app.managementAccess.deny(reply);
    }

    return readDisplayCardData();
  });

  app.put<{ Body: SaveDisplayOverrideBody; Params: { targetId: string } }>(
    "/api/display-card-data/overrides/:targetId",
    async (request, reply) => {
      if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
        return app.managementAccess.deny(reply);
      }

      if (typeof request.body?.displayValue !== "number" || !Number.isFinite(request.body.displayValue)) {
        return reply.status(400).send({
          error: "Display override value must be a finite number"
        });
      }

      if (
        request.body.expiresAt !== undefined &&
        request.body.expiresAt !== null &&
        (typeof request.body.expiresAt !== "string" || !Number.isFinite(Date.parse(request.body.expiresAt)))
      ) {
        return reply.status(400).send({
          error: "Display override expiresAt must be an ISO date string"
        });
      }

      const target = readTargetRow(request.params.targetId);
      if (!target) {
        return reply.status(404).send({
          error: "Display card target not found"
        });
      }

      saveDisplayValueOverride(
        {
          cardId: target.cardId,
          metricKey: target.metricKey,
          pageId: target.pageId,
          targetId: target.cardId,
          unit: target.unit
        },
        {
          displayValue: request.body.displayValue,
          expiresAt: typeof request.body.expiresAt === "string" ? request.body.expiresAt : null,
          reason: typeof request.body.reason === "string" ? request.body.reason : null,
          unit: typeof request.body.unit === "string" ? request.body.unit : null
        }
      );
      emitOverrideSync(app);

      const row = readTargetRow(request.params.targetId);
      return {
        row,
        success: true
      };
    }
  );

  app.delete<{ Params: { targetId: string } }>(
    "/api/display-card-data/overrides/:targetId",
    async (request, reply) => {
      if (!app.managementAccess.isTrustedManagementMutationRequest(request)) {
        return app.managementAccess.deny(reply);
      }

      const target = readTargetRow(request.params.targetId);
      if (!target) {
        return reply.status(404).send({
          error: "Display card target not found"
        });
      }

      clearDisplayValueOverride(request.params.targetId);
      emitOverrideSync(app);

      return {
        row: readTargetRow(request.params.targetId),
        success: true
      };
    }
  );
};

export default displayCardDataRoute;
