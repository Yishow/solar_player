import assert from "node:assert/strict";
import test from "node:test";
import {
  isSiteEnergySetupTask,
  nextSiteEnergySetupStep,
  previousSiteEnergySetupStep,
  siteEnergySetupChooseSiteCopy,
  siteEnergySetupHref
} from "./guidedSiteEnergySetup.js";

test("U6 four-step factory energy setup keeps scope in the entry href", () => {
  assert.equal(nextSiteEnergySetupStep("site"), "total");
  assert.equal(nextSiteEnergySetupStep("basis"), "basis");
  assert.equal(previousSiteEnergySetupStep("total"), "site");
  assert.equal(siteEnergySetupHref("kn"), "/settings/data-hub?scope=kn&task=energy");
  assert.equal(isSiteEnergySetupTask("energy"), true);
  assert.match(siteEnergySetupChooseSiteCopy(), /CL 或 KN/);
});
