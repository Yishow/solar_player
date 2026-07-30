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
    defaultProfile: null,
    devices: [],
    groups: [],
    liveness: null,
    unavailable: ["defaultProfile", "devices", "groups", "liveness"]
  });
  const [filter, setFilter] = useState("");
  const [mutationPending, setMutationPending] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [pairing, setPairing] = useState<PairingDialogState>({
    issue: null
  });

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
      model={viewModel}
      mutationError={mutationError}
      mutationPending={mutationPending}
      onClosePairing={() => setPairing((current) => closePairingDialog(current))}
      onCreateDevice={async (input) => {
        await mutate(() => createFleetDevice(input), ["devices"]);
      }}
      onCreateGroup={async (input) => {
        await mutate(() => createDeviceGroup(input), ["groups"]);
      }}
      onEditDevice={async (row) => {
        const displayName = window.prompt("顯示名稱", row.displayName);
        if (displayName === null || !displayName.trim()) return;
        const groupIdInput = window.prompt(
          "群組 ID",
          row.groupId === null ? "" : String(row.groupId)
        );
        if (groupIdInput === null) return;
        const groupId = Number(groupIdInput);
        if (!Number.isInteger(groupId) || groupId <= 0) return;
        await mutate(
          () => updateFleetDevice(row.id, {
            displayName: displayName.trim(),
            groupId
          }),
          ["devices"]
        );
      }}
      onEditGroup={async (group) => {
        const name = window.prompt("群組名稱", group.name);
        if (name === null || !name.trim()) return;
        const siteScope = window.prompt(
          "Site Scope（cl 或 kn）",
          group.siteScope
        );
        if (siteScope !== "cl" && siteScope !== "kn") return;
        await mutate(
          () => updateDeviceGroup(group.id, {
            name: name.trim(),
            playbackProfileId:
              model.defaultProfile?.id ?? group.playbackProfileId,
            siteScope
          }),
          ["groups", "devices"]
        );
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
      profileId={model.defaultProfile?.id ?? null}
    />
  );
}
