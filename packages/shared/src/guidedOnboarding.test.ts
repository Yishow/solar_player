import assert from "node:assert/strict";
import test from "node:test";
import { isOnboardingTask, nextOnboardingStep, onboardingPreservesScope, previousOnboardingStep } from "./guidedOnboarding.js";

test("U2 onboarding keeps the chosen site and walks connection → confirm", () => {
  assert.equal(onboardingPreservesScope("kn"), "kn");
  assert.equal(nextOnboardingStep("connection"), "site");
  assert.equal(nextOnboardingStep("site"), "received-data");
  assert.equal(nextOnboardingStep("received-data"), "confirm");
  assert.equal(nextOnboardingStep("confirm"), "confirm");
  assert.equal(previousOnboardingStep("confirm"), "received-data");
  assert.equal(isOnboardingTask("connect"), true);
});
