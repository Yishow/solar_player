import assert from "node:assert/strict";
import test from "node:test";
import { nextOnboardingStep, onboardingPreservesScope } from "./guidedOnboarding.js";

test("U2 onboarding keeps the chosen site and walks connection → confirm", () => {
  assert.equal(onboardingPreservesScope("kn"), "kn");
  assert.equal(nextOnboardingStep("connection"), "site");
  assert.equal(nextOnboardingStep("confirm"), "confirm");
});
