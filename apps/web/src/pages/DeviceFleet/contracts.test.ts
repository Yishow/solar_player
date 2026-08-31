import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import type {
  Device,
  DeviceGroup,
  DisplayClientLivenessSnapshot
} from "@solar-display/shared";
import {
  createDeviceGroup,
  createFleetDevice,
  getDeviceGroups,
  getFleetDevices,
  issueDevicePairingToken,
  updateDeviceGroup,
  updateFleetDevice
} from "../../services/api";
import { DeviceFleetContent } from "./DeviceFleetContent";
import {
  loadDeviceFleetRoute,
  resetDeviceFleetRouteModelForTests,
  setDeviceFleetLoadersForTests
} from "./route";
import {
  buildDeviceFleetViewModel,
  closePairingDialog,
  showPairingIssue,
  type DeviceFleetRow
} from "./viewModel";

const profile = {
  id: 1,
  isDefault: true,
  name: "Default Profile",
  profileKey: "default"
};

function createGroup(id: number): DeviceGroup {
  return {
    desiredVersion: 1,
    enabled: true,
    id,
    name: `Group ${id}`,
    playbackProfile: profile,
    playbackProfileId: profile.id,
    siteScope: id % 2 === 0 ? "kn" : "cl"
  };
}

function createRow(overrides: Partial<DeviceFleetRow> = {}): DeviceFleetRow {
  return {
    appliedVersion: 1,
    clientId: "cl-lobby-01",
    connectedCount: 1,
    displayName: "中壢大廳",
    duplicateIdentity: false,
    enabled: true,
    groupId: 7,
    groupEnabled: true,
    groupName: "CL Lobby",
    id: 1,
    isPlaying: true,
    key: 1,
    lastSeenAt: "2026-07-30T08:00:00.000Z",
    operationalState: "online",
    pageKey: "overview",
    paired: true,
    rolloutError: null,
    rolloutState: "applied",
    desiredVersion: 1,
    pairingAction: "re-pair",
    playbackProfileId: 1,
    playbackProfileName: "Default Profile",
    route: "/overview",
    siteScope: "cl",
    ...overrides
  };
}

function createContentProps(
  overrides: Partial<React.ComponentProps<typeof DeviceFleetContent>> = {}
): React.ComponentProps<typeof DeviceFleetContent> {
  return {
    accessDenied: false,
    filter: "",
    profiles: [],
    model: {
      groups: [],
      rolloutSummary: {
        applied: 1,
        failed: 0,
        offline: 0,
        total: 1,
        waiting: 0
      },
      rows: [createRow()],
      state: "ready",
      unavailable: []
    },
    mutationError: "",
    mutationPending: false,
    onPreparePairing: () => {},
    onClosePairing: () => {},
    onCreateDevice: async () => true,
    onCreateGroup: async () => {},
    onEditDevice: async () => {},
    onEditGroup: async () => {},
    onFilterChange: () => {},
    onIssuePairing: async () => {},
    onToggleDevice: async () => {},
    onToggleGroup: async () => {},
    pairing: {
      issue: null
    },
    pairingPreparation: null,
    ...overrides
  };
}

function setTestGlobal(key: string, value: unknown) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value
  });
}

