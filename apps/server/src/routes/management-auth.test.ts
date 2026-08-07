import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../app.js";
import { migrateDatabase } from "../db/migrate.js";
import { disableManagementPassword, readManagementPasswordState, setManagementPassword } from "../services/managementPasswordService.js";
import { revokeAllManagementSessions } from "../services/managementSessionService.js";

migrateDatabase();
test("management-auth state is public but never exposes stored secrets", async () => {
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
