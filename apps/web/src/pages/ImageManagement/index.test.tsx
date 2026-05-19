import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const imageManagementSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const imageManagementContentSource = readFileSync(path.join(import.meta.dirname, "ImageManagementContent.tsx"), "utf8");

test("image management persists playlist-facing metadata through the playlist runtime API", () => {
  assert.match(imageManagementSource, /updateImagePlaylistEntry\(selectedPlaylistEntry\.entryId/);
  assert.match(imageManagementSource, /const shouldMirrorLegacyPlaybackState = assetPlaylistEntries\.length <= 1/);
  assert.match(imageManagementSource, /shouldMirrorLegacyPlaybackState/);
  assert.match(imageManagementSource, /displayDuration: selectedPlaylistEntry\?\.durationSeconds \?\? selectedAsset\.displayDuration/);
  assert.match(imageManagementSource, /normalizeManagementPlaylistAssetId\(entry\.assetId, entry\.entryId\)/);
  assert.match(imageManagementSource, /title: normalizeNullablePlaylistText\(selectedPlaylistEntry\.title\)/);
  assert.match(imageManagementSource, /area: normalizeNullablePlaylistText\(selectedPlaylistEntry\.area\)/);
});

test("image management editor surfaces playlist runtime controls and server-driven delete blockers", () => {
  assert.match(imageManagementContentSource, /播放設定/);
  assert.match(imageManagementContentSource, /Playlist Runtime/);
  assert.match(imageManagementContentSource, /playlistFallbackMode/);
  assert.match(imageManagementContentSource, /updatePlaylistEntryField/);
  assert.match(imageManagementSource, /deleteBlocked=\{\(assetReferences\?\.blockingIssues\.length \?\? 0\) > 0\}/);
});
