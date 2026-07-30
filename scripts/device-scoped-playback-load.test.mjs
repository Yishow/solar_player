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
    boundaryWaitMs: 5_000,
    browserClients: 1,
    browserConditionalHits: 1,
    clients: 50,
    conditionalHits: 50,
    durationMs: 600_000,
    heartbeatCoverage: 50,
    heartbeats: 3_000,
    peakConnections: 50,
    reconnects: 5,
    reloads: 0,
    rolloutApplied: 50,
    rolloutWaiting: 50,
    rotationEvaluations: null,
    rotationEvaluationsAfterPublish: 4,
    rotationEvaluationsAtRest: 4,
    runtimeFetches: 100,
    timeSignalCoverage: 50,
    timeSignals: 1_050
  });
  assert.deepEqual(missing, ["rotationEvaluations metric unavailable"]);

  const excessive = evaluateAcceptanceThresholds({
    boundaryWaitMs: 5_000,
    browserClients: 1,
    browserConditionalHits: 1,
    clients: 50,
    conditionalHits: 50,
    durationMs: 600_000,
    heartbeatCoverage: 50,
    heartbeats: 3_151,
    peakConnections: 51,
    reconnects: 5,
    reloads: 0,
    rolloutApplied: 50,
    rolloutWaiting: 50,
    rotationEvaluations: 3,
    rotationEvaluationsAfterPublish: 5,
    rotationEvaluationsAtRest: 5,
    runtimeFetches: 100,
    timeSignalCoverage: 50,
    timeSignals: 1_056
  });
  assert.deepEqual(excessive, [
    "heartbeats 3151 exceed 3150",
    "timeSignals 1056 exceed 1055",
    "rotationEvaluations 3 exceed 2",
    "peakConnections 51 exceed 50"
  ]);
});

test("threshold evaluation rejects zero-work counters", () => {
  assert.deepEqual(
    evaluateAcceptanceThresholds({
      boundaryWaitMs: 5_000,
      browserClients: 1,
      browserConditionalHits: 1,
      clients: 50,
      conditionalHits: 50,
      durationMs: 600_000,
      heartbeatCoverage: 0,
      heartbeats: 0,
      peakConnections: 0,
      reconnects: 5,
      reloads: 0,
      rolloutApplied: 50,
      rolloutWaiting: 50,
      rotationEvaluations: 0,
      rotationEvaluationsAfterPublish: 0,
      rotationEvaluationsAtRest: 0,
      runtimeFetches: 100,
      timeSignalCoverage: 0,
      timeSignals: 0
    }),
    [
      "heartbeats 0 are below 50",
      "timeSignals 0 are below 55",
      "rotationEvaluations 0 are below 2",
      "peakConnections 0 are below 50",
      "timeSignalCoverage 0 does not equal 50",
      "heartbeatCoverage 0 does not equal 50",
      "rotation evaluations grew by 0 after publishing a Profile Version, below 1"
    ]
  );
});

test("isolated harness exercises Management API → Pairing → Story/Rotation/Socket", async () => {
  const result = await runDeviceScopedPlaybackAcceptance({
    browserRolloutProbe: async (_baseUrl, _device, _profileId) => ({
      appliedOnServer: false,
      boundaryWaitMs: 5_000,
      browserClients: 1,
      conditionalHits: 1,
      desiredVersion: 1,
      reloads: 0,
      runtimeFetches: 2
    }),
    clients: 2,
    durationMs: 200,
    reconnects: 1
  });

  assert.equal(result.clients, 2);
  assert.equal(result.failures, 0);
  assert.equal(result.browserClients, 1);
  assert.equal(result.browserConditionalHits >= 1, true);
  assert.equal(result.boundaryWaitMs >= 5_000, true);
  assert.equal(result.heartbeats, 6);
  assert.equal(result.conditionalHits, 2);
  assert.equal(result.rolloutWaiting, 2);
  assert.equal(result.rolloutApplied, 2);
  assert.equal(result.reloads, 0);
  assert.equal(result.timeSignals >= 3, true);
  assert.equal(result.rotationEvaluations, 2);
  assert.equal(result.peakConnections, 2);
  assert.equal(result.reconnects, 1);
  assert.equal(result.timeSignalCoverage, 2);
  assert.equal(result.heartbeatCoverage, 2);
  assert.equal(
    result.rotationEvaluationsAfterPublish - result.rotationEvaluations <= 2,
    true
  );
  assert.equal(
    result.rotationEvaluationsAtRest - result.rotationEvaluationsAfterPublish,
    0,
    "an unchanged cohort re-evaluated the Effective Rotation at rest"
  );
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

const passingMetrics = {
  boundaryWaitMs: 5_000,
  browserClients: 1,
  browserConditionalHits: 1,
  clients: 50,
  conditionalHits: 50,
  durationMs: 600_000,
  heartbeatCoverage: 50,
  heartbeats: 3_000,
  peakConnections: 50,
  reconnects: 5,
  reloads: 0,
  rolloutApplied: 50,
  rolloutWaiting: 50,
  rotationEvaluations: 2,
  rotationEvaluationsAfterPublish: 4,
  rotationEvaluationsAtRest: 4,
  runtimeFetches: 100,
  timeSignalCoverage: 50,
  timeSignals: 1_050
};

test("threshold evaluation rejects aggregate counts that hide an uncovered Client", () => {
  assert.deepEqual(evaluateAcceptanceThresholds(passingMetrics), []);

  assert.deepEqual(
    evaluateAcceptanceThresholds({
      ...passingMetrics,
      timeSignalCoverage: 49
    }),
    ["timeSignalCoverage 49 does not equal 50"]
  );

  assert.deepEqual(
    evaluateAcceptanceThresholds({
      ...passingMetrics,
      heartbeatCoverage: 48
    }),
    ["heartbeatCoverage 48 does not equal 50"]
  );
});

test("threshold evaluation rejects rotation evaluations that grow per Device", () => {
  assert.deepEqual(
    evaluateAcceptanceThresholds({
      ...passingMetrics,
      rotationEvaluationsAfterPublish: 52,
      rotationEvaluationsAtRest: 52
    }),
    [
      "rotation evaluations grew by 50 after publishing a Profile Version, exceeding 2"
    ]
  );

  assert.deepEqual(
    evaluateAcceptanceThresholds({
      ...passingMetrics,
      rotationEvaluationsAtRest: 54
    }),
    [
      "rotation evaluations grew by 50 during the steady-state window, exceeding 2"
    ]
  );

  assert.deepEqual(
    evaluateAcceptanceThresholds({
      ...passingMetrics,
      rotationEvaluationsAfterPublish: 2
    }),
    ["rotation evaluations grew by 0 after publishing a Profile Version, below 1"]
  );
});
