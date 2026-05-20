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
  delete process.env.MANAGEMENT_TRUSTED_ORIGINS;
  delete process.env.MANAGEMENT_ACCESS_TOKEN;
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

test("GET /api/settings/mqtt denies untrusted readers while runtime mqtt bootstrap remains public-safe", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const [settingsResponse, runtimeResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/settings/mqtt",
        headers: {
          host: "player.example",
          origin: "https://evil.example"
        }
      }),
      app.inject({
        method: "GET",
        url: "/api/runtime/mqtt-status",
        headers: {
          host: "player.example",
          origin: "https://evil.example"
        }
      })
    ]);

    assert.equal(settingsResponse.statusCode, 403);
    assert.equal(settingsResponse.json<{ access: string }>().access, "denied");

    assert.equal(runtimeResponse.statusCode, 200);
    const runtimeBody = runtimeResponse.json() as {
      status: {
        connected: boolean;
      };
    };
    assert.equal(typeof runtimeBody.status.connected, "boolean");
  } finally {
    await app.close();
  }
});

test("GET /api/settings/mqtt/topics exposes broker status alongside topic and readiness snapshots", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/settings/mqtt/topics"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      readiness: { generatedAt: string };
      status: { connected: boolean };
      topics: unknown[];
    };

    assert.equal(Array.isArray(body.topics), true);
    assert.equal(typeof body.status.connected, "boolean");
    assert.equal(typeof body.readiness.generatedAt, "string");
  } finally {
    await app.close();
  }
});

test("OPTIONS /api/settings/mqtt preflight allows PUT for cross-origin dev saves", async () => {
  migrateDatabase();
  seedDatabase();
  process.env.MANAGEMENT_TRUSTED_ORIGINS = "http://127.0.0.1:5177";

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/settings/mqtt",
      headers: {
        origin: "http://127.0.0.1:5177",
        "access-control-request-method": "PUT"
      }
    });

    assert.equal(response.statusCode, 204);
    assert.match(response.headers["access-control-allow-methods"] ?? "", /\bPUT\b/);
    assert.equal(response.headers["access-control-allow-origin"], "http://127.0.0.1:5177");
  } finally {
    await app.close();
  }
});

test("OPTIONS /api/settings/mqtt preflight rejects unknown origins by default", async () => {
  migrateDatabase();
  seedDatabase();
  delete process.env.MANAGEMENT_TRUSTED_ORIGINS;

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/settings/mqtt",
      headers: {
        origin: "https://evil.example",
        "access-control-request-method": "PUT"
      }
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.headers["access-control-allow-origin"], undefined);
  } finally {
    await app.close();
  }
});

test("PUT /api/settings/mqtt rejects untrusted origins and leaves persisted settings unchanged", async () => {
  migrateDatabase();
  seedDatabase();
  delete process.env.MANAGEMENT_TRUSTED_ORIGINS;

  const app = await buildApp();

  try {
    const before = getDatabase()
      .prepare("SELECT broker_host, broker_port FROM mqtt_settings LIMIT 1")
      .get() as { broker_host: string; broker_port: number };

    const response = await app.inject({
      method: "PUT",
      url: "/api/settings/mqtt",
      headers: {
        origin: "https://evil.example"
      },
      payload: {
        host: "evil-broker",
        port: 2883
      }
    });

    assert.equal(response.statusCode, 403);

    const afterRow = getDatabase()
      .prepare("SELECT broker_host, broker_port FROM mqtt_settings LIMIT 1")
      .get() as { broker_host: string; broker_port: number };

    assert.deepEqual(afterRow, before);
  } finally {
    await app.close();
  }
});

