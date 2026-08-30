import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-derived-route-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;
const [{ buildApp }, databaseModule, { migrateDatabase }, { seedDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
]);

beforeEach(() => {
  databaseModule.closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  migrateDatabase();
  seedDatabase();
});

after(() => {
  databaseModule.closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

function customDefinitionForRoute(metricKey: string, expression = "source * 2") {
  return {
    description: "route test",
    enabled: true,
    expression,
    fallbackPolicy: "unavailable",
    inputs: [{ alias: "source", kind: "metric", metricKey: "realTimePower", scope: "output-site", unit: "kW" }],
    managed: false,
    metricKey,
    name: "Route test",
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 1,
    revision: 0
  };
}

test("derived metric management endpoints deny untrusted readers and writers", async () => {
  const app = await buildApp();
  try {
    const headers = {
      host: "player.example",
      origin: "https://evil.example"
    };
    const [list, detail, create, update, enable, disable, preview] = await Promise.all([
      app.inject({ headers, method: "GET", url: "/api/derived-metrics" }),
      app.inject({ headers, method: "GET", url: "/api/derived-metrics/selfConsumptionRatio" }),
      app.inject({
        headers,
        method: "POST",
        payload: customDefinitionForRoute("custom.untrusted"),
        remoteAddress: "198.51.100.24",
        url: "/api/derived-metrics"
      }),
      app.inject({
        headers,
        method: "PUT",
        payload: customDefinitionForRoute("custom.untrusted-update"),
        remoteAddress: "198.51.100.24",
        url: "/api/derived-metrics/custom.untrusted-update"
      }),
      app.inject({
        headers,
        method: "PATCH",
        payload: { enabled: true },
        remoteAddress: "198.51.100.24",
        url: "/api/derived-metrics/selfConsumptionRatio/enabled"
      }),
      app.inject({
        headers,
        method: "PATCH",
        payload: { enabled: false },
        remoteAddress: "198.51.100.24",
        url: "/api/derived-metrics/selfConsumptionRatio/enabled"
      }),
      app.inject({
        headers,
        method: "POST",
        payload: {
          definition: customDefinitionForRoute("custom.untrusted-preview"),
          metricScope: "cl"
        },
        remoteAddress: "198.51.100.24",
        url: "/api/derived-metrics/preview"
      })
    ]);

    for (const response of [list, detail, create, update, enable, disable, preview]) {
      assert.equal(response.statusCode, 403);
      assert.equal(response.json<{ code: string }>().code, "management_access_denied");
    }
  } finally {
    await app.close();
  }
});

test("derived metric mutations return stable validation envelopes for malformed bodies", async () => {
  const app = await buildApp();
  try {
    const invalidUpdate = await app.inject({
      method: "PUT",
      url: "/api/derived-metrics/custom.invalid"
    });
    const invalidPreview = await app.inject({
      method: "POST",
      url: "/api/derived-metrics/preview"
    });
    const invalidPreviewDefinition = await app.inject({
      method: "POST",
      payload: { metricScope: "cl" },
      url: "/api/derived-metrics/preview"
    });

    for (const response of [invalidUpdate, invalidPreview, invalidPreviewDefinition]) {
      assert.equal(response.statusCode, 422);
      const body = response.json<{ code: string; errors: Array<{ code: string }>; success: boolean }>();
      assert.equal(body.code, "derived_metric_validation_failed");
      assert.equal(body.errors[0]?.code, "invalid-definition");
      assert.equal(body.success, false);
    }
  } finally {
    await app.close();
  }
});

test("derived metric mutations reject malformed scalar fields with stable validation envelopes", async () => {
  const app = await buildApp();
  try {
    const malformedFields: Array<[string, unknown]> = [
      ["description", 42],
      ["enabled", "true"],
      ["managed", "false"],
      ["outputUnit", 42],
      ["precision", "1"],
      ["revision", "0"],
      ["acceptancePolicy", null]
    ];

    for (const [field, value] of malformedFields) {
      const response = await app.inject({
        method: "POST",
        payload: {
          ...customDefinitionForRoute(`custom.malformed-${field}`),
          [field]: value
        },
        url: "/api/derived-metrics"
      });
      assert.equal(response.statusCode, 422);
      const body = response.json<{ code: string; errors: Array<{ code: string }>; success: boolean }>();
      assert.equal(body.code, "derived_metric_validation_failed");
      assert.equal(body.errors.some(({ code }) => code === "invalid-definition"), true);
      assert.equal(body.success, false);
    }
  } finally {
    await app.close();
  }
});

test("disabled create and update payloads still validate expressions and inputs atomically", async () => {
  const app = await buildApp();
  try {
    const invalidCreate = await app.inject({
      method: "POST",
      payload: {
        ...customDefinitionForRoute("custom.disabled-invalid-create"),
        enabled: false,
        expression: "source ^ 2"
      },
      url: "/api/derived-metrics"
    });
    assert.equal(invalidCreate.statusCode, 422);
    const invalidCreateBody = invalidCreate.json<{ code: string; errors: Array<{ code: string }>; success: boolean }>();
    assert.equal(invalidCreateBody.code, "derived_metric_validation_failed");
    assert.equal(invalidCreateBody.errors.some(({ code }) => code === "invalid-token"), true);
    assert.equal(invalidCreateBody.success, false);
    assert.equal(
      databaseModule.getDatabase().prepare("SELECT 1 FROM derived_metric_definitions WHERE metric_key = ?").get("custom.disabled-invalid-create"),
      undefined
    );

    const invalidInputCreate = await app.inject({
      method: "POST",
      payload: {
        ...customDefinitionForRoute("custom.disabled-invalid-input"),
        enabled: false,
        inputs: [{
          alias: "source",
          kind: "metric",
          metricKey: "missing-disabled-input",
          scope: "output-site",
          unit: "kW"
        }]
      },
      url: "/api/derived-metrics"
    });
    assert.equal(invalidInputCreate.statusCode, 422);
    const invalidInputCreateBody = invalidInputCreate.json<{ code: string; errors: Array<{ code: string }>; success: boolean }>();
    assert.equal(invalidInputCreateBody.code, "derived_metric_validation_failed");
    assert.equal(invalidInputCreateBody.errors.some(({ code }) => code === "unknown-input"), true);
    assert.equal(invalidInputCreateBody.success, false);

    const metricKey = "custom.disabled-invalid-update";
    const created = await app.inject({
      method: "POST",
      payload: customDefinitionForRoute(metricKey),
      url: "/api/derived-metrics"
    });
    assert.equal(created.statusCode, 201);
    const invalidUpdate = await app.inject({
      method: "PUT",
      payload: {
        ...customDefinitionForRoute(metricKey, "process.exit()"),
        enabled: false
      },
      url: `/api/derived-metrics/${metricKey}`
    });
    assert.equal(invalidUpdate.statusCode, 422);
    const invalidUpdateBody = invalidUpdate.json<{ code: string; errors: Array<{ code: string }>; success: boolean }>();
    assert.equal(invalidUpdateBody.code, "derived_metric_validation_failed");
    assert.equal(invalidUpdateBody.errors.some(({ code }) => code === "invalid-token"), true);
    assert.equal(invalidUpdateBody.success, false);
    const stored = databaseModule.getDatabase().prepare(`
      SELECT expression, enabled FROM derived_metric_definitions WHERE metric_key = ?
    `).get(metricKey) as { expression: string; enabled: number };
    assert.deepEqual(stored, { expression: "source * 2", enabled: 1 });
  } finally {
    await app.close();
  }
});

test("management API lists managed definitions and atomically rejects invalid custom formulas", async () => {
  const app = await buildApp();
  try {
    const list = await app.inject({ method: "GET", url: "/api/derived-metrics" });
    assert.equal(list.statusCode, 200);
    assert.ok(list.json<{ definitions: unknown[] }>().definitions.length >= 7);

    const invalid = await app.inject({
      method: "POST",
      payload: {
        description: "bad",
        enabled: true,
        expression: "process.exit()",
        fallbackPolicy: "unavailable",
        inputs: [],
        managed: false,
        metricKey: "custom.unsafe",
        name: "Unsafe",
        outputScopePolicy: "site",
        outputUnit: "kW",
        precision: 1,
        revision: 0
      },
      url: "/api/derived-metrics"
    });
    assert.equal(invalid.statusCode, 422);
    assert.equal(invalid.json<{ errors: Array<{ code: string }> }>().errors[0]?.code, "invalid-token");
  } finally {
    await app.close();
  }
});

test("management registry remains reachable and reports stored compile exclusions", async () => {
  const database = databaseModule.getDatabase();
  database.prepare(`
    INSERT INTO derived_metric_definitions (
      metric_key, name, description, output_scope_policy, expression, output_unit,
      precision, fallback_policy, acceptance_policy, enabled, managed, revision,
      created_at, updated_at
    ) VALUES ('custom.routeStoredUnknown', 'Stored invalid', 'stored test', 'site', 'source * 2', 'kW', 1, 'unavailable', NULL, 1, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  database.prepare(`
    INSERT INTO derived_metric_inputs (
      derived_metric_key, alias, input_kind, metric_key, scope_selector, setting_key, unit, sort_order
    ) VALUES ('custom.routeStoredUnknown', 'source', 'metric', 'missingStoredMetric', 'output-site', NULL, 'kW', 0)
  `).run();

  const app = await buildApp();
  try {
    const response = await app.inject({ method: "GET", url: "/api/derived-metrics" });
    assert.equal(response.statusCode, 200);
    const body = response.json<{
      definitions: Array<{ metricKey: string }>;
      diagnostics: Array<{ metricKey: string; errors: Array<{ code: string }> }>;
    }>();
    assert.equal(body.definitions.some(({ metricKey }) => metricKey === "custom.routeStoredUnknown"), true);
    assert.equal(
      body.diagnostics.find(({ metricKey }) => metricKey === "custom.routeStoredUnknown")?.errors.some(({ code }) => code === "unknown-input"),
      true,
    );
  } finally {
    await app.close();
  }
});

test("preview resolves an explicit site without activating the draft", async () => {
  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "POST",
      payload: {
        definition: {
          description: "preview",
          enabled: true,
          expression: "source * 2",
          fallbackPolicy: "unavailable",
          inputs: [{ alias: "source", kind: "metric", metricKey: "realTimePower", scope: "output-site", unit: "kW" }],
          managed: false,
          metricKey: "custom.preview",
          name: "Preview",
          outputScopePolicy: "site",
          outputUnit: "kW",
          precision: 1,
          revision: 0
        },
        metricScope: "cl"
      },
      url: "/api/derived-metrics/preview"
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ evaluation: { metricScope: string } }>().evaluation.metricScope, "cl");
    const list = await app.inject({ method: "GET", url: "/api/derived-metrics" });
    assert.equal(
      list.json<{ definitions: Array<{ metricKey: string }> }>().definitions.some(({ metricKey }) => metricKey === "custom.preview"),
      false
    );
  } finally {
    await app.close();
  }
});

test("management API supports custom lifecycle and protects managed definitions", async () => {
  const app = await buildApp();
  try {
    const database = databaseModule.getDatabase();
    database.prepare(`
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES ('cl', 'realTimePower', 12, 'kW', ?, 'good', '{}')
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        value = excluded.value, unit = excluded.unit, timestamp = excluded.timestamp,
        quality = excluded.quality, raw_payload = excluded.raw_payload
    `).run(new Date().toISOString());
    const created = await app.inject({
      method: "POST",
      payload: customDefinitionForRoute("custom.routeLifecycle"),
      url: "/api/derived-metrics"
    });
    assert.equal(created.statusCode, 201);
    assert.equal(created.json<{ definition: { revision: number } }>().definition.revision, 1);

    const detail = await app.inject({ method: "GET", url: "/api/derived-metrics/custom.routeLifecycle" });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json<{ definition: { enabled: boolean } }>().definition.enabled, true);

    const updated = await app.inject({
      method: "PUT",
      payload: { ...customDefinitionForRoute("custom.routeLifecycle", "source * 3"), revision: 1 },
      url: "/api/derived-metrics/custom.routeLifecycle"
    });
    assert.equal(updated.statusCode, 200);
    assert.equal(updated.json<{ definition: { expression: string; revision: number } }>().definition.expression, "source * 3");
    assert.equal(updated.json<{ definition: { expression: string; revision: number } }>().definition.revision, 2);

    const disabled = await app.inject({
      method: "PATCH",
      payload: { enabled: false },
      url: "/api/derived-metrics/custom.routeLifecycle/enabled"
    });
    assert.equal(disabled.statusCode, 200);
    assert.equal(disabled.json<{ definition: { enabled: boolean; revision: number } }>().definition.enabled, false);
    assert.equal(disabled.json<{ definition: { enabled: boolean; revision: number } }>().definition.revision, 3);
    const disabledDetail = await app.inject({
      method: "GET",
      url: "/api/derived-metrics/custom.routeLifecycle?scope=cl"
    });
    assert.equal(disabledDetail.statusCode, 200);
    assert.equal(disabledDetail.json<{ evaluation: unknown }>().evaluation, null);
    assert.equal(
      database.prepare("SELECT 1 FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = 'custom.routeLifecycle'").get(),
      undefined
    );

    const enabled = await app.inject({
      method: "PATCH",
      payload: { enabled: true },
      url: "/api/derived-metrics/custom.routeLifecycle/enabled"
    });
    assert.equal(enabled.statusCode, 200);
    assert.equal(enabled.json<{ definition: { enabled: boolean; revision: number } }>().definition.enabled, true);
    assert.equal(enabled.json<{ definition: { enabled: boolean; revision: number } }>().definition.revision, 4);
    const enabledDetail = await app.inject({
      method: "GET",
      url: "/api/derived-metrics/custom.routeLifecycle?scope=cl"
    });
    assert.equal(enabledDetail.statusCode, 200);
    assert.equal(enabledDetail.json<{ evaluation: { status: string; value: number | null } }>().evaluation.status, "ready");
    assert.equal(enabledDetail.json<{ evaluation: { status: string; value: number | null } }>().evaluation.value, 36);
    assert.ok(
      database.prepare("SELECT 1 FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = 'custom.routeLifecycle'").get()
    );

    const managed = await app.inject({
      method: "PUT",
      payload: customDefinitionForRoute("selfConsumptionRatio", "source * 9"),
      url: "/api/derived-metrics/selfConsumptionRatio"
    });
    assert.equal(managed.statusCode, 409);
    assert.equal(managed.json<{ code: string }>().code, "derived_metric_managed_read_only");

    const managedDetail = await app.inject({ method: "GET", url: "/api/derived-metrics/selfConsumptionRatio" });
    assert.equal(managedDetail.statusCode, 200);
    assert.equal(managedDetail.json<{ definition: { managed: boolean; expression: string } }>().definition.managed, true);
    assert.notEqual(managedDetail.json<{ definition: { managed: boolean; expression: string } }>().definition.expression, "source * 9");

    const unscoped = await app.inject({
      method: "POST",
      payload: { ...customDefinitionForRoute("operator.metric"), name: "Unscoped" },
      url: "/api/derived-metrics"
    });
    assert.equal(unscoped.statusCode, 422);
    assert.equal(unscoped.json<{ errors: Array<{ code: string }> }>().errors[0]?.code, "invalid-definition");
  } finally {
    await app.close();
  }
});

test("management API rejects cyclic edits without replacing the active definition", async () => {
  const app = await buildApp();
  try {
    const database = databaseModule.getDatabase();
    database.prepare(`
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES ('cl', 'realTimePower', 12, 'kW', ?, 'good', '{}')
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        value = excluded.value, unit = excluded.unit, timestamp = excluded.timestamp,
        quality = excluded.quality, raw_payload = excluded.raw_payload
    `).run(new Date().toISOString());
    const created = await app.inject({
      method: "POST",
      payload: customDefinitionForRoute("custom.routeAtomic"),
      url: "/api/derived-metrics"
    });
    assert.equal(created.statusCode, 201);
    const beforeEvaluation = database.prepare(`
      SELECT status, value, source_timestamp, provenance_json
      FROM derived_metric_evaluations
      WHERE metric_scope = 'cl' AND metric_key = 'custom.routeAtomic'
    `).get();
    const beforeLive = database.prepare(`
      SELECT value, unit, timestamp, quality, raw_payload
      FROM live_metric_values
      WHERE metric_scope = 'cl' AND metric_key = 'custom.routeAtomic'
    `).get();
    assert.ok(beforeEvaluation);
    assert.ok(beforeLive);

    const rejected = await app.inject({
      method: "PUT",
      payload: {
        ...customDefinitionForRoute("custom.routeAtomic"),
        inputs: [{ alias: "source", kind: "metric", metricKey: "custom.routeAtomic", scope: "output-site", unit: "kW" }],
        revision: 1
      },
      url: "/api/derived-metrics/custom.routeAtomic"
    });
    assert.equal(rejected.statusCode, 422);
    assert.equal(rejected.json<{ errors: Array<{ code: string }> }>().errors.some(({ code }) => code === "cycle"), true);
    assert.deepEqual(
      database.prepare(`
        SELECT status, value, source_timestamp, provenance_json
        FROM derived_metric_evaluations
        WHERE metric_scope = 'cl' AND metric_key = 'custom.routeAtomic'
      `).get(),
      beforeEvaluation
    );
    assert.deepEqual(
      database.prepare(`
        SELECT value, unit, timestamp, quality, raw_payload
        FROM live_metric_values
        WHERE metric_scope = 'cl' AND metric_key = 'custom.routeAtomic'
      `).get(),
      beforeLive
    );

    const detail = await app.inject({ method: "GET", url: "/api/derived-metrics/custom.routeAtomic" });
    const definition = detail.json<{ definition: { inputs: Array<{ metricKey?: string }>; revision: number } }>().definition;
    assert.equal(detail.statusCode, 200);
    assert.equal(definition.revision, 1);
    assert.equal(definition.inputs[0]?.metricKey, "realTimePower");
  } finally {
    await app.close();
  }
});

test("preview returns effective diagnostics without mutating registry state", async () => {
  const app = await buildApp();
  try {
    const database = databaseModule.getDatabase();
    const observedAt = new Date().toISOString();
    database.prepare(`
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES ('cl', 'realTimePower', 12, 'kW', ?, 'good', '{}')
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        value = excluded.value, unit = excluded.unit, timestamp = excluded.timestamp,
        quality = excluded.quality, raw_payload = excluded.raw_payload
    `).run(observedAt);
    const beforeRevision = database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").get();
    const beforeEvaluationCount = database.prepare("SELECT COUNT(*) AS count FROM derived_metric_evaluations").get();
    const beforeLiveCount = database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get();

    const response = await app.inject({
      method: "POST",
      payload: {
        definition: customDefinitionForRoute("custom.routePreview", "source * 2"),
        metricScope: "cl"
      },
      url: "/api/derived-metrics/preview"
    });
    assert.equal(response.statusCode, 200);
    const evaluation = response.json<{
      evaluation: {
        dependencies: Array<{ alias: string; metricScope?: string; value: number | null }>;
        freshnessState: string;
        metricScope: string;
        outputUnit: string;
        precision: number;
        status: string;
        value: number | null;
      };
    }>().evaluation;
    assert.equal(evaluation.status, "ready");
    assert.equal(evaluation.value, 24);
    assert.equal(evaluation.metricScope, "cl");
    assert.equal(evaluation.outputUnit, "kW");
    assert.equal(evaluation.precision, 1);
    assert.equal(evaluation.freshnessState, "fresh");
    assert.deepEqual(evaluation.dependencies.map(({ alias, metricScope, value }) => ({ alias, metricScope, value })), [
      { alias: "source", metricScope: "cl", value: 12 }
    ]);

    assert.equal(database.prepare("SELECT 1 FROM derived_metric_definitions WHERE metric_key = 'custom.routePreview'").get(), undefined);
    assert.equal(database.prepare("SELECT 1 FROM derived_metric_evaluations WHERE metric_key = 'custom.routePreview'").get(), undefined);
    assert.deepEqual(database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").get(), beforeRevision);
    assert.deepEqual(database.prepare("SELECT COUNT(*) AS count FROM derived_metric_evaluations").get(), beforeEvaluationCount);
    assert.deepEqual(database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get(), beforeLiveCount);
  } finally {
    await app.close();
  }
});

test("preview resolves global scope and reports unavailable failures without persistence", async () => {
  const app = await buildApp();
  try {
    const database = databaseModule.getDatabase();
    const observedAt = new Date().toISOString();
    database.prepare(`
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES (?, 'realTimePower', ?, 'kW', ?, 'good', '{}')
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        value = excluded.value, unit = excluded.unit, timestamp = excluded.timestamp,
        quality = excluded.quality, raw_payload = excluded.raw_payload
    `).run("cl", 12, observedAt);
    database.prepare(`
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES (?, 'realTimePower', ?, 'kW', ?, 'good', '{}')
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        value = excluded.value, unit = excluded.unit, timestamp = excluded.timestamp,
        quality = excluded.quality, raw_payload = excluded.raw_payload
    `).run("kn", 20, observedAt);
    const beforeRevision = database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").get();
    const beforeEvaluationCount = database.prepare("SELECT COUNT(*) AS count FROM derived_metric_evaluations").get();
    const beforeLiveCount = database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get();

    const readyResponse = await app.inject({
      method: "POST",
      payload: {
        definition: {
          description: "global preview",
          enabled: true,
          expression: "clPower + knPower",
          fallbackPolicy: "unavailable",
          inputs: [
            { alias: "clPower", kind: "metric", metricKey: "realTimePower", scope: "cl", unit: "kW" },
            { alias: "knPower", kind: "metric", metricKey: "realTimePower", scope: "kn", unit: "kW" }
          ],
          managed: false,
          metricKey: "custom.globalPreview",
          name: "Global preview",
          outputScopePolicy: "global",
          outputUnit: "kW",
          precision: 1,
          revision: 0
        },
        metricScope: "global"
      },
      url: "/api/derived-metrics/preview"
    });
    assert.equal(readyResponse.statusCode, 200);
    const readyEvaluation = readyResponse.json<{
      evaluation: {
        dependencies: Array<{ alias: string; metricKey?: string; metricScope?: string; unit: string; value: number | null }>;
        freshnessState: string;
        metricScope: string;
        outputUnit: string;
        precision: number;
        status: string;
        value: number | null;
      };
    }>().evaluation;
    assert.equal(readyEvaluation.status, "ready");
    assert.equal(readyEvaluation.value, 32);
    assert.equal(readyEvaluation.metricScope, "global");
    assert.equal(readyEvaluation.outputUnit, "kW");
    assert.equal(readyEvaluation.precision, 1);
    assert.equal(readyEvaluation.freshnessState, "fresh");
    assert.deepEqual(
      readyEvaluation.dependencies.map(({ alias, metricKey, metricScope, unit, value }) => ({
        alias,
        metricKey,
        metricScope,
        unit,
        value
      })),
      [
        { alias: "clPower", metricKey: "realTimePower", metricScope: "cl", unit: "kW", value: 12 },
        { alias: "knPower", metricKey: "realTimePower", metricScope: "kn", unit: "kW", value: 20 }
      ]
    );
    assert.equal(database.prepare("SELECT 1 FROM derived_metric_definitions WHERE metric_key = 'custom.globalPreview'").get(), undefined);
    assert.equal(database.prepare("SELECT 1 FROM derived_metric_evaluations WHERE metric_key = 'custom.globalPreview'").get(), undefined);
    assert.deepEqual(database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").get(), beforeRevision);
    assert.deepEqual(database.prepare("SELECT COUNT(*) AS count FROM derived_metric_evaluations").get(), beforeEvaluationCount);
    assert.deepEqual(database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get(), beforeLiveCount);

    database.prepare("DELETE FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = 'realTimePower'").run();
    const beforeUnavailableEvaluationCount = database.prepare("SELECT COUNT(*) AS count FROM derived_metric_evaluations").get();
    const beforeUnavailableLiveCount = database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get();
    const unavailableResponse = await app.inject({
      method: "POST",
      payload: {
        definition: {
          description: "global unavailable preview",
          enabled: true,
          expression: "source * 2",
          fallbackPolicy: "unavailable",
          inputs: [{ alias: "source", kind: "metric", metricKey: "realTimePower", scope: "cl", unit: "kW" }],
          managed: false,
          metricKey: "custom.globalUnavailablePreview",
          name: "Global unavailable preview",
          outputScopePolicy: "global",
          outputUnit: "kW",
          precision: 1,
          revision: 0
        },
        metricScope: "global"
      },
      url: "/api/derived-metrics/preview"
    });
    assert.equal(unavailableResponse.statusCode, 200);
    const unavailableEvaluation = unavailableResponse.json<{
      evaluation: {
        dependencies: Array<{ alias: string; metricScope?: string; value: number | null }>;
        failureCode: string | null;
        freshnessState: string;
        status: string;
        timestamp: string | null;
        value: number | null;
      };
    }>().evaluation;
    assert.equal(unavailableEvaluation.status, "unavailable");
    assert.equal(unavailableEvaluation.failureCode, "input-unavailable");
    assert.equal(unavailableEvaluation.freshnessState, "unavailable");
    assert.equal(unavailableEvaluation.value, null);
    assert.equal(unavailableEvaluation.timestamp, null);
    assert.deepEqual(unavailableEvaluation.dependencies, [
      {
        alias: "source",
        kind: "metric",
        metricKey: "realTimePower",
        metricScope: "cl",
        sourceTopic: "kuozui/plant/solar/power",
        unit: "kW",
        value: null
      }
    ]);
    assert.equal(database.prepare("SELECT 1 FROM derived_metric_definitions WHERE metric_key = 'custom.globalUnavailablePreview'").get(), undefined);
    assert.equal(database.prepare("SELECT 1 FROM derived_metric_evaluations WHERE metric_key = 'custom.globalUnavailablePreview'").get(), undefined);
    assert.deepEqual(database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").get(), beforeRevision);
    assert.deepEqual(database.prepare("SELECT COUNT(*) AS count FROM derived_metric_evaluations").get(), beforeUnavailableEvaluationCount);
    assert.deepEqual(database.prepare("SELECT COUNT(*) AS count FROM live_metric_values").get(), beforeUnavailableLiveCount);
  } finally {
    await app.close();
  }
});
