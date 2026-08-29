import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-management-auth-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [
  { buildApp },
  { closeDatabaseConnection },
  { migrateDatabase },
  { disableManagementPassword, readManagementPasswordState, setManagementPassword },
  { revokeAllManagementSessions }
] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../services/managementPasswordService.js"),
  import("../services/managementSessionService.js")
]);

migrateDatabase();
test.after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});
test("management-auth state is readable without a session but never exposes stored secrets", async () => {
  disableManagementPassword();
  revokeAllManagementSessions();
  const app = await buildApp();
  try {
    const response = await app.inject({ method: "GET", url: "/api/management-auth/state", headers: { origin: "http://localhost", host: "localhost" } });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(Object.keys(response.json()).sort(), ["authenticated", "enabled", "lockedUntil"]);
  } finally {
    await app.close();
  }
});

test("an untrusted caller cannot read the management-auth gate state", async () => {
  setManagementPassword("trusted-password");
  revokeAllManagementSessions();
  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/management-auth/state",
      headers: { origin: "https://evil.example", host: "player.example" }
    });

    assert.equal(response.statusCode, 403);
    const body = response.json();
    assert.equal("enabled" in body, false);
    assert.equal("lockedUntil" in body, false);
  } finally {
    disableManagementPassword();
    revokeAllManagementSessions();
    await app.close();
  }
});

test("an untrusted caller cannot revoke a trusted management session", async () => {
  setManagementPassword("trusted-password");
  revokeAllManagementSessions();
  const app = await buildApp();
  const trusted = { origin: "http://localhost", host: "localhost" };
  try {
    const unlocked = await app.inject({
      method: "POST",
      url: "/api/management-auth/unlock",
      headers: trusted,
      payload: { password: "trusted-password" }
    });
    const sessionCookie = (unlocked.headers["set-cookie"] as string).split(";")[0];

    const attack = await app.inject({
      method: "POST",
      url: "/api/management-auth/lock",
      headers: { origin: "https://evil.example", host: "player.example", cookie: sessionCookie }
    });
    assert.equal(attack.statusCode, 403);

    const stillUnlocked = await app.inject({
      method: "GET",
      url: "/api/management-auth/state",
      headers: { ...trusted, cookie: sessionCookie }
    });
    assert.equal(stillUnlocked.json().authenticated, true);
  } finally {
    disableManagementPassword();
    revokeAllManagementSessions();
    await app.close();
  }
});

test("management-auth error responses carry the common management failure fields", async () => {
  setManagementPassword("trusted-password");
  revokeAllManagementSessions();
  const app = await buildApp();
  const trusted = { origin: "http://localhost", host: "localhost" };
  try {
    const badRequest = await app.inject({
      method: "PUT",
      url: "/api/management-auth/password",
      headers: trusted,
      payload: { newPassword: "another-password" }
    });
    assert.equal(badRequest.statusCode, 400);
    assert.equal(badRequest.json().success, false);
    assert.equal(typeof badRequest.json().timestamp, "string");
    assert.equal(typeof badRequest.json().error, "string");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await app.inject({
        method: "POST",
        url: "/api/management-auth/unlock",
        headers: trusted,
        payload: { password: "wrong-password" }
      });
    }

    const locked = await app.inject({
      method: "POST",
      url: "/api/management-auth/unlock",
      headers: trusted,
      payload: { password: "trusted-password" }
    });
    assert.equal(locked.statusCode, 429);
    assert.equal(locked.json().success, false);
    assert.equal(typeof locked.json().timestamp, "string");
    assert.equal(locked.json().locked, true);
    assert.equal(locked.json().authenticated, false);
    assert.equal(typeof locked.json().lockedUntil, "string");
  } finally {
    disableManagementPassword();
    revokeAllManagementSessions();
    await app.close();
  }
});

test("playback-safe runtime reads remain available while the gate is enabled", async () => {
  setManagementPassword("correct horse battery staple");
  const app = await buildApp();
  try {
    const response = await app.inject({ method: "GET", url: "/api/brand/profiles/active" });
    assert.equal(response.statusCode, 200);
  } finally {
    disableManagementPassword();
    await app.close();
  }
});

test("untrusted callers cannot bootstrap the management password gate", async () => {
  disableManagementPassword();
  revokeAllManagementSessions();
  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "PUT",
      url: "/api/management-auth/password",
      headers: { origin: "https://evil.example", host: "player.example" },
      payload: { enabled: true, newPassword: "attacker-password" }
    });
    assert.equal(response.statusCode, 403);
    assert.equal(readManagementPasswordState().enabled, false);
  } finally {
    disableManagementPassword();
    await app.close();
  }
});

