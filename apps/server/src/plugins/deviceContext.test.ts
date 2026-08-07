import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { readDeviceCredentialCookie } from "./deviceContext.js";
import { deviceContextPlugin } from "./deviceContext.js";
import { DisplayClientContextServiceError } from "../services/displayClientContextService.js";
import { createUnpairedDisplayAccessRegistry } from "../services/unpairedDisplayAccessRegistry.js";

test("Device context cookie parsing fails closed for missing or duplicate credentials", () => {
  for (const cookieHeader of [
    undefined,
    "other=value",
    "solar_device_credential=first; solar_device_credential=second"
  ]) {
    assert.throws(
      () => readDeviceCredentialCookie(cookieHeader),
      (error) =>
        error instanceof DisplayClientContextServiceError &&
        error.code === "device_unpaired" &&
        error.statusCode === 401
    );
  }
});

test("Device context cookie parsing returns only the dedicated credential value", () => {
  assert.equal(
    readDeviceCredentialCookie(
      "theme=dark; solar_device_credential=opaque-credential; locale=zh-TW"
    ),
    "opaque-credential"
  );
});

test("records denied display context using the path without query string", async () => {
  const app = Fastify();
  const registry = createUnpairedDisplayAccessRegistry();
  app.decorate("unpairedDisplayAccessRegistry", registry);
  await deviceContextPlugin(app);
  app.get("/display-test", { preHandler: app.requireDisplayClientContext }, async () => "ok");

  const response = await app.inject({ method: "GET", url: "/display-test?token=secret" });
  assert.equal(response.statusCode, 401);
  assert.equal(registry.getSummary().totalCount, 1);
  assert.equal(registry.getSummary().lastDeniedRoute, "/display-test");
  await app.close();
});

test("recording failure does not change the existing denial response", async () => {
  const app = Fastify();
  app.decorate("unpairedDisplayAccessRegistry", {
    record() {
      throw new Error("registry unavailable");
    },
    getSummary() {
      throw new Error("unused");
    }
  });
  await deviceContextPlugin(app);
  app.get("/display-test", { preHandler: app.requireDisplayClientContext }, async () => "ok");

  const response = await app.inject({ method: "GET", url: "/display-test" });
  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), {
    code: "device_unpaired",
    error: "Display Client is not paired",
    success: false,
    timestamp: response.json().timestamp
  });
  await app.close();
});