test("Device Fleet contract keeps Device, Group, and pairing mutations on trusted API routes", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ method: string; path: string }> = [];
  globalThis.fetch = async (input, init) => {
    const pathName = new URL(String(input)).pathname;
    requests.push({
      method: init?.method ?? "GET",
      path: pathName
    });
    const data = pathName.endsWith("/pairing-tokens")
      ? {
          expiresAt: "2026-07-30T08:10:00.000Z",
          pairingPath: "/device-pairing?token=one-time",
          token: "one-time"
        }
      : [];
    return new Response(JSON.stringify({ data, success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  };

  try {
    await getFleetDevices();
    await getDeviceGroups();
    await createFleetDevice({
      clientId: "cl-lobby-01",
      displayName: "中壢大廳",
      enabled: true,
      groupId: 7
    });
    await updateFleetDevice(9, { enabled: false });
    await createDeviceGroup({
      enabled: true,
      name: "CL Lobby",
      playbackProfileId: profile.id,
      siteScope: "cl"
    });
    await updateDeviceGroup(7, { enabled: false });
    await issueDevicePairingToken(9);

    assert.deepEqual(requests, [
      { method: "GET", path: "/api/devices" },
      { method: "GET", path: "/api/device-groups" },
      { method: "POST", path: "/api/devices" },
      { method: "PUT", path: "/api/devices/9" },
      { method: "POST", path: "/api/device-groups" },
      { method: "PUT", path: "/api/device-groups/7" },
      { method: "POST", path: "/api/devices/9/pairing-tokens" }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Device Fleet contract keeps disabled, unpaired, offline, stale, and duplicate states explicit", () => {
  const group = createGroup(1);
  const devices: Device[] = [
    {
      appliedVersion: 1,
      clientId: "disabled",
      displayName: "Disabled",
      enabled: false,
      group,
      groupId: group.id,
      id: 1,
      paired: true,
      profileUpdateError: null,
      profileUpdateState: "applied"
    },
    {
      appliedVersion: 1,
      clientId: "unpaired",
      displayName: "Unpaired",
      enabled: true,
      group,
      groupId: group.id,
      id: 2,
      paired: false,
      profileUpdateError: null,
      profileUpdateState: "applied"
    },
    {
      appliedVersion: 1,
      clientId: "offline",
      displayName: "Offline",
      enabled: true,
      group,
      groupId: group.id,
      id: 3,
      paired: true,
      profileUpdateError: null,
      profileUpdateState: "applied"
    },
    {
      appliedVersion: 1,
      clientId: "stale-duplicate",
      displayName: "Stale Duplicate",
      enabled: true,
      group,
      groupId: group.id,
      id: 4,
      paired: true,
      profileUpdateError: null,
      profileUpdateState: "applied"
    }
  ];
  const liveness: DisplayClientLivenessSnapshot = {
    clients: [
      {
        appliedVersion: 1,
        clientId: "offline",
        connectedCount: 0,
        deviceId: 3,
        duplicateDetectedAt: null,
        duplicateIdentity: false,
        desiredVersion: 1,
        groupId: group.id,
        isIdle: false,
        isPlaying: false,
        lastSeenAt: "2026-07-30T07:59:00.000Z",
        pageKey: null,
        profileId: profile.id,
        profileUpdateError: null,
        route: "/",
        siteScope: "cl",
        sourceStatus: "source-unknown",
        state: "offline",
        timeSyncState: "waiting",
        updateState: "applied",
        viewport: { height: 0, width: 0 }
      },
      {
        appliedVersion: 1,
        clientId: "stale-duplicate",
        connectedCount: 2,
        deviceId: 4,
        duplicateDetectedAt: "2026-07-30T08:00:30.000Z",
        duplicateIdentity: true,
        desiredVersion: 1,
        groupId: group.id,
        isIdle: false,
        isPlaying: true,
        lastSeenAt: "2026-07-30T08:00:00.000Z",
        pageKey: "solar",
        profileId: profile.id,
        profileUpdateError: null,
        route: "/solar",
        siteScope: "cl",
        sourceStatus: "multi-source",
        state: "stale",
        timeSyncState: "stale",
        updateState: "applied",
        viewport: { height: 1080, width: 1920 }
      }
    ],
    summary: {
      offline: 1,
      online: 0,
      stale: 1,
      total: 2
    }
  };

  const model = buildDeviceFleetViewModel({
    devices,
    filter: "",
    groups: [group],
    liveness,
    loading: false,
    unavailable: ["profiles"]
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
      { action: "re-pair", duplicate: true, state: "stale" }
    ]
  );
  assert.deepEqual(model.unavailable, ["profiles"]);
});

test("Device Fleet contract presents pairing context before issuing one-time plaintext", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { pretendToBeVisual: true, url: "http://127.0.0.1/" }
  );
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousNavigator = globalThis.navigator;
  const previousHTMLElement = globalThis.HTMLElement;
  setTestGlobal("window", dom.window);
  setTestGlobal("document", dom.window.document);
  setTestGlobal("navigator", dom.window.navigator);
  setTestGlobal("HTMLElement", dom.window.HTMLElement);
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  let root: Root | null = null;
  let issueCalls = 0;
  let prepared: DeviceFleetRow | null = null;
  const pairingRow = createRow({
    groupName: "CL Lobby",
    playbackProfileName: "Default Profile",
    siteScope: "cl"
  });

  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        React.createElement(
          DeviceFleetContent,
          createContentProps({
            model: {
              groups: [],
              rolloutSummary: {
                applied: 1,
                failed: 0,
                offline: 0,
                total: 1,
                waiting: 0
              },
              rows: [pairingRow],
              state: "ready",
              unavailable: []
            },
            onPreparePairing: (row: DeviceFleetRow) => {
              prepared = row;
            },
            onIssuePairing: async () => {
              issueCalls += 1;
            }
          })
        )
      );
    });

    const rePair = dom.window.document.querySelector<HTMLButtonElement>(
      "[data-action=\"re-pair\"]"
    )!;
    await act(async () => {
      rePair.click();
      await Promise.resolve();
    });
    assert.equal(prepared, pairingRow);
    assert.equal(issueCalls, 0);

    await act(async () => {
      root!.render(
        React.createElement(
          DeviceFleetContent,
          createContentProps({
            model: {
              groups: [],
              rolloutSummary: {
                applied: 1,
                failed: 0,
                offline: 0,
                total: 1,
                waiting: 0
              },
              rows: [pairingRow],
              state: "ready",
              unavailable: []
            },
            onIssuePairing: async () => {
              issueCalls += 1;
            },
            pairingPreparation: pairingRow
          })
        )
      );
    });

    const dialog = dom.window.document.querySelector<HTMLElement>(
      "[data-testid=\"pairing-dialog\"]"
    );
    assert.ok(dialog);
    assert.match(dialog.textContent ?? "", /CL Lobby/u);
    assert.match(dialog.textContent ?? "", /CL/u);
    assert.match(dialog.textContent ?? "", /Default Profile/u);
    assert.match(dialog.textContent ?? "", /撤銷舊 Credential/u);
    await act(async () => {
      dialog.querySelector<HTMLButtonElement>(
        "[data-action=\"confirm-pairing\"]"
      )!.click();
      await Promise.resolve();
    });
    assert.equal(issueCalls, 1);

    const open = showPairingIssue(
      { issue: null },
      {
        expiresAt: "2026-07-30T08:10:00.000Z",
        pairingPath: "/device-pairing?token=one-time",
        token: "one-time"
      }
    );
    assert.match(open.issue?.pairingPath ?? "", /one-time/u);
    assert.deepEqual(closePairingDialog(open), {
      issue: null
    });
  } finally {
    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
    setTestGlobal("window", previousWindow);
    setTestGlobal("document", previousDocument);
    setTestGlobal("navigator", previousNavigator);
    setTestGlobal("HTMLElement", previousHTMLElement);
  }
});

