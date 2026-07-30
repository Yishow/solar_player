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
  defaultProfile: PlaybackProfileSummary | null;
  devices: Device[];
  groups: DeviceGroup[];
  liveness: DisplayClientLivenessSnapshot | null;
  unavailable: DeviceFleetResource[];
};

export type DeviceFleetLoaders = {
  getDevices: () => Promise<Device[]>;
  getGroups: () => Promise<DeviceGroup[]>;
  getLiveness: () => Promise<DisplayClientLivenessSnapshot>;
};

export async function loadDeviceFleetModel(
  loaders: DeviceFleetLoaders
): Promise<DeviceFleetModel> {
  const [devices, groups, liveness] = await Promise.allSettled([
    loaders.getDevices(),
    loaders.getGroups(),
    loaders.getLiveness()
  ]);
  const accessDenied = [devices, groups, liveness].some(
    (result) =>
      result.status === "rejected"
      && isManagementAccessDeniedError(result.reason)
  );
  const unavailable: DeviceFleetResource[] = [];

  if (devices.status === "rejected") unavailable.push("devices");
  if (groups.status === "rejected") unavailable.push("groups");
  if (liveness.status === "rejected") unavailable.push("liveness");
  const defaultProfile =
    groups.status === "fulfilled"
      ? groups.value
          .map((group) => group.playbackProfile)
          .find((profile) => profile.isDefault) ?? null
      : null;
  if (groups.status === "fulfilled" && defaultProfile === null) {
    unavailable.push("defaultProfile");
  }

  return {
    accessDenied,
    defaultProfile,
    devices: devices.status === "fulfilled" ? devices.value : [],
    groups: groups.status === "fulfilled" ? groups.value : [],
    liveness: liveness.status === "fulfilled" ? liveness.value : null,
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
