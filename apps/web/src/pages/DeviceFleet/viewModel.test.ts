import assert from "node:assert/strict";
import test from "node:test";
import type {
  Device,
  DeviceGroup,
  DisplayClientLivenessSnapshot
} from "@solar-display/shared";
import {
  buildDeviceFleetViewModel,
  closePairingDialog,
  showPairingIssue
} from "./viewModel";

const defaultProfile = {
  id: 1,
  isDefault: true,
  name: "Default Profile",
  profileKey: "default"
};

function createGroup(id: number, siteScope: "cl" | "kn" = "cl"): DeviceGroup {
  return {
    enabled: true,
    id,
    name: `Group ${id}`,
    playbackProfile: defaultProfile,
    playbackProfileId: defaultProfile.id,
    siteScope
  };
}

function createDevice(index: number, overrides: Partial<Device> = {}): Device {
  const group = createGroup(index + 1, index % 2 === 0 ? "cl" : "kn");
  return {
    clientId: `display-${String(index + 1).padStart(2, "0")}`,
    displayName: `Display ${index + 1}`,
    enabled: true,
    group,
    groupId: group.id,
    id: index + 1,
    paired: true,
    ...overrides
  };
}

function createLiveness(
  devices: Device[],
  overrides: Record<number, Partial<DisplayClientLivenessSnapshot["clients"][number]>> = {}
): DisplayClientLivenessSnapshot {
  const clients = devices.map((device) => ({
    clientId: device.clientId,
    connectedCount: 1,
    deviceId: device.id,
    duplicateDetectedAt: null,
    duplicateIdentity: false,
    groupId: device.groupId ?? 0,
    isIdle: false,
    isPlaying: true,
    lastSeenAt: "2026-07-30T08:00:00.000Z",
    pageKey: "overview",
    profileId: defaultProfile.id,
    route: "/overview",
    siteScope: device.group?.siteScope ?? "cl",
    sourceStatus: "same-source" as const,
    state: "online" as const,
    timeSyncState: "synced" as const,
    viewport: { height: 1080, width: 1920 },
    ...overrides[device.id]
  }));

  return {
    clients,
    summary: {
      offline: clients.filter((client) => client.state === "offline").length,
      online: clients.filter((client) => client.state === "online").length,
      stale: clients.filter((client) => client.state === "stale").length,
      total: clients.length
    }
  };
}

test("buildDeviceFleetViewModel keeps 50 stable rows and filters by identity", () => {
  const devices = Array.from({ length: 50 }, (_, index) => createDevice(index));
  const model = buildDeviceFleetViewModel({
    devices,
    filter: "",
    groups: devices.map((device) => device.group!),
    liveness: createLiveness(devices),
    loading: false,
    unavailable: []
  });

  assert.equal(model.rows.length, 50);
  assert.equal(new Set(model.rows.map((row) => row.key)).size, 50);
  assert.equal(model.rows[0]?.groupId, devices[0]?.groupId);
  assert.equal(
    buildDeviceFleetViewModel({
      devices,
      filter: "display-50",
      groups: [],
      liveness: createLiveness(devices),
      loading: false,
      unavailable: []
    }).rows[0]?.clientId,
    "display-50"
  );
});

test("buildDeviceFleetViewModel keeps disabled, unpaired, offline, and duplicate states distinct", () => {
  const disabled = createDevice(0, { enabled: false });
  const unpaired = createDevice(1, { paired: false });
  const offline = createDevice(2);
  const duplicate = createDevice(3);
  const devices = [disabled, unpaired, offline, duplicate];
  const model = buildDeviceFleetViewModel({
    devices,
    filter: "",
    groups: devices.map((device) => device.group!),
    liveness: createLiveness(devices, {
      [offline.id]: {
        connectedCount: 0,
        state: "offline"
      },
      [duplicate.id]: {
        connectedCount: 2,
        duplicateDetectedAt: "2026-07-30T08:00:30.000Z",
        duplicateIdentity: true,
        sourceStatus: "multi-source"
      }
    }),
    loading: false,
    unavailable: []
  });

  assert.deepEqual(
    model.rows.map((row) => ({
      action: row.pairingAction,
      duplicate: row.duplicateIdentity,
      state: row.operationalState
    })),
    [
      { action: "re-pair", duplicate: false, state: "disabled" },
      { action: "pair", duplicate: false, state: "unpaired" },
      { action: "re-pair", duplicate: false, state: "offline" },
      { action: "re-pair", duplicate: true, state: "online" }
    ]
  );
  assert.equal(model.rows[0]?.route, "/overview");
});

test("buildDeviceFleetViewModel exposes loading, empty, and partial unavailable states", () => {
  const loading = buildDeviceFleetViewModel({
    devices: [],
    filter: "",
    groups: [],
    liveness: null,
    loading: true,
    unavailable: []
  });
  const partial = buildDeviceFleetViewModel({
    devices: [],
    filter: "",
    groups: [],
    liveness: null,
    loading: false,
    unavailable: ["liveness"]
  });

  assert.equal(loading.state, "loading");
  assert.equal(partial.state, "empty");
  assert.deepEqual(partial.unavailable, ["liveness"]);
});

test("buildDeviceFleetViewModel does not report offline when liveness is unavailable", () => {
  const device = createDevice(0);
  const model = buildDeviceFleetViewModel({
    devices: [device],
    filter: "",
    groups: [device.group!],
    liveness: null,
    loading: false,
    unavailable: ["liveness"]
  });

  assert.equal(model.rows[0]?.operationalState, "unavailable");
});

test("closing a pairing dialog clears the plaintext token and URL", () => {
  const open = showPairingIssue(
    {
      issue: null
    },
    {
      expiresAt: "2026-07-30T08:10:00.000Z",
      pairingPath: "/device-pairing?token=plain-token",
      token: "plain-token"
    }
  );

  assert.match(open.issue?.pairingPath ?? "", /plain-token/);
  assert.deepEqual(closePairingDialog(open), {
    issue: null
  });
});