test("Device Fleet resets mutation feedback and stale pairing issue before preparation", () => {
  const source = readFileSync(
    path.join(import.meta.dirname, "index.tsx"),
    "utf8"
  );

  assert.match(
    source,
    /onPreparePairing=\{\(row\) => \{\s*setMutationError\(""\);\s*setPairing\(\{ issue: null \}\);\s*setPairingPreparation\(row\);/u
  );
});

test("Device Fleet contract remains lazy and management-gated before fleet requests run", async () => {
  const routerSource = readFileSync(
    path.join(import.meta.dirname, "../../app/router.tsx"),
    "utf8"
  );
  const calls: string[] = [];
  resetDeviceFleetRouteModelForTests();
  setDeviceFleetLoadersForTests({
    getDevices: async () => {
      calls.push("devices");
      return [];
    },
    getGroups: async () => {
      calls.push("groups");
      return [createGroup(1)];
    },
    getProfiles: async () => {
      calls.push("profiles");
      return [profile];
    },
    getLiveness: async () => {
      calls.push("liveness");
      return {
        clients: [],
        summary: { offline: 0, online: 0, stale: 0, total: 0 }
      };
    }
  });

  try {
    assert.match(
      routerSource,
      /element:\s*<ManagementShellRoute[\s\S]*path:\s*"device-fleet"[\s\S]*loader:\s*createLazyManagementRouteLoader\(\s*"device-fleet"/u
    );
    assert.deepEqual(calls, []);
    await loadDeviceFleetRoute();
    assert.deepEqual(calls.sort(), ["devices", "groups", "liveness", "profiles"]);
  } finally {
    resetDeviceFleetRouteModelForTests();
  }
});
