import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  evaluateAcceptanceThresholds,
  runDeviceScopedPlaybackAcceptance
} from "./device-scoped-playback-load.mjs";

test("threshold evaluation fails closed when a required metric is missing or exceeds its bound", () => {
  const missing = evaluateAcceptanceThresholds({
    clients: 50,
    durationMs: 600_000,
    heartbeats: 3_000,
    peakConnections: 50,
    reconnects: 5,
    rotationEvaluations: null,
    timeSignals: 1_050
  });
  assert.deepEqual(missing, ["rotationEvaluations metric unavailable"]);

  const excessive = evaluateAcceptanceThresholds({
    clients: 50,
    durationMs: 600_000,
    heartbeats: 3_051,
    peakConnections: 51,
    reconnects: 5,
    rotationEvaluations: 3,
    timeSignals: 1_056
  });
  assert.deepEqual(excessive, [
    "heartbeats 3051 exceed 3050",
    "timeSignals 1056 exceed 1055",
    "rotationEvaluations 3 exceed 2",
    "peakConnections 51 exceed 50"
  ]);
});

test("threshold evaluation rejects zero-work counters", () => {
  assert.deepEqual(
    evaluateAcceptanceThresholds({
      clients: 50,
      durationMs: 600_000,
      heartbeats: 0,
      peakConnections: 0,
      reconnects: 5,
      rotationEvaluations: 0,
      timeSignals: 0
    }),
    [
      "heartbeats 0 are below 50",
      "timeSignals 0 are below 55",
      "rotationEvaluations 0 are below 2",
      "peakConnections 0 are below 50"
    ]
  );
});

test("isolated harness exercises Management API → Pairing → Story/Rotation/Socket", async () => {
  const result = await runDeviceScopedPlaybackAcceptance({
    clients: 2,
    durationMs: 200,
    reconnects: 1
  });

  assert.equal(result.clients, 2);
  assert.equal(result.failures, 0);
  assert.equal(result.heartbeats, 2);
  assert.equal(result.timeSignals >= 3, true);
  assert.equal(result.rotationEvaluations, 2);
  assert.equal(result.peakConnections, 2);
  assert.equal(result.reconnects, 1);
});

test("root package exposes the explicit acceptance command outside pnpm test", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  );
  assert.equal(
    packageJson.scripts["verify:device-scoped-playback"],
    "node scripts/device-scoped-playback-load.mjs"
  );
  assert.equal(
    packageJson.scripts.test.includes("verify:device-scoped-playback"),
    false
  );
});

test("public acceptance command rejects threshold overrides", () => {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("./device-scoped-playback-load.mjs", import.meta.url)),
      "--duration-seconds",
      "0"
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /acceptance command does not allow client, duration, or reconnect overrides/
  );
});
