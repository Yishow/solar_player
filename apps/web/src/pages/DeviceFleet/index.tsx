import { useMemo, useState } from "react";
import type { DeviceGroup } from "@solar-display/shared";
import {
  createDeviceGroup,
  createFleetDevice,
  issueDevicePairingToken,
  updateDeviceGroup,
  updateFleetDevice,
  isManagementAccessDeniedError
} from "../../services/api";
import { DeviceFleetContent } from "./DeviceFleetContent";
import {
  runDeviceFleetMutation,
  type DeviceFleetModel
} from "./loadModel";
import { formatDeviceFleetMutationError } from "./mutationError";
import {
  readDeviceFleetLoaders,
  readDeviceFleetRouteModel
} from "./route";
import {
  buildDeviceFleetViewModel,
  closePairingDialog,
  showPairingIssue,
  type DeviceFleetResource,
  type DeviceFleetRow,
  type PairingDialogState
} from "./viewModel";
import "./deviceFleet.css";

export function DeviceFleet() {
  const initialRouteModel = readDeviceFleetRouteModel();
  const routeLoaders = readDeviceFleetLoaders();
  const [model, setModel] = useState<DeviceFleetModel>(() => initialRouteModel ?? {
    accessDenied: false,
    devices: [],
    groups: [],
    liveness: null,
    profiles: [],
    unavailable: ["devices", "groups", "liveness", "profiles"]
  });
  const [filter, setFilter] = useState("");
  const [mutationPending, setMutationPending] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [pairing, setPairing] = useState<PairingDialogState>({
    issue: null
  });
  const [pairingPreparation, setPairingPreparation] = useState<DeviceFleetRow | null>(null);

  const refreshers: Partial<
    Record<DeviceFleetResource, () => Promise<void>>
  > = {
    devices: async () => {
      const devices = await routeLoaders.getDevices();
      setModel((current) => ({
        ...current,
        devices,
        unavailable: current.unavailable.filter((item) => item !== "devices")
      }));
    },
    groups: async () => {
      const groups = await routeLoaders.getGroups();
      setModel((current) => ({
        ...current,
        groups,
        unavailable: current.unavailable.filter((item) => item !== "groups")
      }));
    },
    liveness: async () => {
      const liveness = await routeLoaders.getLiveness();
      setModel((current) => ({
        ...current,
        liveness,
        unavailable: current.unavailable.filter((item) => item !== "liveness")
      }));
    },
    profiles: async () => {
      const profiles = await routeLoaders.getProfiles();
      setModel((current) => ({
        ...current,
        profiles,
        unavailable: current.unavailable.filter((item) => item !== "profiles")
      }));
    }
  };

  const mutate = async <T,>(
    action: () => Promise<T>,
    refresh: DeviceFleetResource[]
  ) => {
    setMutationPending(true);
    setMutationError("");
    try {
      return await runDeviceFleetMutation({
        mutate: action,
        refresh,
        refreshers
      });
    } catch (error) {
      setMutationError(formatDeviceFleetMutationError(error));
      if (isManagementAccessDeniedError(error)) {
        setModel((current) => ({
          ...current,
          accessDenied: true
        }));
      }
      return undefined;
    } finally {
      setMutationPending(false);
    }
  };

  const viewModel = useMemo(
    () =>
      buildDeviceFleetViewModel({
        devices: model.devices,
        filter,
        groups: model.groups,
        liveness: model.liveness,
        loading: initialRouteModel === null && model.devices.length === 0,
        unavailable: model.unavailable
      }),
    [filter, model]
  );

  return (
    <DeviceFleetContent
      accessDenied={model.accessDenied}
      filter={filter}
      profiles={model.profiles}
      model={viewModel}
      mutationError={mutationError}
      mutationPending={mutationPending}
      onClosePairing={() => {
        setPairingPreparation(null);
        setPairing((current) => closePairingDialog(current));
      }}
      onCreateDevice={async (input) => {
        const result = await mutate(() => createFleetDevice(input), ["devices"]);
        return result !== undefined;
      }}
      onCreateGroup={async (input) => {
        const result = await mutate(() => createDeviceGroup(input), ["groups"]);
        return result !== undefined;
      }}
      onEditDevice={async (row, input) => {
        const result = await mutate(
          () => updateFleetDevice(row.id, input),
          ["devices"]
        );
        return result !== undefined;
      }}
      onEditGroup={async (group, input) => {
        const result = await mutate(
          () => updateDeviceGroup(group.id, input),
          ["groups", "devices"]
        );
        return result !== undefined;
      }}
      onFilterChange={setFilter}
      onIssuePairing={async (row: DeviceFleetRow) => {
        const issue = await mutate(
          () => issueDevicePairingToken(row.id),
          []
        );
        if (issue) {
          setPairing(showPairingIssue({ issue: null }, issue));
        }
      }}
      onPreparePairing={(row) => {
        setMutationError("");
        setPairing({ issue: null });
        setPairingPreparation(row);
      }}
      onToggleDevice={async (row) => {
        await mutate(
          () => updateFleetDevice(row.id, { enabled: !row.enabled }),
          ["devices"]
        );
      }}
      onToggleGroup={async (group: DeviceGroup) => {
        await mutate(
          () => updateDeviceGroup(group.id, { enabled: !group.enabled }),
          ["groups", "devices"]
        );
      }}
      pairing={pairing}
      pairingPreparation={pairingPreparation}
    />
  );
}
