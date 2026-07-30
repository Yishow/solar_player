import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultFreshnessPolicy,
  type DisplayPlaybackRuntimeResponse
} from "@solar-display/shared";
import {
  createOfflinePlaybackSnapshot,
  resolveOfflineProfileVersion
} from "./useOfflinePlaybackSnapshot";
import { loadPlaybackRuntimeWithOfflineFallback } from "./usePlaybackController";
import type {
  OfflinePlaybackRepository,
  OfflinePlaybackSnapshot
} from "../services/offlinePlaybackStore";

const policy = createDefaultFreshnessPolicy();

const runtime = {
  context: { siteScope: "cl" },
  profileRollout: { appliedVersion: 4 }
} as unknown as DisplayPlaybackRuntimeResponse;

test("offline hydration snapshots only an applied Profile Version", () => {
  assert.equal(resolveOfflineProfileVersion(runtime), 4);
  assert.equal(createOfflinePlaybackSnapshot({
    appRelease: "release-a",
    freshnessPolicy: policy,
    runtime,
    savedAtServerEpoch: 10
  })?.profileVersion, 4);

  const waiting = {
    ...runtime,
    profileRollout: { ...runtime.profileRollout, appliedVersion: null }
  };
  assert.equal(createOfflinePlaybackSnapshot({
    appRelease: "release-a",
    freshnessPolicy: policy,
    runtime: waiting,
    savedAtServerEpoch: 10
  }), null);
});

test("offline restart uses one complete last-known-good snapshot", async () => {
  const stored = createOfflinePlaybackSnapshot({
    appRelease: "release-a",
    freshnessPolicy: policy,
    runtime,
    savedAtServerEpoch: 10
  }) as OfflinePlaybackSnapshot;
  const repository: OfflinePlaybackRepository = {
    commit: async () => {},
    read: async () => stored
  };
  const loaded = await loadPlaybackRuntimeWithOfflineFallback({
    fetchFreshnessPolicy: async () => {
      throw new TypeError("offline");
    },
    fetchRuntime: async () => {
      throw new TypeError("offline");
    },
    readActiveCache: async () => ({
      appRelease: "release-a",
      cacheName: "solar-playback:release-a:candidate:abc",
      verifiedUrls: ["/index.html"]
    }),
    readSnapshotForRelease: async () => stored,
    repository
  });
  assert.equal(loaded.offline, true);
  assert.equal(loaded.runtime, runtime);
  assert.equal(loaded.freshnessPolicy, policy);
});

test("offline restart rejects a snapshot from a different App release", async () => {
  const stored = createOfflinePlaybackSnapshot({
    appRelease: "release-a",
    freshnessPolicy: policy,
    runtime,
    savedAtServerEpoch: 10
  }) as OfflinePlaybackSnapshot;
  await assert.rejects(
    loadPlaybackRuntimeWithOfflineFallback({
      fetchFreshnessPolicy: async () => {
        throw new TypeError("offline");
      },
      fetchRuntime: async () => {
        throw new TypeError("offline");
      },
      readActiveCache: async () => ({
        appRelease: "release-b",
        cacheName: "solar-playback:release-b:candidate:def",
        verifiedUrls: ["/index.html"]
      }),
      readSnapshotForRelease: async () => null,
      repository: {
        commit: async () => {},
        read: async () => stored
      }
    }),
    /offline/
  );
});
