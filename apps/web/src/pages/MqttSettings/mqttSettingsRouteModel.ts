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

function requireText(value: string, label: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} 不可空白。`);
  }
  return trimmed;
}

function parseDecimalInteger(
  value: string,
  label: string,
  options: { min: number; max?: number }
) {
  const trimmed = value.trim();
  if (!/^[0-9]+$/u.test(trimmed)) {
    throw new Error(`${label} 必須是完整整數。`);
  }

  const parsed = Number(trimmed);
  if (
    !Number.isSafeInteger(parsed)
    || parsed < options.min
    || (options.max !== undefined && parsed > options.max)
  ) {
    const range = options.max === undefined
      ? `${options.min} 以上`
      : `${options.min} 到 ${options.max}`;
    throw new Error(`${label} 必須介於 ${range}。`);
  }

  return parsed;
}

export function buildSettingsPayload(settings: MqttSettingsForm) {
  return {
    clientId: requireText(settings.clientId, "Client ID"),
    dataMode: settings.dataMode,
    host: requireText(settings.host, "Broker Host"),
    messageTimeout: parseDecimalInteger(settings.messageTimeout, "Message Timeout", { min: 1 }),
    password: settings.password,
    port: parseDecimalInteger(settings.port, "Port", { min: 1, max: 65_535 }),
    reconnectInterval: parseDecimalInteger(settings.reconnectInterval, "Reconnect Interval", { min: 0 }),
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
