import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveActiveImagePlaylistEntry,
  resolveImagePlaylistEntries,
  type ImagePlaylistEntryInput
} from "@solar-display/shared";

const entries: ImagePlaylistEntryInput[] = [
  {
    assetId: "asset-1",
    capturedAt: "2026/05/10 14:32",
    description: "封面圖片",
    displayOrder: 1,
    durationSeconds: 25,
    enabled: true,
    entryId: "IMG-01",
    fallbackMode: "display-placeholder",
    tags: ["封面"],
    title: "封面"
  },
  {
    assetId: "asset-2",
    capturedAt: null,
    description: null,
    displayOrder: 2,
    durationSeconds: 10,
    enabled: true,
    entryId: "IMG-02",
    fallbackMode: "skip",
    tags: [],
    title: "缺圖"
  }
];

test("image playlist model resolves explicit fallback modes and preserves metadata", () => {
  const resolved = resolveImagePlaylistEntries({
    assets: [
      {
        assetId: "asset-1",
        height: 2160,
        source: "cover.jpg",
        status: "ready",
        width: 3840
      }
    ],
    entries
  });

  assert.equal(resolved[0]?.durationSeconds, 25);
  assert.equal(resolved[0]?.infoPanel.title, "封面");
  assert.equal(resolved[1]?.fallbackMode, "skip");
  assert.equal(resolved[1]?.fallbackReason, "asset-missing");
});

test("image playlist active selection skips missing entries configured with skip", () => {
  const resolved = resolveImagePlaylistEntries({
    assets: [
      {
        assetId: "asset-1",
        height: 2160,
        source: "cover.jpg",
        status: "ready",
        width: 3840
      }
    ],
    entries
  });
  const active = resolveActiveImagePlaylistEntry(resolved, 1);

  assert.ok(active);
  assert.equal(active.entryId, "IMG-01");
});
