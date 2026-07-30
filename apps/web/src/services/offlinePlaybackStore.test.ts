import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultFreshnessPolicy } from "@solar-display/shared";

import {
  OFFLINE_PLAYBACK_SCHEMA_VERSION,
  assertValidOfflinePlaybackSnapshot,
  commitOfflinePlaybackRuntimeSnapshot,
  createSnapshotId,
  isVerifiedCachedAsset,
  stageOfflineAssetManifest,
  validateOfflineAssetManifest,
  type OfflinePlaybackSnapshot
} from "./offlinePlaybackStore";

function snapshot(): OfflinePlaybackSnapshot {
  return {
    appRelease: "release-a",
    freshnessPolicy: createDefaultFreshnessPolicy(),
    metricSnapshots: [{
      key: "/api/display-story/overview",
      sourceTimestamps: ["2026-07-30T01:00:00.000Z"],
      value: { value: 42 }
    }],
    profileVersion: 7,
    runtime: {
      context: {
        clientId: "display-a",
        contextRevision: "ctx-1",
        deviceId: 1,
        groupId: 1,
        profileId: 3,
        siteScope: "cl"
      },
      effectiveRotationRevision: "rotation-1",
      preview: {
        evaluatedAt: "2026-07-30T01:00:00.000Z",
        fallbackRoute: null,
        playablePages: [{
          displayOrder: 1,
          durationSeconds: 15,
          enabled: true,
          id: 1,
          labelEn: "Overview",
          labelZh: "總覽",
          pageKey: "overview",
          route: "/overview",
          templateKey: "overview"
        }],
        skippedPages: []
      },
      profileRollout: {
        appliedVersion: 7,
        desired: null,
        desiredVersion: 7,
        lastError: null,
        updatedAt: "2026-07-30T01:00:00.000Z",
        updateState: "applied"
      },
      settings: {
        autoplay: true,
        brightness: 100,
        enforceFreshRuntimeData: true,
        idleMode: "disabled",
        idleTimeout: 60,
        loop: true,
        orientation: "landscape",
        repeatDays: [],
        scheduleEnabled: false,
        scheduleEnd: "23:59",
        scheduleStart: "00:00",
        startPage: 1,
        transitionSpeed: 500,
        transitionType: "fade",
        updatedAt: "2026-07-30T01:00:00.000Z"
      }
    },
    savedAtServerEpoch: 1785373200000,
    schemaVersion: OFFLINE_PLAYBACK_SCHEMA_VERSION,
    siteScope: "cl"
  };
}

test("offline snapshot identity binds release, applied version, and rotation", () => {
  assert.equal(createSnapshotId(snapshot()), "release-a:7:rotation-1");
});

test("offline snapshot rejects mixed versions and secret fields", () => {
  const mixed = snapshot();
  mixed.runtime.profileRollout.appliedVersion = 6;
  assert.throws(() => assertValidOfflinePlaybackSnapshot(mixed));

  const secret = snapshot() as OfflinePlaybackSnapshot & { pairingToken: string };
  secret.pairingToken = "must-not-persist";
  assert.throws(() => assertValidOfflinePlaybackSnapshot(secret), /secret/);
});

test("asset manifest rejects hash mismatch inputs and token URLs", () => {
  const valid = {
    appRelease: "release-a",
    assets: [{
      hash: "a".repeat(64),
      required: true,
      url: "/assets/app.js"
    }],
    schemaVersion: 1 as const
  };
  assert.equal(validateOfflineAssetManifest(valid), true);
  assert.equal(validateOfflineAssetManifest({
    ...valid,
    assets: [{ ...valid.assets[0]!, hash: "bad" }]
  }), false);
  assert.equal(validateOfflineAssetManifest({
    ...valid,
    assets: [{ ...valid.assets[0]!, url: "/pairing-token/secret" }]
  }), false);
});

test("offline Images uses only manifest-verified assets", () => {
  const verified = new Set(["/uploads/one.jpg"]);
  assert.equal(isVerifiedCachedAsset("/uploads/one.jpg", verified), true);
  assert.equal(isVerifiedCachedAsset("/uploads/missing.jpg", verified), false);
  assert.equal(isVerifiedCachedAsset(null, verified), false);
});

test("runtime refresh preserves metrics for the same applied version", async () => {
  let active = snapshot();
  const repository = {
    commit: async (value: OfflinePlaybackSnapshot) => {
      active = value;
    },
    read: async () => active
  };
  const refreshed = {
    ...snapshot(),
    metricSnapshots: [],
    savedAtServerEpoch: active.savedAtServerEpoch + 1
  };
  await commitOfflinePlaybackRuntimeSnapshot(refreshed, repository);
  assert.equal(active.metricSnapshots.length, 1);
  assert.equal(active.savedAtServerEpoch, refreshed.savedAtServerEpoch);
});

test("quota failure leaves the prior last-known-good snapshot active", async () => {
  const prior = snapshot();
  const active = prior;
  const repository = {
    commit: async (_value: OfflinePlaybackSnapshot) => {
      throw new DOMException("quota", "QuotaExceededError");
    },
    read: async () => active
  };
  await assert.rejects(
    commitOfflinePlaybackRuntimeSnapshot({
      ...snapshot(),
      savedAtServerEpoch: prior.savedAtServerEpoch + 1
    }, repository),
    /quota/
  );
  assert.equal(active, prior);
});

test("hash mismatch deletes only the candidate asset cache", async () => {
  const deleted: string[] = [];
  const writes: string[] = [];
  const cache = {
    put: async (key: RequestInfo | URL) => {
      writes.push(String(key));
    }
  };
  const cacheStorage = {
    delete: async (key: string) => {
      deleted.push(key);
      return true;
    },
    open: async () => cache
  } as unknown as CacheStorage;
  await assert.rejects(
    stageOfflineAssetManifest({
      appRelease: "release-b",
      assets: [{
        hash: "0".repeat(64),
        required: true,
        url: "/assets/app.js"
      }],
      schemaVersion: 1
    }, {
      caches: cacheStorage,
      fetch: async () => new Response("content")
    }),
    /validation failed/
  );
  assert.deepEqual(writes, []);
  assert.deepEqual(deleted, ["solar-playback:release-b:candidate"]);
});
