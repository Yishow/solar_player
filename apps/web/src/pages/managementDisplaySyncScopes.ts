import type { DisplaySyncEventScope } from "@solar-display/shared";

function defineDisplaySyncScopes<const T extends readonly DisplaySyncEventScope[]>(scopes: T) {
  return scopes;
}

export const BRAND_ASSETS_DISPLAY_SYNC_SCOPES = defineDisplaySyncScopes(["brand"]);

export const MQTT_SETTINGS_DISPLAY_SYNC_SCOPES = defineDisplaySyncScopes(["mqtt", "weather"]);

export const CIRCUIT_SETTINGS_DISPLAY_SYNC_SCOPES = defineDisplaySyncScopes(["circuits"]);

export const PLAYBACK_SETTINGS_DISPLAY_SYNC_SCOPES = defineDisplaySyncScopes([
  "display-pages",
  "playback"
]);

export const IMAGE_MANAGEMENT_DISPLAY_SYNC_SCOPES = defineDisplaySyncScopes([
  "display-pages",
  "images"
]);

export const DEVICE_STATUS_DISPLAY_SYNC_SCOPES = defineDisplaySyncScopes([
  "circuits",
  "device",
  "display-ops",
  "display-pages",
  "images",
  "mqtt",
  "playback"
]);
