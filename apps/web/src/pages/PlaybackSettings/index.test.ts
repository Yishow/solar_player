import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pageDir = path.resolve(import.meta.dirname);
const playbackSettingsSource = fs.readFileSync(path.join(pageDir, "index.tsx"), "utf8");

test("playback settings keeps save and resync actions wired to the playback APIs", () => {
  assert.match(playbackSettingsSource, /const handleSave = async \(\) => \{/);
  assert.match(playbackSettingsSource, /updatePlaybackSettings\(settings\)/);
  assert.match(playbackSettingsSource, /updatePlaybackPages\(/);
  assert.match(playbackSettingsSource, /const resyncPlaybackConfig = async \(\) => \{/);
  assert.match(playbackSettingsSource, /className="mgmt-action ps-resync"/);
  assert.match(playbackSettingsSource, /className="mgmt-action primary ps-save"/);
  assert.match(playbackSettingsSource, /role="status"/);
  assert.match(playbackSettingsSource, /viewModel\.saveBanner\.title/);
});

test("playback settings does not expose an enabled add-page button without backend support", () => {
  assert.match(playbackSettingsSource, /className="ps-add-btn"/);
  assert.match(playbackSettingsSource, /disabled/);
  assert.match(playbackSettingsSource, /title="目前僅支援既有頁面的啟用、排序與停留秒數調整。"/);
});
