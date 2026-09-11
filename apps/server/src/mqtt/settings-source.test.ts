import assert from "node:assert/strict";
import test from "node:test";

import {
  getEnvMqttSettings,
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

test("getEnvMqttSettings accepts strict bounded integers including reconnect zero", () => {
  const settings = getEnvMqttSettings({
    MQTT_MESSAGE_TIMEOUT: "45",
    MQTT_PORT: "2883",
    MQTT_RECONNECT_INTERVAL: "0"
  });

  assert.equal(settings.broker_port, 2883);
  assert.equal(settings.message_timeout, 45);
  assert.equal(settings.reconnect_interval, 0);
});

test("getEnvMqttSettings falls back instead of partially parsing malformed integers", () => {
  assert.equal(getEnvMqttSettings({ MQTT_PORT: "1883abc" }).broker_port, 1883);
  assert.equal(getEnvMqttSettings({ MQTT_PORT: "0" }).broker_port, 1883);
  assert.equal(getEnvMqttSettings({ MQTT_PORT: "65536" }).broker_port, 1883);
  assert.equal(getEnvMqttSettings({ MQTT_PORT: "1883.5" }).broker_port, 1883);
  assert.equal(getEnvMqttSettings({ MQTT_MESSAGE_TIMEOUT: "0" }).message_timeout, 30);
  assert.equal(getEnvMqttSettings({ MQTT_RECONNECT_INTERVAL: "-1" }).reconnect_interval, 5000);
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
