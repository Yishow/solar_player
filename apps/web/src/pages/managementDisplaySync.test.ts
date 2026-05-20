import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pageSources = [
  "PlaybackSettings/index.tsx",
  "MqttSettings/index.tsx",
  "CircuitSettings/index.tsx",
  "ImageManagement/index.tsx",
  "BrandAssets/index.tsx"
].map((relativePath) => ({
  path: relativePath,
  source: fs.readFileSync(path.join(import.meta.dirname, relativePath), "utf8")
}));

test("management surfaces wire the shared display-sync draft guard contract", () => {
  for (const page of pageSources) {
    assert.match(page.source, /useDisplaySyncDraftGuard\(/, `${page.path} should use the shared draft guard`);
    assert.match(page.source, /isDirty:/, `${page.path} should provide an isDirty adapter field`);
    assert.match(page.source, /reloadNow:/, `${page.path} should provide a reloadNow adapter field`);
    assert.match(page.source, /RemoteSyncBanner/, `${page.path} should render the shared remote sync banner`);
    assert.match(page.source, /onKeepEditing=\{syncDraftGuard\.keepEditing\}/, `${page.path} should keep the explicit keep-editing action`);
    assert.match(
      page.source,
      /onReloadNow=\{\(\) => syncDraftGuard\.discardAndReload\(\)\.catch\(\(\) => \{\}\)\}/,
      `${page.path} should offer the explicit discard-and-reload action`
    );
  }
});

test("management surfaces keep clean summary reloads inside their display-sync adapters", () => {
  const playbackSettingsSource = pageSources.find((page) => page.path === "PlaybackSettings/index.tsx")?.source ?? "";
  const mqttSettingsSource = pageSources.find((page) => page.path === "MqttSettings/index.tsx")?.source ?? "";
  const circuitSettingsSource = pageSources.find((page) => page.path === "CircuitSettings/index.tsx")?.source ?? "";
  const imageManagementSource = pageSources.find((page) => page.path === "ImageManagement/index.tsx")?.source ?? "";
  const brandAssetsSource = pageSources.find((page) => page.path === "BrandAssets/index.tsx")?.source ?? "";

  assert.match(playbackSettingsSource, /reloadDisplayOpsSummary\(\)/);
  assert.match(mqttSettingsSource, /reloadReadiness\(\)/);
  assert.match(circuitSettingsSource, /reloadReadiness\(\)/);
  assert.match(imageManagementSource, /reloadAssetHealth\(\)/);
  assert.match(imageManagementSource, /reloadAssetReferences\(\)/);
  assert.match(brandAssetsSource, /resyncBrandProfiles/);
});

test("BrandAssets exposes operator-facing destructive confirmations instead of confirm-only flows", () => {
  const brandAssetsSource = pageSources.find((page) => page.path === "BrandAssets/index.tsx")?.source ?? "";

  assert.match(brandAssetsSource, /pendingAction/);
  assert.match(brandAssetsSource, /brand-confirm-panel/);
  assert.match(brandAssetsSource, /confirmPendingAction/);
  assert.match(brandAssetsSource, /cancelPendingAction/);
});
