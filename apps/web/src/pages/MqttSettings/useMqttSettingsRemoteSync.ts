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
    weatherReloadResult,
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
    externalReloadResult: weatherReloadResult,
    isDirty: isDirty,
    relevantScopes: MQTT_SETTINGS_DISPLAY_SYNC_SCOPES,
    stickyPending: !connectionsOnly,
    reloadNow: async (context) => {
      const discardDraft = context?.discardDraft ?? false;
      if (connectionsOnly) {
        await loadSettings({ propagateError: true });
      } else {
        const weatherOutcome = await loadMqttEditableModel({
          propagateError: true,
          topicsAsPolling: true,
          weatherDiscard: discardDraft
        });
        await loadPlaybackPages();
        refreshDeferredSettingsDiagnostics([reloadReadiness]);
        return weatherOutcome;
      }
      refreshDeferredSettingsDiagnostics([reloadReadiness]);
    }
  });

  useDisplaySyncRefresh(syncDraftGuard.handleDisplaySync, MQTT_SETTINGS_DISPLAY_SYNC_SCOPES);

  return { draftSections, syncDraftGuard };
}
