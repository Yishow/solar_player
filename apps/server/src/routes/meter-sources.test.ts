import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import Database from "better-sqlite3";
import Fastify from "fastify";
import { migrateScopedMetricIdentity } from "../db/scopedMetricMigration.js";
import type { MqttClientService } from "../mqtt/MqttClientService.js";
import { createManagementAccessControl } from "../plugins/managementAuth.js";
import { readMetricUsage } from "../services/metricUsageService.js";
import { readSourceImpact } from "../services/sourceImpactService.js";
import meterSourcesRoute from "./meter-sources.js";

const source = {
  channelId: "main", meterId: "cl-main", metricKey: "sourceCrudEnergy", metricScope: "cl",
  enabled: true, reviewStatus: "reviewed", measurementKind: "cumulative-energy", energyFlowRole: "consumption",
  inputUnit: "kWh", scaleDecimal: "1", sourceRevision: 1, epochId: "one", expectedCadenceSeconds: 60,
  sourceTimestampTimeZone: null, timestampPolicy: "source-required"
};

const noopMqttClientService = {
  subscribe: async (_topics: string[]) => undefined
} as unknown as MqttClientService;

test("source CRUD enforces management access, scope, validation and retained history", async () => {
  const database = new Database(":memory:");
  for (const file of readdirSync("src/db/migrations").filter(f => f.endsWith(".sql")).sort()) {
    if (file === "035_scoped_metric_identity.sql") migrateScopedMetricIdentity(database, { legacySiteScope: "cl" });
    else database.exec(readFileSync(`src/db/migrations/${file}`, "utf8"));
  }
  const app = Fastify();
  app.decorate("managementAccess", createManagementAccessControl({ managementAccessToken: "secret", trustedOrigins: [] }));
  app.decorate("mqttClientService", noopMqttClientService);
  await app.register(meterSourcesRoute, { database });
  const url = "/api/data-hub/sites/cl/meter-sources";
  const headers = { "x-solar-management-token": "secret" };
  const remoteAddress = "198.51.100.2";
  try {
    for (const method of ["GET", "POST", "PUT", "DELETE"] as const) {
      const denied = await app.inject({ method, url: method === "PUT" || method === "DELETE" ? `${url}/main` : url, remoteAddress });
      assert.equal(denied.statusCode, 403);
    }
    for (const bad of [{ ...source, metricScope: "kn" }, { ...source, password: "secret" }, { ...source, departmentId: null }]) {
      const response = await app.inject({ method: "POST", url, headers, remoteAddress, payload: { source: bad, reason: "review" } });
      assert.equal(response.statusCode, 422);
      assert.equal(response.json().success, false);
      assert.ok(Number.isFinite(Date.parse(response.json().timestamp)));
      assert.ok(!response.body.includes("secret"));
    }
    assert.equal((database.prepare("SELECT COUNT(*) n FROM meter_sources").get() as {n:number}).n, 0);
    const created = await app.inject({ method: "POST", url, headers, remoteAddress, payload: { source: { ...source, boundaryMaxAgeSeconds: 90 }, reason: "review" } });
    assert.equal(created.statusCode, 201, created.body);
    assert.equal(created.json().source.boundaryMaxAgeSeconds, 90);
    const approval = await app.inject({ method: "PUT", url: `${url}/main`, headers, remoteAddress,
      payload: { source: { ...source, sourceRevision: 2, timestampPolicy: "allow-receive-time-estimate" } } });
    assert.equal(approval.statusCode, 422);
    const audit = database.prepare("SELECT actor, reason FROM meter_source_audit").all();
    assert.deepEqual(audit, [{ actor: "management", reason: "review" }]);
    const renamed = await app.inject({ method: "PUT", url: `${url}/main`, headers, remoteAddress, payload: { source: { ...source, displayNameZh: "新名稱" }, reason: "rename" } });
    assert.equal(renamed.statusCode, 200, renamed.body);
    assert.equal(renamed.json().source.sourceRevision, 1);
    assert.equal(renamed.json().source.boundaryMaxAgeSeconds, 90);
    const invalid = await app.inject({ method: "PUT", url: `${url}/main`, headers, remoteAddress, payload: { source: { ...source, inputUnit: "Wh" }, reason: "unit correction" } });
    assert.equal(invalid.statusCode, 409, invalid.body);
    database.prepare("INSERT INTO display_page_stage_configs (page_key,stage,config_json) VALUES ('test','draft',?)")
      .run(JSON.stringify({ dataBindings: { one: { itemId: "one", dataBinding: { metricKey: source.metricKey } } } }));
    const referenced = await app.inject({ method: "DELETE", url: `${url}/main`, headers, remoteAddress, payload: { expectedRevision: 1, reason: "retire" } });
    assert.equal(referenced.statusCode, 409, referenced.body);
    assert.equal(referenced.json().error, "E1_SOURCE_IN_USE");
    database.prepare("DELETE FROM display_page_stage_configs WHERE page_key='test'").run();
    database.prepare("INSERT INTO topic_mappings (metric_scope,metric_key,topic,unit,enabled) VALUES ('cl',?,'crud/topic','kWh',1)").run(source.metricKey);
    const removed = await app.inject({ method: "DELETE", url: `${url}/main`, headers, remoteAddress, payload: { expectedRevision: 1, reason: "retire" } });
    assert.equal(removed.statusCode, 200, removed.body);
    assert.equal((database.prepare("SELECT enabled FROM topic_mappings WHERE metric_key=?").get(source.metricKey) as {enabled:number}).enabled, 0);
    assert.equal((database.prepare("SELECT COUNT(*) n FROM meter_sources").get() as {n:number}).n, 1);
    const listed = await app.inject({ method: "GET", url, headers, remoteAddress });
    assert.deepEqual(listed.json().sources, []);
    const detail = await app.inject({ method: "GET", url: `${url}/main`, headers, remoteAddress });
    assert.equal(detail.json().source.enabled, false);
    assert.equal(detail.json().source.epochId, "one");
    const unknown = await app.inject({ method: "GET", url: url.replace("/cl/", "/all/"), headers, remoteAddress });
    assert.equal(unknown.statusCode, 422);
  } finally { await app.close(); database.close(); }
});

