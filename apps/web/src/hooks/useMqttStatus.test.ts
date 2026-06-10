import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { MqttConnectionStatus } from "../services/socket";
import { loadRuntimeMqttStatus, resolveInitialMqttState } from "./useMqttStatus";

const useMqttStatusSource = readFileSync(path.join(import.meta.dirname, "useMqttStatus.ts"), "utf8");

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

test("resolveInitialMqttState uses cached socket status when bootstrap state is undefined", () => {
  const cachedStatus: MqttConnectionStatus = {
    broker: "mqtt.cached:1883",
    clientId: "cached-client",
    connected: true,
    reason: null,
    updatedAt: "2026-05-20T08:30:00.000Z"
  };

  const state = resolveInitialMqttState(undefined, cachedStatus);

  assert.equal(state.isHydrated, true);
  assert.deepEqual(state.status, cachedStatus);
});

test("resolveInitialMqttState keeps null bootstrap state from falling back to stale cache", () => {
  const cachedStatus: MqttConnectionStatus = {
    broker: "mqtt.cached:1883",
    clientId: "cached-client",
    connected: true,
    reason: null,
    updatedAt: "2026-05-20T08:30:00.000Z"
  };

  const state = resolveInitialMqttState(null, cachedStatus);

  assert.equal(state.isHydrated, false);
  assert.deepEqual(state.status, {
    broker: "",
    clientId: "",
    connected: false,
    reason: "unavailable",
    updatedAt: null
  } satisfies MqttConnectionStatus);
});

test("useMqttStatus can subscribe without bootstrap fetch or forced socket connect", () => {
  assert.match(useMqttStatusSource, /bootstrap\?:\s*boolean/);
  assert.match(useMqttStatusSource, /connectSocket\?:\s*boolean/);
  assert.match(useMqttStatusSource, /if \(connectSocket\)/);
  assert.match(useMqttStatusSource, /if \(bootstrap\)/);
});
