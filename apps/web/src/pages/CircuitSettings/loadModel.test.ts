import assert from "node:assert/strict";
import test from "node:test";
import type { CircuitConfig } from "@solar-display/shared";

import { loadCircuitEditableModel } from "./loadModel";

test("loadCircuitEditableModel starts circuit and playback page reads together", async () => {
  const started: string[] = [];
  let resolveCircuits: (circuits: CircuitConfig[]) => void = () => {};
  const loading = loadCircuitEditableModel({
    readCircuits: async () => {
      started.push("circuits");
      return new Promise<CircuitConfig[]>((resolve) => {
        resolveCircuits = resolve;
      });
    },
    readPlaybackPages: async () => {
      started.push("playbackPages");
      return [];
    }
  }, { force: true });

  await Promise.resolve();

  try {
    assert.deepEqual(started, ["circuits", "playbackPages"]);
  } finally {
    resolveCircuits([]);
    await loading;
  }
});
