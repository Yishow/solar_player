import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyError } from "fastify";
import { config } from "./config.js";
import { closeDatabaseConnection } from "./db/index.js";
import { readLiveMetricsSnapshot } from "./metrics/liveMetrics.js";
import { MqttClientService } from "./mqtt/MqttClientService.js";
import { type MqttStatus, SocketService } from "./realtime/SocketService.js";
import healthRoute from "./routes/health.js";
import metricsRoute from "./routes/metrics.js";
import metricsHistoryRoute from "./routes/metrics-history.js";
import settingsMqttRoute from "./routes/settings-mqtt.js";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });
  let mqttClientService: MqttClientService | null = null;
  const socketService = new SocketService({
    getLiveMetricsSnapshot: () => readLiveMetricsSnapshot(),
    getMqttStatus: () =>
      mqttClientService?.getStatus() ?? {
        broker: "",
        clientId: "",
        connected: false,
        reason: "offline",
        updatedAt: new Date().toISOString()
      } satisfies MqttStatus,
    logger: app.log,
    server: app.server
  });
  mqttClientService = new MqttClientService({
    logger: app.log,
    socketService
  });

  app.decorate("mqttClientService", mqttClientService);
  app.decorate("socketService", socketService);

  await app.register(cors, {
    origin: true
  });

  await app.register(swagger, {
    mode: "static",
    specification: {
      path: config.openapiPath,
      baseDir: config.projectRoot
    }
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false
    }
  });

  await app.register(healthRoute);
  await app.register(metricsRoute);
  await app.register(metricsHistoryRoute);
  await app.register(settingsMqttRoute);

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: `Route ${request.method} ${request.url} not found`,
      timestamp: new Date().toISOString()
    });
  });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;

    reply.status(statusCode).send({
      success: false,
      error: statusCode >= 500 ? "Internal Server Error" : error.message,
      timestamp: new Date().toISOString()
    });
  });

  app.addHook("onClose", async () => {
    await socketService.close();
    await mqttClientService.disconnect();
    closeDatabaseConnection();
  });

  return app;
}
