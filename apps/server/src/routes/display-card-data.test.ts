import assert from "node:assert/strict";
import test from "node:test";
import { updateDefaultPlaybackPageForTest } from "../testing/defaultPlaybackProfileTestSupport.js";
import {
  buildApp,
  getDatabase
} from "./display-pages-asset-governance.test-support.js";
import { createPairedDeviceTestContext } from "../testing/deviceContextTestSupport.js";
import { readDisplayCardData } from "../services/displayCardDataService.js";

function toLocalDateKey(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function seedFactoryGenerationSummary(
  database: ReturnType<typeof getDatabase>,
  factory: "cl" | "kn",
  summary: {
    monthMwh: number;
    timestamp: string;
    todayMwh: number;
    totalMwh: number;
  }
) {
  const rawPayload = JSON.stringify({
    month_mwh: summary.monthMwh,
    timestamp: summary.timestamp,
    today_mwh: summary.todayMwh,
    total_mwh: summary.totalMwh
  });
  const insertLiveMetric = database.prepare(
    `
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES (?, ?, ?, 'MWh', ?, 'good', ?)
    `
  );
  insertLiveMetric.run(factory, "factoryGeneration.todayMwh", summary.todayMwh, summary.timestamp, rawPayload);
  insertLiveMetric.run(factory, "factoryGeneration.monthMwh", summary.monthMwh, summary.timestamp, rawPayload);
  insertLiveMetric.run(factory, "factoryGeneration.totalMwh", summary.totalMwh, summary.timestamp, rawPayload);
}

function seedCardDataFixture() {
  const database = getDatabase();
  const today = toLocalDateKey(new Date());
  const timestamp = new Date().toISOString();
  database.prepare("DELETE FROM live_metric_values").run();
  database
    .prepare(
      `
        UPDATE calculation_settings
        SET carbon_emission_factor = 0.467,
            tree_equivalent_factor = 0.16,
            household_daily_usage_kwh = 13,
            household_monthly_usage_kwh = 400,
            estimated_tariff_per_kwh = 4.5,
            co2_auto_convert_small_to_kg = 0
        WHERE id = 1
      `
    )
    .run();
  database.prepare("UPDATE mqtt_settings SET message_timeout = 86400").run();
  updateDefaultPlaybackPageForTest(database, "factory-circuit", { enabled: true });
  updateDefaultPlaybackPageForTest(database, "factory-circuit-guanyin", { enabled: true });
  seedFactoryGenerationSummary(database, "cl", {
    monthMwh: 1000,
    timestamp,
    todayMwh: 100,
    totalMwh: 10000
  });
  seedFactoryGenerationSummary(database, "kn", {
    monthMwh: 860,
    timestamp,
    todayMwh: 86,
    totalMwh: 8600
  });
  database
    .prepare("UPDATE topic_mappings SET topic = ?, enabled = 1 WHERE metric_key = ?")
    .run("kuozui/plant/solar/power", "realTimePower");
  database
    .prepare("UPDATE topic_mappings SET topic = ?, enabled = 1 WHERE metric_key = ?")
    .run("kuozui/plant/solar/self_consumption", "selfConsumptionEnergy");
  database
    .prepare("UPDATE topic_mappings SET topic = ?, enabled = 1 WHERE metric_key = ?")
    .run("kuozui/plant/factory/consumption", "consumptionEnergy");
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES ('cl', ?, ?, ?, ?, ?, ?)
      `
    )
    .run("realTimePower", 42, "kW", timestamp, "good", "{\"value\":42}");
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES ('cl', ?, ?, ?, ?, ?, ?)
      `
    )
    .run("selfConsumptionEnergy", 30, "kWh", timestamp, "good", "{\"value\":30}");
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES ('cl', ?, ?, ?, ?, ?, ?)
      `
    )
    .run("consumptionEnergy", 40, "kWh", timestamp, "good", "{\"value\":40}");
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          metric_scope,
          date,
          generation_total,
          consumption_total,
          self_consumption_total
        ) VALUES ('global', ?, ?, ?, ?)
      `
    )
    .run(today, 100, 80, 16);
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
          total_value = excluded.total_value,
          last_updated = excluded.last_updated
      `
    )
    .run("global", "selfConsumption", 360, timestamp);
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
          total_value = excluded.total_value,
          last_updated = excluded.last_updated
      `
    )
    .run("global", "generation", 18600000, timestamp);
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
          total_value = excluded.total_value,
          last_updated = excluded.last_updated
      `
    )
    .run("global", "consumption", 6000, timestamp);
}

function seedPageScopedFactoryCardDataFixture() {
  seedCardDataFixture();
  const database = getDatabase();
  const today = toLocalDateKey(new Date());
  const observedAt = new Date().toISOString();
  database.prepare("DELETE FROM circuit_configs").run();
  const insertCircuit = database.prepare(
    `
      INSERT INTO circuit_configs (
        page_key,
        name_zh,
        name_en,
        icon,
        unit,
        mqtt_topic,
        display_slot,
        rated_capacity,
        normal_min,
        normal_max,
        attention_min,
        attention_max,
        warning_min,
        warning_max,
        display_order,
        enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  );
  const insertMetric = database.prepare(
    `
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  );
  const insertTopic = database.prepare(
    `
      INSERT INTO topic_mappings (
        metric_scope,
        metric_key,
        topic,
        unit,
        value_path,
        multiplier,
        offset,
        decimal_places,
        enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        topic = excluded.topic,
        enabled = excluded.enabled
    `
  );

  insertCircuit.run(
    "factory-circuit",
    "中壢沖壓",
    "Jungli Stamping",
    "factory",
    "kW",
    "factory/jungli/stamping",
    "stamping",
    100,
    0,
    70,
    70,
    90,
    90,
    100,
    1,
    1
  );
  insertCircuit.run(
    "factory-circuit-guanyin",
    "觀音沖壓",
    "Guanyin Stamping",
    "factory",
    "kW",
    "factory/guanyin/stamping",
    "stamping",
    100,
    0,
    70,
    70,
    90,
    90,
    100,
    1,
    1
  );
  insertTopic.run("cl", "factoryCircuit.stampingPower", "factory/jungli/stamping", "kW", "$.value", 1, 0, 2, 1);
  insertTopic.run("kn", "factoryCircuit.stampingPower", "factory/guanyin/stamping", "kW", "$.value", 1, 0, 2, 1);
  insertMetric.run("cl", "factoryCircuit.stampingPower", 10, "kW", observedAt, "good", "{\"value\":10}");
  insertMetric.run("kn", "factoryCircuit.stampingPower", 20, "kW", observedAt, "good", "{\"value\":20}");
}

test("GET /api/display-card-data exposes monitoring card diagnostics", async () => {
  seedCardDataFixture();
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-card-data"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      rows: Array<{
        cardId: string;
        dependencies: Array<{ metricKey: string; topic: string | null }>;
        displayValue: string;
        metricKey: string;
        pageId: string;
        sourceTopics: Array<{ metricKey: string; topic: string }>;
        status: string;
        unit: string;
      }>;
    };

    const overviewPower = body.rows.find(
      (row) => row.pageId === "overview" && row.metricKey === "realTimePower"
    );

    assert.equal(overviewPower?.cardId, "overview.realTimePower");
    assert.equal(overviewPower?.displayValue, "42.0");
    assert.equal(overviewPower?.unit, "kW");
    assert.equal(overviewPower?.status, "ready");
    assert.deepEqual(overviewPower?.sourceTopics, [
      { metricKey: "realTimePower", metricScope: "cl", topic: "kuozui/plant/solar/power" }
    ]);

    const solarRatio = body.rows.find(
      (row) => row.pageId === "solar" && row.metricKey === "selfConsumptionRatio"
    );

    assert.deepEqual(
      solarRatio?.dependencies.map((dependency) => [dependency.metricKey, dependency.topic]),
      [
        ["selfConsumptionRatio", null],
        ["selfConsumptionEnergy", "kuozui/plant/solar/self_consumption"],
        ["consumptionEnergy", "kuozui/plant/factory/consumption"]
      ]
    );
  } finally {
    await app.close();
  }
});

test("card diagnostics keep CL and KN semantic twins scoped independently", () => {
  seedCardDataFixture();
  const database = getDatabase();
  const timestamp = new Date().toISOString();
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, unit, enabled)
    VALUES ('kn', 'realTimePower', 'solar/kn/power', 'kW', 1)
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
      topic = excluded.topic,
      enabled = excluded.enabled
  `).run();
  database.prepare(`
    INSERT INTO live_metric_values
      (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('kn', 'realTimePower', 84, 'kW', ?, 'good', '{"site":"kn"}')
  `).run(timestamp);

  const clRow = readDisplayCardData("cl").rows.find(
    (row) => row.cardId === "overview.realTimePower"
  );
  const knRow = readDisplayCardData("kn").rows.find(
    (row) => row.cardId === "overview.realTimePower"
  );

  assert.equal(clRow?.metricScope, "cl");
  assert.equal(clRow?.dependencies[0]?.latestValue, "42 kW");
  assert.deepEqual(clRow?.sourceTopics, [
    { metricKey: "realTimePower", metricScope: "cl", topic: "kuozui/plant/solar/power" }
  ]);
  assert.equal(knRow?.metricScope, "kn");
  assert.equal(knRow?.dependencies[0]?.latestValue, "84 kW");
  assert.deepEqual(knRow?.sourceTopics, [
    { metricKey: "realTimePower", metricScope: "kn", topic: "solar/kn/power" }
  ]);
});

