import type { DisplayCardDataResponse } from "@solar-display/shared";
import {
  guanyinFactoryTopicMetricKeys,
  jungliFactoryTopicMetricKeys
} from "./factoryTopicSites";
import type {
  MqttSettingsForm,
  MqttStatus,
  TopicMapping
} from "./viewModel";

export const defaultMetricOptions = [
  "realTimePower",
  "todayGeneration",
  "totalGeneration",
  "todayCo2Reduction",
  "totalCo2Reduction",
  "selfConsumptionEnergy",
  "consumptionEnergy",
  "systemEfficiency",
  "factoryPeakMultiplier",
  "factoryProductionPower",
  "factoryHvacPower",
  "factoryLightingPower",
  "factoryEvGreenPower",
  "factoryInfrastructurePower",
  ...jungliFactoryTopicMetricKeys,
  ...guanyinFactoryTopicMetricKeys,
  "phaseRVoltage",
  "phaseRCurrent",
  "phaseRPower",
  "phaseSVoltage",
  "phaseSCurrent",
  "phaseSPower",
  "phaseTVoltage",
  "phaseTCurrent",
  "phaseTPower"
] as const;

export type CachedMqttConnectionModel = {
  settings: MqttSettingsForm;
  status: MqttStatus;
};

let cachedMqttConnectionModel: CachedMqttConnectionModel | null = null;

export function readCachedMqttConnectionModel() {
  return cachedMqttConnectionModel;
}

export function rememberMqttConnectionModel(model: CachedMqttConnectionModel | null) {
  cachedMqttConnectionModel = model;
}

export function buildSettingsPayload(settings: MqttSettingsForm) {
  return {
    clientId: settings.clientId.trim(),
    dataMode: settings.dataMode,
    host: settings.host.trim(),
    messageTimeout: Number.parseInt(settings.messageTimeout, 10) || 30,
    password: settings.password,
    port: Number.parseInt(settings.port, 10) || 1883,
    reconnectInterval: Number.parseInt(settings.reconnectInterval, 10) || 5000,
    username: settings.username.trim()
  };
}

export function buildCardDataOverrideKey(
  targetId: string,
  metricScope: DisplayCardDataResponse["rows"][number]["metricScope"]
) {
  return `${metricScope}:${targetId}`;
}

export function createEmptyMapping(
  metricKey: string,
  metricScope: TopicMapping["metricScope"]
): TopicMapping {
  return {
    enabled: true,
    id: -Date.now(),
    lastReceivedAt: null,
    lastValue: null,
    metricKey,
    metricScope,
    multiplier: 1,
    nameZh: null,
    nameEn: null,
    quality: null,
    rawPayload: null,
    topic: "",
    unit: "",
    updatedAt: null,
    valuePath: ""
  };
}
