import { useMemo } from "react";
import type {
  MqttSettingsContentProps,
  MqttSettingsSurface
} from "./MqttSettingsContent.types";
import {
  readCachedMqttConnectionModel
} from "./mqttSettingsRouteModel";
import {
  readCachedMqttEditableModel,
  type MqttEditableModel
} from "./loadModel";
import {
  useMqttSettingsData,
  type MqttSettingsDataController
} from "./useMqttSettingsData";
import {
  useMqttSettingsRuntime,
  type MqttSettingsRuntimeController
} from "./useMqttSettingsRuntime";
import {
  useMqttSettingsCardData,
  type MqttSettingsCardDataController
} from "./useMqttSettingsCardData";
import {
  useMqttSettingsBroker,
  type MqttSettingsBrokerController
} from "./useMqttSettingsBroker";
import {
  useMqttSettingsTopics,
  type MqttSettingsTopicsController
} from "./useMqttSettingsTopics";
import {
  useMqttSettingsRemoteSync,
  type MqttSettingsRemoteSyncController
} from "./useMqttSettingsRemoteSync";
import {
  useMqttSettingsWeather,
  type MqttSettingsWeatherController
} from "./useMqttSettingsWeather";

export type MqttSettingsController = Omit<MqttSettingsContentProps, "remoteSyncBanner"> & {
  remoteSync: MqttSettingsRemoteSyncController["syncDraftGuard"];
};

type ControllerParts = {
  broker: MqttSettingsBrokerController;
  card: MqttSettingsCardDataController;
  data: MqttSettingsDataController;
  remote: MqttSettingsRemoteSyncController;
  runtime: MqttSettingsRuntimeController;
  topics: MqttSettingsTopicsController;
  weather: MqttSettingsWeatherController;
};

export function useMqttSettingsController(
  surface: MqttSettingsSurface
): MqttSettingsController {
  const connectionsOnly = surface === "connections";
  const initialEditableModel: MqttEditableModel | null = useMemo(
    () => (connectionsOnly ? null : readCachedMqttEditableModel()),
    [connectionsOnly]
  );
  const initialConnectionModel = useMemo(
    () => (connectionsOnly ? readCachedMqttConnectionModel() : null),
    [connectionsOnly]
  );
  const data = useMqttSettingsData({
    connectionsOnly,
    initialConnectionModel,
    initialEditableModel
  });
  const runtime = useMqttSettingsRuntime({
    connectionsOnly,
    hasLoadedMqttEditableModel: data.hasLoadedMqttEditableModel,
    hasLoadedMqttSettings: data.hasLoadedMqttSettings,
    setStatus: data.setStatus
  });
  const card = useMqttSettingsCardData({ data });
  const weather = useMqttSettingsWeather({ data });
  const broker = useMqttSettingsBroker({
    connectionsOnly,
    data,
    reloadReadiness: runtime.reloadReadiness
  });
  const topics = useMqttSettingsTopics({
    activeCardDataSite: card.activeCardDataSite,
    activeTopicWorkspaceTab: card.activeTopicWorkspaceTab,
    data,
    loadCardData: card.loadCardData,
    reloadReadiness: runtime.reloadReadiness
  });
  const remote = useMqttSettingsRemoteSync({
    connectionsOnly,
    data,
    reloadReadiness: runtime.reloadReadiness
  });

  return composeMqttSettingsController({ broker, card, data, remote, runtime, topics, weather }, surface);
}

function composeMqttSettingsController(
  parts: ControllerParts,
  surface: MqttSettingsSurface
): MqttSettingsController {
  const { broker, card, data, remote, runtime, topics, weather } = parts;
  return {
    actionState: data.actionState,
    activeCardDataSite: card.activeCardDataSite,
    activeTopicWorkspaceTab: card.activeTopicWorkspaceTab,
    addTopicMapping: topics.addTopicMapping,
    cardDataErrorMessage: card.cardDataErrorMessage,
    cardDataRows: card.cardData?.rows ?? [],
    clearDisplayOverride: card.clearDisplayOverride,
    copyWeatherDiagnostic: weather.copyWeatherDiagnostic,
    draftSections: remote.draftSections,
    enabledCardDataSites: card.enabledCardDataSites,
    errorMessage: data.errorMessage,
    handleCardDataSiteChange: card.handleCardDataSiteChange,
    handleConfigureTopicMetric: card.handleConfigureTopicMetric,
    handleOverrideDraftChange: card.handleOverrideDraftChange,
    handleSettingChange: broker.handleSettingChange,
    handleTopicChange: topics.handleTopicChange,
    handleTopicPublishDraftChange: topics.handleTopicPublishDraftChange,
    handleTopicWorkspaceTabChange: card.setActiveTopicWorkspaceTab,
    handleWeatherSettingChange: weather.handleWeatherSettingChange,
    highlightedTopicMetricKey: card.highlightedTopicMetricKey,
    isLoadingCardData: card.isLoadingCardData,
    lastConnectionTest: data.lastConnectionTest,
    liveMetricsConnectionState: runtime.liveMetricsConnectionState,
    liveMetricsSnapshot: runtime.mqttLiveMetricsSnapshot,
    message: data.message,
    overrideDrafts: card.overrideDrafts,
    publishTopicValue: topics.publishTopicValue,
    publishingTopicKey: topics.publishingTopicKey,
    readiness: runtime.readiness,
    readinessErrorMessage: runtime.readinessErrorMessage,
    refreshWeather: weather.refreshWeather,
    reloadTopics: topics.reloadTopics,
    removeTopicMapping: topics.removeTopicMapping,
    remoteSync: remote.syncDraftGuard,
    saveDisplayOverride: card.saveDisplayOverride,
    saveSettings: broker.saveSettings,
    saveTopicMappings: topics.saveTopicMappings,
    savingOverrideTargetId: card.savingOverrideTargetId,
    settings: data.settings,
    status: data.status,
    surface,
    testConnection: broker.testConnection,
    toggleWeatherField: weather.toggleWeatherField,
    topicMappingsDirty: remote.draftSections.topic,
    topicPublishDrafts: topics.topicPublishDrafts,
    topics: data.topics,
    weatherDiagnostic: data.weatherDiagnostic,
    weatherOptions: weather.weatherOptions,
    weatherOptionsErrorMessage: weather.weatherOptionsErrorMessage,
    weatherPreviewContract: weather.weatherPreviewContract,
    weatherPreviewErrorMessage: weather.weatherPreviewErrorMessage,
    weatherSettings: data.weatherSettings
  };
}
