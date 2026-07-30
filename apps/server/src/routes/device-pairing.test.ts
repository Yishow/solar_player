import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import type { FastifyInstance } from "fastify";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-device-pairing-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
const databasePath = process.env.DATABASE_PATH;

const [
  { buildApp },
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase },
  { serializeDeviceCredentialCookie },
  {
    authenticateDeviceCredential,
    DeviceCredentialServiceError,
    resetDeviceCredentialClockForTests,
    setDeviceCredentialClockForTests
  }
] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./device-pairing.js"),
  import("../services/deviceCredentialService.js")
]);

let now = new Date("2026-07-30T04:00:00.000Z");

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  now = new Date("2026-07-30T04:00:00.000Z");
  delete process.env.TRUST_PROXY_IPS;
  setDeviceCredentialClockForTests(() => now);
  migrateDatabase();
  seedDatabase();
});

after(() => {
  resetDeviceCredentialClockForTests();
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.DATA_DIR;
  delete process.env.DATABASE_PATH;
  delete process.env.UPLOADS_DIR;
  delete process.env.TRUST_PROXY_IPS;
});

async function createDevice(app: FastifyInstance, suffix = "01") {
  const groupResponse = await app.inject({
    method: "POST",
    payload: {
      enabled: true,
      name: `中壢展示群組-${suffix}`,
      siteScope: "cl"
    },
    url: "/api/device-groups"
  });
  assert.equal(groupResponse.statusCode, 201);
  const groupId = groupResponse.json<{ data: { id: number } }>().data.id;

  const deviceResponse = await app.inject({
    method: "POST",
    payload: {
      clientId: `lobby-cl-${suffix}`,
      displayName: `中壢大廳-${suffix}`,
      enabled: true,
      groupId
    },
    url: "/api/devices"
  });
  assert.equal(deviceResponse.statusCode, 201);

  return {
    deviceId: deviceResponse.json<{ data: { id: number } }>().data.id,
    groupId
  };
}

async function issueToken(app: FastifyInstance, deviceId: number) {
  const response = await app.inject({
    method: "POST",
    url: `/api/devices/${deviceId}/pairing-tokens`
  });
  assert.equal(response.statusCode, 201);
  const body = response.json<{
    data: { expiresAt: string; token: string };
    success: boolean;
  }>();
  assert.equal(body.success, true);
  assert.equal(body.data.expiresAt, "2026-07-30T04:15:00.000Z");
  assert.ok(body.data.token.length >= 32);
  return body.data.token;
}

async function exchangeToken(
  app: FastifyInstance,
  token: string
) {
  return app.inject({
    method: "POST",
    payload: { token },
    url: "/api/device-pairing/exchange"
  });
}

function readCredentialCookie(response: Awaited<ReturnType<typeof exchangeToken>>) {
  const cookie = response.cookies.find((candidate) => candidate.name === "solar_device_credential");
  assert.ok(cookie);
  return cookie;
}

function assertCredentialError(
  credential: string,
  expectedCode:
    | "credential_expired"
    | "credential_invalid"
    | "credential_revoked"
    | "device_disabled"
    | "group_disabled"
) {
  assert.throws(
    () => authenticateDeviceCredential(credential),
    (error) =>
      error instanceof DeviceCredentialServiceError &&
      error.code === expectedCode
  );
}

test("management receives a fragment-only pairing path backed by a no-store landing page", async () => {
  const app = await buildApp();

  try {
    const { deviceId } = await createDevice(app);
    const issueResponse = await app.inject({
      method: "POST",
      url: `/api/devices/${deviceId}/pairing-tokens`
    });
    assert.equal(issueResponse.statusCode, 201);
    const issue = issueResponse.json<{
      data: { pairingPath: string; token: string };
    }>().data;
    assert.equal(
      issue.pairingPath,
      `/device-pairing#token=${encodeURIComponent(issue.token)}`
    );

    const landingResponse = await app.inject({
      headers: { accept: "text/html" },
      method: "GET",
      url: "/device-pairing"
    });
    assert.equal(landingResponse.statusCode, 200);
    assert.match(landingResponse.headers["content-type"] ?? "", /^text\/html/u);
    assert.equal(landingResponse.headers["cache-control"], "no-store");
    assert.equal(landingResponse.headers["referrer-policy"], "no-referrer");
    assert.match(
      landingResponse.headers["content-security-policy"] ?? "",
      /script-src 'nonce-[^']+';.*frame-ancestors 'none'/u
    );
    assert.match(landingResponse.body, /window\.location\.hash/u);
    assert.match(landingResponse.body, /history\.replaceState/u);
    assert.match(landingResponse.body, /\/api\/device-pairing\/exchange/u);
    assert.match(landingResponse.body, /window\.location\.replace\("\/overview"\)/u);
    assert.equal(landingResponse.body.includes(issue.token), false);
  } finally {
    await app.close();
  }
});

