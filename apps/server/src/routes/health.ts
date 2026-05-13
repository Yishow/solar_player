import type { FastifyPluginAsync } from "fastify";

const healthRoute: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString()
  }));
};

export default healthRoute;