test("GET /api/display-card-data exposes household-equivalent derivation diagnostics", async () => {
  seedCardDataFixture();
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-card-data"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      rows: Array<{
        aggregateSource: string | null;
        calculationFields: string[];
        cardId: string;
        metricKey: string;
        pageId: string;
        sourceClassification: string;
        status: string;
      }>;
    };

    const todayHousehold = body.rows.find(
      (row) => row.pageId === "sustainability" && row.cardId === "sustainability.household.today"
    );

    assert.equal(todayHousehold?.metricKey, "householdEquivalent.today");
    assert.equal(todayHousehold?.sourceClassification, "daily-summary");
    assert.equal(todayHousehold?.aggregateSource, "daily-self-consumption");
    assert.deepEqual(todayHousehold?.calculationFields, ["householdDailyUsageKwh"]);
    assert.equal(todayHousehold?.status, "ready");

    const cumulativeHousehold = body.rows.find(
      (row) => row.pageId === "sustainability" && row.cardId === "sustainability.household.cumulative"
    );

    assert.equal(cumulativeHousehold?.sourceClassification, "cumulative-counter");
    assert.equal(cumulativeHousehold?.aggregateSource, "CL + KN MQTT aggregate");
    assert.deepEqual(cumulativeHousehold?.calculationFields, ["householdDailyUsageKwh"]);
  } finally {
    await app.close();
  }
});

