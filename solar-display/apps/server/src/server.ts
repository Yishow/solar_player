import { config as loadDotenv } from "dotenv";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { migrateDatabase } from "./db/migrate.js";
import { seedDatabase } from "./db/seed.js";
import { resolveEnvFilePath } from "./env.js";
import { DailySummaryService } from "./services/DailySummaryService.js";
import { MetricsAccumulatorService } from "./services/MetricsAccumulatorService.js";
import { SnapshotWriterService } from "./services/SnapshotWriterService.js";

loadDotenv({
  path: resolveEnvFilePath(import.meta.url)
});

async function startServer() {
  const app = await buildApp();

  try {
    migrateDatabase();
    seedDatabase();

    const metricsAccumulatorService = new MetricsAccumulatorService();
    metricsAccumulatorService.initialize();
    metricsAccumulatorService.start();

    const snapshotWriterService = new SnapshotWriterService({
      metricsAccumulatorService
    });
    snapshotWriterService.start();

    const dailySummaryService = new DailySummaryService({
      metricsAccumulatorService
    });
    dailySummaryService.start();

    app.addHook("onClose", async () => {
      dailySummaryService.stop();
      snapshotWriterService.stop();
      metricsAccumulatorService.stop();
    });

    try {
      await app.mqttClientService.connect();
    } catch (error) {
      app.log.warn({ error }, "MQTT initial connect failed");
    }

    await app.listen({
      host: config.host,
      port: config.port
    });
  } catch (error) {
    app.log.error(error);
    await app.close();
    process.exit(1);
  }
}

void startServer();
