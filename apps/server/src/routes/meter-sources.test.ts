import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import Database from "better-sqlite3";
import Fastify from "fastify";
import { migrateScopedMetricIdentity } from "../db/scopedMetricMigration.js";
import { createManagementAccessControl } from "../plugins/managementAuth.js";
import meterSourcesRoute from "./meter-sources.js";

const source = {
  channelId: "main", meterId: "cl-main", metricKey: "sourceCrudEnergy", metricScope: "cl",
  enabled: true, reviewStatus: "reviewed", measurementKind: "cumulative-energy", energyFlowRole: "consumption",
  inputUnit: "kWh", scaleDecimal: "1", sourceRevision: 1, epochId: "one", expectedCadenceSeconds: 60,
  sourceTimestampTimeZone: null, timestampPolicy: "source-required"
};

test("source CRUD enforces management access, scope, validation and retained history", async () => {
  const database = new Database(":memory:");
  for (const file of readdirSync("src/db/migrations").filter(f => f.endsWith(".sql")).sort()) {
    if (file === "035_scoped_metric_identity.sql") migrateScopedMetricIdentity(database, { legacySiteScope: "cl" });
    else database.exec(readFileSync(`src/db/migrations/${file}`, "utf8"));
  }
  const app = Fastify();
  app.decorate("managementAccess", createManagementAccessControl({ managementAccessToken: "secret", trustedOrigins: [] }));
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