test("trusted same-host caller can bootstrap the management password gate", async () => {
  disableManagementPassword();
  revokeAllManagementSessions();
  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "PUT",
      url: "/api/management-auth/password",
      headers: { origin: "http://localhost", host: "localhost" },
      payload: { enabled: true, newPassword: "trusted-password" }
    });
    assert.equal(response.statusCode, 200);
    assert.equal(readManagementPasswordState().enabled, true);
  } finally {
    disableManagementPassword();
    await app.close();
  }
});

test("untrusted unlock attempts cannot lock out a trusted administrator", async () => {
  setManagementPassword("trusted-password");
  revokeAllManagementSessions();
  const app = await buildApp();
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/api/management-auth/unlock",
        headers: { origin: "https://evil.example", host: "player.example" },
        payload: { password: "wrong-password" }
      });
      assert.equal(response.statusCode, 403);
    }

    const trustedResponse = await app.inject({
      method: "POST",
      url: "/api/management-auth/unlock",
      headers: { origin: "http://localhost", host: "localhost" },
      payload: { password: "trusted-password" }
    });
    assert.equal(trustedResponse.statusCode, 200);
    assert.equal(trustedResponse.json().authenticated, true);
  } finally {
    disableManagementPassword();
    revokeAllManagementSessions();
    await app.close();
  }
});

test("a same-host unlock issues a strictly scoped session cookie", async () => {
  setManagementPassword("trusted-password");
  revokeAllManagementSessions();
  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/management-auth/unlock",
      headers: { origin: "http://localhost", host: "localhost" },
      payload: { password: "trusted-password" }
    });

    assert.equal(response.statusCode, 200);
    const cookie = response.headers["set-cookie"];
    assert.equal(typeof cookie, "string");
    assert.match(cookie as string, /SameSite=Strict/);
    assert.doesNotMatch(cookie as string, /Secure/);
  } finally {
    disableManagementPassword();
    revokeAllManagementSessions();
    await app.close();
  }
});

test("a cross-host unlock over a secure connection issues a cookie the browser will return", async () => {
  setManagementPassword("trusted-password");
  revokeAllManagementSessions();
  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/management-auth/unlock",
      headers: {
        origin: "http://localhost:5173",
        host: "127.0.0.1:3000",
        "x-forwarded-proto": "https"
      },
      payload: { password: "trusted-password" }
    });

    assert.equal(response.statusCode, 200);
    const cookie = response.headers["set-cookie"];
    assert.match(cookie as string, /SameSite=None/);
    assert.match(cookie as string, /Secure/);
  } finally {
    disableManagementPassword();
    revokeAllManagementSessions();
    await app.close();
  }
});

test("changing the password during a cooldown reports the lockout instead of a failed password", async () => {
  setManagementPassword("trusted-password");
  revokeAllManagementSessions();
  const app = await buildApp();
  const trusted = { origin: "http://localhost", host: "localhost" };
  try {
    const unlocked = await app.inject({
      method: "POST",
      url: "/api/management-auth/unlock",
      headers: trusted,
      payload: { password: "trusted-password" }
    });
    const sessionCookie = (unlocked.headers["set-cookie"] as string).split(";")[0];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await app.inject({
        method: "POST",
        url: "/api/management-auth/unlock",
        headers: trusted,
        payload: { password: "wrong-password" }
      });
    }

    const response = await app.inject({
      method: "PUT",
      url: "/api/management-auth/password",
      headers: { ...trusted, cookie: sessionCookie },
      payload: { enabled: true, newPassword: "another-password", currentPassword: "trusted-password" }
    });

    assert.equal(response.statusCode, 429);
    assert.equal(response.json().locked, true);
    assert.equal(typeof response.json().lockedUntil, "string");
  } finally {
    disableManagementPassword();
    revokeAllManagementSessions();
    await app.close();
  }
});

test("the management access token recovery path is not blocked by a cooldown", async () => {
  const previousToken = process.env.MANAGEMENT_ACCESS_TOKEN;
  process.env.MANAGEMENT_ACCESS_TOKEN = "recovery-token";

  setManagementPassword("trusted-password");
  revokeAllManagementSessions();
  const app = await buildApp();
  const trusted = { origin: "http://localhost", host: "localhost" };
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await app.inject({
        method: "POST",
        url: "/api/management-auth/unlock",
        headers: trusted,
        payload: { password: "wrong-password" }
      });
    }

    const response = await app.inject({
      method: "PUT",
      url: "/api/management-auth/password",
      headers: { ...trusted, "x-solar-management-token": "recovery-token" },
      payload: { enabled: false }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(readManagementPasswordState().enabled, false);
  } finally {
    disableManagementPassword();
    revokeAllManagementSessions();
    await app.close();
    if (previousToken === undefined) delete process.env.MANAGEMENT_ACCESS_TOKEN;
    else process.env.MANAGEMENT_ACCESS_TOKEN = previousToken;
  }
});
