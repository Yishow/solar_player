import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import test from "node:test";

test("037 and 038 add the registry without changing existing live metric values", async () => {
  const database = new Database(":memory:");
  try {
    database.exec(`
      CREATE TABLE calculation_settings (
        id INTEGER PRIMARY KEY,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO calculation_settings (id) VALUES (1);
      CREATE TABLE live_metric_values (
        metric_scope TEXT NOT NULL,
        metric_key TEXT NOT NULL,
        value REAL,
        unit TEXT,
        timestamp TEXT,
        quality TEXT,
        raw_payload TEXT,
        PRIMARY KEY (metric_scope, metric_key)
      );
      CREATE TABLE topic_mappings (
        metric_scope TEXT NOT NULL,
        metric_key TEXT NOT NULL,
        topic TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT
      );
      INSERT INTO live_metric_values VALUES
        ('cl', 'realTimePower', 42, 'kW', '2026-08-30T00:00:00.000Z', 'good', '{}');
    `);
    const before = database.prepare("SELECT * FROM live_metric_values").all();
    const migrationPath = fileURLToPath(new URL("./037_derived_metric_registry.sql", import.meta.url));
    database.exec(readFileSync(migrationPath, "utf8"));
    database.prepare(`
      INSERT INTO derived_metric_definitions (
        metric_key, name, description, output_scope_policy, expression, output_unit,
        precision, fallback_policy, acceptance_policy, enabled, managed, revision
      ) VALUES (?, ?, '', 'site', 'source', 'kW', 1, 'unavailable', NULL, 1, 1, 1)
    `).run("factoryCircuit.jungliTotalPower", "Jungli");
    database.prepare(`
      INSERT INTO derived_metric_definitions (
        metric_key, name, description, output_scope_policy, expression, output_unit,
        precision, fallback_policy, acceptance_policy, enabled, managed, revision
      ) VALUES (?, ?, '', 'site', 'source', 'kW', 1, 'unavailable', NULL, 1, 1, 1)
    `).run("factoryCircuit.guanyinTotalPower", "Guanyin");
    const insertInput = database.prepare(`
      INSERT INTO derived_metric_inputs (
        derived_metric_key, alias, input_kind, metric_key, scope_selector, setting_key, unit, sort_order
      ) VALUES (?, 'source', 'metric', 'realTimePower', 'output-site', NULL, 'kW', 0)
    `);
    insertInput.run("factoryCircuit.jungliTotalPower");
    insertInput.run("factoryCircuit.guanyinTotalPower");
    database.prepare(`
      INSERT INTO topic_mappings (metric_scope, metric_key, topic, enabled)
      VALUES ('cl', 'factoryCircuit.guanyinTotalPower', 'legacy/cl-guanyin-total', 1)
    `).run();
    const observedAt = "2026-08-30T00:00:00.000Z";
    const legacyRows = [
      ["cl", "factoryCircuit.jungliTotalPower"],
      ["kn", "factoryCircuit.jungliTotalPower"],
      ["cl", "factoryCircuit.guanyinTotalPower"],
      ["kn", "factoryCircuit.guanyinTotalPower"]
    ] as const;
    const insertEvaluation = database.prepare(`
      INSERT INTO derived_metric_evaluations (
        metric_scope, metric_key, definition_revision, status, failure_code,
        retained_last_good, value, unit, source_timestamp, evaluated_at, provenance_json
      ) VALUES (?, ?, 1, 'ready', NULL, 0, 10, 'kW', ?, ?, '{}')
    `);
    const insertLive = database.prepare(`
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES (?, ?, 10, 'kW', ?, 'good', ?)
    `);
    for (const [metricScope, metricKey] of legacyRows) {
      insertEvaluation.run(metricScope, metricKey, observedAt, observedAt);
      insertLive.run(
        metricScope,
        metricKey,
        observedAt,
        metricScope === "cl" && metricKey === "factoryCircuit.guanyinTotalPower"
          ? "{}"
          : JSON.stringify({ source: "derived-metric-registry" })
      );
    }
    insertLive.run("cl", "factoryCircuit.stampingPower", observedAt, "{}");
    insertLive.run("kn", "factoryCircuit.stampingPower", observedAt, "{}");
    const siteScopesMigrationPath = fileURLToPath(new URL("./038_derived_metric_site_scopes.sql", import.meta.url));
    database.exec(readFileSync(siteScopesMigrationPath, "utf8"));

    assert.deepEqual(
      database.prepare("SELECT * FROM live_metric_values WHERE metric_key = 'realTimePower'").all(),
      before
    );
    assert.equal(
      database.prepare("SELECT revision FROM calculation_settings WHERE id = 1").pluck().get(),
      1
    );
    assert.deepEqual(
      database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'derived_metric_%' ORDER BY name").pluck().all(),
      ["derived_metric_definitions", "derived_metric_evaluations", "derived_metric_inputs", "derived_metric_registry_state"]
    );
    assert.equal(
      database.prepare("SELECT 1 FROM pragma_table_info('derived_metric_definitions') WHERE name = 'site_scopes_json'").pluck().get(),
      1
    );
    assert.deepEqual(
      database.prepare("SELECT metric_key, site_scopes_json FROM derived_metric_definitions ORDER BY metric_key").all(),
      [
        { metric_key: "factoryCircuit.guanyinTotalPower", site_scopes_json: '["kn"]' },
        { metric_key: "factoryCircuit.jungliTotalPower", site_scopes_json: '["cl"]' }
      ]
    );

    const { initializeDerivedMetricRegistry, readDerivedMetricEvaluation } = await import("../../services/derivedMetricRegistryService.js");
    const snapshot = initializeDerivedMetricRegistry(database);
    assert.deepEqual(
      snapshot.nodes
        .filter(({ definition }) => definition.definition.metricKey.startsWith("factoryCircuit."))
        .map(({ nodeId }) => nodeId)
        .sort(),
      ["cl:factoryCircuit.jungliTotalPower", "kn:factoryCircuit.guanyinTotalPower"]
    );
    assert.deepEqual(
      database.prepare(`
        SELECT metric_scope, metric_key FROM derived_metric_evaluations
        WHERE metric_key IN ('factoryCircuit.jungliTotalPower', 'factoryCircuit.guanyinTotalPower')
        ORDER BY metric_scope, metric_key
      `).all(),
      [
        { metric_scope: "cl", metric_key: "factoryCircuit.jungliTotalPower" },
        { metric_scope: "kn", metric_key: "factoryCircuit.guanyinTotalPower" }
      ]
    );
    assert.deepEqual(
      database.prepare(`
        SELECT metric_scope, metric_key FROM live_metric_values
        WHERE metric_key IN ('factoryCircuit.jungliTotalPower', 'factoryCircuit.guanyinTotalPower')
        ORDER BY metric_scope, metric_key
      `).all(),
      [
        { metric_scope: "cl", metric_key: "factoryCircuit.guanyinTotalPower" },
        { metric_scope: "cl", metric_key: "factoryCircuit.jungliTotalPower" },
        { metric_scope: "kn", metric_key: "factoryCircuit.guanyinTotalPower" }
      ]
    );
    assert.deepEqual(
      database.prepare(`
        SELECT value, raw_payload FROM live_metric_values
        WHERE metric_scope = 'cl' AND metric_key = 'factoryCircuit.guanyinTotalPower'
      `).get(),
      { value: 10, raw_payload: "{}" }
    );
    assert.deepEqual(
      database.prepare(`
        SELECT metric_scope, metric_key FROM live_metric_values
        WHERE metric_key = 'factoryCircuit.stampingPower' ORDER BY metric_scope
      `).all(),
      [
        { metric_scope: "cl", metric_key: "factoryCircuit.stampingPower" },
        { metric_scope: "kn", metric_key: "factoryCircuit.stampingPower" }
      ]
    );
    assert.equal(readDerivedMetricEvaluation("kn", "factoryCircuit.jungliTotalPower", database), null);
    assert.equal(readDerivedMetricEvaluation("cl", "factoryCircuit.guanyinTotalPower", database), null);
  } finally {
    database.close();
  }
});
