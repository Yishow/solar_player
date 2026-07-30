import type { SustainabilityPeriodKey, SustainabilityStoryInput } from "@solar-display/shared";
import type { FastifyPluginAsync } from "fastify";
import {
  readSustainabilityStory,
  saveSustainabilityStory
} from "../services/sustainabilityStoryService.js";
import { requireResolvedDisplayClientContext } from "../plugins/deviceContext.js";

const sustainabilityStoryRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { period?: SustainabilityPeriodKey } }>(
    "/api/sustainability-story",
    { preHandler: app.requireDisplayClientContext },
    async (request) => {
      const context = requireResolvedDisplayClientContext(request);
      return {
        story: readSustainabilityStory(request.query.period, {
          siteScope: context.siteScope
        })
      };
    }
  );

  app.put<{ Body: SustainabilityStoryInput }>("/api/sustainability-story", async (request) => {
    saveSustainabilityStory(request.body);
    const story = readSustainabilityStory(request.body.selectedPeriod);
    app.socketService.emitDisplaySync({
      generatedAt: new Date().toISOString(),
      reason: "sustainability-story-updated",
      scope: "sustainability"
    });
    return { story };
  });
};

export default sustainabilityStoryRoute;
