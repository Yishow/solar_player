import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pageDir = path.resolve(import.meta.dirname);
const playbackSettingsSource = fs.readFileSync(path.join(pageDir, "index.tsx"), "utf8");
const playbackSettingsCss = fs.readFileSync(path.join(pageDir, "playbackSettings.css"), "utf8");

test("playback settings keeps save and resync actions wired to the playback APIs", () => {
  assert.match(playbackSettingsSource, /const handleSave = async \(\) => \{/);
  assert.match(playbackSettingsSource, /updatePlaybackSettings\(settings\)/);
  assert.match(playbackSettingsSource, /updatePlaybackPages\(/);
  assert.match(playbackSettingsSource, /getDisplayRotationPreview\(\)/);
  assert.match(playbackSettingsSource, /const resyncPlaybackConfig = async \(\) => \{/);
  assert.match(playbackSettingsSource, /className="mgmt-action ps-resync"/);
  assert.match(playbackSettingsSource, /className="mgmt-action primary ps-save"/);
  assert.match(playbackSettingsSource, /role="status"/);
  assert.match(playbackSettingsSource, /showSaveBanner/);
  assert.doesNotMatch(playbackSettingsSource, /正式生效輪播鏈/);
});

test("playback settings renders rotation tiles from the shared live preview catalog instead of static thumbnails", () => {
  assert.match(playbackSettingsSource, /useLiveDisplayPagePreviewCatalog\(\)/);
  assert.match(playbackSettingsSource, /<LiveRotationPreviewList/);
  assert.match(playbackSettingsSource, /ps-preview__alert/);
  assert.doesNotMatch(playbackSettingsSource, /slideOverview/);
  assert.doesNotMatch(playbackSettingsSource, /PAGE_THUMBNAILS/);
  assert.doesNotMatch(playbackSettingsSource, /viewModel\.skippedRotationRows\.length > 0/);
  assert.doesNotMatch(playbackSettingsSource, /viewModel\.pendingDraftRows\.length > 0/);
  assert.match(playbackSettingsSource, /showPreviewAlert/);
});

test("playback settings wires add-page management through display page registry APIs", () => {
  assert.match(playbackSettingsSource, /getDisplayPageRegistry\(\)/);
  assert.match(playbackSettingsSource, /createDisplayPageRegistryPage\(/);
  assert.match(playbackSettingsSource, /archiveDisplayPageRegistryPage\(/);
  assert.match(playbackSettingsSource, /className="ps-add-btn"/);
  assert.match(playbackSettingsSource, /disabled=\{registryActionDisabled\}/);
  assert.match(playbackSettingsSource, /顯示頁面管理/);
  assert.doesNotMatch(playbackSettingsSource, /title="目前僅支援既有頁面的啟用、排序與停留秒數調整。"/);
});

test("playback settings action row opts out of the absolute-position management button primitive", () => {
  assert.match(playbackSettingsCss, /\.playback-settings-page \.ps-actions \.mgmt-action/);
  assert.match(playbackSettingsCss, /position:\s*static/);
  assert.match(playbackSettingsCss, /top:\s*auto/);
});
