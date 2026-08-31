import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConnectionsView } from "./ConnectionsView";
import type { MqttSettingsForm, MqttStatus } from "../../MqttSettings/viewModel";

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

const mockStatus: MqttStatus = {
  connected: true,
  broker: "tcp://127.0.0.1:1883",
  clientId: "test-client",
  reason: null,
  updatedAt: "2026-08-31T18:00:00.000Z"
};

test("ConnectionsView renders two-column layout with toolbar actions", () => {
  const html = renderToStaticMarkup(
    <ConnectionsView
      settings={mockSettings}
      status={mockStatus}
      lastConnectionTest={null}
      onChange={() => {}}
      onTestConnection={() => {}}
      onSaveSettings={() => {}}
    />
  );

  assert.match(html, /data-data-hub-connections-view/);
  assert.match(html, /<em>Connections<\/em>/);
  assert.match(html, /data-connections-action="test"/);
  assert.match(html, /data-connections-action="save"/);
  assert.match(html, /data-connections-panel="settings"/);
  assert.match(html, /data-connections-panel="diagnostics"/);
  assert.match(html, /data-connections-dirty="false"/);
});

test("ConnectionsView displays dirty state and message alerts", () => {
  const html = renderToStaticMarkup(
    <ConnectionsView
      settings={mockSettings}
      status={mockStatus}
      lastConnectionTest={null}
      isDirty={true}
      message="設定已同步。"
      onChange={() => {}}
      onTestConnection={() => {}}
      onSaveSettings={() => {}}
    />
  );

  assert.match(html, /data-connections-dirty="true"/);
  assert.match(html, /尚未儲存設定變更/);
  assert.match(html, /data-connections-message/);
  assert.match(html, /設定已同步。/);
});