test("PUT /api/settings/mqtt allows trusted local operator origins", async () => {
  migrateDatabase();
  seedDatabase();
  process.env.MANAGEMENT_TRUSTED_ORIGINS = "http://127.0.0.1:5177";

  const app = await buildApp();

  try {
    app.mqttClientService.connect = async () => undefined;

    const response = await app.inject({
      method: "PUT",
      url: "/api/settings/mqtt",
      headers: {
        origin: "http://127.0.0.1:5177"
      },
      payload: {
        host: "trusted-broker",
        port: 2883
      }
    });

    assert.equal(response.statusCode, 200);

    const row = getDatabase()
      .prepare("SELECT broker_host, broker_port FROM mqtt_settings LIMIT 1")
      .get() as { broker_host: string; broker_port: number };

    assert.equal(row.broker_host, "trusted-broker");
    assert.equal(row.broker_port, 2883);
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

test("GET /api/metrics/history, /daily-summary, and /cumulative expose persisted history records", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database.prepare("DELETE FROM cumulative_counters").run();

  database
    .prepare(
      `
        INSERT INTO metric_snapshots (
          generation,
          consumption,
          self_consumption,
          co2,
          ratio,
          efficiency,
          captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(120.5, 90.1, 66.2, 59.5, 54.94, 97.3, "2026-05-13T09:00:00.000Z");
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      "2026-05-13",
      120.5,
      90.1,
      66.2,
      59.5,
      612.4,
      "2026-05-13T11:20:00.000Z",
      488.9,
      "2026-05-13T15:10:00.000Z"
    );
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES
          ('generation', 120.5, '2026-05-13T09:00:00.000Z', 0),
          ('consumption', 90.1, '2026-05-13T09:00:00.000Z', 0),
          ('selfConsumption', 66.2, '2026-05-13T09:00:00.000Z', 0),
          ('co2', 59.5, '2026-05-13T09:00:00.000Z', 0)
      `
    )
    .run();

  const app = await buildApp();

  try {
    const [historyResponse, dailySummaryResponse, cumulativeResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/metrics/history?range=total"
      }),
      app.inject({
        method: "GET",
        url: "/api/metrics/daily-summary"
      }),
      app.inject({
        method: "GET",
        url: "/api/metrics/cumulative"
      })
    ]);

    assert.equal(historyResponse.statusCode, 200);
    assert.equal(dailySummaryResponse.statusCode, 200);
    assert.equal(cumulativeResponse.statusCode, 200);

    const historyBody = historyResponse.json() as {
      range: string;
      snapshots: Array<{
        capturedAt: string;
        co2: number;
        consumption: number;
        efficiency: number;
        generation: number;
        ratio: number;
        selfConsumption: number;
      }>;
    };
    const dailySummaryBody = dailySummaryResponse.json() as {
      summaries: Array<{
        co2Total: number;
        consumptionTotal: number;
        date: string;
        generationTotal: number;
        peakConsumption: number;
        peakConsumptionTime: string;
        peakGeneration: number;
        peakGenerationTime: string;
        selfConsumptionTotal: number;
      }>;
    };
    const cumulativeBody = cumulativeResponse.json() as {
      counters: Array<{
        lastUpdated: string;
        metricKey: string;
        resetCount: number;
        totalValue: number;
      }>;
    };

    assert.equal(historyBody.range, "total");
    assert.deepEqual(historyBody.snapshots, [
      {
        capturedAt: "2026-05-13T09:00:00.000Z",
        co2: 59.5,
        consumption: 90.1,
        efficiency: 97.3,
        generation: 120.5,
        ratio: 54.94,
        selfConsumption: 66.2
      }
    ]);
    assert.deepEqual(dailySummaryBody.summaries, [
      {
        co2Total: 59.5,
        consumptionTotal: 90.1,
        date: "2026-05-13",
        generationTotal: 120.5,
        peakConsumption: 488.9,
        peakConsumptionTime: "2026-05-13T15:10:00.000Z",
        peakGeneration: 612.4,
        peakGenerationTime: "2026-05-13T11:20:00.000Z",
        selfConsumptionTotal: 66.2
      }
    ]);
    assert.deepEqual(cumulativeBody.counters, [
      {
        lastUpdated: "2026-05-13T09:00:00.000Z",
        metricKey: "co2",
        resetCount: 0,
        totalValue: 59.5
      },
      {
        lastUpdated: "2026-05-13T09:00:00.000Z",
        metricKey: "consumption",
        resetCount: 0,
        totalValue: 90.1
      },
      {
        lastUpdated: "2026-05-13T09:00:00.000Z",
        metricKey: "generation",
        resetCount: 0,
        totalValue: 120.5
      },
      {
        lastUpdated: "2026-05-13T09:00:00.000Z",
        metricKey: "selfConsumption",
        resetCount: 0,
        totalValue: 66.2
      }
    ]);
  } finally {
    await app.close();
  }
});

