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
    .run("systemEfficiency", 88.6, "%", "2026-05-13T09:00:00.000Z", "good", '{"value":88.6}');
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run("factoryProductionPower", 790, "kW", "2026-05-13T09:00:00.000Z", "good", '{"value":790}');
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
        summary: {
          alertTone: string;
          bindingState: string;
        };
      };
      solar: {
        story: {
          flowState: {
            reason: string;
            state: string;
          };
        };
      };
    };

    assert.equal(body.overview.summary.bindingState, "missing");
    assert.equal(body.overview.summary.alertTone, "warning");
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
