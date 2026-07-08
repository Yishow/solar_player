import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApp,
  getDatabase
} from "./display-pages-asset-governance.test-support.js";

function toLocalDateKey(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function seedDisplayStoryFixture() {
  const database = getDatabase();
  const today = toLocalDateKey(new Date());
  const updateTopic = database.prepare(
    "UPDATE topic_mappings SET topic = ?, enabled = 1 WHERE metric_key = ?"
  );
  updateTopic.run("kuozui/plant/solar/power", "realTimePower");
  updateTopic.run("kuozui/plant/solar/self_consumption", "selfConsumptionEnergy");
  updateTopic.run("kuozui/plant/factory/consumption", "consumptionEnergy");
  database.prepare("DELETE FROM live_metric_values").run();
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("realTimePower", 586.2, "kW", `${today}T09:00:00.000Z`, "good", '{"value":586.2}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("todayGeneration", 3842, "kWh", `${today}T09:00:00.000Z`, "good", '{"value":3842}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("totalGeneration", 18642, "GWh", `${today}T09:00:00.000Z`, "good", '{"value":18642}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("todayCo2Reduction", 1.94, "t", `${today}T09:00:00.000Z`, "good", '{"value":1.94}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("totalCo2Reduction", 9842, "t", `${today}T09:00:00.000Z`, "good", '{"value":9842}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("systemEfficiency", 88.6, "%", `${today}T09:00:00.000Z`, "good", '{"value":88.6}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("selfConsumptionEnergy", 30, "kWh", `${today}T09:00:00.000Z`, "good", '{"value":30}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("consumptionEnergy", 40, "kWh", `${today}T09:00:00.000Z`, "good", '{"value":40}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("factoryStampingPower", 790, "kW", `${today}T09:00:00.000Z`, "good", '{"value":790}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("factoryBodyPower", 120, "kW", `${today}T09:00:00.000Z`, "good", '{"value":120}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("factoryOfficePower", 90, "kW", `${today}T09:00:00.000Z`, "good", '{"value":90}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("factoryHeavyVehiclePower", 45, "kW", `${today}T09:00:00.000Z`, "good", '{"value":45}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("factoryUtilityPower", 35, "kW", `${today}T09:00:00.000Z`, "good", '{"value":35}');
  database.prepare("DELETE FROM live_metric_values WHERE metric_key = ?").run("selfConsumptionRatio");
  database.prepare("DELETE FROM metric_snapshots").run();
  for (const [generation, capturedAt] of [
    [82, `${today}T08:00:00.000Z`],
    [95, `${today}T09:00:00.000Z`],
    [101, `${today}T10:00:00.000Z`],
    [108, `${today}T11:00:00.000Z`]
  ] as const) {
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
      .run(generation, null, null, null, null, null, capturedAt);
  }
  database
    .prepare(
      "UPDATE circuit_configs SET display_slot = NULL WHERE mqtt_topic = ?"
    )
    .run("factory/power/stamping");

  return { today };
}

test("GET /api/display-story exposes monitoring semantics for overview, solar, and factory slots", async () => {
  const { today } = seedDisplayStoryFixture();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-story"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      factoryCircuit: {
        kpis: Array<{
          bindingState: string;
          dependencyKeys: string[];
          fallbackReason: string | null;
          metricKey: string;
          provenance: string;
          sourceTopics?: Array<{ metricKey: string; topic: string }>;
          sourceClass: string;
          value: string;
        }>;
        slots: Array<{
          bindingState: string;
          fallbackReason: string | null;
          slotKey: string;
        }>;
      };
      overview: {
        metrics: Array<{
          dependencyKeys: string[];
          metricKey: string;
          provenance: string;
          sourceTopics?: Array<{ metricKey: string; topic: string }>;
          sourceClass: string;
          trendHours?: number[];
          trendSeries?: number[];
        }>;
        readinessFindings: Array<{
          pageId: string;
          requirementKey: string;
          status: string;
        }>;
        summary: {
          alertTone: string;
          bindingState: string;
        };
      };
      solar: {
        kpis: Array<{
          bindingState: string;
          dependencyKeys: string[];
          fallbackReason: string | null;
          metricKey: string;
          provenance: string;
          sourceTopics?: Array<{ metricKey: string; topic: string }>;
          sourceClass: string;
        }>;
        story: {
          flowState: {
            reason: string;
            state: string;
          };
        };
      };
    };

    assert.equal(body.overview.summary.bindingState, "bound");
    assert.equal(body.overview.summary.alertTone, "normal");
    assert.ok(Array.isArray(body.overview.readinessFindings));
    assert.equal(body.overview.readinessFindings.every((finding) => finding.pageId === "overview"), true);
    assert.equal(body.overview.readinessFindings.every((finding) => finding.status !== "ready"), true);
    const totalGenerationMetric = body.overview.metrics.find(
      (metric) => metric.metricKey === "totalGeneration"
    );
    assert.ok(totalGenerationMetric);
    assert.equal(totalGenerationMetric.sourceClass, "cumulative-counter");
    assert.equal(totalGenerationMetric.provenance, "cumulative");
    assert.deepEqual(totalGenerationMetric.dependencyKeys, ["totalGeneration"]);
    const realTimePowerMetric = body.overview.metrics.find((metric) => metric.metricKey === "realTimePower");
    assert.deepEqual(realTimePowerMetric?.sourceTopics, [
      { metricKey: "realTimePower", topic: "kuozui/plant/solar/power" }
    ]);
    const expectedTrendHours = ["08", "09", "10", "11"].map((hour) =>
      new Date(`${today}T${hour}:00:00.000Z`).getHours()
    );
    assert.deepEqual(realTimePowerMetric?.trendHours, expectedTrendHours);
    assert.deepEqual(realTimePowerMetric?.trendSeries, [82, 95, 101, 108]);

    const selfConsumptionMetric = body.solar.kpis.find(
      (metric) => metric.metricKey === "selfConsumptionRatio"
    );
    assert.ok(selfConsumptionMetric);
    assert.equal(selfConsumptionMetric.bindingState, "bound");
    assert.equal(selfConsumptionMetric.fallbackReason, null);
    assert.equal(selfConsumptionMetric.provenance, "derived");
    assert.equal(selfConsumptionMetric.sourceClass, "derived-metric");
    assert.deepEqual(selfConsumptionMetric.dependencyKeys, [
      "selfConsumptionRatio",
      "selfConsumptionEnergy",
      "consumptionEnergy"
    ]);
    assert.deepEqual(selfConsumptionMetric.sourceTopics, [
      { metricKey: "selfConsumptionEnergy", topic: "kuozui/plant/solar/self_consumption" },
      { metricKey: "consumptionEnergy", topic: "kuozui/plant/factory/consumption" }
    ]);
    assert.equal(body.solar.story.flowState.state, "degraded");
    assert.equal(body.solar.story.flowState.reason, "reduced-efficiency");
    assert.equal(
      body.factoryCircuit.slots.some(
        (slot) =>
          slot.slotKey === "stamping" &&
          slot.bindingState === "missing" &&
          slot.fallbackReason === "missing-slot-binding"
      ),
      true
    );
    const totalPowerKpi = body.factoryCircuit.kpis.find(
      (metric) => metric.metricKey === "totalPower"
    );
    assert.ok(totalPowerKpi);
    assert.equal(totalPowerKpi.bindingState, "missing");
    assert.equal(totalPowerKpi.fallbackReason, "missing-slot-binding");
    assert.equal(totalPowerKpi.provenance, "fallback");
    assert.equal(totalPowerKpi.sourceClass, "slot-aggregate");
    assert.equal(totalPowerKpi.value, "--");
    assert.equal(totalPowerKpi.dependencyKeys.includes("stamping"), true);

    const selfConsumptionKpi = body.factoryCircuit.kpis.find(
      (metric) => metric.metricKey === "selfConsumption"
    );
    assert.ok(selfConsumptionKpi);
    assert.equal(selfConsumptionKpi.bindingState, "bound");
    assert.equal(selfConsumptionKpi.fallbackReason, null);
    assert.equal(selfConsumptionKpi.provenance, "live");
    assert.equal(selfConsumptionKpi.sourceClass, "mqtt-live");
    assert.equal(selfConsumptionKpi.value, "30.0");
  } finally {
    await app.close();
  }
});

test("GET /api/display-story/:pageId returns only the requested page payload wrapper", async () => {
  seedDisplayStoryFixture();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-story/overview"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      generatedAt: string;
      pageId: string;
      payload: {
        metrics: Array<{
          metricKey: string;
        }>;
        summary: {
          bindingState: string;
        };
      };
      solar?: unknown;
      factoryCircuit?: unknown;
      overview?: unknown;
    };

    assert.equal(body.pageId, "overview");
    assert.equal(typeof body.generatedAt, "string");
    assert.equal(body.payload.summary.bindingState, "bound");
    assert.equal(body.payload.metrics.some((metric) => metric.metricKey === "totalGeneration"), true);
    assert.equal("overview" in body, false);
    assert.equal("solar" in body, false);
    assert.equal("factoryCircuit" in body, false);
  } finally {
    await app.close();
  }
});

test("GET /api/display-story/factory-circuit exposes bilingual slot labels for playback", async () => {
  seedDisplayStoryFixture();
  getDatabase()
    .prepare("UPDATE topic_mappings SET name_zh = ?, name_en = ? WHERE metric_key = ?")
    .run("一號產線", "Line 1", "factoryStampingPower");

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-story/factory-circuit"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      pageId: string;
      payload: {
        slots: Array<{
          label: string;
          labelEn?: string;
          labelZh?: string;
          slotKey: string;
        }>;
      };
    };

    assert.equal(body.pageId, "factory-circuit");
    const stampingSlot = body.payload.slots.find((slot) => slot.slotKey === "stamping");
    assert.equal(stampingSlot?.label, "一號產線");
    assert.equal(stampingSlot?.labelZh, "一號產線");
    assert.equal(stampingSlot?.labelEn, "Line 1");
  } finally {
    await app.close();
  }
});

