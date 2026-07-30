import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyError, type FastifyServerOptions } from "fastify";
import { existsSync, mkdirSync } from "node:fs";
import { isIP } from "node:net";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { closeDatabaseConnection } from "./db/index.js";
import { createLoggerOptions } from "./logger.js";
import { readAuthoritativeLiveMetricsSnapshot } from "./metrics/liveMetrics.js";
import { MqttClientService } from "./mqtt/MqttClientService.js";
import { getWeatherService } from "./services/weatherService.js";
import managementAuthPlugin, {
  createManagementAccessControl,
  createManagementCorsOriginDelegate,
  createManagementCorsOptionsDelegate,
  createManagementCorsRequestGate,
  parseManagementTrustedOrigins
} from "./plugins/managementAuth.js";
import { deviceContextPlugin } from "./plugins/deviceContext.js";
import { type MqttStatus, SocketService } from "./realtime/SocketService.js";
import { recordDeviceProfileRolloutHeartbeat } from "./services/deviceProfileRolloutService.js";
import healthRoute from "./routes/health.js";
import metricsRoute from "./routes/metrics.js";
import metricsHistoryRoute from "./routes/metrics-history.js";
import playbackRoute from "./routes/playback.js";
import playbackProfilesRoute from "./routes/playback-profiles.js";
import imagesRoute from "./routes/images.js";
import brandRoute from "./routes/brand.js";
import calculationSettingsRoute from "./routes/calculation-settings.js";
import circuitsRoute from "./routes/circuits.js";
import dataSourceRoute from "./routes/data-source.js";
import deviceRoute from "./routes/device.js";
import deviceGroupsRoute from "./routes/device-groups.js";
import devicesRoute from "./routes/devices.js";
import devicePairingRoute from "./routes/device-pairing.js";
import deviceDisplayOpsRoute from "./routes/device-display-ops.js";
import displayOpsRoute from "./routes/display-ops.js";
import displayCardDataRoute from "./routes/display-card-data.js";
import displayPageRegistryRoute from "./routes/display-page-registry.js";
import displayPagesRoute from "./routes/display-pages.js";
import displayReadinessRoute from "./routes/display-readiness.js";
import displayStoryRoute from "./routes/display-story.js";
import imagePlaylistRoute from "./routes/image-playlist.js";
import freshnessPolicyRoute from "./routes/freshness-policy.js";
import settingsMqttRoute from "./routes/settings-mqtt.js";
import shellDecorationsRoute from "./routes/shell-decorations.js";
import sustainabilityStoryRoute from "./routes/sustainability-story.js";
import weatherRoute from "./routes/weather.js";

function shouldServeSpaFallback(request: { headers: { accept?: string }; method: string; url: string }) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  const pathname = new URL(request.url, "http://localhost").pathname;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/uploads/")
  ) {
    return false;
  }

  if (extname(pathname)) {
    return false;
  }

  const accept = request.headers.accept;

  if (!accept) {
    return true;
  }

  return accept.includes("text/html") || accept.includes("application/xhtml+xml");
}

export function parseTrustedProxyIps(value: string | undefined): string[] {
  if (!value || value.trim().length === 0) {
    return [];
  }

  return Array.from(new Set(value.split(",").map((entry) => entry.trim()))).map(
    (entry) => {
      if (isIP(entry) === 0) {
        throw new Error(`TRUST_PROXY_IPS contains an invalid IP address: ${entry}`);
      }
      return entry;
    }
  );
}

export function createFastifyOptions(): FastifyServerOptions {
  const trustedProxyIps = parseTrustedProxyIps(config.trustProxyIps);
  return {
    disableRequestLogging: true,
    logger: createLoggerOptions(),
    trustProxy: trustedProxyIps.length > 0 ? trustedProxyIps : false
  };
}

