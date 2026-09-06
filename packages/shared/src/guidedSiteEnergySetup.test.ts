import assert from "node:assert/strict";
import test from "node:test";
import { nextSiteEnergySetupStep, siteEnergySetupHref } from "./guidedSiteEnergySetup.js";

test("U6 guided setup is four steps and keeps the site in the URL", () => {
  assert.equal(nextSiteEnergySetupStep("site"), "total");
  assert.equal(nextSiteEnergySetupStep("basis"), "basis");
  assert.equal(siteEnergySetupHref("kn"), "/settings/data-hub?scope=kn&task=energy");
});
