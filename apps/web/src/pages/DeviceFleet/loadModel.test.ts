import assert from "node:assert/strict";
import test from "node:test";
import { ManagementAccessDeniedError } from "../../services/api";
import {
  loadDeviceFleetModel,
  runDeviceFleetMutation
} from "./loadModel";

test("loadDeviceFleetModel preserves successful resources when one request fails", async () => {
  const groups = [{
    desiredVersion: 1,
    enabled: true,
    id: 7,
    name: "CL Lobby",
    playbackProfile: {
      id: 1,
      isDefault: true,
      name: "Default Profile",
      profileKey: "default"
    },
    playbackProfileId: 1,
    siteScope: "cl" as const
  }];
  const model = await loadDeviceFleetModel({
    getDevices: async () => [],
    getGroups: async () => groups,
    getLiveness: async () => {
      throw new Error("liveness unavailable");
    }
  });

  assert.deepEqual(model.devices, []);
  assert.deepEqual(model.groups, groups);
  assert.equal(model.defaultProfile?.id, 1);
  assert.equal(model.liveness, null);
  assert.deepEqual(model.unavailable, ["liveness"]);
});

test("loadDeviceFleetModel identifies management trust loss", async () => {
  const denied = new ManagementAccessDeniedError(
    "Management access denied",
    403,
    {
      access: "denied",
      code: "management_access_denied"
    }
  );
  const model = await loadDeviceFleetModel({
    getDevices: async () => {
      throw denied;
    },
    getGroups: async () => {
      throw denied;
    },
    getLiveness: async () => {
      throw denied;
    }
  });

  assert.equal(model.accessDenied, true);
  assert.deepEqual(model.unavailable, ["devices", "groups", "liveness"]);
});

test("runDeviceFleetMutation refreshes only named resources after success", async () => {
  const calls: string[] = [];
  const result = await runDeviceFleetMutation({
    mutate: async () => "saved",
    refresh: ["devices"],
    refreshers: {
      devices: async () => {
        calls.push("devices");
      },
      groups: async () => {
        calls.push("groups");
      },
      liveness: async () => {
        calls.push("liveness");
      }
    }
  });

  assert.equal(result, "saved");
  assert.deepEqual(calls, ["devices"]);
});

test("runDeviceFleetMutation does not refresh after a 409 failure", async () => {
  let refreshed = false;

  await assert.rejects(
    runDeviceFleetMutation({
      mutate: async () => {
        throw Object.assign(new Error("Group is in use"), {
          status: 409
        });
      },
      refresh: ["groups"],
      refreshers: {
        groups: async () => {
          refreshed = true;
        }
      }
    }),
    /Group is in use/
  );
  assert.equal(refreshed, false);
});

test("runDeviceFleetMutation fails visibly when a required refresher is missing", async () => {
  await assert.rejects(
    runDeviceFleetMutation({
      mutate: async () => "saved",
      refresh: ["devices"],
      refreshers: {}
    }),
    /Missing Device Fleet refresher: devices/
  );
});
