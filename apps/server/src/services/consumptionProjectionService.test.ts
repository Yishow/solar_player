import assert from "node:assert/strict";
import test from "node:test";
import { activateProjection, rollbackProjection, shadowProject } from "./consumptionProjectionService.js";

test("E3 shadow activation and rollback keep the previous projection", () => {
  const first = shadowProject({
    profileRevision: 1,
    quality: "exact",
    siteTimeZone: "Asia/Taipei",
    valueKwh: "4300"
  }, "kn", "month");
  activateProjection(first);
  const second = shadowProject({
    profileRevision: 2,
    quality: "exact",
    siteTimeZone: "Asia/Taipei",
    valueKwh: "4500"
  }, "kn", "month");
  activateProjection(second);
  assert.equal(second.active, true);
  assert.equal(first.active, false);
  const rolled = rollbackProjection("kn", "month");
  assert.equal(rolled?.valueKwh, "4300");
  assert.equal(rolled?.active, true);
});
