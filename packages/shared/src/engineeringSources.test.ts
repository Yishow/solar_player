import assert from "node:assert/strict";
import test from "node:test";
import {
  KN_ENGINEERING_IDS,
  validateKnEngineeringSource,
  buildDefaultEngineeringExactTopic
} from "./engineeringSources.js";

test("KNE-R1-S02: eight existing identities are distinct and recognized", () => {
  assert.equal(KN_ENGINEERING_IDS.length, 8);
  const expected = [
    "stamping",
    "body",
    "painting",
    "assembly",
    "utility",
    "office",
    "heavy_vehicle",
    "ed_coating"
  ];
  assert.deepEqual([...KN_ENGINEERING_IDS], expected);

  for (const engId of KN_ENGINEERING_IDS) {
    const res = validateKnEngineeringSource({
      sourceKind: "engineering",
      site: "kn",
      engineeringId: engId,
      purpose: "power",
      mode: "power-gauge",
      enabled: false
    });
    assert.equal(res.valid, true);
    if (res.valid) {
      assert.equal(res.source.engineeringId, engId);
      assert.equal(res.source.unit, "kW");
    }
  }
});

test("KNE-R1-S03: alias is not approval - rejects paint or utilities", () => {
  const paintRes = validateKnEngineeringSource({
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "paint" as any,
    purpose: "power",
    mode: "power-gauge"
  });
  assert.equal(paintRes.valid, false);
  if (!paintRes.valid) {
    assert.match(paintRes.errors.join(";"), /Unknown engineering identity "paint"/);
  }

  const utilRes = validateKnEngineeringSource({
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "utilities" as any,
    purpose: "power",
    mode: "power-gauge"
  });
  assert.equal(utilRes.valid, false);
  if (!utilRes.valid) {
    assert.match(utilRes.errors.join(";"), /Unknown engineering identity "utilities"/);
  }
});

test("KNE-R1-S01: does not require meterId or physical fields", () => {
  const res = validateKnEngineeringSource({
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "painting",
    purpose: "energy",
    mode: "daily-report",
    enabled: true
  });
  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.source.engineeringId, "painting");
    assert.equal(res.source.mode, "daily-report");
    assert.equal((res.source as any).meterId, undefined);
  }
});

test("KNE-R1: rejects non-kn site", () => {
  const res = validateKnEngineeringSource({
    sourceKind: "engineering",
    site: "cl" as any,
    engineeringId: "stamping",
    purpose: "power",
    mode: "power-gauge"
  });
  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.match(res.errors.join(";"), /site must be "kn"/);
  }
});

test("KNE-R2-S01: energy on a power topic is rejected", () => {
  const res = validateKnEngineeringSource({
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "assembly",
    purpose: "energy",
    mode: "daily-report",
    exactTopic: "factory/guanyin/power/assembly"
  });
  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.match(res.errors.join(";"), /Energy source topic cannot use power path/);
  }
});

test("KNE-R2: unconfigured mode allows draft but blocks activation", () => {
  // Draft allowed
  const draftRes = validateKnEngineeringSource({
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "office",
    purpose: "energy",
    mode: "unconfigured",
    enabled: false
  });
  assert.equal(draftRes.valid, true);

  // Activation blocked
  const activeRes = validateKnEngineeringSource({
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "office",
    purpose: "energy",
    mode: "unconfigured",
    enabled: true
  });
  assert.equal(activeRes.valid, false);
  if (!activeRes.valid) {
    assert.match(activeRes.errors.join(";"), /Cannot enable engineering source with mode "unconfigured"/);
  }
});

test("KNE-R2: topic builder generates expected paths without wildcards", () => {
  assert.equal(
    buildDefaultEngineeringExactTopic("stamping", "power-gauge"),
    "factory/guanyin/power/stamping"
  );
  assert.equal(
    buildDefaultEngineeringExactTopic("painting", "daily-report"),
    "factory/guanyin/energy/daily/painting"
  );
  assert.equal(
    buildDefaultEngineeringExactTopic("assembly", "cumulative-energy"),
    "factory/guanyin/energy/cumulative/assembly"
  );
});