test("paired Browser can read back only its own Device identity from the HttpOnly Cookie", async () => {
  const app = await buildApp();

  try {
    const { deviceId } = await createDevice(app);
    const exchange = await exchangeToken(app, await issueToken(app, deviceId));
    const credential = readCredentialCookie(exchange).value;

    const missingResponse = await app.inject({
      method: "GET",
      url: "/api/device-pairing/status"
    });
    assert.equal(missingResponse.statusCode, 401);
    assert.equal(missingResponse.headers["cache-control"], "no-store");
    assert.equal(
      missingResponse.json<{ code: string }>().code,
      "credential_missing"
    );

    const pairedResponse = await app.inject({
      cookies: { solar_device_credential: credential },
      method: "GET",
      url: "/api/device-pairing/status"
    });
    assert.equal(pairedResponse.statusCode, 200);
    assert.equal(pairedResponse.headers["cache-control"], "no-store");
    assert.deepEqual(pairedResponse.json(), {
      data: {
        clientId: "lobby-cl-01",
        deviceId,
        paired: true
      },
      success: true,
      timestamp: pairedResponse.json<{ timestamp: string }>().timestamp
    });

    assert.deepEqual(
      Object.keys(
        pairedResponse.json<{ data: Record<string, unknown> }>().data
      ).sort(),
      ["clientId", "deviceId", "paired"]
    );

    const duplicateCookieResponse = await app.inject({
      headers: {
        cookie:
          `solar_device_credential=${credential}; ` +
          `solar_device_credential=${"x".repeat(43)}`
      },
      method: "GET",
      url: "/api/device-pairing/status"
    });
    assert.equal(duplicateCookieResponse.statusCode, 401);
    assert.equal(
      duplicateCookieResponse.json<{ code: string }>().code,
      "credential_invalid"
    );
  } finally {
    await app.close();
  }
});

test("Pairing Token boundary states are stable and token-only", async () => {
  const app = await buildApp();

  try {
    const { deviceId } = await createDevice(app);
    const usedToken = await issueToken(app, deviceId);

    now = new Date("2026-07-30T04:14:59.000Z");
    const firstExchange = await exchangeToken(app, usedToken);
    assert.equal(firstExchange.statusCode, 204);

    const usedExchange = await exchangeToken(app, usedToken);
    assert.equal(usedExchange.statusCode, 409);
    assert.equal(usedExchange.json<{ code: string }>().code, "pairing_token_used");

    now = new Date("2026-07-30T04:00:00.000Z");
    const expiredToken = await issueToken(app, deviceId);
    now = new Date("2026-07-30T04:15:00.000Z");
    const expiredExchange = await exchangeToken(app, expiredToken);
    assert.equal(expiredExchange.statusCode, 409);
    assert.equal(
      expiredExchange.json<{ code: string }>().code,
      "pairing_token_expired"
    );

    const invalidExchange = await exchangeToken(app, "not-a-issued-token");
    assert.equal(invalidExchange.statusCode, 400);
    assert.equal(
      invalidExchange.json<{ code: string }>().code,
      "pairing_token_invalid"
    );

    now = new Date("2026-07-30T04:00:00.000Z");
    const malformedExpiryToken = await issueToken(app, deviceId);
    getDatabase()
      .prepare("UPDATE pairing_tokens SET expires_at = 'not-a-timestamp' WHERE used_at IS NULL")
      .run();
    const malformedExpiryExchange = await exchangeToken(app, malformedExpiryToken);
    assert.equal(malformedExpiryExchange.statusCode, 409);
    assert.equal(
      malformedExpiryExchange.json<{ code: string }>().code,
      "pairing_token_expired"
    );
  } finally {
    await app.close();
  }
});