function migratedDatabase() {
  const database = new Database(":memory:");
  for (const file of readdirSync("src/db/migrations").filter(f => f.endsWith(".sql")).sort()) {
    if (file === "035_scoped_metric_identity.sql") migrateScopedMetricIdentity(database, { legacySiteScope: "cl" });
    else database.exec(readFileSync(`src/db/migrations/${file}`, "utf8"));
  }
  return database;
}

async function managementApp(database: Database.Database) {
  const app = Fastify();
  app.decorate("managementAccess", createManagementAccessControl({ managementAccessToken: "secret", trustedOrigins: [] }));
  app.decorate("mqttClientService", noopMqttClientService);
  await app.register(meterSourcesRoute, { database });
  return app;
}

/**
 * `todayGeneration` is referenced only by the display code's registered playback story and readiness
 * expectations. No draft binding, published live page widget binding or derived metric input points
 * at it — including after the derived-metric registry bootstraps at app start — and no operator
 * action can clear a registered expectation, so it must not hold a destructive source change the
 * way a resolvable reference does.
 */
const registeredOnlySource = {
  ...source, channelId: "kn-registered", meterId: "kn-registered",
  metricScope: "kn", metricKey: "todayGeneration"
};
const knUrl = "/api/data-hub/sites/kn/meter-sources";
const managementHeaders = { "x-solar-management-token": "secret" };
const managementAddress = "198.51.100.2";

function assertOnlyRegisteredExpectations(database: Database.Database, metricKey: string) {
  const usage = readMetricUsage(database, { metricKey, scope: "kn" });
  assert.ok(usage.length > 0, "the fixture destination must carry at least one registered expectation");
  assert.equal(
    usage.filter((row) => row.consumerType === "widget").length,
    0,
    "the fixture destination must carry no published live page widget binding"
  );
}

function mappingEnabled(database: Database.Database, metricKey: string) {
  return (database.prepare("SELECT enabled FROM topic_mappings WHERE metric_scope = 'kn' AND metric_key = ?")
    .get(metricKey) as { enabled: number } | undefined)?.enabled;
}

test("U2-R5 disabling a destination only registered expectations reference stays available", async () => {
  const database = migratedDatabase();
  const app = await managementApp(database);
  try {
    assertOnlyRegisteredExpectations(database, registeredOnlySource.metricKey);
    const created = await app.inject({
      method: "POST", url: knUrl, headers: managementHeaders, remoteAddress: managementAddress,
      payload: { source: registeredOnlySource, reason: "register" }
    });
    assert.equal(created.statusCode, 201, created.body);
    database.prepare("INSERT INTO topic_mappings (metric_scope,metric_key,topic,unit,enabled) VALUES ('kn',?,'registered/topic','kWh',1)")
      .run(registeredOnlySource.metricKey);

    const disabled = await app.inject({
      method: "DELETE", url: `${knUrl}/kn-registered`, headers: managementHeaders, remoteAddress: managementAddress,
      payload: { expectedRevision: 1, reason: "retire" }
    });
    assert.equal(disabled.statusCode, 200, disabled.body);
    assert.equal(disabled.json().source.enabled, false, "a registered expectation must not block a disable");
    assert.equal(
      mappingEnabled(database, registeredOnlySource.metricKey),
      0,
      "a permitted disable must leave the source and its mapping consistently disabled"
    );
  } finally { await app.close(); database.close(); }
});

