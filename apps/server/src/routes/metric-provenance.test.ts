import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-metric-provenance-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ buildApp }, { migrateDatabase }, { seedDatabase }, { getDatabase, closeDatabaseConnection }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js")
]);

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

function insertDerivedMetric(args: {
  expression: string;
  inputs: Array<{
    alias: string;
    kind: "metric" | "calculation-setting";
    metricKey?: string;
    scope?: "output-site" | "cl" | "kn" | "global";
    settingKey?: string;
    unit: string;
  }>;
  metricKey: string;
  name: string;
  outputUnit: string;
}) {
  const database = getDatabase();
  database.prepare(`
    INSERT INTO derived_metric_definitions (
      metric_key, name, description, output_scope_policy, expression, output_unit,
      precision, fallback_policy, enabled, managed, revision
    ) VALUES (?, ?, '', 'site', ?, ?, 2, 'unavailable', 1, 0, 1)
  `).run(args.metricKey, args.name, args.expression, args.outputUnit);
  const insertInput = database.prepare(`
    INSERT INTO derived_metric_inputs (
      derived_metric_key, alias, input_kind, metric_key, scope_selector, setting_key, unit, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  args.inputs.forEach((input, index) => {
    insertInput.run(
      args.metricKey,
      input.alias,
      input.kind,
      input.metricKey ?? null,
      input.scope ?? null,
      input.settingKey ?? null,
      input.unit,
      index
    );
  });
}

function seedProvenanceFixture() {
  migrateDatabase();
  seedDatabase();
  const database = getDatabase();
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('cl', 'custom.provenanceSource', ?, '$.value', 'kWh', 1)
  `).run("mqtt://topic-user:topic-password@broker.example/data?token=topic-token&keep=visible");
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'custom.provenanceSource', 20, 'kWh', '2026-08-31T00:00:00.000Z', 'good', ?)
  `).run(JSON.stringify({ password: "raw-password", token: "raw-token", message: "raw-exception" }));

  insertDerivedMetric({
    expression: "source * factor",
    inputs: [
      { alias: "source", kind: "metric", metricKey: "custom.provenanceSource", scope: "output-site", unit: "kWh" },
      { alias: "factor", kind: "calculation-setting", settingKey: "carbonEmissionFactor", unit: "kg/kWh" }
    ],
    metricKey: "custom.provenanceDerived",
    name: "Provenance Derived",
    outputUnit: "kg"
  });
  insertDerivedMetric({
    expression: "left + right",
    inputs: [
      { alias: "left", kind: "metric", metricKey: "custom.provenanceDerived", scope: "output-site", unit: "kg" },
      { alias: "right", kind: "metric", metricKey: "custom.provenanceDerived", scope: "output-site", unit: "kg" }
    ],
    metricKey: "custom.provenanceRoot",
    name: "Provenance Root",
    outputUnit: "kg"
  });

  database.prepare(`
    INSERT INTO display_page_stage_configs (
      page_key, stage, config_json, version, updated_at, published_at, published_by
    ) VALUES ('overview', 'live', ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'provenance-test')
    ON CONFLICT(page_key, stage) DO UPDATE SET
      config_json = excluded.config_json,
      version = excluded.version,
      updated_at = excluded.updated_at,
      published_at = excluded.published_at,
      published_by = excluded.published_by
  `).run(JSON.stringify({
    regions: {
      dataBindings: {
        customPower: {
          dataBinding: {
            metricKey: "custom.provenanceRoot",
            scope: "cl",
            sourceType: "metric"
          },
          itemId: "customPower"
        }
      }
    }
  }));
}

test("provenance redacts URL host, path, and query details from source topics", async () => {
  migrateDatabase();
  seedDatabase();
  const database = getDatabase();
  const privateTopic = "https://source-user:source-password@10.20.30.40/private/metrics?token=private-token&query=private-query";
  database.prepare(`
    INSERT INTO topic_mappings (metric_scope, metric_key, topic, value_path, unit, enabled)
    VALUES ('cl', 'custom.privateUrlSource', ?, '$.value', 'kWh', 1)
  `).run(privateTopic);
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES ('cl', 'custom.privateUrlSource', 21, 'kWh', '2026-08-31T00:00:00.000Z', 'good', ?)
  `).run(JSON.stringify({ error: "raw internal exception", token: "raw-token" }));

  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/data-hub/provenance?metricKey=custom.privateUrlSource&scope=cl"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      nodes: Array<{ category: string; label: string; metadata?: Record<string, unknown> }>;
    };
    const topicNode = body.nodes.find(({ category }) => category === "mqtt-topic");
    assert.equal(topicNode?.label, "https://[REDACTED]");
    const serialized = JSON.stringify(body);
    for (const leakedValue of [
      "source-user",
      "source-password",
      "10.20.30.40",
      "/private/metrics",
      "private-token",
      "private-query",
      "raw internal exception",
      "raw-token"
    ]) {
      assert.equal(serialized.includes(leakedValue), false, leakedValue);
    }
  } finally {
    await app.close();
  }
});

