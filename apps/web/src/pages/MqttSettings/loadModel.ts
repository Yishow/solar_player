import {
  DEFAULT_WEATHER_SETTINGS,
  type WeatherSettings
} from "@solar-display/shared";
import {
  getWeatherSettings,
  requestJson
} from "../../services/api";
import type { DataMode, MqttSettingsForm, MqttStatus, TopicMapping } from "./viewModel";

export type MqttSettingsResponse = {
  settings: {
    dataMode: DataMode;
    host: string;
    port: number;
    username: string;
    password: string;
    clientId: string;
    reconnectInterval: number;
    messageTimeout: number;
  };
  status: MqttStatus;
};

export type TopicMappingsResponse = {
  status: MqttStatus;
  topics: TopicMapping[];
};

type MqttEditableModelLoadOptions = {
  force?: boolean;
};

export type MqttEditableModel = {
  settings: MqttSettingsForm;
  status: MqttStatus;
  topics: TopicMapping[];
  weatherSettings: WeatherSettings;
};

export const defaultMqttFormState: MqttSettingsForm = {
  clientId: "solar-display-player",
  dataMode: "mqtt",
  host: "localhost",
  messageTimeout: "30",
  password: "",
  port: "1883",
  reconnectInterval: "5000",
  username: ""
};

export const defaultMqttStatus: MqttStatus = {
  broker: "",
  clientId: "",
  connected: false,
  reason: null,
  updatedAt: null
};

let cachedMqttEditableModel: MqttEditableModel | null = null;

const topicEditableFields = ["enabled", "metricKey", "topic", "unit", "valuePath"] as const;

function hasEditableTopicDraft(current: TopicMapping, synced: TopicMapping | undefined) {
  if (!synced) {
    return true;
  }

  return topicEditableFields.some((field) => current[field] !== synced[field]);
}

function preserveEditableTopicFields(polled: TopicMapping, current: TopicMapping): TopicMapping {
  return {
    ...polled,
    enabled: current.enabled,
    metricKey: current.metricKey,
    topic: current.topic,
    unit: current.unit,
    valuePath: current.valuePath
  };
}

export function toFormState(settings: MqttSettingsResponse["settings"]): MqttSettingsForm {
  return {
    clientId: settings.clientId,
    dataMode: settings.dataMode,
    host: settings.host,
    messageTimeout: String(settings.messageTimeout),
    password: settings.password,
    port: String(settings.port),
    reconnectInterval: String(settings.reconnectInterval),
    username: settings.username
  };
}

export function mergePolledTopicMappings(
  currentTopics: TopicMapping[],
  lastSyncedTopics: TopicMapping[],
  polledTopics: TopicMapping[]
): TopicMapping[] {
  const currentTopicIds = new Set(currentTopics.map((topic) => topic.id));
  const syncedTopicIds = new Set(lastSyncedTopics.map((topic) => topic.id));
  const syncedById = new Map(lastSyncedTopics.map((topic) => [topic.id, topic]));
  const polledById = new Map(polledTopics.map((topic) => [topic.id, topic]));
  const hasLocalDraft =
    currentTopics.some((topic) => hasEditableTopicDraft(topic, syncedById.get(topic.id))) ||
    lastSyncedTopics.some((topic) => !currentTopicIds.has(topic.id));

  if (!hasLocalDraft) {
    return polledTopics;
  }

  const mergedTopics = currentTopics.flatMap((topic) => {
    const polledTopic = polledById.get(topic.id);
    const syncedTopic = syncedById.get(topic.id);

    if (!polledTopic) {
      return syncedTopicIds.has(topic.id) ? [] : [topic];
    }

    if (!hasEditableTopicDraft(topic, syncedTopic)) {
      return [polledTopic];
    }

    return [preserveEditableTopicFields(polledTopic, topic)];
  });

  const newPolledTopics = polledTopics.filter(
    (topic) => !currentTopicIds.has(topic.id) && !syncedTopicIds.has(topic.id)
  );

  return [...mergedTopics, ...newPolledTopics];
}

export function readCachedMqttEditableModel() {
  return cachedMqttEditableModel;
}

export function rememberMqttEditableModel(model: MqttEditableModel) {
  cachedMqttEditableModel = model;
}

export async function loadMqttEditableModel(
  options: MqttEditableModelLoadOptions = {}
): Promise<MqttEditableModel> {
  if (!options.force && cachedMqttEditableModel) {
    return cachedMqttEditableModel;
  }

  const [settingsResponse, topicsResponse, weatherSettings] = await Promise.all([
    requestJson<MqttSettingsResponse>("/api/settings/mqtt"),
    requestJson<TopicMappingsResponse>("/api/settings/mqtt/topics"),
    getWeatherSettings()
  ]);
  const model = {
    settings: toFormState(settingsResponse.settings),
    status: settingsResponse.status,
    topics: topicsResponse.topics,
    weatherSettings: weatherSettings ?? DEFAULT_WEATHER_SETTINGS
  };

  rememberMqttEditableModel(model);

  return model;
}
