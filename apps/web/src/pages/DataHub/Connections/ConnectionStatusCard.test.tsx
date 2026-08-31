import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { ConnectionStatusCard } from "./ConnectionStatusCard";
import type { MqttStatus } from "../../MqttSettings/viewModel";

const mockStatus: MqttStatus = {
  connected: true,
  broker: "tcp://127.0.0.1:1883",
  clientId: "solar-server-1",
  reason: null,
  updatedAt: "2026-08-31T18:00:00.000Z"
};

test("ConnectionStatusCard renders connected state with green badge and broker details", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <ConnectionStatusCard status={mockStatus} lastConnectionTest={null} />
    </MemoryRouter>
  );

  assert.match(html, /data-connection-badge="connected"/);
  assert.match(html, /Connected \(正常連線\)/);
  assert.match(html, /tcp:\/\/127\.0\.0\.1:1883/);
  assert.match(html, /solar-server-1/);
});

test("ConnectionStatusCard renders error status and test failure feedback", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <ConnectionStatusCard
        status={{ ...mockStatus, connected: false, reason: "ECONNREFUSED" }}
        lastConnectionTest={{ connected: false, message: "連線拒絕，請檢查 Broker 是否啟動" }}
      />
    </MemoryRouter>
  );

  assert.match(html, /data-connection-badge="error"/);
  assert.match(html, /data-test-result="failure"/);
  assert.match(html, /連線拒絕，請檢查 Broker 是否啟動/);
});

test("ConnectionStatusCard renders testing in progress state", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <ConnectionStatusCard
        status={mockStatus}
        lastConnectionTest={null}
        isTesting={true}
      />
    </MemoryRouter>
  );

  assert.match(html, /正在測試連線至 MQTT Broker\.\.\./);
});
