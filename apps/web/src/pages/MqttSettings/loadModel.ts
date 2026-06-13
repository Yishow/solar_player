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
