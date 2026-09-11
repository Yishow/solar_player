import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import type { PlaybackPage, PlaybackSettings } from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-runtime-input-boundaries-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [
  { buildApp },
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase }
] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(process.env.DATABASE_PATH!, { force: true });
  rmSync(`${process.env.DATABASE_PATH!}-shm`, { force: true });
  rmSync(`${process.env.DATABASE_PATH!}-wal`, { force: true });
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("playback page duration-only patch preserves omitted enabled and display order fields", async () => {
  const app = await buildApp();

  try {
    const initialResponse = await app.inject({ method: "GET", url: "/api/playback/pages" });
    assert.equal(initialResponse.statusCode, 200);
    const initialPages = (initialResponse.json() as { pages: PlaybackPage[] }).pages;
    const target = initialPages[0];
    assert.ok(target);

    const seedResponse = await app.inject({
      method: "PUT",
      url: "/api/playback/pages",
      payload: {
        pages: [{
          displayOrder: target.displayOrder,
          durationSeconds: target.durationSeconds,
          enabled: false,
          id: target.id
        }]
      }
    });
    assert.equal(seedResponse.statusCode, 200);

    const response = await app.inject({
      method: "PUT",
      url: "/api/playback/pages",
      payload: {
        pages: [{ id: target.id, durationSeconds: 30 }]
      }
    });

    assert.equal(response.statusCode, 200);
    const updated = (response.json() as { pages: PlaybackPage[] }).pages.find(
      (page) => page.id === target.id
    );
    assert.equal(updated?.durationSeconds, 30);
    assert.equal(updated?.enabled, false);
    assert.equal(updated?.displayOrder, target.displayOrder);
  } finally {
    await app.close();
  }
});

test("playback settings reject malformed runtime values before persistence or socket events", async () => {
  const app = await buildApp();
  const playbackEvents: unknown[] = [];
  const syncEvents: unknown[] = [];
  const originalPlaybackEmit = app.socketService.emitPlaybackSettingsUpdated.bind(app.socketService);
  const originalSyncEmit = app.socketService.emitDisplaySync.bind(app.socketService);
  app.socketService.emitPlaybackSettingsUpdated = (payload: unknown) => {
    playbackEvents.push(payload);
    originalPlaybackEmit(payload);
  };
  app.socketService.emitDisplaySync = (payload) => {
    syncEvents.push(payload);
    originalSyncEmit(payload);
  };

  try {
    const initial = await app.inject({ method: "GET", url: "/api/playback/settings" });
    const before = (initial.json() as { settings: PlaybackSettings }).settings;

    const invalidBodies: unknown[] = [
      { autoplay: "false" },
      { brightness: 101 },
      { idleTimeout: 0 },
      { repeatDays: [1, 1] },
      { repeatDays: [7] },
      { scheduleEnabled: true, scheduleStart: null, scheduleEnd: "18:00" },
      { scheduleStart: "8:00" },
      { startPage: 999_999 }
    ];

    for (const payload of invalidBodies) {
      const response = await app.inject({
        method: "PUT",
        url: "/api/playback/settings",
        payload
      });
      assert.equal(response.statusCode, 400, JSON.stringify(payload));
    }

    const afterResponse = await app.inject({ method: "GET", url: "/api/playback/settings" });
    const after = (afterResponse.json() as { settings: PlaybackSettings }).settings;
    assert.deepEqual(
      { ...after, updatedAt: null },
      { ...before, updatedAt: null }
    );
    assert.equal(playbackEvents.length, 0);
    assert.equal(syncEvents.length, 0);
  } finally {
    app.socketService.emitPlaybackSettingsUpdated = originalPlaybackEmit;
    app.socketService.emitDisplaySync = originalSyncEmit;
    await app.close();
  }
});

test("MQTT partial updates preserve mock mode and invalid values never persist or reconnect", async () => {
  const app = await buildApp();
  let connectCalls = 0;
  app.mqttClientService.connect = async () => {
    connectCalls += 1;
  };

  try {
    const seedResponse = await app.inject({
      method: "PUT",
      url: "/api/settings/mqtt",
      payload: {
        clientId: "solar-display-player",
        dataMode: "mock",
        host: "localhost",
        messageTimeout: 30,
        password: "",
        port: 1883,
        reconnectInterval: 0,
        username: ""
      }
    });
    assert.equal(seedResponse.statusCode, 200);
    connectCalls = 0;

    const partialResponse = await app.inject({
      method: "PUT",
      url: "/api/settings/mqtt",
      payload: { host: "broker.internal" }
    });
    assert.equal(partialResponse.statusCode, 200);
    const partialBody = partialResponse.json() as {
      settings: { dataMode: string; host: string; reconnectInterval: number };
    };
    assert.equal(partialBody.settings.dataMode, "mock");
    assert.equal(partialBody.settings.host, "broker.internal");
    assert.equal(partialBody.settings.reconnectInterval, 0);
    assert.equal(connectCalls, 1);

    const readStored = () => getDatabase()
      .prepare(`
        SELECT broker_host, broker_port, client_id, data_mode, message_timeout, reconnect_interval, username, password
        FROM mqtt_settings
        LIMIT 1
      `)
      .get();

    const invalidBodies: unknown[] = [
      { dataMode: "invalid" },
      { host: "   " },
      { clientId: "" },
      { port: "1883abc" },
      { port: 0 },
      { port: 65_536 },
      { port: 1883.5 },
      { messageTimeout: 0 },
      { reconnectInterval: -1 }
    ];

    for (const payload of invalidBodies) {
      const before = readStored();
      connectCalls = 0;
      const response = await app.inject({
        method: "PUT",
        url: "/api/settings/mqtt",
        payload
      });
      assert.equal(response.statusCode, 400, JSON.stringify(payload));
      assert.deepEqual(readStored(), before, JSON.stringify(payload));
      assert.equal(connectCalls, 0, JSON.stringify(payload));
    }

    let testConnectionCalls = 0;
    const originalTestConnection = app.mqttClientService.testConnection.bind(app.mqttClientService);
    app.mqttClientService.testConnection = async () => {
      testConnectionCalls += 1;
      throw new Error("invalid MQTT probe must not reach testConnection");
    };
    const probeResponse = await app.inject({
      method: "POST",
      url: "/api/settings/mqtt/test",
      payload: { port: "1883abc" }
    });
    assert.equal(probeResponse.statusCode, 400);
    assert.equal(testConnectionCalls, 0);
    app.mqttClientService.testConnection = originalTestConnection;
  } finally {
    await app.close();
  }
});
