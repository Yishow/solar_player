import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const imageManagementSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const imageManagementContentSource = readFileSync(path.join(import.meta.dirname, "ImageManagementContent.tsx"), "utf8");
const imageManagementLoadModelSource = readFileSync(path.join(import.meta.dirname, "loadModel.ts"), "utf8");
const imageManagementCss = readFileSync(path.join(import.meta.dirname, "imageManagement.css"), "utf8");
const apiSource = readFileSync(path.join(import.meta.dirname, "../../services/api.ts"), "utf8");

test("image management persists playlist-facing metadata through the playlist runtime API", () => {
  assert.match(imageManagementSource, /buildImageManagementDraftSaveTarget/);
  assert.match(imageManagementSource, /persistImageManagementDraftTarget\(saveTarget\)/);
  assert.doesNotMatch(imageManagementSource, /shouldMirrorLegacyPlaybackState/);
  assert.doesNotMatch(imageManagementSource, /includedInSlideshow: effectiveIncludedInSlideshow/);
  assert.doesNotMatch(imageManagementSource, /displayDuration: selectedPlaylistEntry\?\.durationSeconds \?\? selectedAsset\.displayDuration/);
  assert.match(imageManagementLoadModelSource, /normalizeManagementPlaylistAssetId\(entry\.assetId, entry\.entryId\)/);
  assert.match(apiSource, /updateImagePlaylistEntry\(target\.playlistEntry\.entryId/);
  assert.match(apiSource, /title: normalizeNullableImageManagementText\(target\.playlistEntry\.title\)/);
  assert.match(apiSource, /area: normalizeNullableImageManagementText\(target\.playlistEntry\.area\)/);
});

test("image management editor surfaces playlist runtime controls and server-driven delete blockers", () => {
  assert.match(imageManagementContentSource, /播放設定/);
  assert.match(imageManagementContentSource, /Playlist Runtime/);
  assert.match(imageManagementContentSource, /playlistRuntimeStatus/);
  assert.match(imageManagementContentSource, /playlistFallbackMode/);
  assert.match(imageManagementContentSource, /playlistEntryRows/);
  assert.match(imageManagementContentSource, /隨機播放/);
  assert.match(imageManagementContentSource, /onTogglePlaylistShuffle/);
  assert.match(imageManagementContentSource, /全部播放時間/);
  assert.match(imageManagementContentSource, /onApplyPlaylistBulkDuration/);
  assert.match(imageManagementLoadModelSource, /playlistBulkDurationSeconds:\s*resolveBulkPlaylistDurationInput\(playlistEntries\)/);
  assert.match(imageManagementSource, /setPlaylistBulkDurationSeconds\(appliedDuration\)/);
  assert.match(imageManagementContentSource, /event\.target\.value === "" \? "" : Number\(event\.target\.value\)/);
  assert.match(imageManagementContentSource, /playlistBulkDurationSeconds === ""/);
  assert.match(imageManagementSource, /updateAllImagePlaylistDurations\(\{ durationSeconds: appliedDuration \}\)/);
  assert.match(imageManagementContentSource, /handleSelectPlaylistEntry/);
  assert.match(imageManagementContentSource, /updatePlaylistEntryField/);
  assert.match(imageManagementContentSource, /Delete Blockers/);
  assert.match(imageManagementContentSource, /Live Runtime/);
  assert.match(imageManagementContentSource, /Draft Configuration/);
  assert.match(imageManagementContentSource, /Slideshow Governance/);
});

test("image management repositions the page around governance and editor handoff instead of presenting a second asset-library home", () => {
  assert.match(imageManagementContentSource, /輪播治理與素材交接/);
  assert.match(imageManagementContentSource, /Governance &amp; Editor Handoff/);
  assert.match(imageManagementContentSource, /to="\/display-pages\/editor\?workspace=assets"/);
  assert.match(imageManagementContentSource, /素材替換、版面配置與批次整理請前往展示頁編輯器資產工作區。/);
  assert.match(imageManagementContentSource, /intent=focal-point/);
  assert.match(imageManagementContentSource, /selectedAsset=/);
  assert.doesNotMatch(imageManagementContentSource, /className="im-crop-btn" disabled/);
  assert.doesNotMatch(imageManagementContentSource, /素材庫\s*<small>Asset Library/);
});

test("image management blocks cross-selection context switches when the current draft is still dirty", () => {
  assert.match(imageManagementSource, /const handleSelectImage = \(nextImageId: number\) => {/);
  assert.match(imageManagementSource, /hasSelectedImageManagementDraftChanges\(/);
  assert.match(imageManagementSource, /請先儲存或重新同步目前圖片的未儲存變更，再切換其他素材。/);
  assert.match(imageManagementContentSource, /onClick=\{\(\) => handleSelectImage\(asset\.id\)\}/);
});

test("image management save flow targets the authoritative draft session without full cold bootstrap", () => {
  assert.match(imageManagementSource, /const saveTarget = buildImageManagementDraftSaveTarget\(/);
  assert.match(imageManagementSource, /await persistImageManagementDraftTarget\(saveTarget\)/);
  assert.match(imageManagementSource, /setLastSyncedAssets\(assets\)/);
  assert.match(imageManagementSource, /setLastSyncedPlaylistEntries\(playlistEntries\)/);
  assert.match(imageManagementSource, /refreshImageManagementDiagnostics\(saveTarget\.asset\.id\)/);
  assert.doesNotMatch(imageManagementSource, /await syncImages\(saveTarget\.asset\.id\)/);
});

test("image management mutation follow-ups use targeted refresh lanes", () => {
  assert.match(imageManagementSource, /loadImageManagementLibraryModel/);
  assert.match(imageManagementSource, /loadImageManagementPlaylistGovernanceModel/);
  assert.match(imageManagementSource, /const refreshLibraryLane = async/);
  assert.match(imageManagementSource, /const refreshPlaylistGovernanceLane = async/);
  assert.match(imageManagementSource, /const refreshImageManagementDiagnostics = async \(assetId: number \| null = selectedImageId\)/);
  assert.match(imageManagementSource, /reloadAssetReferences\(assetId\)/);
  assert.match(imageManagementSource, /await refreshLibraryLane\(lastUploadedId\)/);
  assert.match(imageManagementSource, /await refreshPlaylistGovernanceLane\(lastUploadedId\)/);
  assert.match(imageManagementSource, /refreshImageManagementDiagnostics\(lastUploadedId\)/);
  assert.match(imageManagementSource, /const updatedAsset = await updateImageAsset\(selectedImageId, \{ isCover: true \}\)/);
  assert.match(imageManagementSource, /applyUpdatedImageAsset\(updatedAsset\)/);
  assert.match(imageManagementSource, /await refreshPlaylistGovernanceLane\(selectedImageId\)/);
  assert.doesNotMatch(imageManagementSource, /await syncImages\(lastUploadedId\)/);
  assert.doesNotMatch(imageManagementSource, /await syncImages\(selectedImageId\)/);
});

test("image management loads the editable library model before deferred diagnostics", () => {
  assert.match(imageManagementSource, /loadImageManagementModel\(\)/);
  assert.match(imageManagementSource, /const applyImageManagementModel = \(model: ImageManagementModel\) => {/);
  assert.match(imageManagementSource, /useDisplayPageAssetHealth\(\{\s*enabled:\s*hasLoadedImageManagementModel\s*\}\)/);
  assert.match(imageManagementSource, /useImageAssetReferences\(selectedImageId,\s*\{\s*enabled:\s*hasLoadedImageManagementModel\s*\}\)/);
  assert.doesNotMatch(imageManagementSource, /getImages\(\)/);
  assert.doesNotMatch(imageManagementSource, /fetchImagePlaylistGovernance\(\)/);
});

test("image management library and editor cards keep their own scroll containers", () => {
  assert.match(
    imageManagementCss,
    /\.image-mgmt-page \.im-card-library\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;/
  );
  assert.match(
    imageManagementCss,
    /\.image-mgmt-page \.im-grid-wrap\s*\{[\s\S]*min-height:\s*0;[\s\S]*overflow-y:\s*auto;/
  );
  assert.match(
    imageManagementCss,
    /\.image-mgmt-page \.im-editor-body\s*\{[\s\S]*min-height:\s*0;[\s\S]*overflow-y:\s*auto;/
  );
});
