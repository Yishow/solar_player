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
  assert.match(playbackSettingsSource, /loadPlaybackDiagnosticsModel\(\)/);
  assert.match(playbackSettingsSource, /setMessage\("播放設定已儲存。"\);[\s\S]*void refreshPlaybackDiagnostics\(\);[\s\S]*void reloadDisplayOpsSummary\(\);/);
  assert.match(playbackSettingsSource, /const resyncPlaybackConfig = async \(\) => \{/);
  assert.match(playbackSettingsSource, /className="mgmt-action ps-resync"/);
  assert.match(playbackSettingsSource, /className="mgmt-action primary ps-save"/);
  assert.match(playbackSettingsSource, /role="status"/);
  assert.match(playbackSettingsSource, /showSaveBanner/);
  assert.doesNotMatch(playbackSettingsSource, /正式生效輪播鏈/);
});

test("playback settings renders rotation tiles from the shared live preview catalog instead of static thumbnails", () => {
  assert.match(playbackSettingsSource, /useLiveDisplayPagePreviewCatalog\(\{\s*enabled:\s*hasEditableModel\s*\}\)/);
  assert.match(playbackSettingsSource, /<LiveRotationPreviewList/);
  assert.match(playbackSettingsSource, /ps-preview__alert/);
  assert.match(playbackSettingsSource, /ps-preview--with-alert/);
  assert.doesNotMatch(playbackSettingsSource, /slideOverview/);
  assert.doesNotMatch(playbackSettingsSource, /PAGE_THUMBNAILS/);
  assert.doesNotMatch(playbackSettingsSource, /viewModel\.skippedRotationRows\.length > 0/);
  assert.doesNotMatch(playbackSettingsSource, /viewModel\.pendingDraftRows\.length > 0/);
  assert.doesNotMatch(playbackSettingsSource, /Configured Rotation Preview/);
  assert.match(playbackSettingsSource, /showPreviewAlert/);
});



test("playback settings action row opts out of the absolute-position management button primitive", () => {
  assert.match(playbackSettingsCss, /\.playback-settings-page \.ps-actions \.mgmt-action/);
  assert.match(playbackSettingsCss, /position:\s*static/);
  assert.match(playbackSettingsCss, /top:\s*auto/);
});

test("playback settings reserves extra preview space when the alert banner is visible", () => {
  assert.match(playbackSettingsCss, /\.playback-settings-page \.ps-preview--with-alert\s*\{/);
  assert.match(playbackSettingsCss, /\.playback-settings-page \.ps-preview--with-alert\s*\{[\s\S]*height:\s*300px;/);
  assert.match(playbackSettingsCss, /\.playback-settings-page \.ps-preview--with-alert \.ps-preview__list\s*\{/);
});

test("playback settings renders editable model before deferred diagnostics", () => {
  assert.match(playbackSettingsSource, /loadPlaybackEditableModel\(\)/);
  assert.match(playbackSettingsSource, /useLiveDisplayPagePreviewCatalog\(\{\s*enabled:\s*hasEditableModel\s*\}\)/);
  assert.match(playbackSettingsSource, /useDisplayOpsSummary\(\{\s*enabled:\s*hasEditableModel\s*\}\)/);
  assert.match(playbackSettingsSource, /enabled:\s*Boolean\(lastSyncedSettings && rotationPreview\)/);
  assert.match(playbackSettingsSource, /settings:\s*lastSyncedSettings/);
  assert.match(playbackSettingsSource, /rotationPreviewErrorMessage/);
  assert.doesNotMatch(playbackSettingsSource, /const loadPlaybackConfig = async/);
});
