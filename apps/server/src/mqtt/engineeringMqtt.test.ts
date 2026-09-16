import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import type { MqttClient } from "mqtt";

const tempDir = mkdtempSync(join(tmpdir(), "solar-engineering-mqtt-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [
  { MqttClientService },
  { migrateDatabase },
  { getDatabase, closeDatabaseConnection },
  { applyEngineeringSource, previewEngineeringSource },
  { listEnabledGenericTopics }
] = await Promise.all([
  import("./MqttClientService.js"),
  import("../db/migrate.js"),
  import("../db/index.js"),
  import("../services/engineeringSourceService.js"),
  import("./MqttClientService.js")
]);

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

class FakeMqttClient extends EventEmitter {
  connected = true;
  subscriptions: string[][] = [];
  unsubscriptions: string[][] = [];

  subscribe(topics: string[], callback: (error?: Error | null) => void) {
    this.subscriptions.push([...topics]);
    queueMicrotask(() => callback(null));
    return this;
  }

  unsubscribe(topics: string[], callback: (error?: Error | null) => void) {
    this.unsubscriptions.push([...topics]);
    queueMicrotask(() => callback(null));
    return this;
  }

  end(_force: boolean, _options: Record<string, never>, callback: () => void) {
    callback();
    return this;
  }
}

function registerSource(
  engineeringId: "stamping" | "painting",
  mode: "power-gauge" | "daily-report" | "cumulative-energy",
  publisherId = "pub-kn"
) {
  const db = getDatabase();
  const purpose = mode === "power-gauge" ? "power" : "energy";
  const preview = previewEngineeringSource({
    sourceRef: `kn-eng-${engineeringId}-${purpose}`,
    sourceKind: "engineering",
    site: "kn",
    engineeringId,
    purpose,
    mode,
    exactTopic: mode === "power-gauge"
      ? `factory/guanyin/power/${engineeringId}`
      : `factory/guanyin/energy/${mode === "daily-report" ? "daily" : "cumulative"}/${engineeringId}`,
    approvedPublisherId: publisherId,
    definitionRevision: 1,
    calendarRevision: 1,
    unit: mode === "power-gauge" ? "kW" : "kWh",
    enabled: true,
    reviewStatus: "approved"
  });
  return applyEngineeringSource(db, {
    previewToken: preview.previewToken,
    expectedRevision: 0,
    draft: preview.canonicalDraft
  }).source;
}

function createService(client: FakeMqttClient) {
  return new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database: getDatabase(),
    logger: { debug: () => undefined, error: () => undefined, info: () => undefined, warn: () => undefined },
    managedSourceAdapters: []
  });
}

async function emit(client: FakeMqttClient, topic: string, payload: unknown) {
  client.emit("message", topic, Buffer.from(JSON.stringify(payload)), {
    dup: false,
    qos: 1,
    retain: false
  });
  await new Promise((resolve) => setImmediate(resolve));
}

test("KNE-R3: desired subscriptions union approved engineering and generic topics, then remove on disable", async () => {
  migrateDatabase();
  const db = getDatabase();
  db.prepare("DELETE FROM engineering_source_definitions").run();
  db.prepare("DELETE FROM topic_mappings").run();
  db.prepare(`
    INSERT INTO topic_mappings (
      metric_scope, metric_key, topic, enabled, created_at, updated_at
    ) VALUES ('kn', 'genericMetric', 'generic/topic', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  const source = registerSource("stamping", "power-gauge");
  const client = new FakeMqttClient();
  const service = createService(client);

  try {
    await service.connect();
    assert.ok(client.subscriptions.at(-1)?.includes("generic/topic"));
    assert.ok(client.subscriptions.at(-1)?.includes(source.exactTopic));

    const preview = previewEngineeringSource({ ...source, enabled: false });
    applyEngineeringSource(db, {
      previewToken: preview.previewToken,
      expectedRevision: source.configurationRevision,
      draft: preview.canonicalDraft
    });
    await service.subscribe(listEnabledGenericTopics(db));
    assert.ok(client.unsubscriptions.at(-1)?.includes(source.exactTopic));
    assert.ok(!service.getActiveTopics().includes(source.exactTopic));
    assert.ok(service.getActiveTopics().includes("generic/topic"));
  } finally {
    await service.disconnect();
  }
});

test("KNE-R4: registered reports are admitted while schema, calendar, publisher, and revision mismatches stop before generic fallback", async () => {
  migrateDatabase();
  const db = getDatabase();
  db.prepare("DELETE FROM engineering_source_definitions").run();
  db.prepare("DELETE FROM engineering_report_revisions").run();
  db.prepare("DELETE FROM engineering_report_heads").run();
  db.prepare("DELETE FROM engineering_projection_invalidations").run();
  db.prepare("DELETE FROM live_metric_values").run();
  db.prepare(`
    INSERT INTO topic_mappings (
      metric_scope, metric_key, topic, enabled, created_at, updated_at
    ) VALUES ('kn', 'shouldNotBeWritten', 'factory/guanyin/energy/daily/painting', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  const source = registerSource("painting", "daily-report");
  const client = new FakeMqttClient();
  const service = createService(client);
  const baseReport = {
    schemaVersion: 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "painting",
    publisherId: "pub-kn",
    definitionRevision: 1,
    calendarRevision: 1,
    measurementKind: "interval-energy",
    unit: "kWh",
    value: "150.0",
    periodStart: "2026-09-14T16:00:00Z",
    periodEnd: "2026-09-15T16:00:00Z",
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 1,
    publishedAt: "2026-09-16T01:00:00Z"
  };

  try {
    await service.connect();
    const unregistered = { ...baseReport, schemaVersion: 999 };
    await emit(client, "factory/guanyin/energy/daily/body", unregistered);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM engineering_report_heads").get() as { count: number }).count, 0);

    await emit(client, source.exactTopic, baseReport);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM engineering_report_heads").get() as { count: number }).count, 1);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM live_metric_values WHERE metric_key = 'shouldNotBeWritten'").get() as { count: number }).count, 0);

    for (const rejected of [
      { ...baseReport, schemaVersion: 999, dataRevision: 2 },
      { ...baseReport, calendarRevision: 2, dataRevision: 2 },
      { ...baseReport, publisherId: "other", dataRevision: 2 },
      { ...baseReport, definitionRevision: 2, dataRevision: 2 }
    ]) {
      await emit(client, source.exactTopic, rejected);
    }
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM engineering_report_heads").get() as { count: number }).count, 1);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM engineering_report_revisions").get() as { count: number }).count, 1);
  } finally {
    await service.disconnect();
  }
});