test("U2-R5 moving a destination only registered expectations reference stays available", async () => {
  const database = migratedDatabase();
  const app = await managementApp(database);
  try {
    assertOnlyRegisteredExpectations(database, registeredOnlySource.metricKey);
    const created = await app.inject({
      method: "POST", url: knUrl, headers: managementHeaders, remoteAddress: managementAddress,
      payload: { source: registeredOnlySource, reason: "register" }
    });
    assert.equal(created.statusCode, 201, created.body);
    database.prepare("INSERT INTO topic_mappings (metric_scope,metric_key,topic,unit,enabled) VALUES ('kn',?,'registered/topic','kWh',1)")
      .run(registeredOnlySource.metricKey);
    // The replacement destination's transport already exists: this route synchronizes an existing
    // mapping's enabled state rather than creating one, so the row has to be present to observe it.
    database.prepare("INSERT INTO topic_mappings (metric_scope,metric_key,topic,unit,enabled) VALUES ('kn',?,'registered/topic','kWh',0)")
      .run("retiredPlantEnergy");

    const moved = await app.inject({
      method: "PUT", url: `${knUrl}/kn-registered`, headers: managementHeaders, remoteAddress: managementAddress,
      payload: { source: { ...registeredOnlySource, metricKey: "retiredPlantEnergy", sourceRevision: 2 }, reason: "retire destination" }
    });
    assert.equal(moved.statusCode, 200, moved.body);
    assert.equal(moved.json().source.metricKey, "retiredPlantEnergy", "a registered expectation must not block a destination change");
    assert.deepEqual(
      { previous: mappingEnabled(database, registeredOnlySource.metricKey), next: mappingEnabled(database, "retiredPlantEnergy") },
      { previous: 0, next: 1 },
      "the moved source must leave the original destination disabled and its new destination enabled"
    );
  } finally { await app.close(); database.close(); }
});

/**
 * Publishes a live page that binds `metricKey`, so the destination gains the one live consumer
 * an operator can actually edit away. The registry row and its place in the default playback
 * profile are created explicitly: a live stage config alone is not a published page.
 */
function publishLivePageBinding(database: Database.Database, metricKey: string) {
  database.prepare(`
    INSERT INTO display_page_registry (page_key, template_key, route_slug, label_zh, label_en, display_order)
    VALUES ('overview', 'overview', 'overview', '總覽', 'Overview', 1)
  `).run();
  database.prepare(`
    INSERT INTO playback_profile_pages (profile_id, page_id, enabled, display_order)
    SELECT profile.id, registry.id, 1, 1
    FROM playback_profiles AS profile, display_page_registry AS registry
    WHERE profile.profile_key = 'default' AND registry.page_key = 'overview'
  `).run();
  database.prepare(`
    INSERT INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at)
    VALUES ('overview', 'live', ?, 1, ?)
    ON CONFLICT(page_key, stage) DO UPDATE SET config_json = excluded.config_json
  `).run(
    JSON.stringify({ regions: { dataBindings: { power: { itemId: "power", dataBinding: { metricKey, scope: "kn", sourceType: "metric" } } } } }),
    new Date().toISOString()
  );
}

function referenceFromDraftPage(database: Database.Database, metricKey: string) {
  database.prepare(`
    INSERT INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at)
    VALUES ('overview', 'draft', ?, 1, ?)
    ON CONFLICT(page_key, stage) DO UPDATE SET config_json = excluded.config_json
  `).run(
    JSON.stringify({ regions: { dataBindings: { power: { itemId: "power", dataBinding: { metricKey, scope: "kn", sourceType: "metric" } } } } }),
    new Date().toISOString()
  );
}

