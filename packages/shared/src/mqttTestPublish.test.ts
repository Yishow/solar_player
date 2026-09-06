import assert from "node:assert/strict";
import test from "node:test";
import { mqttSafetyActionPublishes, realPublishConfirmation } from "./mqttTestPublish.js";

test("U2-R4-S01 preview and connection test do not publish", () => {
  assert.equal(mqttSafetyActionPublishes("connection-test"), false);
  assert.equal(mqttSafetyActionPublishes("parse-preview"), false);
});

test("U2-R4-S02 real publish requires confirmation and defaults retain off", () => {
  assert.throws(
    () => realPublishConfirmation({
      broker: "mqtt.local",
      confirmed: false,
      metricScope: "kn",
      topic: "factory/kn/main",
      value: "10000.125"
    }),
    /PUBLISH_CONFIRMATION_REQUIRED/
  );
  const sent = realPublishConfirmation({
    broker: "mqtt.local",
    confirmed: true,
    metricScope: "kn",
    topic: "factory/kn/main",
    value: "10000.125"
  });
  assert.equal(sent.actualPublish, true);
  assert.equal(sent.retain, false);
});
