import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { useMqttSettingsBroker, type MqttSettingsBrokerController } from "./useMqttSettingsBroker";
import type { MqttSettingsDataController } from "./useMqttSettingsData";
import type { ConnectionTestFeedback, MqttSettingsForm } from "./viewModel";

test("useMqttSettingsBroker: candidate revision advances on host change and supersedes test", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>");
  for (const [key, value] of Object.entries({
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    window: dom.window
  })) {
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  let currentSettings: MqttSettingsForm = {
    clientId: "client-1",
    dataMode: "mqtt",
    host: "127.0.0.1",
    messageTimeout: "10",
    password: "****",
    port: "1883",
    reconnectInterval: "5000",
    username: "user"
  };

  let testFeedback: ConnectionTestFeedback = {
    candidateRevision: 1,
    connected: true,
    isSuperseded: false,
    message: "這份設定可建立連線；尚未套用至正式環境。",
    testedAt: "2026-09-16T04:00:00.000Z"
  };

  let controllerRef: any = null;

  const mockData: Partial<MqttSettingsDataController> = {
    markDirty: () => {},
    setActionState: () => {},
    setErrorMessage: () => {},
    setLastConnectionTest: (updater) => {
      testFeedback = typeof updater === "function" ? updater(testFeedback) : updater;
    },
    setLastSyncedSettings: () => {},
    setMessage: () => {},
    setSettings: (updater) => {
      currentSettings = typeof updater === "function" ? updater(currentSettings) : updater;
    },
    settings: currentSettings,
    status: {
      broker: "tcp://127.0.0.1:1883",
      clientId: "client-1",
      connected: true,
      reason: null,
      updatedAt: "2026-09-16T04:00:00.000Z"
    }
  };

  function Harness() {
    controllerRef = useMqttSettingsBroker({
      connectionsOnly: true,
      data: mockData as MqttSettingsDataController,
      reloadReadiness: async () => {}
    });
    return null;
  }

  const root = createRoot(dom.window.document.getElementById("root")!);
  await act(async () => {
    root.render(React.createElement(Harness));
  });

  assert.ok(controllerRef);
  assert.equal(controllerRef.candidateRevision, 1);
  assert.equal(testFeedback?.isSuperseded, false);

  await act(async () => {
    controllerRef!.handleSettingChange("host", "192.168.1.100");
  });

  assert.equal(currentSettings.host, "192.168.1.100");
  assert.equal(testFeedback?.isSuperseded, true);
  assert.match(testFeedback?.message ?? "", /先前測試已失效，需重新測試/);

  await act(async () => {
    root.unmount();
  });
  dom.window.close();
});
