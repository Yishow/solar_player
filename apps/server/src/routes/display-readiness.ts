import type { FastifyPluginAsync } from "fastify";
import { readDisplayReadinessReport } from "../services/displayReadinessService.js";

const displayReadinessRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/display-readiness", async () => ({
    readiness: readDisplayReadinessReport()
  }));
};

export default displayReadinessRoute;
