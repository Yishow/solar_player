import assert from "node:assert/strict";
import test from "node:test";
import {
  checkCumulativeBaseline,
  detectAmbiguousTags,
  inspectMessageProvenance,
  isManagedSolarTarget,
  nextMappingStage,
  previousMappingStage,
  validateScaleMultiplier
} from "./mappingJourney.js";

test("mappingJourney stages walk through three stages", () => {
  assert.equal(nextMappingStage("select-data"), "field-meaning");
  assert.equal(nextMappingStage("field-meaning"), "preview-apply");
  assert.equal(nextMappingStage("preview-apply"), "preview-apply");

  assert.equal(previousMappingStage("preview-apply"), "field-meaning");
  assert.equal(previousMappingStage("field-meaning"), "select-data");
  assert.equal(previousMappingStage("select-data"), "select-data");
});

test("validateScaleMultiplier preserves decimal lexeme and detects partial or invalid input", () => {
  assert.deepEqual(validateScaleMultiplier(""), { error: "乘數尚未完成輸入", valid: false });
  assert.deepEqual(validateScaleMultiplier("-"), { error: "乘數尚未完成輸入", valid: false });
  assert.deepEqual(validateScaleMultiplier("0."), { error: "乘數尚未完成輸入", valid: false });
  assert.deepEqual(validateScaleMultiplier("0"), { error: "乘數不可為 0", valid: false });
  assert.deepEqual(validateScaleMultiplier("0.0"), { error: "乘數不可為 0", valid: false });
  assert.deepEqual(validateScaleMultiplier("abc"), { error: "乘數必須為有效數字", valid: false });

  assert.deepEqual(validateScaleMultiplier("1"), { normalized: "1", valid: true });
  assert.deepEqual(validateScaleMultiplier("0.001"), { normalized: "0.001", valid: true });
  assert.deepEqual(validateScaleMultiplier("-10.5"), { normalized: "-10.5", valid: true });
});

test("detectAmbiguousTags finds tags that appear multiple times", () => {
  const unambiguous = [
    { tag: "MAIN", val: 1 },
    { tag: "STAMP", val: 2 }
  ];
  assert.deepEqual(detectAmbiguousTags(unambiguous), []);

  const ambiguous = [
    { tag: "MAIN", val: 1 },
    { tag: "MAIN", val: 2 },
    { tag: "SUB", val: 3 }
  ];
  assert.deepEqual(detectAmbiguousTags(ambiguous), ["MAIN"]);
});

test("inspectMessageProvenance detects legacy ts and v1 power envelope", () => {
  const legacy = { publishedAt: "2026-09-16T00:00:00Z", val: 123 };
  const res1 = inspectMessageProvenance(legacy);
  assert.equal(res1.hasLegacyTs, true);
  assert.equal(res1.isV1PowerEnvelope, false);
  assert.match(res1.warnings[0] ?? "", /發佈端時間/);

  const v1 = { envelopeVersion: "v1-power", val: 456 };
  const res2 = inspectMessageProvenance(v1);
  assert.equal(res2.isV1PowerEnvelope, true);
  assert.match(res2.warnings[0] ?? "", /opc-power-v1/);
});

test("checkCumulativeBaseline warns if only single cumulative observation exists", () => {
  const single = checkCumulativeBaseline("cumulative-energy", 1);
  assert.equal(single.baselineAvailable, false);
  assert.match(single.message ?? "", /尚未累積足夠的區間用電基線/);

  const multiple = checkCumulativeBaseline("cumulative-energy", 2);
  assert.equal(multiple.baselineAvailable, true);

  const power = checkCumulativeBaseline("power-gauge", 1);
  assert.equal(power.baselineAvailable, true);
});

test("isManagedSolarTarget identifies solar sources to protect them from test publish", () => {
  assert.equal(isManagedSolarTarget("solar.generation"), true);
  assert.equal(isManagedSolarTarget("solar_total"), true);
  assert.equal(isManagedSolarTarget("consumptionEnergy"), false);
  assert.equal(isManagedSolarTarget("meter.kn.01"), false);
});
