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

test("POST factory generation baseline reset requires trusted access and exact current confirmation", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM cumulative_counters WHERE metric_key = 'generation'").run();
  database.prepare(`
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('totalGeneration', 2000, 'MWh', CURRENT_TIMESTAMP, 'good', '{}')
  `).run();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
    VALUES ('generation', 2000000, CURRENT_TIMESTAMP, 0)
  `).run();
  const sourceTimestamp = new Date().toISOString();
  const insertSource = database.prepare(`
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, 'MWh', ?, 'good', ?)
  `);
  for (const [factory, values] of [
    ["cl", { month: 20, today: 2, total: 800 }],
    ["kn", { month: 10, today: 1, total: 300 }]
  ] as const) {
    const rawPayload = JSON.stringify({
      month_mwh: values.month,
      timestamp: sourceTimestamp,
      today_mwh: values.today,
      total_mwh: values.total
    });
    insertSource.run(`factoryGeneration.${factory}.todayMwh`, values.today, sourceTimestamp, rawPayload);
    insertSource.run(`factoryGeneration.${factory}.monthMwh`, values.month, sourceTimestamp, rawPayload);
    insertSource.run(`factoryGeneration.${factory}.totalMwh`, values.total, sourceTimestamp, rawPayload);
  }

  const app = await buildApp();
  try {
    const denied = await app.inject({
      headers: {
        host: "player.example",
        origin: "https://evil.example"
      },
      method: "POST",
      payload: { expectedTotalMwh: 1100 },
      url: "/api/settings/mqtt/factory-generation/reset-baseline"
    });
    assert.equal(denied.statusCode, 403);
    assert.equal(
      database.prepare("SELECT value FROM live_metric_values WHERE metric_key = 'totalGeneration'").pluck().get(),
      2000
    );

    const mismatch = await app.inject({
      method: "POST",
      payload: { expectedTotalMwh: 1099 },
      url: "/api/settings/mqtt/factory-generation/reset-baseline"
    });
    assert.equal(mismatch.statusCode, 409);
    assert.equal(mismatch.json<{ reason: string }>().reason, "confirmation-mismatch");
    assert.equal(
      database.prepare("SELECT value FROM live_metric_values WHERE metric_key = 'totalGeneration'").pluck().get(),
      2000
    );

    const accepted = await app.inject({
      method: "POST",
      payload: { expectedTotalMwh: 1100 },
      url: "/api/settings/mqtt/factory-generation/reset-baseline"
    });
    assert.equal(accepted.statusCode, 200);
    assert.deepEqual(accepted.json(), {
      reset: {
        acceptedTotalMwh: 1100,
        previousTotalMwh: 2000,
        updatedAt: sourceTimestamp
      },
      success: true
    });
  } finally {
    database.prepare("DELETE FROM live_metric_values").run();
    database.prepare("DELETE FROM cumulative_counters WHERE metric_key = 'generation'").run();
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

test("GET /api/settings/mqtt/topics exposes custom display names per mapping", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database
    .prepare("UPDATE topic_mappings SET name_zh = ?, name_en = ? WHERE metric_key = ?")
    .run("即時輸出", "Live Output", "realTimePower");

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/settings/mqtt/topics"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      topics: Array<{ metricKey: string; nameZh: string | null; nameEn: string | null }>;
    };

    const named = body.topics.find((topic) => topic.metricKey === "realTimePower");
    assert.equal(named?.nameZh, "即時輸出");
    assert.equal(named?.nameEn, "Live Output");

    const unnamed = body.topics.find((topic) => topic.nameZh === null);
    assert.equal(unnamed?.nameEn, null);
  } finally {
    await app.close();
  }
});

test("GET /api/settings/mqtt/topics exposes multiplier for topic mappings", async () => {
  migrateDatabase();
  seedDatabase();

  getDatabase()
    .prepare("UPDATE topic_mappings SET multiplier = ? WHERE metric_key = ?")
    .run(1.2, "realTimePower");

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/settings/mqtt/topics"
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      topics: Array<{ metricKey: string; multiplier: number }>;
    };
    const topic = body.topics.find((entry) => entry.metricKey === "realTimePower");
    assert.equal(topic?.multiplier, 1.2);
  } finally {
    await app.close();
  }
});

test("PUT /api/settings/mqtt/topics persists custom names and preserves them when omitted", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    app.mqttClientService.subscribe = async () => undefined;

    const writeResponse = await app.inject({
      method: "PUT",
      url: "/api/settings/mqtt/topics",
      payload: {
        topics: [
          {
            metricKey: "realTimePower",
            topic: "solar/power/realtime",
            nameZh: "一號廠輸出",
            nameEn: "Plant A Output"
          },
          {
            metricKey: "todayGeneration",
            topic: "solar/energy/today"
          }
        ]
      }
    });

    assert.equal(writeResponse.statusCode, 200);

    const stored = getDatabase()
      .prepare("SELECT name_zh, name_en FROM topic_mappings WHERE metric_key = ?")
      .get("realTimePower") as { name_zh: string | null; name_en: string | null };
    assert.equal(stored.name_zh, "一號廠輸出");
    assert.equal(stored.name_en, "Plant A Output");

    // Re-save without name fields: existing names must be preserved.
    const preserveResponse = await app.inject({
      method: "PUT",
      url: "/api/settings/mqtt/topics",
      payload: {
        topics: [
          {
            metricKey: "realTimePower",
            topic: "solar/power/realtime"
          }
        ]
      }
    });

    assert.equal(preserveResponse.statusCode, 200);

    const preserved = getDatabase()
      .prepare("SELECT name_zh, name_en FROM topic_mappings WHERE metric_key = ?")
      .get("realTimePower") as { name_zh: string | null; name_en: string | null };
    assert.equal(preserved.name_zh, "一號廠輸出");
    assert.equal(preserved.name_en, "Plant A Output");
  } finally {
    await app.close();
  }
});

test("PUT /api/settings/mqtt/topics stores multiplier from mapping payload", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    app.mqttClientService.subscribe = async () => undefined;

    const response = await app.inject({
      method: "PUT",
      url: "/api/settings/mqtt/topics",
      payload: {
        topics: [
          {
            metricKey: "factoryPeakMultiplier",
            multiplier: 1.2,
            topic: "factory/peak_multiplier",
            unit: "x",
            valuePath: "$.value"
          }
        ]
      }
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      topics: Array<{ metricKey: string; multiplier: number }>;
    };
    const topic = body.topics.find((entry) => entry.metricKey === "factoryPeakMultiplier");
    const stored = getDatabase()
      .prepare("SELECT multiplier FROM topic_mappings WHERE metric_key = ?")
      .get("factoryPeakMultiplier") as { multiplier: number };
    assert.equal(topic?.multiplier, 1.2);
    assert.equal(stored.multiplier, 1.2);
  } finally {
    await app.close();
  }
});

test("PUT /api/settings/mqtt/topics canonicalizes units and updates existing live metric units", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();
  const timestamp = "2026-07-09T05:35:46.000Z";

  try {
    app.mqttClientService.subscribe = async () => undefined;
    getDatabase()
      .prepare(
        `
          INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
          VALUES ('todayGeneration', 2.72, 'kWh', ?, 'good', '{"value":2.72}')
        `
      )
      .run(timestamp);

    const response = await app.inject({
      method: "PUT",
      url: "/api/settings/mqtt/topics",
      payload: {
        topics: [
          {
            metricKey: "todayGeneration",
            topic: "kuozui/plant/solar/today_energy",
            unit: "mWh"
          }
        ]
      }
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      topics: Array<{ lastValue: number | null; metricKey: string; unit: string }>;
    };
    const topic = body.topics.find((entry) => entry.metricKey === "todayGeneration");
    assert.equal(topic?.unit, "MWh");
    assert.equal(topic?.lastValue, 2.72);

    const stored = getDatabase()
      .prepare(
        `
          SELECT topic_mappings.unit AS mapping_unit, live_metric_values.unit AS live_unit
          FROM topic_mappings
          LEFT JOIN live_metric_values ON live_metric_values.metric_key = topic_mappings.metric_key
          WHERE topic_mappings.metric_key = ?
        `
      )
      .get("todayGeneration") as { live_unit: string | null; mapping_unit: string | null };
    assert.equal(stored.mapping_unit, "MWh");
    assert.equal(stored.live_unit, "MWh");
  } finally {
    await app.close();
  }
});

test("PUT /api/settings/mqtt/topics clears a name when an empty string is sent", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  database
    .prepare("UPDATE topic_mappings SET name_zh = ?, name_en = ? WHERE metric_key = ?")
    .run("待清除", "To Clear", "realTimePower");

  const app = await buildApp();

  try {
    app.mqttClientService.subscribe = async () => undefined;

    const response = await app.inject({
      method: "PUT",
      url: "/api/settings/mqtt/topics",
      payload: {
        topics: [
          {
            metricKey: "realTimePower",
            topic: "solar/power/realtime",
            nameZh: "",
            nameEn: ""
          }
        ]
      }
    });

    assert.equal(response.statusCode, 200);

    const stored = getDatabase()
      .prepare("SELECT name_zh, name_en FROM topic_mappings WHERE metric_key = ?")
      .get("realTimePower") as { name_zh: string | null; name_en: string | null };
    assert.equal(stored.name_zh, null);
    assert.equal(stored.name_en, null);
  } finally {
    await app.close();
  }
});

test("POST /api/settings/mqtt/topics/:metricKey/publish sends numeric value to the mapped topic", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();
  const published: Array<{ payload: string; topic: string }> = [];

  try {
    app.mqttClientService.getStatus = () => ({
      broker: "localhost:1883",
      clientId: "solar-display-test",
      connected: true,
      reason: "connected",
      updatedAt: "2026-07-08T00:00:00.000Z"
    });
    app.mqttClientService.publish = (topic: string, payload: string) => {
      published.push({ payload, topic });
      return Promise.resolve({
        mode: "mqtt",
        payload,
        success: true,
        topic
      });
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/settings/mqtt/topics/selfConsumptionEnergy/publish",
      payload: { value: 1200 }
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      metricKey: string;
      payload: string;
      success: boolean;
      topic: string;
    };
    assert.equal(body.success, true);
    assert.equal(body.metricKey, "selfConsumptionEnergy");
    assert.equal(body.topic, "kuozui/plant/solar/self_consumption");
    assert.equal(body.payload, "{\"value\":1200}");
    assert.deepEqual(published, [
      {
        payload: "{\"value\":1200}",
        topic: "kuozui/plant/solar/self_consumption"
      }
    ]);
  } finally {
    await app.close();
  }
});

test("POST /api/settings/mqtt/topics/:metricKey/publish uses each factory summary mapping value path", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  const insertMapping = database.prepare(`
    INSERT INTO topic_mappings (
      metric_key, topic, unit, value_path, multiplier, offset, decimal_places, enabled, created_at, updated_at
    ) VALUES (?, 'solar/CL/summary', 'MWh', ?, 1, 0, 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  insertMapping.run("factoryGeneration.cl.todayMwh", "$.today_mwh");
  insertMapping.run("factoryGeneration.cl.monthMwh", "$.month_mwh");
  insertMapping.run("factoryGeneration.cl.totalMwh", "$.total_mwh");
  database.prepare(`
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES
      ('factoryGeneration.cl.todayMwh', 10, 'MWh', CURRENT_TIMESTAMP, 'good', '{}'),
      ('factoryGeneration.cl.monthMwh', 200, 'MWh', CURRENT_TIMESTAMP, 'good', '{}'),
      ('factoryGeneration.cl.totalMwh', 3000, 'MWh', CURRENT_TIMESTAMP, 'good', '{}')
  `).run();

  const app = await buildApp();
  const published: Array<{ payload: string; topic: string }> = [];

  try {
    app.mqttClientService.publish = (topic: string, payload: string) => {
      published.push({ payload, topic });
      return Promise.resolve({ mode: "mqtt", payload, success: true, topic });
    };

    for (const [metricKey, value] of [
      ["factoryGeneration.cl.todayMwh", 12.3],
      ["factoryGeneration.cl.monthMwh", 456.7],
      ["factoryGeneration.cl.totalMwh", 8901.2]
    ] as const) {
      const response = await app.inject({
        method: "POST",
        url: `/api/settings/mqtt/topics/${metricKey}/publish`,
        payload: { value }
      });
      assert.equal(response.statusCode, 200);
    }

    assert.deepEqual(published.map(({ payload, topic }) => ({
      payload: {
        ...(JSON.parse(payload) as Record<string, unknown>),
        timestamp: "test timestamp"
      },
      topic
    })), [
      { payload: { month_mwh: 200, timestamp: "test timestamp", today_mwh: 12.3, total_mwh: 3000 }, topic: "solar/CL/summary" },
      { payload: { month_mwh: 456.7, timestamp: "test timestamp", today_mwh: 10, total_mwh: 3000 }, topic: "solar/CL/summary" },
      { payload: { month_mwh: 200, timestamp: "test timestamp", today_mwh: 10, total_mwh: 8901.2 }, topic: "solar/CL/summary" }
    ]);
  } finally {
    await app.close();
  }
});

