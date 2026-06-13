import type { DeviceDisplayOpsSummary } from "@solar-display/shared";
import {
  getDeviceDisplayOpsSummary,
  getDeviceLogExportMetadata,
  getDeviceStatus,
  type DeviceLogExportMetadata,
  type DeviceStatusResponseData
} from "../../services/api";

export type DeviceStatusModel = {
  displayOpsSummary: DeviceDisplayOpsSummary;
  logExport: DeviceLogExportMetadata;
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

  const [status, logExport, displayOpsSummary] = await Promise.all([
    getDeviceStatus(),
    getDeviceLogExportMetadata(),
    getDeviceDisplayOpsSummary()
  ]);

  return rememberDeviceStatusModel({
    displayOpsSummary,
    logExport,
    status
  });
}
