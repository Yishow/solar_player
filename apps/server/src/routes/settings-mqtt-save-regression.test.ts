import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-mqtt-save-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.MQTT_BROKER = "192.168.31.62";
process.env.MQTT_PORT = "1883";
process.env.MQTT_CLIENT_ID = "solar-display";
process.env.MQTT_DATA_MODE = "mock";

const [{ buildApp }, { migrateDatabase }, { seedDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
]);

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.MQTT_BROKER;
  delete process.env.MQTT_PORT;
  delete process.env.MQTT_CLIENT_ID;
  delete process.env.MQTT_DATA_MODE;
});

test("PUT /api/settings/mqtt can switch from mock env bootstrap to mqtt runtime mode", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();
  app.mqttClientService.connect = async () => undefined;

  try {
    const response = await app.inject({
      method: "PUT",
      url: "/api/settings/mqtt",
      payload: {
        clientId: "solar-display",
        dataMode: "mqtt",
        host: "192.168.31.62",
        messageTimeout: 30,
        password: "",
        port: 1883,
        reconnectInterval: 5000,
        username: ""
      }
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      settings: { dataMode: string };
      status: { reason: string | null };
    };

    assert.equal(body.settings.dataMode, "mqtt");
    assert.notEqual(body.status.reason, "mock");
  } finally {
    await app.close();
  }
});
