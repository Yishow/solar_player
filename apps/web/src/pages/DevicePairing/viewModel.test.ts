import assert from "node:assert/strict";
import test from "node:test";
import {
  checkDevicePairingStatus,
  exchangePairingToken,
  extractAndClearFragmentToken,
  initialDevicePairingState,
  mapPairingErrorMessage,
  type DevicePairingState
} from "./viewModel";

test("mapPairingErrorMessage localizes known error codes into clear Traditional Chinese", () => {
  assert.match(mapPairingErrorMessage("pairing_token_expired"), /過期/u);
  assert.match(mapPairingErrorMessage("pairing_token_used"), /已被使用/u);
  assert.match(mapPairingErrorMessage("pairing_token_invalid"), /無效/u);
  assert.match(mapPairingErrorMessage("device_disabled"), /停用/u);
  assert.match(mapPairingErrorMessage("pairing_https_required"), /HTTPS/u);
  assert.match(mapPairingErrorMessage("unknown_code"), /配對失敗/u);
  assert.match(mapPairingErrorMessage(), /配對失敗/u);
});

test("extractAndClearFragmentToken extracts token and clears browser address bar", () => {
  let replacedUrl: string | null = null;
  const mockWindow = {
    history: {
      replaceState: (_data: unknown, _unused: string, url: string) => {
        replacedUrl = url;
      }
    },
    location: {
      hash: "#token=secret-token-123",
      pathname: "/device-pairing"
    }
  };

  const token = extractAndClearFragmentToken(mockWindow as never);
  assert.equal(token, "secret-token-123");
  assert.equal(replacedUrl, "/device-pairing");
});

test("extractAndClearFragmentToken returns null when hash is absent or empty", () => {
  let replaceCount = 0;
  const mockWindow = {
    history: {
      replaceState: () => {
        replaceCount += 1;
      }
    },
    location: {
      hash: "",
      pathname: "/device-pairing"
    }
  };

  const token = extractAndClearFragmentToken(mockWindow as never);
  assert.equal(token, null);
  assert.equal(replaceCount, 0);
});

test("checkDevicePairingStatus returns paired status and client identity when paired", async () => {
  const fakeFetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        clientId: "display-kiosk-01",
        deviceId: 42,
        paired: true
      },
      success: true
    })
  })) as unknown as typeof fetch;

  const result = await checkDevicePairingStatus(fakeFetch);
  assert.deepEqual(result, {
    clientId: "display-kiosk-01",
    deviceId: 42,
    paired: true
  });
});

test("checkDevicePairingStatus returns not paired on 401 response", async () => {
  const fakeFetch = (async () => ({
    ok: false,
    status: 401,
    json: async () => ({
      code: "device_unpaired",
      success: false
    })
  })) as unknown as typeof fetch;

  const result = await checkDevicePairingStatus(fakeFetch);
  assert.deepEqual(result, {
    paired: false
  });
});

test("exchangePairingToken handles HTTP 204 as success", async () => {
  let requestMethod = "";
  let requestBody = "";
  const fakeFetch = (async (_url: string, init?: RequestInit) => {
    requestMethod = init?.method ?? "";
    requestBody = String(init?.body ?? "");
    return {
      ok: true,
      status: 204
    };
  }) as unknown as typeof fetch;

  const result = await exchangePairingToken("my-token", fakeFetch);
  assert.equal(result.success, true);
  assert.equal(requestMethod, "POST");
  assert.deepEqual(JSON.parse(requestBody), { token: "my-token" });
});

test("exchangePairingToken returns localized error on non-204 responses", async () => {
  const fakeFetch = (async () => ({
    ok: false,
    status: 409,
    json: async () => ({
      code: "pairing_token_used",
      error: "Token has already been consumed"
    })
  })) as unknown as typeof fetch;

  const result = await exchangePairingToken("consumed-token", fakeFetch);
  assert.equal(result.success, false);
  assert.equal(result.error?.code, "pairing_token_used");
  assert.match(result.error?.message ?? "", /已被使用/u);
});
