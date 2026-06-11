import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  applyDisplaySyncDraftGuard
} from "../hooks/displaySyncDraftGuard";
import { shouldHandleDisplaySyncScope } from "../hooks/useDisplaySyncRefresh";
import {
  BRAND_ASSETS_DISPLAY_SYNC_SCOPES,
  CIRCUIT_SETTINGS_DISPLAY_SYNC_SCOPES,
  DEVICE_STATUS_DISPLAY_SYNC_SCOPES,
  IMAGE_MANAGEMENT_DISPLAY_SYNC_SCOPES,
  MQTT_SETTINGS_DISPLAY_SYNC_SCOPES,
  PLAYBACK_SETTINGS_DISPLAY_SYNC_SCOPES
} from "./managementDisplaySyncScopes";

const baseDisplaySyncEvent = {
  generatedAt: "2026-05-20T00:00:00.000Z",
  reason: "spec-regression"
} as const;

const pageSources = [
  "PlaybackSettings/index.tsx",
  "MqttSettings/index.tsx",
  "CircuitSettings/index.tsx",
  "ImageManagement/index.tsx",
  "BrandAssets/index.tsx",
  "DeviceStatus/index.tsx"
].map((relativePath) => ({
  path: relativePath,
  source: fs.readFileSync(path.join(import.meta.dirname, relativePath), "utf8")
}));

