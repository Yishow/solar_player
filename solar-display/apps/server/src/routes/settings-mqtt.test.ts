import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-mqtt-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ buildApp }, { migrateDatabase }, { seedDatabase }, { getDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js")
]);

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

test("GET /api/settings/mqtt masks password and exposes status", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/settings/mqtt"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      settings: { password: string };
      status: { connected: boolean };
    };

    assert.equal(body.settings.password, "****");
    assert.equal(typeof body.status.connected, "boolean");
  } finally {
    await app.close();
  }
});

test("GET /api/metrics/live returns the latest live metrics snapshot", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("realTimePower", 586.2, "kW", "2026-05-13T09:00:00.000Z", "good", '{"value":586.2}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("todayGeneration", 2340, "kWh", "2026-05-13T09:05:00.000Z", "good", '{"value":2340}');

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/metrics/live"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      metrics: Record<
        string,
        {
          quality: string | null;
          timestamp: string;
          unit: string | null;
          value: number;
        }
      >;
      timestamp: string | null;
    };

    assert.equal(body.timestamp, "2026-05-13T09:05:00.000Z");
    assert.deepEqual(body.metrics.realTimePower, {
      quality: "good",
      timestamp: "2026-05-13T09:00:00.000Z",
      unit: "kW",
      value: 586.2
    });
    assert.deepEqual(body.metrics.todayGeneration, {
      quality: "good",
      timestamp: "2026-05-13T09:05:00.000Z",
      unit: "kWh",
      value: 2340
    });
  } finally {
    await app.close();
  }
});

test("SocketService emits initial snapshots and broadcasts update events", async () => {
  const emittedEvents: Array<{ event: string; payload: unknown }> = [];
  const clientEvents: Array<{ event: string; payload: unknown }> = [];
  const connectionHandlers: Array<
    (socket: { emit: (event: string, payload: unknown) => void }) => void
  > = [];

  const fakeIo = {
    close(callback?: () => void) {
      callback?.();
    },
    emit(event: string, payload: unknown) {
      emittedEvents.push({ event, payload });
      return true;
    },
    on(
      event: "connection",
      listener: (socket: { emit: (event: string, payload: unknown) => void }) => void
    ) {
      if (event === "connection") {
        connectionHandlers.push(listener);
      }
    }
  };

  const { SocketService } = await import("../realtime/SocketService.js");

  const service = new SocketService({
    getLiveMetricsSnapshot: () => ({
      metrics: {
        realTimePower: {
          quality: "good",
          timestamp: "2026-05-13T09:00:00.000Z",
          unit: "kW",
          value: 586.2
        }
      },
      timestamp: "2026-05-13T09:00:00.000Z"
    }),
    getMqttStatus: () => ({
      broker: "localhost:1883",
      clientId: "solar-display-player",
      connected: false,
      reason: "offline",
        updatedAt: "2026-05-13T09:00:00.000Z"
      }),
    io: fakeIo,
    logger: {
      error: () => undefined,
      info: () => undefined,
      warn: () => undefined
    }
  });

  const connectionHandler = connectionHandlers[0];
  if (!connectionHandler) {
    assert.fail("expected SocketService to register a connection handler");
  }

  connectionHandler({
    emit: (event: string, payload: unknown) => {
      clientEvents.push({ event, payload });
    }
  });

  service.emitMqttStatus({
    broker: "localhost:1883",
    clientId: "solar-display-player",
    connected: true,
    reason: null,
    updatedAt: "2026-05-13T09:06:00.000Z"
  });

  service.emitLiveMetrics({
    metrics: {
      todayGeneration: {
        quality: "good",
        timestamp: "2026-05-13T09:06:00.000Z",
        unit: "kWh",
        value: 2340
      }
    },
    timestamp: "2026-05-13T09:06:00.000Z"
  });

  assert.deepEqual(
    clientEvents.map(({ event }) => event),
    ["mqtt:status", "liveMetrics:update"]
  );
  assert.deepEqual(
    emittedEvents.map(({ event }) => event),
    ["mqtt:status", "liveMetrics:update"]
  );
});
