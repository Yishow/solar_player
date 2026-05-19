import assert from "node:assert/strict";
import test from "node:test";
import type { DisplaySyncEvent } from "@solar-display/shared";
import {
  createDisplaySyncPlaybackReloadCoordinator,
  shouldReloadPlaybackRuntimeForDisplaySync
} from "./displaySyncPlaybackReload";

const baseEvent: Omit<DisplaySyncEvent, "scope"> = {
  generatedAt: "2026-05-20T00:00:00.000Z",
  reason: "spec-test"
};

test("relevant display sync scopes trigger playback runtime reloads", () => {
  assert.equal(shouldReloadPlaybackRuntimeForDisplaySync("display-pages"), true);
  assert.equal(shouldReloadPlaybackRuntimeForDisplaySync("images"), true);
  assert.equal(shouldReloadPlaybackRuntimeForDisplaySync("mqtt"), true);
  assert.equal(shouldReloadPlaybackRuntimeForDisplaySync("circuits"), true);
});

test("irrelevant display sync scopes are ignored by playback runtime reloads", () => {
  assert.equal(shouldReloadPlaybackRuntimeForDisplaySync("playback"), false);
  assert.equal(shouldReloadPlaybackRuntimeForDisplaySync("display-ops"), false);
  assert.equal(shouldReloadPlaybackRuntimeForDisplaySync("device"), false);
});

test("burst relevant display sync events coalesce into one controlled reload", async () => {
  let reloadCount = 0;
  const coordinator = createDisplaySyncPlaybackReloadCoordinator({
    debounceMs: 5,
    reloadPlayback: async () => {
      reloadCount += 1;
    }
  });

  coordinator.notify({
    ...baseEvent,
    scope: "display-pages"
  });
  coordinator.notify({
    ...baseEvent,
    scope: "images"
  });
  coordinator.notify({
    ...baseEvent,
    scope: "mqtt"
  });

  await coordinator.flush();

  assert.equal(reloadCount, 1);
  coordinator.dispose();
});

test("relevant display sync bursts during an in-flight reload trigger at most one follow-up cycle", async () => {
  let reloadCount = 0;
  const reloadResolvers: Array<() => void> = [];
  const coordinator = createDisplaySyncPlaybackReloadCoordinator({
    debounceMs: 0,
    reloadPlayback: async () => {
      reloadCount += 1;
      await new Promise<void>((resolve) => {
        reloadResolvers.push(resolve);
      });
    }
  });

  coordinator.notify({
    ...baseEvent,
    scope: "display-pages"
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  coordinator.notify({
    ...baseEvent,
    scope: "images"
  });
  coordinator.notify({
    ...baseEvent,
    scope: "mqtt"
  });

  reloadResolvers.shift()?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  reloadResolvers.shift()?.();
  await coordinator.flush();

  assert.equal(reloadCount, 2);
  coordinator.dispose();
});