export async function buildApp() {
  const app = Fastify(createFastifyOptions());
  const trustedManagementOrigins = parseManagementTrustedOrigins(config.managementTrustedOrigins);
  const managementCorsOrigin = createManagementCorsOriginDelegate(trustedManagementOrigins);
  const managementCorsOptions = createManagementCorsOptionsDelegate(trustedManagementOrigins);
  const managementCorsRequestGate = createManagementCorsRequestGate(trustedManagementOrigins);
  const managementAccess = createManagementAccessControl({
    managementAccessToken: config.managementAccessToken,
    trustedOrigins: trustedManagementOrigins
  });
  let mqttClientService: MqttClientService | null = null;
  const socketService = new SocketService({
    allowRequest: managementCorsRequestGate,
    classifySession: managementAccess.classifySocketSession,
    corsOrigin: managementCorsOrigin,
    getLiveMetricsSnapshot: () => readAuthoritativeLiveMetricsSnapshot(),
    getMqttStatus: () =>
      mqttClientService?.getStatus() ?? {
        broker: "",
        clientId: "",
        connected: false,
        reason: "offline",
        updatedAt: new Date().toISOString()
      } satisfies MqttStatus,
    logger: app.log,
    recordDeviceProfileRolloutHeartbeat,
    server: app.server
  });
  mqttClientService = new MqttClientService({
    logger: app.log,
    socketService
  });

  const weatherService = getWeatherService();
  weatherService.setLogger(app.log);
  weatherService.setMqttPublisher((topic, payload) => {
    mqttClientService?.publish(topic, payload);
  });

  app.decorate("managementAccess", managementAccess);
  app.decorate("mqttClientService", mqttClientService);
  app.decorate("socketService", socketService);

  await app.register(cors, {
    delegator: managementCorsOptions
  });

  await managementAuthPlugin(app, {
    accessControl: managementAccess,
    managementAccessToken: config.managementAccessToken,
    trustedOrigins: trustedManagementOrigins
  });
  await deviceContextPlugin(app);

  if (existsSync(config.openapiPath)) {
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
  }

  await app.register(healthRoute);
  await app.register(metricsRoute);
  await app.register(metricsHistoryRoute);
  await app.register(playbackRoute);
  await app.register(playbackProfilesRoute);
  await app.register(imagesRoute);
  await app.register(brandRoute);
  await app.register(calculationSettingsRoute);
  await app.register(circuitsRoute);
  await app.register(dataSourceRoute);
  await app.register(deviceRoute);
  await app.register(deviceGroupsRoute);
  await app.register(devicesRoute);
  await app.register(devicePairingRoute);
  await app.register(deviceDisplayOpsRoute);
  await app.register(displayOpsRoute);
  await app.register(displayCardDataRoute);
  await app.register(displayPageRegistryRoute);
  await app.register(displayPagesRoute);
  await app.register(displayReadinessRoute);
  await app.register(displayStoryRoute);
  await app.register(imagePlaylistRoute);
  await app.register(freshnessPolicyRoute);
  await app.register(settingsMqttRoute);
  await app.register(shellDecorationsRoute);
  await app.register(sustainabilityStoryRoute);
  await app.register(weatherRoute);

  mkdirSync(config.uploadsDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: config.uploadsDir,
    prefix: "/uploads/images/",
    decorateReply: false,
    index: false
  });

  mkdirSync(config.brandUploadsDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: config.brandUploadsDir,
    prefix: "/uploads/brand/",
    decorateReply: false,
    index: false
  });

  // Serve frontend static files
  const serverDir = dirname(fileURLToPath(import.meta.url));
  const webDist = process.env.WEB_DIST_DIR ?? join(serverDir, "../../web/dist");
  await app.register(fastifyStatic, {
    root: webDist,
    prefix: "/"
  });

  // SPA fallback: serve index.html for non-API, non-file routes
  app.setNotFoundHandler((request, reply) => {
    if (!shouldServeSpaFallback(request)) {
      reply.status(404).send({
        success: false,
        error: `Route ${request.method} ${request.url} not found`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    reply.sendFile("index.html");
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
