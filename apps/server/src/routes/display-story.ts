import type { FastifyPluginAsync } from "fastify";
import type { DisplayStoryPageId } from "@solar-display/shared";
import {
  readDisplayStory,
  readDisplayStoryPage
} from "../services/displayStoryService.js";

const displayStoryPageIds = new Set<DisplayStoryPageId>([
  "overview",
  "solar",
  "factory-circuit"
]);

function isDisplayStoryPageId(pageId: string): pageId is DisplayStoryPageId {
  return displayStoryPageIds.has(pageId as DisplayStoryPageId);
}

const displayStoryRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/display-story", async () => readDisplayStory());
  app.get<{ Params: { pageId: string } }>("/api/display-story/:pageId", async (request, reply) => {
    const { pageId } = request.params;
    if (!isDisplayStoryPageId(pageId)) {
      reply.code(404);
      return {
        error: `Unsupported display story page: ${pageId}`,
        success: false,
        timestamp: new Date().toISOString()
      };
    }

    return readDisplayStoryPage(pageId);
  });
};

export default displayStoryRoute;
