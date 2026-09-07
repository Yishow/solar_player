import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { createManagementAccessControl } from "../plugins/managementAuth.js";
import mqttCapturesRoute from "./mqtt-captures.js";

test("capture metadata and lifecycle require management authorization and an explicit scope", async () => {
  const app = Fastify();
  app.decorate("managementAccess", createManagementAccessControl({
    managementAccessToken: "capture-test-token",
    trustedOrigins: []
  }));
  await app.register(mqttCapturesRoute);
  try {
    for (const url of ["/api/settings/mqtt/reception-profiles", "/api/settings/mqtt/captures/unknown/candidates"]) {
      const response = await app.inject({ method: "GET", url, remoteAddress: "198.51.100.2" });
      assert.equal(response.statusCode, 403);
    }
    const denied = await app.inject({ method: "DELETE", url: "/api/settings/mqtt/captures/unknown", remoteAddress: "198.51.100.2" });
    assert.equal(denied.statusCode, 403);
    const missingScope = await app.inject({
      method: "POST", url: "/api/settings/mqtt/captures", payload: {},
      headers: { "x-management-token": "capture-test-token" }
    });
    assert.equal(missingScope.statusCode, 400);
    assert.equal(missingScope.json().error, "INVALID_SCOPE");
  } finally {
    await app.close();
  }
});
