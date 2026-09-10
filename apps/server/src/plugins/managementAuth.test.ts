import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildManagementSessionCookie,
  createManagementAccessControl,
  createManagementCorsOptionsDelegate,
  isTrustedManagementCorsRequest,
  MANAGEMENT_ACCESS_TOKEN_HEADER,
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

// Neither caller carries any other trust witness: the origin is foreign to the
// host, the address is remote, and no password gate or session is configured.
// Whatever these callers are granted comes from the token path alone.
const UNTRUSTED_HEADERS = { host: "player.example", origin: "https://evil.example" };
const UNTRUSTED_ADDRESS = "198.51.100.24";

function httpTokenOutcome(configured: string | null, presented: string | undefined): boolean {
  const tokenHeaders = presented === undefined ? {} : { [MANAGEMENT_ACCESS_TOKEN_HEADER]: presented };
  const direct = matchesManagementAccessTokenHeader(tokenHeaders, configured);
  const classified = createManagementAccessControl({ managementAccessToken: configured, trustedOrigins: [] })
    .isTrustedManagementRequestLike({ headers: { ...UNTRUSTED_HEADERS, ...tokenHeaders }, ip: UNTRUSTED_ADDRESS });
  assert.equal(classified, direct, "the HTTP classifier must reach the same token outcome as the header adapter");
  return direct;
}

function socketTokenOutcome(configured: string | null, presented: unknown): boolean {
  const auth: Record<string, unknown> = { sessionClass: "management-trusted" };
  if (presented !== undefined) {
    auth.managementAccessToken = presented;
  }

  return createManagementAccessControl({ managementAccessToken: configured, trustedOrigins: [] })
    .classifySocketSession({ address: UNTRUSTED_ADDRESS, auth, headers: UNTRUSTED_HEADERS }) === "management-trusted";
}

// `presented: undefined` means the transport carries no token at all.
const TOKEN_OUTCOMES: Array<{ configured: string | null; presented: string | undefined; accepted: boolean }> = [
  { configured: null, presented: "secret-token", accepted: false },
  { configured: "", presented: "secret-token", accepted: false },
  { configured: "secret-token", presented: undefined, accepted: false },
  { configured: "secret-token", presented: "   ", accepted: false },
  { configured: "secret-token", presented: "secret-token", accepted: true },
  { configured: "secret-token", presented: "  secret-token  ", accepted: true },
  { configured: "secret-token", presented: "Xecret-token", accepted: false },
  { configured: "secret-token", presented: "secret-tokeX", accepted: false },
  { configured: "secret-token", presented: "secret-toke", accepted: false },
  { configured: "secret-token", presented: "SECRET-TOKEN", accepted: false },
  { configured: "é", presented: "e\u0301", accepted: false },
  // Equal character counts but different UTF-8 byte lengths (3 vs 2). Only a
  // byte-length guard keeps timingSafeEqual from throwing a RangeError here.
  { configured: "éa", presented: "aa", accepted: false },
  { configured: "éa", presented: "éa", accepted: true }
];

for (const row of TOKEN_OUTCOMES) {
  const label = `configured ${JSON.stringify(row.configured)}, presented ${row.presented === undefined ? "absent" : JSON.stringify(row.presented)}`;
  test(`HTTP and Socket token paths agree: ${label} is ${row.accepted ? "accepted" : "rejected"}`, () => {
    assert.equal(httpTokenOutcome(row.configured, row.presented), row.accepted, "HTTP token path");
    assert.equal(socketTokenOutcome(row.configured, row.presented), row.accepted, "Socket token path");
  });
}

function topLevelFunctionSource(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `managementAuth.ts must declare ${name}`);
  const end = source.indexOf("\n}\n", start);
  assert.notEqual(end, -1, `${name} must close at the top level`);
  return source.slice(start, end + 2).replace(/\s+/g, " ").trim();
}

test("both token transports delegate to the one byte comparator", () => {
  // Outcomes alone cannot tell a timing-safe comparison from `===`, so the
  // structure is pinned: a second, transport-specific comparator is exactly the
  // drift the single-comparison contract forbids.
  const source = readFileSync(new URL("./managementAuth.ts", import.meta.url), "utf8");
  assert.equal(
    topLevelFunctionSource(source, "matchesManagementAccessTokenValue"),
    "function matchesManagementAccessTokenValue( presented: string | null, configured: string | null ): boolean { if (!configured || !presented) { return false; } const presentedBytes = Buffer.from(presented, \"utf8\"); const configuredBytes = Buffer.from(configured, \"utf8\"); return presentedBytes.length === configuredBytes.length && timingSafeEqual(presentedBytes, configuredBytes); }",
    "the comparator must remain exactly one missing-value guard plus UTF-8 byte equality"
  );
  assert.equal(
    topLevelFunctionSource(source, "matchesManagementAccessTokenHeader"),
    "function matchesManagementAccessTokenHeader( headers: IncomingHttpHeaders, managementAccessToken: string | null ): boolean { return matchesManagementAccessTokenValue( readHeaderValue(headers[MANAGEMENT_ACCESS_TOKEN_HEADER]), managementAccessToken ); }"
  );
  assert.equal(
    topLevelFunctionSource(source, "matchesSocketAuthAccessToken"),
    "function matchesSocketAuthAccessToken( auth: Record<string, unknown> | undefined, managementAccessToken: string | null ): boolean { const presented = typeof auth?.managementAccessToken === \"string\" ? auth.managementAccessToken.trim() : null; return matchesManagementAccessTokenValue(presented, managementAccessToken); }"
  );
  assert.equal(
    source.split("matchesManagementAccessTokenHeader(").length - 1,
    3,
    "the HTTP adapter must have one declaration and exactly two classifier call sites"
  );
  assert.equal(
    source.split("matchesSocketAuthAccessToken(").length - 1,
    2,
    "the Socket adapter must have one declaration and exactly one classifier call site"
  );
  assert.equal(
    source.match(/\bmanagementAccessToken\b/g)?.length,
    12,
    "new token aliases or classifier branches must be reviewed through the shared comparator contract"
  );
  assert.equal(source.split("timingSafeEqual(").length - 1, 1, "timingSafeEqual is called only by the shared comparator");
});