function referenceFromDerivedMetric(database: Database.Database, metricKey: string) {
  database.prepare(`
    INSERT INTO derived_metric_definitions (
      metric_key, name, description, output_scope_policy, expression, output_unit,
      precision, fallback_policy, enabled, managed, revision
    ) VALUES ('registeredOnlyDerivedTotal', 'registeredOnlyDerivedTotal', '', 'site', 'a', 'kWh', 3, 'unavailable', 1, 0, 1)
  `).run();
  database.prepare(`
    INSERT INTO derived_metric_inputs (derived_metric_key, alias, input_kind, metric_key, scope_selector, unit, sort_order)
    VALUES ('registeredOnlyDerivedTotal', 'a', 'metric', ?, 'output-site', 'kWh', 0)
  `).run(metricKey);
}

/** Everything the direct source route must leave untouched when it rejects a destructive change. */
function committedWrites(database: Database.Database) {
  const rows = (sql: string) => JSON.stringify(database.prepare(sql).all());
  return {
    audit: rows("SELECT * FROM meter_source_audit ORDER BY id"),
    mappings: rows("SELECT * FROM topic_mappings ORDER BY id"),
    receipts: rows("SELECT * FROM mapping_apply_receipts ORDER BY idempotency_key"),
    sources: rows("SELECT * FROM meter_sources ORDER BY metric_scope, channel_id, source_revision")
  };
}

async function registerRegisteredOnlySource(app: Awaited<ReturnType<typeof managementApp>>, database: Database.Database) {
  const created = await app.inject({
    method: "POST", url: knUrl, headers: managementHeaders, remoteAddress: managementAddress,
    payload: { source: registeredOnlySource, reason: "register" }
  });
  assert.equal(created.statusCode, 201, created.body);
  database.prepare("INSERT INTO topic_mappings (metric_scope,metric_key,topic,unit,enabled) VALUES ('kn',?,'registered/topic','kWh',1)")
    .run(registeredOnlySource.metricKey);
}

test("U2-R5 Source mutations preserve identity ownership and concurrent work: each resolvable reference blocks a destructive change", async () => {
  const reference: Array<[string, "draft" | "live" | "derived", (database: Database.Database, metricKey: string) => void]> = [
    ["draft binding", "draft", referenceFromDraftPage],
    ["published live page widget binding", "live", publishLivePageBinding],
    ["derived metric input", "derived", referenceFromDerivedMetric]
  ];
  for (const [label, expectedKind, addReference] of reference) {
    const database = migratedDatabase();
    const app = await managementApp(database);
    try {
      assertOnlyRegisteredExpectations(database, registeredOnlySource.metricKey);
      await registerRegisteredOnlySource(app, database);
      addReference(database, registeredOnlySource.metricKey);
      // Each case must be held by its own mechanism, not by whichever reference happens to exist.
      // A page template can bind one destination from more than one item, so the count is not fixed.
      const blocking = readSourceImpact(database, {
        metricKey: registeredOnlySource.metricKey, metricScope: "kn"
      }).consumers;
      assert.deepEqual(
        [...new Set(blocking.map((row) => row.kind))],
        [expectedKind],
        `${label}: the blocking set must hold this reference and nothing else`
      );
      const before = committedWrites(database);

      const rejected = await app.inject({
        method: "DELETE", url: `${knUrl}/kn-registered`, headers: managementHeaders, remoteAddress: managementAddress,
        payload: { expectedRevision: 1, reason: "retire" }
      });
      assert.equal(rejected.statusCode, 409, `${label}: ${rejected.body}`);
      assert.equal(rejected.json().error, "E1_SOURCE_IN_USE", label);
      assert.deepEqual(committedWrites(database), before, `${label}: a rejected change must write nothing`);
    } finally { await app.close(); database.close(); }
  }
});

test("U2-R5 an unreadable impact lookup rejects a destructive change instead of reading as no dependency", async () => {
  const database = migratedDatabase();
  const app = await managementApp(database);
  try {
    await registerRegisteredOnlySource(app, database);
    // Only the impact read consults this table, so the ownership authorities stay readable and the
    // rejection can only come from the dependency lookup failing.
    database.exec("DROP TABLE display_page_stage_configs");
    const before = committedWrites(database);

    const rejected = await app.inject({
      method: "DELETE", url: `${knUrl}/kn-registered`, headers: managementHeaders, remoteAddress: managementAddress,
      payload: { expectedRevision: 1, reason: "retire" }
    });
    assert.equal(rejected.statusCode, 409, rejected.body);
    assert.equal(rejected.json().error, "E1_SOURCE_IMPACT_UNKNOWN");
    assert.deepEqual(committedWrites(database), before, "an unknown impact must write nothing");
  } finally { await app.close(); database.close(); }
});
