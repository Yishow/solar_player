import assert from "node:assert/strict";
import test from "node:test";
import { buildSettingsPayload } from "./mqttSettingsRouteModel";
import type { MqttSettingsForm } from "./viewModel";

const baseSettings: MqttSettingsForm = {
  clientId: "solar-display-player",
  dataMode: "mqtt",
  host: "broker.internal",
  messageTimeout: "30",
  password: "secret",
  port: "1883",
  reconnectInterval: "5000",
  username: "operator"
};

test("buildSettingsPayload accepts complete integer strings without partial parsing", () => {
  assert.deepEqual(buildSettingsPayload(baseSettings), {
    clientId: "solar-display-player",
    dataMode: "mqtt",
    host: "broker.internal",
    messageTimeout: 30,
    password: "secret",
    port: 1883,
    reconnectInterval: 5000,
    username: "operator"
  });

  assert.equal(
    buildSettingsPayload({ ...baseSettings, reconnectInterval: "0" }).reconnectInterval,
    0
  );
});

test("buildSettingsPayload rejects malformed and out-of-range numeric strings", () => {
  const invalidSettings: MqttSettingsForm[] = [
    { ...baseSettings, port: "1883abc" },
    { ...baseSettings, port: "0" },
    { ...baseSettings, port: "65536" },
    { ...baseSettings, port: "1883.5" },
    { ...baseSettings, messageTimeout: "0" },
    { ...baseSettings, reconnectInterval: "-1" }
  ];

  for (const settings of invalidSettings) {
    assert.throws(() => buildSettingsPayload(settings));
  }
});

test("buildSettingsPayload rejects blank required text fields", () => {
  assert.throws(() => buildSettingsPayload({ ...baseSettings, host: "   " }));
  assert.throws(() => buildSettingsPayload({ ...baseSettings, clientId: "   " }));
});