test("GET /api/display-card-data identifies live today generation fallback for today's household equivalent", async () => {
  seedCardDataFixture();
  const database = getDatabase();
  const today = toLocalDateKey(new Date());
  const observedAt = new Date().toISOString();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          metric_scope,
          date,
          generation_total,
          consumption_total,
          self_consumption_total
        ) VALUES ('global', ?, 0, 0, 0)
      `
    )
    .run(today);
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES ('global', 'todayGeneration', 7.99, 'MWh', ?, 'good', '{}')
      `
    )
    .run(observedAt);
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-card-data"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      rows: Array<{
        aggregateSource: string | null;
        cardId: string;
        displayValue: string;
        formula: string;
        sourceClassification: string;
      }>;
    };
    const todayHousehold = body.rows.find(
      (row) => row.cardId === "sustainability.household.today"
    );

    assert.equal(todayHousehold?.displayValue, "615");
    assert.equal(todayHousehold?.sourceClassification, "mqtt-live");
    assert.equal(todayHousehold?.aggregateSource, "live-today-generation-fallback");
    assert.equal(todayHousehold?.formula, "todayGeneration / householdDailyUsageKwh");
  } finally {
    await app.close();
  }
});

test("GET /api/display-card-data marks factory self-consumption ready when today generation fallback is active", async () => {
  seedCardDataFixture();
  const database = getDatabase();
  const observedAt = new Date().toISOString();
  database
    .prepare("UPDATE topic_mappings SET topic = ?, enabled = 1 WHERE metric_key = ?")
    .run("solar/KN/today_mwh", "todayGeneration");
  database
    .prepare("UPDATE live_metric_values SET timestamp = ? WHERE metric_key = ?")
    .run("2026-06-30T08:09:41.000Z", "selfConsumptionEnergy");
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES ('cl', 'todayGeneration', 7.99, 'MWh', ?, 'good', '{}')
        ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
          value = excluded.value,
          unit = excluded.unit,
          timestamp = excluded.timestamp,
          quality = excluded.quality,
          raw_payload = excluded.raw_payload
      `
    )
    .run(observedAt);
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-card-data"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      rows: Array<{
        aggregateSource: string | null;
        cardId: string;
        displayValue: string;
        formula: string | null;
        sourceClassification: string;
        status: string;
        unit: string;
      }>;
    };
    const factorySelfConsumption = body.rows.find(
      (row) => row.cardId === "factory-circuit.selfConsumption"
    );

    assert.equal(factorySelfConsumption?.displayValue, "100,000");
    assert.equal(factorySelfConsumption?.unit, "kWh");
    assert.equal(factorySelfConsumption?.status, "ready");
    assert.equal(factorySelfConsumption?.sourceClassification, "derived-metric");
    assert.equal(factorySelfConsumption?.aggregateSource, null);
    assert.equal(factorySelfConsumption?.formula, "todayGeneration fallback");
  } finally {
    await app.close();
  }
});

test("GET /api/display-card-data exposes sustainability numeric card diagnostics", async () => {
  seedCardDataFixture();
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-card-data"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      rows: Array<{
        aggregateSource: string | null;
        cardId: string;
        displayValue: string;
        metricKey: string;
        originalValue: string | null;
        pageId: string;
        status: string;
        unit: string;
      }>;
    };

    const generation = body.rows.find(
      (row) => row.cardId === "sustainability.big-number.accumulatedGenerationGwh"
    );
    assert.equal(generation?.pageId, "sustainability");
    assert.equal(generation?.metricKey, "accumulatedGenerationGwh");
    assert.equal(generation?.displayValue, "18,600");
    assert.equal(generation?.originalValue, "18,600");
    assert.equal(generation?.unit, "MWh");
    assert.equal(generation?.aggregateSource, "CL + KN MQTT aggregate");
    assert.equal(generation?.status, "ready");

    const trees = body.rows.find(
      (row) => row.cardId === "sustainability.big-number.plantedTreeEquivalent"
    );
    assert.equal(trees?.displayValue, "54,288");
    assert.equal(trees?.unit, "trees");
  } finally {
    await app.close();
  }
});

test("GET /api/display-card-data exposes Factory Circuit slot power diagnostics", async () => {
  seedCardDataFixture();
  const database = getDatabase();
  const observedAt = new Date().toISOString();
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, unit, enabled)
    VALUES ('cl', 'factoryCircuit.stampingPower', 'factory/power/stamping', 'kW', 1)
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
      topic = excluded.topic,
      enabled = excluded.enabled
  `).run();
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES ('cl', ?, ?, ?, ?, ?, ?)
      `
    )
    .run("factoryCircuit.stampingPower", 790, "kW", observedAt, "good", "{\"value\":790}");
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-card-data"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      rows: Array<{
        actions: Array<{ metricKey?: string; type: string }>;
        cardId: string;
        dependencies: Array<{ latestValue: string | null; metricKey: string; status: string; topic: string | null }>;
        displayValue: string;
        label: string;
        metricKey: string;
        sourceTopics: Array<{ metricKey: string; topic: string }>;
        status: string;
        unit: string;
      }>;
    };

    const stamping = body.rows.find(
      (row) => row.cardId === "factory-circuit.slot.stamping"
    );

    assert.equal(stamping?.label, "沖壓工程");
    assert.equal(stamping?.metricKey, "factoryCircuit.stampingPower");
    assert.equal(stamping?.displayValue, "790");
    assert.equal(stamping?.unit, "kW");
    assert.equal(stamping?.status, "ready");
    assert.deepEqual(stamping?.sourceTopics, [
      { metricKey: "factoryCircuit.stampingPower", metricScope: "cl", topic: "factory/power/stamping" }
    ]);
    assert.deepEqual(stamping?.dependencies, [
      {
        latestValue: "790 kW",
        metricKey: "factoryCircuit.stampingPower",
        metricScope: "cl",
        status: "ready",
        topic: "factory/power/stamping"
      }
    ]);
    assert.deepEqual(
      stamping?.actions.map((action) => [action.type, action.metricKey ?? null]),
      [
        ["publish-test-value", "factoryCircuit.stampingPower"],
        ["set-display-override", null]
      ]
    );
  } finally {
    await app.close();
  }
});

test("GET /api/display-card-data exposes page-scoped Factory Circuit slot diagnostics", async () => {
  seedPageScopedFactoryCardDataFixture();
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-card-data"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      rows: Array<{
        actions: Array<{ metricKey?: string; type: string }>;
        cardId: string;
        displayValue: string;
        label: string;
        metricKey: string;
        pageId: string;
        sourceTopics: Array<{ metricKey: string; topic: string }>;
      }>;
    };

    const jungliStamping = body.rows.find((row) => row.cardId === "factory-circuit.slot.stamping");
    const guanyinStamping = body.rows.find((row) => row.cardId === "factory-circuit-guanyin.slot.stamping");

    assert.equal(jungliStamping?.pageId, "factory-circuit");
    assert.equal(jungliStamping?.label, "中壢沖壓");
    assert.equal(jungliStamping?.metricKey, "factoryCircuit.stampingPower");
    assert.equal(jungliStamping?.displayValue, "10.0");
    assert.deepEqual(jungliStamping?.sourceTopics, [
      { metricKey: "factoryCircuit.stampingPower", metricScope: "cl", topic: "factory/jungli/stamping" }
    ]);
    assert.deepEqual(
      jungliStamping?.actions.map((action) => [action.type, action.metricKey ?? null]),
      [
        ["publish-test-value", "factoryCircuit.stampingPower"],
        ["set-display-override", null]
      ]
    );

    assert.equal(guanyinStamping?.pageId, "factory-circuit-guanyin");
    assert.equal(guanyinStamping?.label, "觀音沖壓");
    assert.equal(guanyinStamping?.metricKey, "factoryCircuit.stampingPower");
    assert.equal(guanyinStamping?.displayValue, "20.0");
    assert.deepEqual(guanyinStamping?.sourceTopics, [
      { metricKey: "factoryCircuit.stampingPower", metricScope: "kn", topic: "factory/guanyin/stamping" }
    ]);
    assert.deepEqual(
      guanyinStamping?.actions.map((action) => [action.type, action.metricKey ?? null]),
      [
        ["publish-test-value", "factoryCircuit.stampingPower"],
        ["set-display-override", null]
      ]
    );
  } finally {
    await app.close();
  }
});

test("GET /api/display-card-data classifies missing topics and formula inputs", async () => {
  seedCardDataFixture();
  const database = getDatabase();
  database.prepare("UPDATE topic_mappings SET topic = '', enabled = 1 WHERE metric_key = ?").run("realTimePower");
  database.prepare("DELETE FROM live_metric_values WHERE metric_key = ?").run("realTimePower");
  database.prepare("DELETE FROM live_metric_values WHERE metric_key = ?").run("consumptionEnergy");
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-card-data"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      rows: Array<{
        dependencies: Array<{ metricKey: string; status: string }>;
        metricKey: string;
        pageId: string;
        status: string;
      }>;
    };

    const realTimePower = body.rows.find(
      (row) => row.pageId === "overview" && row.metricKey === "realTimePower"
    );
    assert.equal(realTimePower?.status, "missing-topic");

    const solarRatio = body.rows.find(
      (row) => row.pageId === "solar" && row.metricKey === "selfConsumptionRatio"
    );
    assert.equal(solarRatio?.status, "formula-input-missing");
    assert.deepEqual(
      solarRatio?.dependencies.map((dependency) => [dependency.metricKey, dependency.status]),
      [
        ["selfConsumptionRatio", "missing-topic"],
        ["selfConsumptionEnergy", "ready"],
        ["consumptionEnergy", "idle-topic"]
      ]
    );
  } finally {
    await app.close();
  }
});

test("PUT and DELETE /api/display-card-data/overrides/:targetId apply display-only overrides without changing true metric storage", async () => {
  seedCardDataFixture();
  const app = await buildApp();

  try {
    const applyResponse = await app.inject({
      body: { displayValue: 60, metricScope: "cl" },
      method: "PUT",
      url: "/api/display-card-data/overrides/overview.realTimePower?metricScope=cl"
    });

    assert.equal(applyResponse.statusCode, 200);
    const applied = applyResponse.json() as {
      row: {
        cardId: string;
        displayValue: string;
        originalValue: string | null;
        sourceTopics: Array<{ metricKey: string; topic: string }>;
        status: string;
      };
    };
    assert.equal(applied.row.cardId, "overview.realTimePower");
    assert.equal(applied.row.displayValue, "60.0");
    assert.equal(applied.row.originalValue, "42.0");
    assert.equal(applied.row.status, "overridden");
    assert.deepEqual(applied.row.sourceTopics, [
      { metricKey: "realTimePower", metricScope: "cl", topic: "kuozui/plant/solar/power" }
    ]);

    const database = getDatabase();
    const liveMetric = database
      .prepare("SELECT value FROM live_metric_values WHERE metric_key = ?")
      .get("realTimePower") as { value: number } | undefined;
    assert.equal(liveMetric?.value, 42);

    const paired = createPairedDeviceTestContext("cl");
    const storyResponse = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      method: "GET",
      url: "/api/display-story"
    });
    assert.equal(storyResponse.statusCode, 200);
    const story = storyResponse.json() as {
      overview: { metrics: Array<{ metricKey: string; value: string }> };
    };
    assert.equal(
      story.overview.metrics.find((metric) => metric.metricKey === "realTimePower")?.value,
      "60.0"
    );

    const clearResponse = await app.inject({
      method: "DELETE",
      url: "/api/display-card-data/overrides/overview.realTimePower?metricScope=cl"
    });

    assert.equal(clearResponse.statusCode, 200);
    const cleared = clearResponse.json() as {
      row: { displayValue: string; originalValue: string | null; status: string };
    };
    assert.equal(cleared.row.displayValue, "42.0");
    assert.equal(cleared.row.originalValue, "42.0");
    assert.equal(cleared.row.status, "ready");

    const unchangedMetric = database
      .prepare("SELECT value FROM live_metric_values WHERE metric_key = ?")
      .get("realTimePower") as { value: number } | undefined;
    assert.equal(unchangedMetric?.value, 42);
  } finally {
    await app.close();
  }
});

test("PUT /api/display-card-data/overrides/:targetId rejects invalid override requests", async () => {
  seedCardDataFixture();
  const app = await buildApp();

  try {
    const invalidValueResponse = await app.inject({
      body: { displayValue: "good looking" },
      method: "PUT",
      url: "/api/display-card-data/overrides/overview.realTimePower"
    });

    assert.equal(invalidValueResponse.statusCode, 400);
    assert.deepEqual(invalidValueResponse.json(), {
      code: "INVALID_METRIC_SCOPE",
      error: "Display override metricScope must be cl, kn, or global",
      success: false
    });

    const unknownTargetResponse = await app.inject({
      body: { displayValue: 60, metricScope: "cl" },
      method: "PUT",
      url: "/api/display-card-data/overrides/unknown.target"
    });

    assert.equal(unknownTargetResponse.statusCode, 404);
  } finally {
    await app.close();
  }
});

test("CL and KN overrides coexist and clearing CL preserves KN", async () => {
  seedCardDataFixture();
  const database = getDatabase();
  const timestamp = new Date().toISOString();
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, unit, enabled)
    VALUES ('kn', 'realTimePower', 'solar/kn/power', 'kW', 1)
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET topic = excluded.topic, enabled = 1
  `).run();
  database.prepare(`
    INSERT INTO live_metric_values
      (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('kn', 'realTimePower', 84, 'kW', ?, 'good', '{"site":"kn"}')
  `).run(timestamp);
  const app = await buildApp();

  try {
    const clResponse = await app.inject({
      body: { displayValue: 60, metricScope: "cl" },
      method: "PUT",
      url: "/api/display-card-data/overrides/overview.realTimePower"
    });
    const knResponse = await app.inject({
      body: { displayValue: 70, metricScope: "kn" },
      method: "PUT",
      url: "/api/display-card-data/overrides/overview.realTimePower"
    });

    assert.equal(clResponse.statusCode, 200);
    assert.equal(knResponse.statusCode, 200);
    assert.equal(knResponse.json().row.override.metricScope, "kn");
    assert.equal(knResponse.json().row.displayValue, "70.0");

    const clearResponse = await app.inject({
      method: "DELETE",
      url: "/api/display-card-data/overrides/overview.realTimePower?metricScope=cl"
    });
    assert.equal(clearResponse.statusCode, 200);

    const rows = database.prepare(`
      SELECT metric_scope, enabled
      FROM display_value_overrides
      WHERE target_id = 'overview.realTimePower'
      ORDER BY metric_scope
    `).all();
    assert.deepEqual(rows, [
      { enabled: 0, metric_scope: "cl" },
      { enabled: 1, metric_scope: "kn" }
    ]);
    const knRow = readDisplayCardData("kn").rows.find(
      (row) => row.cardId === "overview.realTimePower"
    );
    assert.equal(knRow?.override?.active, true);
    assert.equal(knRow?.displayValue, "70.0");
  } finally {
    await app.close();
  }
});

test("GET /api/display-card-data keeps expired overrides visible but inactive", async () => {
  seedCardDataFixture();
  const app = await buildApp();

  try {
    const applyResponse = await app.inject({
      body: {
        displayValue: 60,
        metricScope: "cl",
        expiresAt: "2000-01-01T00:00:00.000Z"
      },
      method: "PUT",
      url: "/api/display-card-data/overrides/overview.realTimePower"
    });
    assert.equal(applyResponse.statusCode, 200);

    const response = await app.inject({
      method: "GET",
      url: "/api/display-card-data"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      rows: Array<{
        cardId: string;
        displayValue: string;
        override: { active: boolean; displayValue: number } | null;
        status: string;
      }>;
    };
    const row = body.rows.find((item) => item.cardId === "overview.realTimePower");

    assert.equal(row?.displayValue, "42.0");
    assert.equal(row?.status, "ready");
    assert.equal(row?.override?.active, false);
    assert.equal(row?.override?.displayValue, 60);
  } finally {
    await app.close();
  }
});
