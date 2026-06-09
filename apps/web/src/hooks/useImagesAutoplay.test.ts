import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { resolveImagesPlaybackOrder, type ResolvedImagePlaylistEntry } from "@solar-display/shared";
import {
  getImagesAutoplayDurationMs,
  getNextImagesAutoplayIndex,
  resolveImagesAutoplayCycleStartIndex,
  resolveImagesAutoplayActiveIndex
} from "./useImagesAutoplay";

const hookSource = readFileSync(path.join(import.meta.dirname, "useImagesAutoplay.ts"), "utf8");

function createEntry(
  overrides: Partial<ResolvedImagePlaylistEntry> & Pick<ResolvedImagePlaylistEntry, "entryId">
): ResolvedImagePlaylistEntry {
  const base: ResolvedImagePlaylistEntry = {
    area: null,
    assetId: null,
    assetSource: null,
    capturedAt: null,
    description: null,
    displayOrder: 1,
    durationSeconds: 15,
    enabled: true,
    entryId: "IMG-01",
    fallbackActive: false,
    fallbackMode: "display-placeholder",
    fallbackReason: null,
    hasAsset: false,
    infoPanel: {
      area: "Playback Gallery",
      capturedAt: "2026/05/10 10:00",
      description: "desc",
      tags: [],
      title: "title"
    },
    isPlayable: true,
    resolution: "1920x1080",
    tags: [],
    title: "title"
  };

  return {
    ...base,
    ...overrides
  };
}

test("images autoplay derives timer duration from the resolved active playlist entry", () => {
  const entries = [
    createEntry({ durationSeconds: 25, entryId: "IMG-01", isPlayable: true }),
    createEntry({ durationSeconds: 10, entryId: "IMG-02", isPlayable: true }),
    createEntry({ durationSeconds: 12, entryId: "IMG-03", isPlayable: true })
  ];

  assert.equal(getImagesAutoplayDurationMs(entries[0] ?? null), 25_000);
  assert.equal(getImagesAutoplayDurationMs(entries[1] ?? null), 10_000);
  assert.equal(getNextImagesAutoplayIndex(entries, 0, 1), 1);
  assert.equal(getNextImagesAutoplayIndex(entries, 2, 1), 0);
});

test("images autoplay remaps to the resolved active slide identity and skips non-playable manual targets", () => {
  const entries = [
    createEntry({ durationSeconds: 25, entryId: "IMG-01", isPlayable: true }),
    createEntry({ durationSeconds: 10, entryId: "IMG-02", isPlayable: false }),
    createEntry({ durationSeconds: 12, entryId: "IMG-03", isPlayable: true })
  ];

  assert.equal(resolveImagesAutoplayActiveIndex(entries, entries[2] ?? null, 1), 2);
  assert.equal(getNextImagesAutoplayIndex(entries, 2, -1), 0);
  assert.equal(getNextImagesAutoplayIndex(entries, 0, 1), 2);
});

test("images autoplay prefers the requested playable slide over stale runtime payload state", () => {
  const entries = [
    createEntry({ durationSeconds: 25, entryId: "IMG-01", isPlayable: true }),
    createEntry({ durationSeconds: 10, entryId: "IMG-02", isPlayable: true }),
    createEntry({ durationSeconds: 12, entryId: "IMG-03", isPlayable: true })
  ];

  assert.equal(resolveImagesAutoplayActiveIndex(entries, entries[0] ?? null, 2), 2);
});

test("images autoplay keeps fallback-active and single playable entries inside the same loop", () => {
  const loopEntries = [
    createEntry({ entryId: "IMG-01", isPlayable: true }),
    createEntry({
      durationSeconds: 18,
      entryId: "IMG-02",
      fallbackActive: true,
      fallbackMode: "use-cover",
      fallbackReason: "asset-missing",
      isPlayable: true
    })
  ];
  const singlePlayableEntries = [
    createEntry({ entryId: "IMG-01", isPlayable: false }),
    createEntry({ entryId: "IMG-02", fallbackActive: true, fallbackMode: "use-cover", fallbackReason: "asset-missing", isPlayable: true }),
    createEntry({ entryId: "IMG-03", isPlayable: false })
  ];

  assert.equal(getNextImagesAutoplayIndex(loopEntries, 1, 1), 0);
  assert.equal(getNextImagesAutoplayIndex(singlePlayableEntries, 1, 1), 1);
  assert.equal(getNextImagesAutoplayIndex(singlePlayableEntries, 1, -1), 1);
});

test("images autoplay hook schedules timeout-based rotation from active entry duration", () => {
  assert.match(hookSource, /window\.setTimeout/);
  assert.match(hookSource, /getImagesAutoplayDurationMs\(activeEntry\)/);
  assert.doesNotMatch(hookSource, /setRequestedIndex\(resolvedActiveIndex\)/);
});

test("images autoplay keeps shuffle disabled on the display-order path", () => {
  const entries = [
    createEntry({ displayOrder: 3, entryId: "IMG-03", isPlayable: true }),
    createEntry({ displayOrder: 1, entryId: "IMG-01", isPlayable: true }),
    createEntry({ displayOrder: 2, entryId: "IMG-02", isPlayable: true })
  ];

  assert.equal(getNextImagesAutoplayIndex(entries, 1, 1, { seed: "fixed-seed", shuffle: false }), 2);
  assert.equal(getNextImagesAutoplayIndex(entries, 2, 1, { seed: "fixed-seed", shuffle: false }), 0);
});

test("images autoplay follows a seeded shuffled order once per cycle", () => {
  const entries = [
    createEntry({ displayOrder: 1, entryId: "IMG-01", isPlayable: true }),
    createEntry({ displayOrder: 2, entryId: "IMG-02", isPlayable: true }),
    createEntry({ displayOrder: 3, entryId: "IMG-03", isPlayable: true }),
    createEntry({ displayOrder: 4, entryId: "IMG-04", isPlayable: true })
  ];
  const order = resolveImagesPlaybackOrder(entries, { seed: "fixed-seed", shuffle: true });
  const visited = [order[0]!];
  let currentIndex = entries.findIndex((entry) => entry.entryId === order[0]);

  for (let step = 1; step < order.length; step += 1) {
    currentIndex = getNextImagesAutoplayIndex(entries, currentIndex, 1, {
      seed: "fixed-seed",
      shuffle: true
    });
    visited.push(entries[currentIndex]!.entryId);
  }

  assert.deepEqual(visited, order);
  assert.deepEqual([...visited].sort(), ["IMG-01", "IMG-02", "IMG-03", "IMG-04"]);
});

test("images autoplay aligns a shuffle cycle to the shuffled start entry", () => {
  const entries = [
    createEntry({ displayOrder: 1, entryId: "IMG-01", isPlayable: true }),
    createEntry({ displayOrder: 2, entryId: "IMG-02", isPlayable: true }),
    createEntry({ displayOrder: 3, entryId: "IMG-03", isPlayable: true }),
    createEntry({ displayOrder: 4, entryId: "IMG-04", isPlayable: true })
  ];
  const seed = "fixed-seed";
  const order = resolveImagesPlaybackOrder(entries, { seed, shuffle: true });
  let currentIndex = resolveImagesAutoplayCycleStartIndex(entries, { seed, shuffle: true });
  const visited = [entries[currentIndex]!.entryId];

  for (let step = 1; step < order.length; step += 1) {
    currentIndex = getNextImagesAutoplayIndex(entries, currentIndex, 1, {
      seed,
      shuffle: true
    });
    visited.push(entries[currentIndex]!.entryId);
  }

  assert.deepEqual(visited, order);
});
