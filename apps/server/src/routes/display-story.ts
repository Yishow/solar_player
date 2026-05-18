import type { FastifyPluginAsync } from "fastify";
import { readDisplayStory } from "../services/displayStoryService.js";

const displayStoryRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/display-story", async () => readDisplayStory());
};

export default displayStoryRoute;
