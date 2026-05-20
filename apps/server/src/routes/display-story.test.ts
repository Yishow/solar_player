import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApp,
  getDatabase
} from "./display-pages-asset-governance.test-support.js";

test("GET /api/display-story exposes monitoring semantics for overview, solar, and factory slots", async () => {
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
    .run("todayGeneration", 3842, "kWh", "2026-05-13T09:00:00.000Z", "good", '{"value":3842}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("totalGeneration", 18642, "GWh", "2026-05-13T09:00:00.000Z", "good", '{"value":18642}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("todayCo2Reduction", 1.94, "t", "2026-05-13T09:00:00.000Z", "good", '{"value":1.94}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("totalCo2Reduction", 9842, "t", "2026-05-13T09:00:00.000Z", "good", '{"value":9842}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("systemEfficiency", 88.6, "%", "2026-05-13T09:00:00.000Z", "good", '{"value":88.6}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("selfConsumptionEnergy", 30, "kWh", "2026-05-13T09:00:00.000Z", "good", '{"value":30}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("consumptionEnergy", 40, "kWh", "2026-05-13T09:00:00.000Z", "good", '{"value":40}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("factoryProductionPower", 790, "kW", "2026-05-13T09:00:00.000Z", "good", '{"value":790}');
  database.prepare("DELETE FROM live_metric_values WHERE metric_key = ?").run("selfConsumptionRatio");
  database
    .prepare(
      "UPDATE circuit_configs SET display_slot = NULL WHERE mqtt_topic = ?"
    )
    .run("factory/power/hvac");

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-story"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      factoryCircuit: {
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
          sourceClass: string;
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
    const totalGenerationMetric = body.overview.metrics.find(
      (metric) => metric.metricKey === "totalGeneration"
    );
    assert.ok(totalGenerationMetric);
    assert.equal(totalGenerationMetric.sourceClass, "cumulative-counter");
    assert.equal(totalGenerationMetric.provenance, "cumulative");
    assert.deepEqual(totalGenerationMetric.dependencyKeys, ["totalGeneration"]);

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
    assert.equal(body.solar.story.flowState.state, "degraded");
    assert.equal(body.solar.story.flowState.reason, "reduced-efficiency");
    assert.equal(
      body.factoryCircuit.slots.some(
        (slot) =>
          slot.slotKey === "hvac" &&
          slot.bindingState === "missing" &&
          slot.fallbackReason === "missing-slot-binding"
      ),
      true
    );
  } finally {
    await app.close();
  }
});
