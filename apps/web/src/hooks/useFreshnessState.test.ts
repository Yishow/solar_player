import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultFreshnessPolicy,
  evaluateFreshness
} from "@solar-display/shared";
import { resolveClientFreshnessState } from "./useFreshnessState";

const policy = createDefaultFreshnessPolicy();
const serverFreshness = evaluateFreshness({
  category: "realtime",
  nowMs: Date.parse("2026-07-30T12:00:20.000Z"),
  policy,
  sourceTimestamp: "2026-07-30T12:00:00.000Z"
});

test("connected client preserves the Server-authoritative result", () => {
  assert.deepEqual(resolveClientFreshnessState({
    connected: true,
    elapsedMonotonicMs: 999_999,
    policy,
    serverFreshness,
    timeSyncState: "synced"
  }), serverFreshness);
});

test("disconnected client advances through boundaries using monotonic elapsed", () => {
  const result = resolveClientFreshnessState({
    connected: false,
    elapsedMonotonicMs: 75_000,
    policy,
    serverFreshness,
    timeSyncState: "stale"
  });
  assert.equal(result.ageMs, 95_000);
  assert.equal(result.state, "stale");
  assert.equal(result.ageFrozen, false);
});

test("time-untrusted client freezes the last trusted age and state", () => {
  const result = resolveClientFreshnessState({
    connected: false,
    elapsedMonotonicMs: 1_800_000,
    policy,
    serverFreshness,
    timeSyncState: "time-untrusted"
  });
  assert.equal(result.ageMs, 20_000);
  assert.equal(result.state, "live");
  assert.equal(result.ageFrozen, true);
});