test("HTTP token extraction reads only the first array element", () => {
  assert.equal(matchesManagementAccessTokenHeader({ [MANAGEMENT_ACCESS_TOKEN_HEADER]: ["wrong-token", "secret-token"] }, "secret-token"), false);
  assert.equal(matchesManagementAccessTokenHeader({ [MANAGEMENT_ACCESS_TOKEN_HEADER]: ["  secret-token  ", "wrong-token"] }, "secret-token"), true);
});

test("Socket token extraction rejects non-string values without coercing them", () => {
  // Each presented value would stringify to its configured token if coerced.
  const cases: Array<[configured: string, presented: unknown]> = [
    ["secret-token", ["secret-token"]],
    ["secret-token", { toString: () => "secret-token" }],
    ["123", 123],
    ["true", true]
  ];

  for (const [configured, presented] of cases) {
    assert.equal(socketTokenOutcome(configured, presented), false, `Socket token ${String(presented)} must be rejected`);
  }
});

test("a rejected token leaves session and trusted-origin trust to the existing classifier", () => {
  const validSession = "solar_management_session=valid";
  const gated = createManagementAccessControl({
    managementAccessToken: "secret-token",
    trustedOrigins: [],
    passwordGateEnabled: () => true,
    isManagementSessionValid: (request) => request.headers.cookie === validSession
  });
  const sameHost = { host: "player.example", origin: "https://player.example" };
  const wrongTokenAuth = { managementAccessToken: "wrong-token", sessionClass: "management-trusted" };

  assert.equal(
    gated.isTrustedManagementRequestLike({ headers: { ...sameHost, cookie: validSession, [MANAGEMENT_ACCESS_TOKEN_HEADER]: "wrong-token" }, ip: UNTRUSTED_ADDRESS }),
    true
  );
  assert.equal(
    gated.isTrustedManagementRequestLike({ headers: { ...sameHost, [MANAGEMENT_ACCESS_TOKEN_HEADER]: "wrong-token" }, ip: UNTRUSTED_ADDRESS }),
    false
  );
  assert.equal(
    gated.classifySocketSession({ address: UNTRUSTED_ADDRESS, auth: wrongTokenAuth, headers: { ...sameHost, cookie: validSession } }),
    "management-trusted"
  );
  assert.equal(
    gated.classifySocketSession({ address: UNTRUSTED_ADDRESS, auth: wrongTokenAuth, headers: sameHost }),
    "playback-safe"
  );

  const ungated = createManagementAccessControl({ managementAccessToken: "secret-token", trustedOrigins: ["https://ops.example"] });
  assert.equal(
    ungated.classifySocketSession({ address: UNTRUSTED_ADDRESS, auth: wrongTokenAuth, headers: { host: "player.example", origin: "https://ops.example" } }),
    "management-trusted"
  );
});

test("a Socket request that does not ask for management access stays playback-safe with a valid token", () => {
  const accessControl = createManagementAccessControl({ managementAccessToken: "secret-token", trustedOrigins: [] });
  const headers = { ...UNTRUSTED_HEADERS, [MANAGEMENT_ACCESS_TOKEN_HEADER]: "secret-token" };

  assert.equal(accessControl.classifySocketSession({ address: UNTRUSTED_ADDRESS, auth: { managementAccessToken: "secret-token" }, headers }), "playback-safe");
  assert.equal(
    accessControl.classifySocketSession({ address: UNTRUSTED_ADDRESS, auth: { managementAccessToken: "secret-token", sessionClass: "playback-safe" }, headers }),
    "playback-safe"
  );
});

test("either Socket token transport can admit a management-trusted request", () => {
  const accessControl = createManagementAccessControl({ managementAccessToken: "secret-token", trustedOrigins: [] });
  const classify = (headerToken: string, authToken: string) => accessControl.classifySocketSession({
    address: UNTRUSTED_ADDRESS,
    auth: { managementAccessToken: authToken, sessionClass: "management-trusted" },
    headers: { ...UNTRUSTED_HEADERS, [MANAGEMENT_ACCESS_TOKEN_HEADER]: headerToken }
  });

  assert.equal(classify("secret-token", "wrong-token"), "management-trusted");
  assert.equal(classify("wrong-token", "secret-token"), "management-trusted");
  assert.equal(classify("wrong-token", "wrong-token"), "playback-safe");
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
