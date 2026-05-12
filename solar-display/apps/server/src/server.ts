import { buildApp } from "./app.js";
import { config } from "./config.js";
import { migrateDatabase } from "./db/migrate.js";
import { seedDatabase } from "./db/seed.js";

async function startServer() {
  const app = await buildApp();

  try {
    migrateDatabase();
    seedDatabase();

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
