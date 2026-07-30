import assert from "node:assert/strict";
import test from "node:test";
import { readDeviceCredentialCookie } from "./deviceContext.js";
import { DisplayClientContextServiceError } from "../services/displayClientContextService.js";

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