test("GET /api/display-story/:pageId rejects unsupported monitoring pages", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-story/images"
    });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json(), {
      error: "Unsupported display story page: images",
      success: false,
      timestamp: response.json().timestamp
    });
    assert.equal(typeof response.json().timestamp, "string");
  } finally {
    await app.close();
  }
});

test("GET /api/display-story remains compatible with page-scoped readers during migration", async () => {
  seedDisplayStoryFixture();

  const app = await buildApp();

  try {
    const aggregateResponse = await app.inject({
      method: "GET",
      url: "/api/display-story"
    });
    const overviewResponse = await app.inject({
      method: "GET",
      url: "/api/display-story/overview"
    });
    const solarResponse = await app.inject({
      method: "GET",
      url: "/api/display-story/solar"
    });
    const factoryResponse = await app.inject({
      method: "GET",
      url: "/api/display-story/factory-circuit"
    });

    assert.equal(aggregateResponse.statusCode, 200);
    assert.equal(overviewResponse.statusCode, 200);
    assert.equal(solarResponse.statusCode, 200);
    assert.equal(factoryResponse.statusCode, 200);

    const aggregateBody = aggregateResponse.json() as {
      factoryCircuit: unknown;
      overview: unknown;
      solar: unknown;
    };
    const overviewBody = overviewResponse.json() as {
      pageId: string;
      payload: unknown;
    };
    const solarBody = solarResponse.json() as {
      pageId: string;
      payload: unknown;
    };
    const factoryBody = factoryResponse.json() as {
      pageId: string;
      payload: unknown;
    };

    assert.equal(overviewBody.pageId, "overview");
    assert.equal(solarBody.pageId, "solar");
    assert.equal(factoryBody.pageId, "factory-circuit");
    assert.deepEqual(overviewBody.payload, aggregateBody.overview);
    assert.deepEqual(solarBody.payload, aggregateBody.solar);
    assert.deepEqual(factoryBody.payload, aggregateBody.factoryCircuit);
  } finally {
    await app.close();
  }
});