test("management surfaces wire the shared display-sync draft guard contract", () => {
  for (const page of pageSources) {
    if (page.path === "DeviceStatus/index.tsx") {
      continue;
    }

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
  assert.match(mqttSettingsSource, /refreshDeferredSettingsDiagnostics\(\[reloadReadiness\]\)/);
  assert.match(circuitSettingsSource, /refreshDeferredSettingsDiagnostics\(\[reloadReadiness\]\)/);
  assert.match(imageManagementSource, /reloadAssetHealth\(\)/);
  assert.match(imageManagementSource, /reloadAssetReferences\(\)/);
  assert.match(brandAssetsSource, /resyncBrandProfiles/);
});

test("management surfaces declare surface-specific display-sync scope filters", () => {
  const playbackSettingsSource = pageSources.find((page) => page.path === "PlaybackSettings/index.tsx")?.source ?? "";
  const mqttSettingsSource = pageSources.find((page) => page.path === "MqttSettings/index.tsx")?.source ?? "";
  const circuitSettingsSource = pageSources.find((page) => page.path === "CircuitSettings/index.tsx")?.source ?? "";
  const imageManagementSource = pageSources.find((page) => page.path === "ImageManagement/index.tsx")?.source ?? "";
  const brandAssetsSource = pageSources.find((page) => page.path === "BrandAssets/index.tsx")?.source ?? "";
  const deviceStatusSource = pageSources.find((page) => page.path === "DeviceStatus/index.tsx")?.source ?? "";

  assert.match(playbackSettingsSource, /PLAYBACK_SETTINGS_DISPLAY_SYNC_SCOPES/);
  assert.match(playbackSettingsSource, /relevantScopes:\s*PLAYBACK_SETTINGS_DISPLAY_SYNC_SCOPES/);
  assert.match(playbackSettingsSource, /useDisplaySyncRefresh\(syncDraftGuard\.handleDisplaySync,\s*PLAYBACK_SETTINGS_DISPLAY_SYNC_SCOPES\)/);

  assert.match(mqttSettingsSource, /MQTT_SETTINGS_DISPLAY_SYNC_SCOPES/);
  assert.match(mqttSettingsSource, /relevantScopes:\s*MQTT_SETTINGS_DISPLAY_SYNC_SCOPES/);
  assert.match(mqttSettingsSource, /useDisplaySyncRefresh\(syncDraftGuard\.handleDisplaySync,\s*MQTT_SETTINGS_DISPLAY_SYNC_SCOPES\)/);

  assert.match(circuitSettingsSource, /CIRCUIT_SETTINGS_DISPLAY_SYNC_SCOPES/);
  assert.match(circuitSettingsSource, /relevantScopes:\s*CIRCUIT_SETTINGS_DISPLAY_SYNC_SCOPES/);
  assert.match(circuitSettingsSource, /useDisplaySyncRefresh\(syncDraftGuard\.handleDisplaySync,\s*CIRCUIT_SETTINGS_DISPLAY_SYNC_SCOPES\)/);

  assert.match(imageManagementSource, /IMAGE_MANAGEMENT_DISPLAY_SYNC_SCOPES/);
  assert.match(imageManagementSource, /relevantScopes:\s*IMAGE_MANAGEMENT_DISPLAY_SYNC_SCOPES/);
  assert.match(imageManagementSource, /useDisplaySyncRefresh\(syncDraftGuard\.handleDisplaySync,\s*IMAGE_MANAGEMENT_DISPLAY_SYNC_SCOPES\)/);

  assert.match(brandAssetsSource, /BRAND_ASSETS_DISPLAY_SYNC_SCOPES/);
  assert.match(brandAssetsSource, /relevantScopes:\s*BRAND_ASSETS_DISPLAY_SYNC_SCOPES/);
  assert.match(brandAssetsSource, /useDisplaySyncRefresh\(syncDraftGuard\.handleDisplaySync,\s*BRAND_ASSETS_DISPLAY_SYNC_SCOPES\)/);

  assert.match(deviceStatusSource, /DEVICE_STATUS_DISPLAY_SYNC_SCOPES/);
  assert.match(deviceStatusSource, /useDisplaySyncRefresh\(\(\) => \{[\s\S]*\},\s*DEVICE_STATUS_DISPLAY_SYNC_SCOPES\)/);
});

test("irrelevant display-sync scopes no longer trigger management reloads", async () => {
  assert.equal(
    shouldHandleDisplaySyncScope({ ...baseDisplaySyncEvent, scope: "images" }, BRAND_ASSETS_DISPLAY_SYNC_SCOPES),
    false
  );
  assert.equal(
    shouldHandleDisplaySyncScope({ ...baseDisplaySyncEvent, scope: "display-pages" }, PLAYBACK_SETTINGS_DISPLAY_SYNC_SCOPES),
    true
  );
  assert.equal(
    shouldHandleDisplaySyncScope({ ...baseDisplaySyncEvent, scope: "images" }, PLAYBACK_SETTINGS_DISPLAY_SYNC_SCOPES),
    false
  );
  assert.equal(
    shouldHandleDisplaySyncScope({ ...baseDisplaySyncEvent, scope: "display-pages" }, IMAGE_MANAGEMENT_DISPLAY_SYNC_SCOPES),
    true
  );
  assert.equal(
    shouldHandleDisplaySyncScope({ ...baseDisplaySyncEvent, scope: "circuits" }, MQTT_SETTINGS_DISPLAY_SYNC_SCOPES),
    false
  );
  assert.equal(
    shouldHandleDisplaySyncScope({ ...baseDisplaySyncEvent, scope: "weather" }, MQTT_SETTINGS_DISPLAY_SYNC_SCOPES),
    true
  );
  assert.equal(
    shouldHandleDisplaySyncScope({ ...baseDisplaySyncEvent, scope: "mqtt" }, CIRCUIT_SETTINGS_DISPLAY_SYNC_SCOPES),
    false
  );
  assert.equal(
    shouldHandleDisplaySyncScope({ ...baseDisplaySyncEvent, scope: "playback" }, DEVICE_STATUS_DISPLAY_SYNC_SCOPES),
    true
  );

  let reloadCount = 0;
  const result = await applyDisplaySyncDraftGuard(
    { hasPendingRemoteChange: false },
    {
      event: { ...baseDisplaySyncEvent, scope: "images" },
      isDirty: true,
      relevantScopes: BRAND_ASSETS_DISPLAY_SYNC_SCOPES,
      reloadNow: async () => {
        reloadCount += 1;
      }
    }
  );

  assert.equal(result.outcome, "ignored");
  assert.equal(reloadCount, 0);
  assert.equal(result.nextState.hasPendingRemoteChange, false);
});

test("relevant draft conflicts stay deferred while unrelated scopes stay quiet", async () => {
  let reloadCount = 0;

  const deferredPlaybackSync = await applyDisplaySyncDraftGuard(
    { hasPendingRemoteChange: false },
    {
      event: { ...baseDisplaySyncEvent, scope: "display-pages" },
      isDirty: true,
      relevantScopes: PLAYBACK_SETTINGS_DISPLAY_SYNC_SCOPES,
      reloadNow: async () => {
        reloadCount += 1;
      }
    }
  );

  const ignoredPlaybackSync = await applyDisplaySyncDraftGuard(
    { hasPendingRemoteChange: false },
    {
      event: { ...baseDisplaySyncEvent, scope: "images" },
      isDirty: true,
      relevantScopes: PLAYBACK_SETTINGS_DISPLAY_SYNC_SCOPES,
      reloadNow: async () => {
        reloadCount += 1;
      }
    }
  );

  assert.equal(deferredPlaybackSync.outcome, "deferred");
  assert.equal(deferredPlaybackSync.nextState.hasPendingRemoteChange, true);
  assert.equal(ignoredPlaybackSync.outcome, "ignored");
  assert.equal(ignoredPlaybackSync.nextState.hasPendingRemoteChange, false);
  assert.equal(reloadCount, 0);
});

test("weather-scoped management sync is treated as relevant only for MQTT settings drafts", async () => {
  let reloadCount = 0;

  const deferredWeatherSync = await applyDisplaySyncDraftGuard(
    { hasPendingRemoteChange: false },
    {
      event: { ...baseDisplaySyncEvent, scope: "weather" },
      isDirty: true,
      relevantScopes: MQTT_SETTINGS_DISPLAY_SYNC_SCOPES,
      reloadNow: async () => {
        reloadCount += 1;
      }
    }
  );

  const ignoredWeatherSync = await applyDisplaySyncDraftGuard(
    { hasPendingRemoteChange: false },
    {
      event: { ...baseDisplaySyncEvent, scope: "weather" },
      isDirty: true,
      relevantScopes: BRAND_ASSETS_DISPLAY_SYNC_SCOPES,
      reloadNow: async () => {
        reloadCount += 1;
      }
    }
  );

  assert.equal(deferredWeatherSync.outcome, "deferred");
  assert.equal(deferredWeatherSync.nextState.hasPendingRemoteChange, true);
  assert.equal(ignoredWeatherSync.outcome, "ignored");
  assert.equal(ignoredWeatherSync.nextState.hasPendingRemoteChange, false);
  assert.equal(reloadCount, 0);
});

test("BrandAssets exposes operator-facing destructive confirmations instead of confirm-only flows", () => {
  const brandAssetsSource = pageSources.find((page) => page.path === "BrandAssets/index.tsx")?.source ?? "";

  assert.match(brandAssetsSource, /pendingAction/);
  assert.match(brandAssetsSource, /brand-confirm-panel/);
  assert.match(brandAssetsSource, /confirmPendingAction/);
  assert.match(brandAssetsSource, /cancelPendingAction/);
});
