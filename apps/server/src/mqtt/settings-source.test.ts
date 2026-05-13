import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveMqttSettings,
  shouldBootstrapStoredMqttSettings
} from "./settings-source.js";

test("resolveMqttSettings keeps stored database values over env overrides", () => {
  const settings = resolveMqttSettings(
    {
      MQTT_BROKER: "broker.example.internal",
      MQTT_CLIENT_ID: "env-client",
      MQTT_DATA_MODE: "mqtt",
      MQTT_PASSWORD: "env-password",
      MQTT_PORT: "2883",
      MQTT_USERNAME: "env-user"
    },
    {
      broker_host: "localhost",
      broker_port: 1883,
      client_id: "db-client",
      data_mode: "mock",
      message_timeout: 30,
      password: "db-password",
      reconnect_interval: 5000,
      username: "db-user"
    }
  );

  assert.deepEqual(settings, {
    broker_host: "localhost",
    broker_port: 1883,
    client_id: "db-client",
    data_mode: "mock",
    message_timeout: 30,
    password: "db-password",
    reconnect_interval: 5000,
    username: "db-user"
  });
});

test("resolveMqttSettings falls back to database and built-in defaults when env is missing", () => {
  const settings = resolveMqttSettings(
    {},
    {
      broker_host: null,
      broker_port: null,
      client_id: null,
      data_mode: null,
      message_timeout: null,
      password: null,
      reconnect_interval: null,
      username: null
    }
  );

  assert.deepEqual(settings, {
    broker_host: "localhost",
    broker_port: 1883,
    client_id: "solar-display-player",
    data_mode: "mqtt",
    message_timeout: 30,
    password: "",
    reconnect_interval: 5000,
    username: ""
  });
});

test("shouldBootstrapStoredMqttSettings detects legacy seeded localhost row", () => {
  assert.equal(
    shouldBootstrapStoredMqttSettings({
      broker_host: "localhost",
      broker_port: 1883,
      client_id: "solar-display-player",
      data_mode: "mqtt",
      message_timeout: 30,
      password: "",
      reconnect_interval: 5000,
      username: ""
    }),
    true
  );

  assert.equal(
    shouldBootstrapStoredMqttSettings({
      broker_host: "192.168.31.62",
      broker_port: 1883,
      client_id: "solar-display",
      data_mode: "mqtt",
      message_timeout: 30,
      password: "",
      reconnect_interval: 5000,
      username: ""
    }),
    false
  );
});
