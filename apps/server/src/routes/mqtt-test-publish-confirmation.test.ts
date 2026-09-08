import assert from "node:assert/strict";
import test from "node:test";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { applyGuidedMapping, previewGuidedMapping } from "../services/guidedMqttMappingService.js";
import { buildApp, getDatabase } from "./display-pages-asset-governance.test-support.js";

const source: MeterSourceDefinition = {
  channelId: "kn-main", meterId: "kn-main", metricKey: "consumptionEnergy", metricScope: "kn",
  enabled: true, reviewStatus: "reviewed", measurementKind: "cumulative-energy", energyFlowRole: "consumption",
  inputUnit: "kWh", scaleDecimal: "1", sourceRevision: 1, epochId: "one", expectedCadenceSeconds: 60,
  sourceTimestampTimeZone: null, timestampPolicy: "source-required"
};
/** The configured topic deliberately differs from the `kn/kn-main` naming convention. */
const configuredTopic = "factory/kn/main";
const confirmationUrl = "/api/settings/mqtt/topics/consumptionEnergy/publish-confirmation";
const publishUrl = "/api/settings/mqtt/topics/consumptionEnergy/publish";

function reviewConfiguredMapping(topic = configuredTopic, definition = source) {
  const database = getDatabase();
  const draft = {
    channelId: definition.channelId, energyFlowRole: definition.energyFlowRole,
    measurementKind: definition.measurementKind, metricScope: definition.metricScope,
    selector: { path: ["value"] }, source: definition, timestampPolicy: definition.timestampPolicy, topic
  };
  const preview = previewGuidedMapping(database, draft);
  return applyGuidedMapping(database, {
    canonicalDraft: preview.canonicalDraft, idempotencyKey: `confirmation-${topic}-${definition.sourceRevision}`,
    meterId: definition.meterId, previewToken: preview.previewToken, source: definition
  });
}

function trackPublishes(app: Awaited<ReturnType<typeof buildApp>>) {
  const published: Array<{ options: { retain?: boolean }; payload: string; topic: string }> = [];
  app.mqttClientService.publish = async (topic: string, payload: string, options: { retain?: boolean } = {}) => {
    published.push({ options, payload, topic });
    return { mode: "mqtt" as const, payload, success: true as const, topic };
  };
  return published;
}

test("R4 confirmation binds the configured topic, not a naming convention, and publishes exactly that payload", async () => {
  reviewConfiguredMapping();
  const app = await buildApp();
  const published = trackPublishes(app);
  try {
    const confirmation = await app.inject({
      method: "POST", payload: { metricScope: "kn", value: 123.75 }, url: confirmationUrl
    });
    assert.equal(confirmation.statusCode, 200, confirmation.body);
    const target = confirmation.json();
    assert.equal(target.exactTopic, configuredTopic, "confirmation must show the resolved topic the server will use");
    assert.notEqual(target.exactTopic, "kn/kn-main");
    assert.equal(target.metricScope, "kn");
    assert.equal(target.metricKey, "consumptionEnergy");
    assert.equal(target.retain, false, "retain must default to false");
    assert.equal(target.value, "123.75", "confirmation must echo the reviewed operator value");
    assert.equal(target.source.channelId, source.channelId);
    assert.equal(target.source.meterId, source.meterId);
    assert.equal(target.source.sourceRevision, source.sourceRevision);
    assert.equal(target.source.inputUnit, source.inputUnit);
    assert.ok(target.broker, "confirmation must name the authorized broker reference");
    assert.ok(target.confirmationToken, "confirmation must be a server-issued short-lived token");
    assert.ok(target.targetFingerprint, "confirmation must be tied to the current target configuration");
    assert.equal(published.length, 0, "requesting a confirmation must publish nothing");

    const sent = await app.inject({
      method: "POST",
      payload: { confirmationToken: target.confirmationToken, confirmed: true, metricScope: "kn", value: 123.75 },
      url: publishUrl
    });
    assert.equal(sent.statusCode, 200, sent.body);
    assert.equal(sent.json().actualPublish, true);
    assert.equal(sent.json().topic, configuredTopic);
    assert.equal(published.length, 1);
    assert.equal(published[0]!.topic, configuredTopic);
    assert.equal(published[0]!.payload, target.payload, "the sent payload must be the confirmed payload");
    assert.equal(published[0]!.options.retain, false);
  } finally {
    await app.close();
  }
});

