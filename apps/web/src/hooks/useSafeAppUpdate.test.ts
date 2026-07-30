import assert from "node:assert/strict";
import test from "node:test";

import {
  createSafeAppUpdateController,
  promoteStagedAppUpdate
} from "./useSafeAppUpdate";

test("staged App update waits for a Safe Playback Boundary", async () => {
  let activations = 0;
  const controller = createSafeAppUpdateController({
    activate: async () => {
      activations += 1;
    }
  });
  controller.candidateReady();
  assert.equal(controller.getState(), "staged");
  assert.equal(activations, 0);
  assert.equal(await controller.safeBoundary(), "idle");
  assert.equal(activations, 1);
});

test("failed activation keeps the staged page running", async () => {
  const controller = createSafeAppUpdateController({
    activate: async () => {
      throw new Error("worker activation failed");
    }
  });
  controller.candidateReady();
  assert.equal(await controller.safeBoundary(), "failed");
});

test("App update stages a matching snapshot before the final cache commit", async () => {
  const calls: string[] = [];
  await promoteStagedAppUpdate({
    activateWorker: async () => {
      calls.push("activate-worker");
    },
    commitCache: async () => {
      calls.push("commit-cache");
    },
    stageSnapshot: async () => {
      calls.push("stage-snapshot");
    }
  });
  assert.deepEqual(calls, [
    "stage-snapshot",
    "activate-worker",
    "commit-cache"
  ]);
});

test("failed final cache commit does not move the snapshot active pointer", async () => {
  let activeSnapshot = "release-r10";
  let stagedSnapshot: string | null = null;
  await assert.rejects(
    promoteStagedAppUpdate({
      commitCache: async () => {
        throw new Error("cache commit failed");
      },
      stageSnapshot: async () => {
        stagedSnapshot = "release-r11";
      }
    }),
    /cache commit failed/
  );
  assert.equal(stagedSnapshot, "release-r11");
  assert.equal(activeSnapshot, "release-r10");
});
