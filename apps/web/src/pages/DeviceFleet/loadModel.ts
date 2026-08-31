import type {
  Device,
  DeviceGroup,
  DisplayClientLivenessSnapshot,
  PlaybackProfileSummary
} from "@solar-display/shared";
import { isManagementAccessDeniedError } from "../../services/api";
import type {
  DeviceFleetResource
} from "./viewModel";

export type DeviceFleetModel = {
  accessDenied: boolean;
  devices: Device[];
  groups: DeviceGroup[];
  liveness: DisplayClientLivenessSnapshot | null;
  profiles: PlaybackProfileSummary[];
  unavailable: DeviceFleetResource[];
};

export type DeviceFleetLoaders = {
  getDevices: () => Promise<Device[]>;
  getGroups: () => Promise<DeviceGroup[]>;
  getLiveness: () => Promise<DisplayClientLivenessSnapshot>;
  getProfiles: () => Promise<PlaybackProfileSummary[]>;
};

export async function loadDeviceFleetModel(
  loaders: DeviceFleetLoaders
): Promise<DeviceFleetModel> {
  const [devices, groups, liveness, profiles] = await Promise.allSettled([
    loaders.getDevices(),
    loaders.getGroups(),
    loaders.getLiveness(),
    loaders.getProfiles()
  ]);
  const accessDenied = [devices, groups, liveness, profiles].some(
    (result) =>
      result.status === "rejected"
      && isManagementAccessDeniedError(result.reason)
  );
  const unavailable: DeviceFleetResource[] = [];

  if (devices.status === "rejected") unavailable.push("devices");
  if (groups.status === "rejected") unavailable.push("groups");
  if (liveness.status === "rejected") unavailable.push("liveness");
  if (profiles.status === "rejected") unavailable.push("profiles");
  const availableProfiles = profiles.status === "fulfilled" ? profiles.value : [];

  return {
    accessDenied,
    devices: devices.status === "fulfilled" ? devices.value : [],
    groups: groups.status === "fulfilled" ? groups.value : [],
    liveness: liveness.status === "fulfilled" ? liveness.value : null,
    profiles: availableProfiles,
    unavailable
  };
}

export async function runDeviceFleetMutation<T>(args: {
  mutate: () => Promise<T>;
  refresh: DeviceFleetResource[];
  refreshers: Partial<Record<DeviceFleetResource, () => Promise<void>>>;
}) {
  const result = await args.mutate();
  await Promise.all(
    args.refresh.map((resource) => {
      const refresher = args.refreshers[resource];
      if (!refresher) {
        throw new Error(`Missing Device Fleet refresher: ${resource}`);
      }
      return refresher();
    })
  );
  return result;
}
