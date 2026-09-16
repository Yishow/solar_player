import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { ConnectionStatusCard } from "./ConnectionStatusCard";
import { ConnectionsView } from "./ConnectionsView";
import type { MqttSettingsForm, MqttStatus } from "../../MqttSettings/viewModel";

const testSettings: MqttSettingsForm = {
  clientId: "player-test-client",
  dataMode: "mqtt",
  host: "central-broker.local",
  messageTimeout: "10",
  password: "****",
  port: "1883",
  reconnectInterval: "5000",
  username: "player"
};

const testStatus: MqttStatus = {
  broker: "tcp://central-broker.local:1883",
  clientId: "player-test-client",
  connected: true,
  reason: null,
  updatedAt: "2026-09-16T04:00:00.000Z"
};

test("DHC-R1: Receiver broker summary indicates shared infrastructure and links preserve scope", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <ConnectionsView
        isDirty={false}
        lastConnectionTest={null}
        managementScope="kn"
        onChange={() => {}}
        onSaveSettings={() => {}}
        onTestConnection={() => {}}
        settings={testSettings}
        status={testStatus}
      />
    </MemoryRouter>
  );

  assert.match(html, /data-connections-summary="receiver-broker"/);
  assert.match(html, /Solar Player 接收端 Broker（CL／KN 共用）/);
  assert.match(html, /href="\/settings\/data-hub\/sources\?scope=kn"/);
  assert.match(html, /href="\/settings\/data-hub\/metrics\?scope=kn"/);
});

test("DHC-R2: Action button specifies candidate testing and saving shared settings", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <ConnectionsView
        isDirty={true}
        lastConnectionTest={null}
        onChange={() => {}}
        onSaveSettings={() => {}}
        onTestConnection={() => {}}
        settings={testSettings}
        status={testStatus}
      />
    </MemoryRouter>
  );

  assert.match(html, /測試這份設定 \(Test Candidate\)/);
  assert.match(html, /儲存連線設定 \(Save Settings\)/);
});

test("DHC-R3-S01 & S02: Superseded test feedback is visibly marked when settings change", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <ConnectionStatusCard
        lastConnectionTest={{
          candidateRevision: 1,
          connected: true,
          isSuperseded: true,
          message: "此測試結果屬於先前版本，設定已變更，需重新測試。",
          testedAt: "2026-09-16T04:01:00.000Z"
        }}
        status={testStatus}
      />
    </MemoryRouter>
  );

  assert.match(html, /data-test-result="superseded"/);
  assert.match(html, /此測試結果屬於先前版本，設定已變更，需重新測試/);
});

test("DHC-R4-S02: Mock data mode clearly rendered as simulation", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <ConnectionStatusCard
        dataMode="mock"
        lastConnectionTest={null}
        status={{ ...testStatus, connected: false }}
      />
    </MemoryRouter>
  );

  assert.match(html, /data-connection-mode="mock"/);
  assert.match(html, /模擬資料模式/);
  assert.match(html, /未建立實體 MQTT 連線/);
});

test("DHC-R5: Connection view explains Player receiver scope and publisher independence", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <ConnectionsView
        lastConnectionTest={null}
        onChange={() => {}}
        onSaveSettings={() => {}}
        onTestConnection={() => {}}
        settings={testSettings}
        status={testStatus}
      />
    </MemoryRouter>
  );

  assert.match(html, /此連線設定僅適用於 Solar Player 接收端/);
  assert.match(html, /亦不變更 solar_mqtt_go 或 opc_mqtt 發布端/);
});
