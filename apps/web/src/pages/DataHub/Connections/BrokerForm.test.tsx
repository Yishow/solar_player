import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BrokerForm, brokerFieldDefinitions } from "./BrokerForm";
import type { MqttSettingsForm } from "../../MqttSettings/viewModel";

const mockSettings: MqttSettingsForm = {
  dataMode: "mock",
  host: "127.0.0.1",
  port: "1883",
  clientId: "test-client",
  username: "admin",
  password: "secret",
  messageTimeout: "30",
  reconnectInterval: "5000"
};

test("BrokerForm renders simulated and mqtt data mode buttons with active states", () => {
  const htmlMock = renderToStaticMarkup(
    <BrokerForm settings={mockSettings} onChange={() => {}} />
  );

  assert.match(htmlMock, /data-mode-toggle="mock"/);
  assert.match(htmlMock, /aria-selected="true"/);
  assert.match(htmlMock, /模擬資料 \(Simulated\)/);
  assert.match(htmlMock, /即時 MQTT \(Real\)/);

  const htmlReal = renderToStaticMarkup(
    <BrokerForm settings={{ ...mockSettings, dataMode: "mqtt" }} onChange={() => {}} />
  );
  assert.match(htmlReal, /data-mode-toggle="mqtt"/);
});

test("BrokerForm renders all broker field definitions with inputs", () => {
  const html = renderToStaticMarkup(
    <BrokerForm settings={mockSettings} onChange={() => {}} />
  );

  for (const field of brokerFieldDefinitions) {
    assert.match(html, new RegExp(`data-broker-field="${field.key}"`));
    assert.ok(html.includes(field.label), `expected html to include ${field.label}`);
  }
  assert.match(html, /value="127\.0\.0\.1"/);
  assert.match(html, /type="password"/);
});
