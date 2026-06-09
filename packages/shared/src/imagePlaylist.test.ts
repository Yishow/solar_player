import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveImagesPlaybackOrder,
  resolveImagesPlaylistTotalDurationSeconds
} from "./imagePlaylist.js";

test("resolveImagesPlaylistTotalDurationSeconds sums enabled playable entry durations", () => {
  const totalDuration = resolveImagesPlaylistTotalDurationSeconds([
    { durationSeconds: 10, enabled: true, isPlayable: true },
    { durationSeconds: 15, enabled: true, isPlayable: true },
    { durationSeconds: 5, enabled: true, isPlayable: true },
    { durationSeconds: 20, enabled: false, isPlayable: true },
    { durationSeconds: 99, enabled: true, isPlayable: false },
    { durationSeconds: 0, enabled: true, isPlayable: true }
  ]);

  assert.equal(totalDuration, 31);
});

test("resolveImagesPlaylistTotalDurationSeconds returns 0 when no entry can play", () => {
  const totalDuration = resolveImagesPlaylistTotalDurationSeconds([
    { durationSeconds: 20, enabled: false, isPlayable: true },
    { durationSeconds: 15, enabled: true, isPlayable: false }
  ]);

  assert.equal(totalDuration, 0);
});

test("resolveImagesPlaybackOrder keeps display order when shuffle is off", () => {
  const order = resolveImagesPlaybackOrder([
    { displayOrder: 3, enabled: true, entryId: "IMG-03", isPlayable: true },
    { displayOrder: 1, enabled: true, entryId: "IMG-01", isPlayable: true },
    { displayOrder: 2, enabled: false, entryId: "IMG-02", isPlayable: true },
    { displayOrder: 4, enabled: true, entryId: "IMG-04", isPlayable: false }
  ], { seed: "fixed-seed", shuffle: false });

  assert.deepEqual(order, ["IMG-01", "IMG-03"]);
});

test("resolveImagesPlaybackOrder produces a deterministic shuffled cycle", () => {
  const entries = [
    { displayOrder: 1, enabled: true, entryId: "IMG-01", isPlayable: true },
    { displayOrder: 2, enabled: true, entryId: "IMG-02", isPlayable: true },
    { displayOrder: 3, enabled: true, entryId: "IMG-03", isPlayable: true },
    { displayOrder: 4, enabled: true, entryId: "IMG-04", isPlayable: true },
    { displayOrder: 5, enabled: false, entryId: "IMG-05", isPlayable: true },
    { displayOrder: 6, enabled: true, entryId: "IMG-06", isPlayable: false }
  ];

  const firstOrder = resolveImagesPlaybackOrder(entries, { seed: "fixed-seed", shuffle: true });
  const secondOrder = resolveImagesPlaybackOrder(entries, { seed: "fixed-seed", shuffle: true });

  assert.deepEqual(firstOrder, secondOrder);
  assert.deepEqual([...firstOrder].sort(), ["IMG-01", "IMG-02", "IMG-03", "IMG-04"]);
});
