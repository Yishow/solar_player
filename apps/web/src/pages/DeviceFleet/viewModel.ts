import type {
  Device,
  DeviceGroup,
  DisplayClientLivenessSnapshot,
  PairingTokenIssue
} from "@solar-display/shared";

export type DeviceFleetResource =
  | "defaultProfile"
  | "devices"
  | "groups"
  | "liveness";

export type DeviceFleetOperationalState =
  | "disabled"
  | "offline"
  | "online"
  | "stale"
  | "unavailable"
  | "unpaired";

export type DeviceFleetRow = {
  clientId: string;
  connectedCount: number;
  displayName: string;
  duplicateIdentity: boolean;
  enabled: boolean;
  groupId: number | null;
  groupName: string | null;
  id: number;
  isPlaying: boolean;
  key: number;
  lastSeenAt: string | null;
  operationalState: DeviceFleetOperationalState;
  pageKey: string | null;
  paired: boolean;
  pairingAction: "pair" | "re-pair";
  route: string | null;
  siteScope: DeviceGroup["siteScope"] | null;
};

export type PairingDialogState = {
  issue: PairingTokenIssue | null;
};

export function showPairingIssue(
  _state: PairingDialogState,
  issue: PairingTokenIssue
): PairingDialogState {
  return {
    issue
  };
}

export function closePairingDialog(
  _state: PairingDialogState
): PairingDialogState {
  return {
    issue: null
  };
}

function resolveOperationalState(
  device: Device,
  liveness: DisplayClientLivenessSnapshot["clients"][number] | undefined,
  livenessUnavailable: boolean
): DeviceFleetOperationalState {
  if (!device.enabled) return "disabled";
  if (!device.paired) return "unpaired";
  if (livenessUnavailable) return "unavailable";
  return liveness?.state ?? "offline";
}

export function buildDeviceFleetViewModel(args: {
  devices: Device[];
  filter: string;
  groups: DeviceGroup[];
  liveness: DisplayClientLivenessSnapshot | null;
  loading: boolean;
  unavailable: DeviceFleetResource[];
}) {
  const normalizedFilter = args.filter.trim().toLocaleLowerCase("zh-TW");
  const livenessByDeviceId = new Map(
    (args.liveness?.clients ?? []).map((client) => [client.deviceId, client])
  );
  const rows: DeviceFleetRow[] = args.devices
    .filter((device) => {
      if (!normalizedFilter) return true;
      return [device.clientId, device.displayName, device.group?.name ?? ""]
        .some((value) =>
          value.toLocaleLowerCase("zh-TW").includes(normalizedFilter)
        );
    })
    .map((device) => {
      const liveness = livenessByDeviceId.get(device.id);
      return {
        clientId: device.clientId,
        connectedCount: liveness?.connectedCount ?? 0,
        displayName: device.displayName,
        duplicateIdentity: liveness?.duplicateIdentity ?? false,
        enabled: device.enabled,
        groupId: device.groupId,
        groupName: device.group?.name ?? null,
        id: device.id,
        isPlaying: liveness?.isPlaying ?? false,
        key: device.id,
        lastSeenAt: liveness?.lastSeenAt ?? null,
        operationalState: resolveOperationalState(
          device,
          liveness,
          args.unavailable.includes("liveness")
        ),
        pageKey: liveness?.pageKey ?? null,
        paired: device.paired,
        pairingAction: device.paired ? "re-pair" : "pair",
        route: liveness?.route ?? null,
        siteScope: device.group?.siteScope ?? null
      };
    });

  return {
    groups: args.groups,
    rows,
    state: args.loading ? "loading" as const : rows.length === 0 ? "empty" as const : "ready" as const,
    unavailable: args.unavailable
  };
}