test("KNE-R4: an unregistered engineering power topic is handled without generic fallback", async () => {
  migrateDatabase();
  const db = getDatabase();
  db.prepare("DELETE FROM engineering_source_definitions").run();
  db.prepare("DELETE FROM topic_mappings").run();
  db.prepare("DELETE FROM live_metric_values").run();
  db.prepare(`
    INSERT INTO topic_mappings (
      metric_scope, metric_key, topic, enabled, created_at, updated_at
    ) VALUES ('kn', 'shouldNotBeWritten', 'factory/guanyin/power/stamping', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  const client = new FakeMqttClient();
  const service = createService(client);

  try {
    await service.connect();
    await emit(client, "factory/guanyin/power/stamping", {
      schemaVersion: 999,
      sourceKind: "engineering",
      site: "kn",
      engineeringId: "stamping",
      publisherId: "pub-kn",
      definitionRevision: 1,
      calendarRevision: 1,
      measurementKind: "power-gauge",
      unit: "kW",
      value: "42.5",
      observedAt: "2026-09-16T12:00:00Z",
      quality: "valid"
    });
    assert.equal(
      (db.prepare("SELECT COUNT(*) AS count FROM live_metric_values WHERE metric_key = 'shouldNotBeWritten'").get() as { count: number }).count,
      0
    );
  } finally {
    await service.disconnect();
  }
});

test("KNE-R3: registered power and cumulative packets enter engineering live interfaces", async () => {
  migrateDatabase();
  const db = getDatabase();
  db.prepare("DELETE FROM engineering_source_definitions").run();
  db.prepare("DELETE FROM live_metric_values").run();
  const power = registerSource("stamping", "power-gauge");
  const cumulative = registerSource("painting", "cumulative-energy");
  const client = new FakeMqttClient();
  const service = createService(client);

  try {
    await service.connect();
    await emit(client, power.exactTopic, {
      schemaVersion: 1,
      sourceKind: "engineering",
      site: "kn",
      engineeringId: "stamping",
      publisherId: "pub-kn",
      definitionRevision: 1,
      calendarRevision: 1,
      measurementKind: "power-gauge",
      unit: "kW",
      value: "42.5",
      observedAt: "2026-09-16T12:00:00Z",
      quality: "valid"
    });
    await emit(client, cumulative.exactTopic, {
      schemaVersion: 1,
      sourceKind: "engineering",
      site: "kn",
      engineeringId: "painting",
      publisherId: "pub-kn",
      definitionRevision: 1,
      calendarRevision: 1,
      measurementKind: "cumulative-energy",
      unit: "kWh",
      value: "1000.125",
      observedAt: "2026-09-16T12:00:00Z",
      counterEpoch: "epoch-1",
      quality: "valid"
    });
    assert.equal(
      (db.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'kn' AND metric_key = 'engineering.stamping.powerKw'").get() as { value: number }).value,
      42.5
    );
    assert.equal(
      (db.prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'kn' AND metric_key = 'engineering.painting.cumulativeKWh'").get() as { value: number }).value,
      1000.125
    );
  } finally {
    await service.disconnect();
  }
});
