import assert from "node:assert/strict";
import test from "node:test";
import { createUnpairedDisplayAccessRegistry } from "./unpairedDisplayAccessRegistry.js";

test("starts with an empty bounded summary", () => {
  const registry = createUnpairedDisplayAccessRegistry();
  const summary = registry.getSummary();

  assert.equal(summary.totalCount, 0);
  assert.equal(summary.firstSeenAt, null);
  assert.equal(summary.lastSeenAt, null);
  assert.equal(summary.lastDeniedRoute, null);
  assert.deepEqual(Object.values(summary.counts), Array(8).fill(0));
});

test("records a known denial and returns an isolated snapshot", () => {
  const registry = createUnpairedDisplayAccessRegistry();
  registry.record("device_unpaired", "/overview?screen=1");

  const snapshot = registry.getSummary();
  assert.equal(snapshot.counts.device_unpaired, 1);
  assert.equal(snapshot.totalCount, 1);
  assert.match(snapshot.firstSeenAt ?? "", /^20/);
  assert.equal(snapshot.lastSeenAt, snapshot.firstSeenAt);
  assert.equal(snapshot.lastDeniedRoute, "/overview?screen=1");

  snapshot.counts.device_unpaired = 99;
  snapshot.totalCount = 99;
  assert.equal(registry.getSummary().counts.device_unpaired, 1);
  assert.equal(registry.getSummary().totalCount, 1);
});

test("counts unknown codes without growing the fixed key set", () => {
  const registry = createUnpairedDisplayAccessRegistry();
  registry.record("future_code", "/api/display-story/overview");

  const summary = registry.getSummary();
  assert.equal(summary.totalCount, 1);
  assert.equal(Object.keys(summary.counts).length, 8);
  assert.equal(summary.lastDeniedRoute, "/api/display-story/overview");
});
