import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  loadDeviceFleetRoute,
  resetDeviceFleetRouteModelForTests,
  setDeviceFleetLoadersForTests
} from "./route";

test("Device Fleet is a lazy ManagementShell route and not a playback import", () => {
  const routerSource = readFileSync(
    path.join(import.meta.dirname, "../../app/router.tsx"),
    "utf8"
  );
  const routeMetaSource = readFileSync(
    path.join(import.meta.dirname, "../../app/routeMeta.ts"),
    "utf8"
  );

  assert.match(
    routerSource,
    /path:\s*"device-fleet"[\s\S]*createLazyManagementRouteLoader\([\s\S]*import\("\.\.\/pages\/DeviceFleet\/route"\)[\s\S]*import\("\.\.\/pages\/DeviceFleet"\)/u
  );
  assert.match(
    routeMetaSource,
    /path:\s*"\/device-fleet"[\s\S]*group:\s*"management"/u
  );
});

test("loadDeviceFleetRoute runs fleet requests only when the lazy route loader is invoked", async () => {
  const calls: string[] = [];
  resetDeviceFleetRouteModelForTests();
  setDeviceFleetLoadersForTests({
    getDevices: async () => {
      calls.push("devices");
      return [];
    },
    getGroups: async () => {
      calls.push("groups");
      return [];
    },
    getLiveness: async () => {
      calls.push("liveness");
      return {
        clients: [],
        summary: { offline: 0, online: 0, stale: 0, total: 0 }
      };
    }
  });

  assert.deepEqual(calls, []);
  await loadDeviceFleetRoute();
  assert.deepEqual(calls.sort(), ["devices", "groups", "liveness"]);
});