test("POST /api/settings/mqtt/topics/:metricKey/publish rejects invalid values without publishing", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();
  let publishCalls = 0;

  try {
    app.mqttClientService.publish = () => {
      publishCalls += 1;
      return Promise.resolve({
        mode: "mqtt",
        payload: "",
        success: true,
        topic: ""
      });
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/settings/mqtt/topics/selfConsumptionEnergy/publish",
      payload: { value: "1200" }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ success: boolean }>().success, false);
    assert.equal(publishCalls, 0);
  } finally {
    await app.close();
  }
});

test("POST /api/settings/mqtt/topics/:metricKey/publish rejects missing mappings without publishing", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();
  let publishCalls = 0;

  try {
    app.mqttClientService.publish = () => {
      publishCalls += 1;
      return Promise.resolve({
        mode: "mqtt",
        payload: "",
        success: true,
        topic: ""
      });
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/settings/mqtt/topics/notARealMetric/publish",
      payload: { value: 1200 }
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json<{ success: boolean }>().success, false);
    assert.equal(publishCalls, 0);
  } finally {
    await app.close();
  }
});

test("POST /api/settings/mqtt/topics/:metricKey/publish rejects disabled and empty topic mappings without publishing", async () => {
  migrateDatabase();
  seedDatabase();

  const database = getDatabase();
  const restore = database.prepare(
    "UPDATE topic_mappings SET topic = ?, enabled = ? WHERE metric_key = ?"
  );
  const app = await buildApp();
  let publishCalls = 0;

  try {
    app.mqttClientService.publish = () => {
      publishCalls += 1;
      return Promise.resolve({
        mode: "mqtt",
        payload: "",
        success: true,
        topic: ""
      });
    };

    database
      .prepare("UPDATE topic_mappings SET enabled = 0 WHERE metric_key = ?")
      .run("selfConsumptionEnergy");
    const disabledResponse = await app.inject({
      method: "POST",
      url: "/api/settings/mqtt/topics/selfConsumptionEnergy/publish",
      payload: { value: 1200 }
    });

    restore.run("kuozui/plant/solar/self_consumption", 1, "selfConsumptionEnergy");
    database.prepare("UPDATE topic_mappings SET topic = ? WHERE metric_key = ?").run("", "selfConsumptionEnergy");
    const emptyTopicResponse = await app.inject({
      method: "POST",
      url: "/api/settings/mqtt/topics/selfConsumptionEnergy/publish",
      payload: { value: 1200 }
    });

    assert.equal(disabledResponse.statusCode, 409);
    assert.equal(emptyTopicResponse.statusCode, 409);
    assert.equal(publishCalls, 0);
  } finally {
    restore.run("kuozui/plant/solar/self_consumption", 1, "selfConsumptionEnergy");
    await app.close();
  }
});

