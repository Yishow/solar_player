import { useMemo } from "react";
import {
  hasDisplaySyncDraftChanges,
  useDisplaySyncDraftGuard
} from "../../hooks/displaySyncDraftGuard";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import { refreshDeferredSettingsDiagnostics } from "../shared/editableSettingsLoader";
import { MQTT_SETTINGS_DISPLAY_SYNC_SCOPES } from "../managementDisplaySyncScopes";
import type { MqttSettingsDataController } from "./useMqttSettingsData";

export type MqttSettingsRemoteSyncController = {
  draftSections: {
    broker: boolean;
    topic: boolean;
    weather: boolean;
  };
  syncDraftGuard: ReturnType<typeof useDisplaySyncDraftGuard>;
};

export function useMqttSettingsRemoteSync({
  connectionsOnly,
  data,
  reloadReadiness
}: {
  connectionsOnly: boolean;
  data: MqttSettingsDataController;
  reloadReadiness: () => Promise<void>;
}): MqttSettingsRemoteSyncController {
  const {
    lastSyncedSettings,
    lastSyncedTopics,
    lastSyncedWeatherSettings,
    loadMqttEditableModel,
    loadPlaybackPages,
    loadSettings,
    settings,
    topics,
    weatherSettings
  } = data;
  const draftSections = useMemo(
    () => ({
      broker: hasDisplaySyncDraftChanges(settings, lastSyncedSettings),
      topic: !connectionsOnly && hasDisplaySyncDraftChanges(topics, lastSyncedTopics),
      weather: !connectionsOnly && hasDisplaySyncDraftChanges(weatherSettings, lastSyncedWeatherSettings)
    }),
    [connectionsOnly, lastSyncedSettings, lastSyncedTopics, lastSyncedWeatherSettings, settings, topics, weatherSettings]
  );
  const isDirty = useMemo(
    () => draftSections.broker || draftSections.topic || draftSections.weather,
    [draftSections]
  );
  const syncDraftGuard = useDisplaySyncDraftGuard({
    isDirty: isDirty,
    relevantScopes: MQTT_SETTINGS_DISPLAY_SYNC_SCOPES,
    reloadNow: async () => {
      if (connectionsOnly) {
        await loadSettings({ propagateError: true });
      } else {
        await loadMqttEditableModel({ propagateError: true, topicsAsPolling: true });
        await loadPlaybackPages();
      }
      refreshDeferredSettingsDiagnostics([reloadReadiness]);
    }
  });

  useDisplaySyncRefresh(syncDraftGuard.handleDisplaySync, MQTT_SETTINGS_DISPLAY_SYNC_SCOPES);

  return { draftSections, syncDraftGuard };
}
