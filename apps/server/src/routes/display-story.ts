import type { FastifyPluginAsync } from "fastify";
import type { DisplayStoryPageId } from "@solar-display/shared";
import {
  readDisplayStory,
  readSiteScopedDisplayStoryPage
} from "../services/displayStoryService.js";
import { requireResolvedDisplayClientContext } from "../plugins/deviceContext.js";

const displayStoryPageIds = new Set<DisplayStoryPageId>([
  "overview",
  "solar",
  "factory-circuit",
  "factory-circuit-guanyin"
]);

function isDisplayStoryPageId(pageId: string): pageId is DisplayStoryPageId {
  return displayStoryPageIds.has(pageId as DisplayStoryPageId);
}

const displayStoryRoute: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/display-story",
    { preHandler: app.requireDisplayClientContext },
    async (request) => {
      const context = requireResolvedDisplayClientContext(request);
      return readDisplayStory({
        profileId: context.profileId,
        siteScope: context.siteScope
      });
    }
  );
  app.get<{ Params: { pageId: string } }>(
    "/api/display-story/:pageId",
    { preHandler: app.requireDisplayClientContext },
    async (request, reply) => {
      const { pageId } = request.params;
      if (!isDisplayStoryPageId(pageId)) {
        reply.code(404);
        return {
          error: `Unsupported display story page: ${pageId}`,
          success: false,
          timestamp: new Date().toISOString()
        };
      }

      const context = requireResolvedDisplayClientContext(request);
      const expectedFactoryPage =
        context.siteScope === "cl"
          ? "factory-circuit"
          : "factory-circuit-guanyin";
      if (
        (pageId === "factory-circuit" ||
          pageId === "factory-circuit-guanyin") &&
        pageId !== expectedFactoryPage
      ) {
        return reply.status(403).send({
          code: "site_scope_mismatch",
          error: "Display Story page does not match the Device Site Scope",
          success: false,
          timestamp: new Date().toISOString()
        });
      }

      return readSiteScopedDisplayStoryPage(
        pageId,
        context.siteScope,
        context.profileId
      );
    }
  );
};

export default displayStoryRoute;