test("POST /api/settings/mqtt/topics/:metricKey/publish rejects disconnected publish results", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();
  let publishCalls = 0;

  try {
    app.mqttClientService.publish = (topic: string, payload: string) => {
      publishCalls += 1;
      return Promise.resolve({
        message: "Cannot publish, MQTT client not connected",
        payload,
        reason: "disconnected",
        success: false,
        topic
      });
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/settings/mqtt/topics/selfConsumptionEnergy/publish",
      payload: { value: 1200 }
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json<{ success: boolean }>().success, false);
    assert.equal(publishCalls, 1);
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

test("OPTIONS /api/settings/mqtt allows same-host cross-port preflight without an explicit trusted-origin entry", async () => {
  migrateDatabase();
  seedDatabase();
  delete process.env.MANAGEMENT_TRUSTED_ORIGINS;

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/settings/mqtt",
      headers: {
        host: "100.76.76.75:3000",
        origin: "http://100.76.76.75:4173",
        "access-control-request-method": "PUT"
      }
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["access-control-allow-origin"], "http://100.76.76.75:4173");
    assert.match(response.headers["access-control-allow-methods"] ?? "", /\bPUT\b/);
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

test("PUT /api/settings/mqtt persists trusted changes even when broker reconnect fails", async () => {
  migrateDatabase();
  seedDatabase();
  process.env.MANAGEMENT_TRUSTED_ORIGINS = "http://127.0.0.1:5177";

  const app = await buildApp();

  try {
    app.mqttClientService.connect = async () => {
      throw new Error("MQTT connection timeout");
    };

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
