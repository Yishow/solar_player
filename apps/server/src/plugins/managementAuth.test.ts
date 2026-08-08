import assert from "node:assert/strict";
import test from "node:test";
import {
  buildManagementSessionCookie,
  createManagementAccessControl,
  createManagementCorsOptionsDelegate,
  isTrustedManagementCorsRequest,
  matchesManagementAccessTokenHeader,
  resolveManagementSessionCookieSameSite
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

test("same-host browser reads stay trusted when referer matches but Origin is absent", () => {
  const accessControl = createManagementAccessControl({
    managementAccessToken: "secret-token",
    trustedOrigins: ["https://ops.example"]
  });

  assert.equal(
    accessControl.isTrustedManagementRequestLike({
      headers: {
        host: "100.99.99.2:3000",
        referer: "http://100.99.99.2:3000/settings/mqtt"
      },
      ip: "100.99.99.50"
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

test("management origin classification never yields unidentified", () => {
  const accessControl = createManagementAccessControl({
    managementAccessToken: "secret-token",
    trustedOrigins: ["https://ops.example"]
  });

  // No Device Credential and no management intent — the class SocketService
  // would later downgrade to unidentified is not one this function can produce.
  const sessionClass = accessControl.classifySocketSession({
    address: "198.51.100.24",
    headers: { host: "player.example" }
  });

  assert.equal(sessionClass, "playback-safe");
  assert.notEqual(sessionClass as string, "unidentified");
});

test("same-host cross-port browser requests stay trusted by CORS gating", () => {
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

test("password gate adds a second condition without changing origin trust", () => {
  const accessControl = createManagementAccessControl({
    managementAccessToken: "secret-token",
    trustedOrigins: [],
    passwordGateEnabled: () => true,
    isManagementSessionValid: (request) => request.headers.cookie === "solar_management_session=valid"
  });
  const base = { headers: { host: "player.example", origin: "https://player.example" }, ip: "10.0.0.8" };
  assert.equal(accessControl.isTrustedManagementOriginRequest(base), true);
  assert.equal(accessControl.isTrustedManagementRequestLike(base), false);
  assert.equal(accessControl.isTrustedManagementRequestLike({ ...base, headers: { ...base.headers, cookie: "solar_management_session=valid" } }), true);
  assert.equal(accessControl.isTrustedManagementRequestLike({ headers: { "x-solar-management-token": "secret-token" }, ip: "198.51.100.2" }), true);
});

test("session cookie SameSite is derived from the issuing request", () => {
  assert.equal(
    resolveManagementSessionCookieSameSite({ headers: { host: "player.example" } }),
    "Strict"
  );

  assert.equal(
    resolveManagementSessionCookieSameSite({
      headers: { host: "player.example", origin: "https://player.example" },
      protocol: "https"
    }),
    "Strict"
  );

  assert.equal(
    resolveManagementSessionCookieSameSite({
      headers: { host: "player.example", origin: "https://ops.example" },
      protocol: "https"
    }),
    "None"
  );

  assert.equal(
    resolveManagementSessionCookieSameSite({
      headers: { host: "player.example", origin: "http://ops.example" },
      protocol: "http"
    }),
    "Strict"
  );
});

test("a forwarded https protocol counts as a secure connection", () => {
  assert.equal(
    resolveManagementSessionCookieSameSite({
      headers: {
        host: "player.example",
        origin: "https://ops.example",
        "x-forwarded-proto": "https"
      },
      protocol: "http"
    }),
    "None"
  );
});

test("setting and clearing a session cookie share the same attributes", () => {
  const request = {
    headers: { host: "player.example", origin: "https://ops.example" },
    protocol: "https"
  };

  const set = buildManagementSessionCookie(request, { maxAgeSeconds: 3600, value: "token-value" });
  const cleared = buildManagementSessionCookie(request, { value: null });

  assert.match(set, /SameSite=None/);
  assert.match(set, /Secure/);
  assert.match(cleared, /SameSite=None/);
  assert.match(cleared, /Secure/);
  assert.match(set, /^solar_management_session=token-value;/);
  assert.match(cleared, /^solar_management_session=;/);
  assert.match(set, /Max-Age=3600/);
  assert.doesNotMatch(cleared, /Max-Age=[1-9]/);
});

test("a strictly scoped session cookie carries no Secure attribute over plaintext", () => {
  const cookie = buildManagementSessionCookie(
    { headers: { host: "player.example", origin: "http://player.example" }, protocol: "http" },
    { maxAgeSeconds: 3600, value: "token-value" }
  );

  assert.match(cookie, /SameSite=Strict/);
  assert.doesNotMatch(cookie, /Secure/);
});

test("a strictly scoped session cookie is marked Secure over a secure connection", () => {
  const cookie = buildManagementSessionCookie(
    { headers: { host: "player.example", origin: "https://player.example" }, protocol: "https" },
    { maxAgeSeconds: 3600, value: "token-value" }
  );

  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
});

test("the management access token header is recognised by a single comparison", () => {
  assert.equal(matchesManagementAccessTokenHeader({ "x-solar-management-token": "secret-token" }, null), false);
  assert.equal(matchesManagementAccessTokenHeader({}, "secret-token"), false);
  assert.equal(matchesManagementAccessTokenHeader({ "x-solar-management-token": "secret-token" }, "secret-token"), true);
  assert.equal(matchesManagementAccessTokenHeader({ "x-solar-management-token": "secret-tokeX" }, "secret-token"), false);
  assert.equal(matchesManagementAccessTokenHeader({ "x-solar-management-token": "secret-toke" }, "secret-token"), false);
});

test("management CORS delegate allows credentials only for allowed origins", async () => {
  const delegate = createManagementCorsOptionsDelegate(["https://ops.example"]);

  const allowed = await new Promise<{ credentials?: boolean; origin: boolean } | undefined>((resolve) => {
    delegate(
      { headers: { host: "player.example", origin: "https://ops.example" }, ip: "198.51.100.8", method: "GET", url: "/api/device/status" } as never,
      (_error, corsOptions) => resolve(corsOptions)
    );
  });

  const denied = await new Promise<{ credentials?: boolean; origin: boolean } | undefined>((resolve) => {
    delegate(
      { headers: { host: "player.example", origin: "https://evil.example" }, ip: "198.51.100.8", method: "GET", url: "/api/device/status" } as never,
      (_error, corsOptions) => resolve(corsOptions)
    );
  });

  assert.equal(allowed?.origin, true);
  assert.equal(allowed?.credentials, true);
  assert.equal(denied?.origin, false);
});