test("a concurrent token exchange issues exactly one credential", async () => {
  const app = await buildApp();

  try {
    const { deviceId } = await createDevice(app);
    const token = await issueToken(app, deviceId);
    const responses = await Promise.all([
      exchangeToken(app, token),
      exchangeToken(app, token)
    ]);

    assert.deepEqual(
      responses.map((response) => response.statusCode).sort(),
      [204, 409]
    );
    assert.equal(
      responses.find((response) => response.statusCode === 409)?.json<{
        code: string;
      }>().code,
      "pairing_token_used"
    );
    assert.deepEqual(
      getDatabase()
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM device_credentials) AS credential_count,
             (SELECT COUNT(*) FROM pairing_tokens WHERE used_at IS NOT NULL) AS used_count`
        )
        .get(),
      { credential_count: 1, used_count: 1 }
    );
  } finally {
    await app.close();
  }
});

test("Pairing Tokens and Device Credentials persist hashes only", async () => {
  const app = await buildApp();

  try {
    const { deviceId } = await createDevice(app);
    const token = await issueToken(app, deviceId);
    const tokenRow = getDatabase()
      .prepare("SELECT token_hash FROM pairing_tokens WHERE device_id = ?")
      .get(deviceId) as { token_hash: string };
    assert.match(tokenRow.token_hash, /^[a-f0-9]{64}$/u);
    assert.notEqual(tokenRow.token_hash, token);

    const exchange = await exchangeToken(app, token);
    assert.equal(exchange.statusCode, 204);
    assert.equal(exchange.body, "");
    const credential = readCredentialCookie(exchange).value;
    const credentialRow = getDatabase()
      .prepare("SELECT credential_hash FROM device_credentials WHERE device_id = ?")
      .get(deviceId) as { credential_hash: string };
    assert.match(credentialRow.credential_hash, /^[a-f0-9]{64}$/u);
    assert.notEqual(credentialRow.credential_hash, credential);
    assert.equal(JSON.stringify(tokenRow).includes(token), false);
    assert.equal(JSON.stringify(credentialRow).includes(credential), false);

    getDatabase()
      .prepare(
        "DELETE FROM schema_migrations WHERE version = '030_device_pairing_credentials'"
      )
      .run();
    migrateDatabase();
    assert.deepEqual(
      getDatabase()
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM pairing_tokens) AS token_count,
             (SELECT COUNT(*) FROM device_credentials) AS credential_count`
        )
        .get(),
      { credential_count: 1, token_count: 1 }
    );
  } finally {
    await app.close();
  }
});

test("exchange delivers the credential only through the dedicated cookie", async () => {
  const app = await buildApp();

  try {
    const { deviceId } = await createDevice(app);
    const developmentExchange = await exchangeToken(
      app,
      await issueToken(app, deviceId)
    );
    assert.equal(developmentExchange.statusCode, 204);
    const developmentCookie = readCredentialCookie(developmentExchange);
    assert.equal(developmentCookie.httpOnly, true);
    assert.equal(developmentCookie.sameSite, "Lax");
    assert.equal(developmentCookie.secure, undefined);
    assert.equal(developmentCookie.maxAge, 31_536_000);
    assert.equal(developmentCookie.path, "/");

    assert.match(
      serializeDeviceCredentialCookie("opaque-credential", true),
      /; Secure$/u
    );
  } finally {
    await app.close();
  }
});

test("remote exchange requires HTTPS and trusts forwarded protocol only from configured proxies", async () => {
  process.env.TRUST_PROXY_IPS = "127.0.0.1";
  const app = await buildApp();

  try {
    const { deviceId } = await createDevice(app);
    const insecureToken = await issueToken(app, deviceId);
    const insecureRemote = await app.inject({
      headers: {
        host: "solar.example:4000",
        origin: "http://solar.example:4000"
      },
      method: "POST",
      payload: { token: insecureToken },
      remoteAddress: "192.0.2.50",
      url: "/api/device-pairing/exchange"
    });
    assert.equal(insecureRemote.statusCode, 400);
    assert.equal(
      insecureRemote.json<{ code: string }>().code,
      "pairing_https_required"
    );

    const spoofedForwardedProtocol = await app.inject({
      headers: {
        host: "solar.example:4000",
        origin: "http://solar.example:4000",
        "x-forwarded-for": "192.0.2.50",
        "x-forwarded-proto": "https"
      },
      method: "POST",
      payload: { token: insecureToken },
      remoteAddress: "192.0.2.50",
      url: "/api/device-pairing/exchange"
    });
    assert.equal(spoofedForwardedProtocol.statusCode, 400);

    const trustedProxyExchange = await app.inject({
      headers: {
        host: "solar.example",
        origin: "https://solar.example",
        "x-forwarded-for": "192.0.2.50",
        "x-forwarded-proto": "https"
      },
      method: "POST",
      payload: { token: insecureToken },
      remoteAddress: "127.0.0.1",
      url: "/api/device-pairing/exchange"
    });
    assert.equal(trustedProxyExchange.statusCode, 204);
    assert.equal(readCredentialCookie(trustedProxyExchange).secure, true);
  } finally {
    await app.close();
  }
});