test("GET /api/data-hub/provenance returns a bounded, redacted provenance graph", async () => {
  seedProvenanceFixture();
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/data-hub/provenance?metricKey=custom.provenanceRoot&scope=cl&maxDepth=6"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      edges: Array<{ from: string; kind: string; to: string }>;
      nodes: Array<{
        category: string;
        id: string;
        label: string;
        metadata?: Record<string, unknown>;
        scope: string | null;
        status: string | null;
      }>;
      truncated: boolean;
    };
    assert.equal(body.truncated, false);
    assert.ok(body.nodes.some(({ category }) => category === "source-connection"));
    assert.ok(body.nodes.some(({ category }) => category === "mqtt-topic"));
    assert.ok(body.nodes.some(({ category }) => category === "semantic-metric"));
    assert.ok(body.nodes.some(({ category }) => category === "calculation-setting"));
    assert.ok(body.nodes.some(({ category }) => category === "derived-metric"));
    assert.ok(body.nodes.some(({ category }) => category === "widget"));
    assert.ok(body.edges.some(({ kind }) => kind === "produces"));
    assert.ok(body.edges.some(({ kind }) => kind === "depends-on"));
    assert.ok(body.edges.some(({ kind }) => kind === "used-by"));

    const nodeIdentities = body.nodes.map(({ id }) => id);
    assert.equal(new Set(nodeIdentities).size, nodeIdentities.length);
    const edgeIdentities = body.edges.map(({ from, kind, to }) => `${kind}:${from}:${to}`);
    assert.equal(new Set(edgeIdentities).size, edgeIdentities.length);
    const nodeIds = new Set(nodeIdentities);
    assert.ok(body.edges.every(({ from, to }) => nodeIds.has(from) && nodeIds.has(to)));
    assert.ok(body.edges.some(({ from, to, kind }) => kind === "produces" && from.startsWith("derived-metric:") && to.startsWith("semantic-metric:") && from !== to));

    const serialized = JSON.stringify(body);
    assert.doesNotMatch(serialized, /topic-password|topic-token|raw-password|raw-token|raw-exception/u);
    assert.match(serialized, /\[REDACTED\]/u);

    const canonical = await app.inject({
      method: "GET",
      url: "/api/data-hub/provenance?metricKey=todayCo2Reduction&scope=cl&maxDepth=6"
    });
    assert.equal(canonical.statusCode, 200);
    const canonicalBody = canonical.json() as {
      nodes: Array<{ category: string }>;
    };
    assert.ok(canonicalBody.nodes.some(({ category }) => category === "managed-source"));
    assert.ok(canonicalBody.nodes.some(({ category }) => category === "readiness-consumer"));
    assert.ok(canonicalBody.nodes.some(({ category }) => category === "page"));

    const shallow = await app.inject({
      method: "GET",
      url: "/api/data-hub/provenance?metricKey=custom.provenanceRoot&scope=cl&maxDepth=1"
    });
    assert.equal(shallow.statusCode, 200);
    assert.equal(shallow.json().truncated, true);

    const small = await app.inject({
      method: "GET",
      url: "/api/data-hub/provenance?metricKey=custom.provenanceRoot&scope=cl&maxNodes=2"
    });
    assert.equal(small.statusCode, 200);
    assert.equal(small.json().truncated, true);
    assert.ok(small.json().nodes.length <= 2);

    const invalidScope = await app.inject({
      method: "GET",
      url: "/api/data-hub/provenance?metricKey=custom.provenanceRoot&scope=all"
    });
    assert.equal(invalidScope.statusCode, 400);

    const denied = await app.inject({
      method: "GET",
      remoteAddress: "198.51.100.24",
      url: "/api/data-hub/provenance?metricKey=custom.provenanceRoot&scope=cl"
    });
    assert.equal(denied.statusCode, 403);
  } finally {
    await app.close();
  }
});

test("provenance graph terminates on persisted cycles and rejects limits above hard caps", async () => {
  insertDerivedMetric({
    expression: "next + 1",
    inputs: [
      { alias: "next", kind: "metric", metricKey: "custom.provenanceCycleB", scope: "output-site", unit: "kg" }
    ],
    metricKey: "custom.provenanceCycleA",
    name: "Cycle A",
    outputUnit: "kg"
  });
  insertDerivedMetric({
    expression: "next + 1",
    inputs: [
      { alias: "next", kind: "metric", metricKey: "custom.provenanceCycleA", scope: "output-site", unit: "kg" }
    ],
    metricKey: "custom.provenanceCycleB",
    name: "Cycle B",
    outputUnit: "kg"
  });

  const app = await buildApp();
  try {
    const cycle = await app.inject({
      method: "GET",
      url: "/api/data-hub/provenance?metricKey=custom.provenanceCycleA&scope=cl&maxDepth=6"
    });
    assert.equal(cycle.statusCode, 200);
    const cycleBody = cycle.json() as {
      edges: Array<{ from: string; kind: string; to: string }>;
      nodes: Array<{ category: string; id: string }>;
    };
    assert.ok(cycleBody.nodes.length < 20);
    assert.equal(
      new Set(cycleBody.nodes.map(({ category, id }) => `${category}:${id}`)).size,
      cycleBody.nodes.length
    );
    assert.equal(
      new Set(cycleBody.edges.map(({ from, kind, to }) => `${kind}:${from}:${to}`)).size,
      cycleBody.edges.length
    );

    for (const query of [
      "maxDepth=7",
      "maxNodes=201",
      "maxDepth=0",
      "maxNodes=0",
      "maxDepth=1.5",
      "maxNodes=not-a-number"
    ]) {
      const response = await app.inject({
        method: "GET",
        url: `/api/data-hub/provenance?metricKey=custom.provenanceCycleA&scope=cl&${query}`
      });
      assert.equal(response.statusCode, query === "maxDepth=0" ? 200 : 400, query);
      if (query === "maxDepth=0") {
        assert.equal(response.json().maxDepth, 0);
        assert.equal(response.json().nodes.length, 1);
        assert.equal(response.json().truncated, true);
      }
    }
  } finally {
    await app.close();
  }
});
