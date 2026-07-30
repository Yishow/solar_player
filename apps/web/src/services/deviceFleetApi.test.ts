import assert from "node:assert/strict";
import test from "node:test";
import {
  createDeviceGroup,
  createFleetDevice,
  getDeviceGroups,
  getFleetDevices,
  issueDevicePairingToken,
  updateDeviceGroup,
  updateFleetDevice
} from "./api";

test("Device Fleet API clients target trusted Device and Group routes", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ body: string | null; method: string; url: string }> = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({
      body: typeof init?.body === "string" ? init.body : null,
      method: init?.method ?? "GET",
      url
    });
    const data = url.includes("pairing-tokens")
      ? {
          expiresAt: "2026-07-30T08:10:00.000Z",
          pairingPath: "/device-pairing?token=plain",
          token: "plain"
        }
      : url.includes("device-groups")
        ? []
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
      siteScope: "cl"
    });
    await updateDeviceGroup(7, { siteScope: "kn" });
    const issue = await issueDevicePairingToken(9);

    assert.equal(issue.token, "plain");
    assert.deepEqual(
      requests.map(({ method, url }) => ({
        method,
        path: new URL(url).pathname
      })),
      [
        { method: "GET", path: "/api/devices" },
        { method: "GET", path: "/api/device-groups" },
        { method: "POST", path: "/api/devices" },
        { method: "PUT", path: "/api/devices/9" },
        { method: "POST", path: "/api/device-groups" },
        { method: "PUT", path: "/api/device-groups/7" },
        { method: "POST", path: "/api/devices/9/pairing-tokens" }
      ]
    );
    assert.doesNotMatch(
      requests
        .filter((request) => !request.url.includes("pairing-tokens"))
        .map((request) => request.body)
        .join(""),
      /credential|token/u
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