test("re-pairing revokes the prior credential and revalidates Device and Group state", async () => {
  const app = await buildApp();

  try {
    const { deviceId, groupId } = await createDevice(app);
    const firstExchange = await exchangeToken(app, await issueToken(app, deviceId));
    const firstCredential = readCredentialCookie(firstExchange).value;
    assert.equal(authenticateDeviceCredential(firstCredential).deviceId, deviceId);

    const secondExchange = await exchangeToken(app, await issueToken(app, deviceId));
    const secondCredential = readCredentialCookie(secondExchange).value;
    assertCredentialError(firstCredential, "credential_revoked");
    assert.equal(authenticateDeviceCredential(secondCredential).deviceId, deviceId);

    getDatabase().prepare("UPDATE devices SET enabled = 0 WHERE id = ?").run(deviceId);
    assertCredentialError(secondCredential, "device_disabled");

    getDatabase().prepare("UPDATE devices SET enabled = 1 WHERE id = ?").run(deviceId);
    getDatabase().prepare("UPDATE device_groups SET enabled = 0 WHERE id = ?").run(groupId);
    assertCredentialError(secondCredential, "group_disabled");

    getDatabase().prepare("UPDATE device_groups SET enabled = 1 WHERE id = ?").run(groupId);
    getDatabase()
      .prepare("UPDATE device_credentials SET expires_at = ? WHERE device_id = ?")
      .run("2026-07-30T04:00:00.000Z", deviceId);
    assertCredentialError(secondCredential, "credential_expired");
    getDatabase()
      .prepare("UPDATE device_credentials SET expires_at = ? WHERE device_id = ?")
      .run("not-a-timestamp", deviceId);
    assertCredentialError(secondCredential, "credential_expired");
    assertCredentialError("unknown-credential", "credential_invalid");
  } finally {
    await app.close();
  }
});

test("pairing administration rejects playback callers without database side effects", async () => {
  const app = await buildApp();

  try {
    const { deviceId } = await createDevice(app);
    const firstExchange = await exchangeToken(app, await issueToken(app, deviceId));
    const credential = readCredentialCookie(firstExchange).value;
    const before = getDatabase()
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM pairing_tokens) AS token_count,
           (SELECT COUNT(*) FROM device_credentials WHERE revoked_at IS NOT NULL) AS revoked_count`
      )
      .get();

    const untrustedHeaders = {
      host: "player.example",
      origin: "https://playback.example"
    };
    const deniedIssue = await app.inject({
      headers: untrustedHeaders,
      method: "POST",
      remoteAddress: "198.51.100.24",
      url: `/api/devices/${deviceId}/pairing-tokens`
    });
    assert.equal(deniedIssue.statusCode, 403);
    assert.deepEqual(
      {
        access: deniedIssue.json<{ access: string }>().access,
        code: deniedIssue.json<{ code: string }>().code,
        requiredRole: deniedIssue.json<{ requiredRole: string }>().requiredRole,
        success: deniedIssue.json<{ success: boolean }>().success
      },
      {
        access: "denied",
        code: "management_access_denied",
        requiredRole: "management-trusted",
        success: false
      }
    );

    const deniedRevoke = await app.inject({
      headers: untrustedHeaders,
      method: "POST",
      remoteAddress: "198.51.100.24",
      url: `/api/devices/${deviceId}/credentials/revoke`
    });
    assert.equal(deniedRevoke.statusCode, 403);
    assert.equal(
      deniedRevoke.json<{ code: string }>().code,
      "management_access_denied"
    );
    assert.deepEqual(
      getDatabase()
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM pairing_tokens) AS token_count,
             (SELECT COUNT(*) FROM device_credentials WHERE revoked_at IS NOT NULL) AS revoked_count`
        )
        .get(),
      before
    );
    assert.equal(authenticateDeviceCredential(credential).deviceId, deviceId);
  } finally {
    await app.close();
  }
});

test("trusted management can revoke a Device credential", async () => {
  const app = await buildApp();

  try {
    const { deviceId } = await createDevice(app);
    const exchange = await exchangeToken(app, await issueToken(app, deviceId));
    const credential = readCredentialCookie(exchange).value;

    const response = await app.inject({
      method: "POST",
      url: `/api/devices/${deviceId}/credentials/revoke`
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json<{ data: { revokedCount: number }; success: boolean }>().data, {
      revokedCount: 1
    });
    assert.equal(response.json<{ success: boolean }>().success, true);
    assertCredentialError(credential, "credential_revoked");
  } finally {
    await app.close();
  }
});
