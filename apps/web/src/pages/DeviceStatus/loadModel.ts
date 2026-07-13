import type { DeviceDisplayOpsSummary } from "@solar-display/shared";
import {
  getDeviceDisplayOpsSummary,
  getDeviceLogs,
  getDeviceStatus,
  type DeviceLogSummary,
  type DeviceStatusResponseData
} from "../../services/api";

export type DeviceStatusModel = {
  displayOpsSummary: DeviceDisplayOpsSummary;
  logSummary: DeviceLogSummary;
  status: DeviceStatusResponseData;
};

let cachedDeviceStatusModel: DeviceStatusModel | null = null;

export function readCachedDeviceStatusModel() {
  return cachedDeviceStatusModel;
}

export function rememberDeviceStatusModel(model: DeviceStatusModel) {
  cachedDeviceStatusModel = model;
  return model;
}

export async function loadDeviceStatusModel(options: { force?: boolean } = {}) {
  if (!options.force && cachedDeviceStatusModel) {
    return cachedDeviceStatusModel;
  }

  const [status, logSummary, displayOpsSummary] = await Promise.all([
    getDeviceStatus(),
    getDeviceLogs(20),
    getDeviceDisplayOpsSummary()
  ]);

  return rememberDeviceStatusModel({
    displayOpsSummary,
    logSummary,
    status
  });
}