test("R4 a target change after confirmation is rejected with zero publishes and keeps the entered value", async () => {
  reviewConfiguredMapping();
  const app = await buildApp();
  const published = trackPublishes(app);
  try {
    const confirmation = await app.inject({
      method: "POST", payload: { metricScope: "kn", value: 500 }, url: confirmationUrl
    });
    assert.equal(confirmation.statusCode, 200, confirmation.body);
    const target = confirmation.json();

    reviewConfiguredMapping("factory/kn/replacement", { ...source, epochId: "two", sourceRevision: 2 });

    const stale = await app.inject({
      method: "POST",
      payload: { confirmationToken: target.confirmationToken, confirmed: true, metricScope: "kn", value: 500 },
      url: publishUrl
    });
    assert.equal(stale.statusCode, 409, stale.body);
    assert.equal(stale.json().error, "PUBLISH_TARGET_CHANGED");
    assert.equal(stale.json().value, "500", "the operator value must survive a required re-confirmation");
    assert.equal(published.length, 0, "a stale confirmation must never reach the broker");

    const refreshed = await app.inject({
      method: "POST", payload: { metricScope: "kn", value: 500 }, url: confirmationUrl
    });
    assert.equal(refreshed.statusCode, 200, refreshed.body);
    assert.equal(refreshed.json().exactTopic, "factory/kn/replacement");
    assert.notEqual(refreshed.json().targetFingerprint, target.targetFingerprint);
  } finally {
    await app.close();
  }
});

test("R4 a payload change after confirmation is rejected with zero publishes", async () => {
  reviewConfiguredMapping();
  const app = await buildApp();
  const published = trackPublishes(app);
  try {
    const target = (await app.inject({
      method: "POST", payload: { metricScope: "kn", value: 10 }, url: confirmationUrl
    })).json();
    const mismatched = await app.inject({
      method: "POST",
      payload: { confirmationToken: target.confirmationToken, confirmed: true, metricScope: "kn", value: 999 },
      url: publishUrl
    });
    assert.equal(mismatched.statusCode, 409, mismatched.body);
    assert.equal(mismatched.json().error, "PUBLISH_TARGET_CHANGED");
    assert.equal(published.length, 0);
  } finally {
    await app.close();
  }
});

test("R4 parse preview, cancellation and an unconfirmed request publish nothing and create no reading", async () => {
  reviewConfiguredMapping();
  const app = await buildApp();
  const published = trackPublishes(app);
  const database = getDatabase();
  try {
    const preview = await app.inject({
      method: "POST", payload: { metricScope: "kn", previewOnly: true, value: 10 }, url: publishUrl
    });
    assert.equal(preview.statusCode, 200, preview.body);
    assert.equal(preview.json().actualPublish, false);

    const unconfirmed = await app.inject({
      method: "POST", payload: { confirmed: false, metricScope: "kn", value: 10 }, url: publishUrl
    });
    assert.equal(unconfirmed.statusCode, 422);
    assert.equal(unconfirmed.json().error, "PUBLISH_CONFIRMATION_REQUIRED");

    await app.inject({ method: "POST", payload: { metricScope: "kn", value: 10 }, url: confirmationUrl });
    assert.equal(published.length, 0, "a confirmation the operator never submits must publish nothing");
    assert.equal(
      (database.prepare("SELECT COUNT(*) AS count FROM meter_readings_accepted").get() as { count: number }).count,
      0,
      "no confirmation step may create an accepted reading"
    );
    assert.equal(
      (database.prepare("SELECT COUNT(*) AS count FROM meter_live_state").get() as { count: number }).count,
      0
    );
  } finally {
    await app.close();
  }
});

test("R4 confirmation and publish keep management authorization and existing callers keep working", async () => {
  reviewConfiguredMapping();
  const app = await buildApp();
  const published = trackPublishes(app);
  try {
    const denied = await app.inject({
      method: "POST", payload: { metricScope: "kn", value: 1 }, remoteAddress: "198.51.100.2", url: confirmationUrl
    });
    assert.equal(denied.statusCode, 403);
    assert.equal(published.length, 0);

    const legacy = await app.inject({
      method: "POST", payload: { confirmed: true, metricScope: "kn", retain: false, value: 42 }, url: publishUrl
    });
    assert.equal(legacy.statusCode, 200, legacy.body);
    assert.equal(legacy.json().actualPublish, true);
    assert.equal(legacy.json().topic, configuredTopic);
    assert.equal(published.length, 1, "existing publish callers must not be silently disabled by the new confirmation");
  } finally {
    await app.close();
  }
});
