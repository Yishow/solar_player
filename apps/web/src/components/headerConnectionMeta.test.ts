import assert from "node:assert/strict";
import test from "node:test";
import { resolveHeaderConnectionMeta } from "./headerConnectionMeta";

test("resolveHeaderConnectionMeta maps playback mqtt status into header badge metadata", () => {
  assert.deepEqual(
    resolveHeaderConnectionMeta({
      connected: true,
      isHydrated: true,
      reason: "connected"
    }),
    {
      label: "Online",
      status: "connected"
    }
  );

  assert.deepEqual(
    resolveHeaderConnectionMeta({
      connected: false,
      isHydrated: true,
      reason: "reconnecting"
    }),
    {
      label: "重新連線",
      status: "connecting"
    }
  );

  assert.deepEqual(
    resolveHeaderConnectionMeta({
      connected: false,
      isHydrated: true,
      reason: "offline"
    }),
    {
      label: "離線",
      status: "disconnected"
    }
  );

  assert.deepEqual(
    resolveHeaderConnectionMeta({
      connected: false,
      isHydrated: false,
      reason: "broker unavailable"
    }),
    {
      label: "連線中",
      status: "connecting"
    }
  );

  assert.deepEqual(
    resolveHeaderConnectionMeta({
      connected: false,
      isHydrated: true,
      reason: "mock"
    }),
    {
      label: "Mock",
      status: "connected"
    }
  );

  assert.deepEqual(
    resolveHeaderConnectionMeta({
      connected: false,
      isHydrated: true,
      reason: "broker unavailable"
    }),
    {
      label: "離線",
      status: "disconnected"
    }
  );
});
