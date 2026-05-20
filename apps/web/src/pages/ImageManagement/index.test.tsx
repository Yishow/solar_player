import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const imageManagementSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const imageManagementContentSource = readFileSync(path.join(import.meta.dirname, "ImageManagementContent.tsx"), "utf8");
const apiSource = readFileSync(path.join(import.meta.dirname, "../../services/api.ts"), "utf8");

test("image management persists playlist-facing metadata through the playlist runtime API", () => {
  assert.match(imageManagementSource, /buildImageManagementDraftSaveTarget/);
  assert.match(imageManagementSource, /persistImageManagementDraftTarget\(saveTarget\)/);
  assert.doesNotMatch(imageManagementSource, /shouldMirrorLegacyPlaybackState/);
  assert.doesNotMatch(imageManagementSource, /includedInSlideshow: effectiveIncludedInSlideshow/);
  assert.doesNotMatch(imageManagementSource, /displayDuration: selectedPlaylistEntry\?\.durationSeconds \?\? selectedAsset\.displayDuration/);
  assert.match(imageManagementSource, /normalizeManagementPlaylistAssetId\(entry\.assetId, entry\.entryId\)/);
  assert.match(apiSource, /updateImagePlaylistEntry\(target\.playlistEntry\.entryId/);
  assert.match(apiSource, /title: normalizeNullableImageManagementText\(target\.playlistEntry\.title\)/);
  assert.match(apiSource, /area: normalizeNullableImageManagementText\(target\.playlistEntry\.area\)/);
});

test("image management editor surfaces playlist runtime controls and server-driven delete blockers", () => {
  assert.match(imageManagementContentSource, /播放設定/);
  assert.match(imageManagementContentSource, /Playlist Runtime/);
  assert.match(imageManagementContentSource, /playlistRuntimeStatus/);
  assert.match(imageManagementContentSource, /playlistFallbackMode/);
  assert.match(imageManagementContentSource, /updatePlaylistEntryField/);
  assert.match(imageManagementSource, /deleteBlocked=\{\(assetReferences\?\.blockingIssues\.length \?\? 0\) > 0\}/);
});

test("image management blocks cross-selection context switches when the current draft is still dirty", () => {
  assert.match(imageManagementSource, /const handleSelectImage = \(nextImageId: number\) => {/);
  assert.match(imageManagementSource, /hasSelectedImageManagementDraftChanges\(/);
  assert.match(imageManagementSource, /請先儲存或重新同步目前圖片的未儲存變更，再切換其他素材。/);
  assert.match(imageManagementContentSource, /onClick=\{\(\) => handleSelectImage\(asset\.id\)\}/);
});

test("image management save flow targets the authoritative draft session and resyncs that same image", () => {
  assert.match(imageManagementSource, /const saveTarget = buildImageManagementDraftSaveTarget\(/);
  assert.match(imageManagementSource, /await persistImageManagementDraftTarget\(saveTarget\)/);
  assert.match(imageManagementSource, /await syncImages\(saveTarget\.asset\.id\)/);
});
