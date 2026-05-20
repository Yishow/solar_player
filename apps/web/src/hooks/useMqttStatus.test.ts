import assert from "node:assert/strict";
import test from "node:test";
import type { MqttConnectionStatus } from "../services/socket";
import { loadRuntimeMqttStatus } from "./useMqttStatus";

test("loadRuntimeMqttStatus resolves the playback-safe mqtt bootstrap payload", async () => {
  const status = await loadRuntimeMqttStatus(async () => ({
    broker: "mqtt.example:1883",
    clientId: "display-player",
    connected: true,
    reason: null,
    updatedAt: "2026-05-20T12:00:00.000Z"
  }));

  assert.deepEqual(status, {
    broker: "mqtt.example:1883",
    clientId: "display-player",
    connected: true,
    reason: null,
    updatedAt: "2026-05-20T12:00:00.000Z"
  } satisfies MqttConnectionStatus);
});
