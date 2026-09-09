import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { MeterSourceDefinition } from "@solar-display/shared";
import type { MqttClient } from "mqtt";
import { MqttClientService } from "../mqtt/MqttClientService.js";
import { buildApp, getDatabase } from "./display-pages-asset-governance.test-support.js";

const source: MeterSourceDefinition = {
  channelId: "kn-reception-power",
  meterId: "kn-reception-power",
  metricKey: "receptionPower",
  metricScope: "kn",
  enabled: true,
  reviewStatus: "reviewed",
  measurementKind: "power-gauge",
  energyFlowRole: "consumption",
  inputUnit: "kW",
  scaleDecimal: "1",
  sourceRevision: 1,
  epochId: "reception-one",
  expectedCadenceSeconds: 60,
  sourceTimestampTimeZone: null,
  timestampPolicy: "source-required"
};
const draft = {
  channelId: source.channelId,
  energyFlowRole: source.energyFlowRole,
  measurementKind: source.measurementKind,
  metricScope: source.metricScope,
  selector: { path: ["value"] },
  source,
  timestampPolicy: source.timestampPolicy,
  topic: "factory/kn/reception-power"
};

class FakeMqttClient extends EventEmitter {
  connected = true;

  subscribe(_topics: string[], callback: (error?: Error | null) => void) {
    queueMicrotask(() => callback(null));
    return this;
  }

  unsubscribe(_topics: string[], callback: (error?: Error | null) => void) {
    queueMicrotask(() => callback(null));
    return this;
  }

  end(_force: boolean, _options: Record<string, never>, callback: () => void) {
    callback();
    return this;
  }
}

async function reviewedApplyPayload(
  app: Awaited<ReturnType<typeof buildApp>>,
  idempotencyKey: string
) {
  const preview = await app.inject({
    method: "POST",
    url: "/api/data-hub/mqtt-mappings/preview",
    payload: draft
  });
  assert.equal(preview.statusCode, 200, preview.body);
  return {
    canonicalDraft: preview.json().canonicalDraft,
    idempotencyKey,
    meterId: source.meterId,
    previewToken: preview.json().previewToken,
    source
  };
}

test("reviewed power production evidence is visible to an identical guided replay", async () => {
  const database = getDatabase();
  const app = await buildApp();
  const client = new FakeMqttClient();
  const runtime = app.mqttClientService as unknown as {
    connectFn: (url: string, options: unknown) => MqttClient;
  };
  runtime.connectFn = () => {
    queueMicrotask(() => client.emit("connect"));
    return client as unknown as MqttClient;
  };
  app.mqttClientService.subscribe = async () => undefined;
  app.mqttClientService.getActiveTopics = () => [draft.topic];
  app.mqttClientService.getStatus = () => ({
    broker: "synthetic:1883",
    clientId: "synthetic",
    connected: true,
    reason: "connected",
    updatedAt: new Date().toISOString()
  });

  try {
    const request = await reviewedApplyPayload(app, "power-reception-replay");
    const applied = await app.inject({
      method: "POST",
      url: "/api/data-hub/mqtt-mappings/apply",
      payload: request
    });
    assert.equal(applied.statusCode, 200, applied.body);
    assert.equal(applied.json().reception.observed, false);
    const appliedBody = applied.json();
    const sourceRowsAfterApply = database.prepare("SELECT * FROM meter_sources").all();
    const auditRowsAfterApply = database.prepare("SELECT * FROM meter_source_audit").all();
    const receiptRowsAfterApply = database.prepare("SELECT * FROM mapping_apply_receipts").all();

    await app.mqttClientService.connect();
    client.emit(
      "message",
      draft.topic,
      Buffer.from(JSON.stringify({ sourceTimestamp: "2026-09-08T01:00:00Z", value: 12.5 })),
      { dup: false, qos: 0, retain: false }
    );
    await new Promise((resolve) => setImmediate(resolve));

    const replayed = await app.inject({
      method: "POST",
      url: "/api/data-hub/mqtt-mappings/apply",
      payload: request
    });
    assert.equal(replayed.statusCode, 200, replayed.body);
    assert.equal(replayed.json().reception.observed, true);
    assert.notEqual(replayed.json().reception.lastAcceptedAt, null);
    assert.notEqual(replayed.json().reception.lastAcceptedAt, "2026-09-08T01:00:00Z");
    assert.deepEqual(Object.keys(replayed.json()).sort(), Object.keys(appliedBody).sort());
    assert.deepEqual(replayed.json().source, appliedBody.source);
    assert.deepEqual(database.prepare("SELECT * FROM meter_sources").all(), sourceRowsAfterApply);
    assert.deepEqual(database.prepare("SELECT * FROM meter_source_audit").all(), auditRowsAfterApply);
    assert.deepEqual(database.prepare("SELECT * FROM mapping_apply_receipts").all(), receiptRowsAfterApply);
    assert.deepEqual(
      database.prepare(`
        SELECT value, unit, timestamp
        FROM live_metric_values
        WHERE metric_scope = ? AND metric_key = ?
      `).get(source.metricScope, source.metricKey),
      { value: 12.5, unit: "kW", timestamp: "2026-09-08T01:00:00Z" }
    );
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count, 0);
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_readings_quarantine").get() as { count: number }).count, 0);
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM meter_live_state").get() as { count: number }).count, 0);
  } finally {
    await app.close();
  }
});