test("SocketService emits playback-safe snapshots to all sessions and keeps diagnostic events management-only", async () => {
  const emittedEvents: Array<{ event: string; payload: unknown }> = [];
  const clientEvents = new Map<string, Array<{ event: string; payload: unknown }>>();
  const socketsByRoom = new Map<string, Set<string>>();
  const connectionHandlers: Array<
    (socket: {
      emit: (event: string, payload: unknown) => void;
      handshake?: {
        address?: string;
        auth?: Record<string, unknown>;
        headers: Record<string, string>;
      };
      id?: string;
      join?: (room: string) => void;
    }) => void
  > = [];

  const fakeIo = {
    close(callback?: () => void) {
      callback?.();
    },
    emit(event: string, payload: unknown) {
      emittedEvents.push({ event, payload });
      for (const events of clientEvents.values()) {
        events.push({ event, payload });
      }
      return true;
    },
    on(
      event: "connection",
      listener: (socket: {
        emit: (event: string, payload: unknown) => void;
        handshake?: {
          address?: string;
          auth?: Record<string, unknown>;
          headers: Record<string, string>;
        };
        id?: string;
        join?: (room: string) => void;
      }) => void
    ) {
      if (event === "connection") {
        connectionHandlers.push(listener);
      }
    },
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          emittedEvents.push({ event: `${room}:${event}`, payload });
          for (const socketId of socketsByRoom.get(room) ?? []) {
            clientEvents.get(socketId)?.push({ event, payload });
          }
          return true;
        }
      };
    }
  };

  const { SocketService } = await import("../realtime/SocketService.js");

  const service = new SocketService({
    classifySession: (handshake) =>
      handshake.auth?.sessionClass === "management-trusted" ? "management-trusted" : "playback-safe",
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

  const connectSocket = (socketId: string, sessionClass: "management-trusted" | "playback-safe") => {
    const connectionHandler = connectionHandlers[0];
    if (!connectionHandler) {
      assert.fail("expected SocketService to register a connection handler");
    }

    const events: Array<{ event: string; payload: unknown }> = [];
    clientEvents.set(socketId, events);

    connectionHandler({
      emit: (event: string, payload: unknown) => {
        events.push({ event, payload });
      },
      handshake: {
        address: "127.0.0.1",
        auth: {
          sessionClass
        },
        headers: {
          origin: "http://127.0.0.1:5177"
        }
      },
      id: socketId,
      join: (room: string) => {
        const roomSockets = socketsByRoom.get(room) ?? new Set<string>();
        roomSockets.add(socketId);
        socketsByRoom.set(room, roomSockets);
      }
    });

    return events;
  };

  const playbackEvents = connectSocket("playback-1", "playback-safe");
  const managementEvents = connectSocket("management-1", "management-trusted");

  service.emitSystemError({
    message: "Broker offline",
    timestamp: "2026-05-13T09:06:00.000Z"
  });
  service.emitSystemRecovered({
    message: "Broker recovered",
    timestamp: "2026-05-13T09:07:00.000Z"
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
    playbackEvents.map(({ event }) => event),
    ["mqtt:status", "liveMetrics:update", "mqtt:status", "liveMetrics:update"]
  );
  assert.deepEqual(
    managementEvents.map(({ event }) => event),
    [
      "mqtt:status",
      "liveMetrics:update",
      "system:error",
      "system:recovered",
      "mqtt:status",
      "liveMetrics:update"
    ]
  );
  assert.deepEqual(
    emittedEvents.map(({ event }) => event),
    [
      "management-trusted:system:error",
      "management-trusted:system:recovered",
      "mqtt:status",
      "liveMetrics:update"
    ]
  );
});
