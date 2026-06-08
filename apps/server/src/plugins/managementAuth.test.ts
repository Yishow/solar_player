import assert from "node:assert/strict";
import test from "node:test";
import {
  createManagementAccessControl,
  isTrustedManagementCorsRequest
} from "./managementAuth.js";

test("trusted same-host and token callers satisfy management read gating", () => {
  const accessControl = createManagementAccessControl({
    managementAccessToken: "secret-token",
    trustedOrigins: ["https://ops.example"]
  });

  assert.equal(
    accessControl.isTrustedManagementRequestLike({
      headers: {
        host: "player.example",
        origin: "https://player.example"
      },
      ip: "10.0.0.8"
    }),
    true
  );

  assert.equal(
    accessControl.isTrustedManagementRequestLike({
      headers: {
        host: "player.example",
        "x-solar-management-token": "secret-token"
      },
      ip: "198.51.100.8"
    }),
    true
  );
});

test("untrusted remote caller fails management read gating", () => {
  const accessControl = createManagementAccessControl({
    managementAccessToken: "secret-token",
    trustedOrigins: ["https://ops.example"]
  });

  assert.equal(
    accessControl.isTrustedManagementRequestLike({
      headers: {
        host: "player.example",
        origin: "https://evil.example"
      },
      ip: "198.51.100.24"
    }),
    false
  );
});

test("socket sessions stay playback-safe unless a trusted caller explicitly requests management access", () => {
  const accessControl = createManagementAccessControl({
    managementAccessToken: "secret-token",
    trustedOrigins: ["https://ops.example"]
  });

  assert.equal(
    accessControl.classifySocketSession({
      address: "198.51.100.24",
      auth: {
        sessionClass: "management-trusted"
      },
      headers: {
        origin: "https://evil.example"
      }
    }),
    "playback-safe"
  );

  assert.equal(
    accessControl.classifySocketSession({
      address: "198.51.100.24",
      auth: {
        managementAccessToken: "secret-token",
        sessionClass: "management-trusted"
      },
      headers: {
        origin: "https://evil.example"
      }
    }),
    "management-trusted"
  );

  assert.equal(
    accessControl.classifySocketSession({
      address: "198.51.100.24",
      auth: {
        sessionClass: "management-trusted"
      },
      headers: {
        host: "player.example",
        origin: "https://player.example"
      }
    }),
    "management-trusted"
  );

  assert.equal(
    accessControl.classifySocketSession({
      address: "198.51.100.24",
      auth: {
        sessionClass: "management-trusted"
      },
      headers: {
        host: "100.76.76.75:3000",
        origin: "http://100.76.76.75:4222"
      }
    }),
    "management-trusted"
  );
});

test("same-host cross-port browser requests are allowed by CORS gating", () => {
  assert.equal(
    isTrustedManagementCorsRequest(
      {
        headers: {
          host: "100.76.76.75:3000",
          origin: "http://100.76.76.75:4173"
        },
        ip: "100.76.76.75"
      },
      []
    ),
    true
  );
});
