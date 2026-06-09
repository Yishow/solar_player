import assert from "node:assert/strict";
import test from "node:test";
import {
  SOLAR_GENERATION_PROFILE_KW,
  computeSolarGenerationPowerAt
} from "./solarGenerationProfile.js";

const at = (hour: number, minute = 0) => new Date(2026, 5, 9, hour, minute, 0);

test("solar profile is a 24-hour series peaking just after solar noon", () => {
  assert.equal(SOLAR_GENERATION_PROFILE_KW.length, 24);
  const peakIndex = SOLAR_GENERATION_PROFILE_KW.indexOf(Math.max(...SOLAR_GENERATION_PROFILE_KW));
  assert.equal(peakIndex, 13, "peak should sit just after solar noon");
});

test("solar profile is dark overnight and rises then falls monotonically", () => {
  for (const hour of [0, 3, 5, 22, 23]) {
    assert.equal(SOLAR_GENERATION_PROFILE_KW[hour], 0, `hour ${hour} should be dark`);
  }

  const peak = 13;
  for (let h = 1; h <= peak; h += 1) {
    assert.ok(SOLAR_GENERATION_PROFILE_KW[h]! >= SOLAR_GENERATION_PROFILE_KW[h - 1]!, `rise at ${h}`);
  }
  for (let h = peak + 1; h < 24; h += 1) {
    assert.ok(SOLAR_GENERATION_PROFILE_KW[h]! <= SOLAR_GENERATION_PROFILE_KW[h - 1]!, `fall at ${h}`);
  }
});

test("solar profile ramps steeply in the morning and declines gently in the afternoon", () => {
  // At equal distance from the 13:00 peak the afternoon stays higher than the
  // morning => steep morning ramp, gentle and longer evening tail.
  assert.ok(
    SOLAR_GENERATION_PROFILE_KW[18]! > SOLAR_GENERATION_PROFILE_KW[8]!,
    "5h after the peak should exceed 5h before the peak"
  );
  assert.ok(SOLAR_GENERATION_PROFILE_KW[19]! > SOLAR_GENERATION_PROFILE_KW[7]!);
});

test("computeSolarGenerationPowerAt interpolates within the hour and is zero at night", () => {
  assert.equal(computeSolarGenerationPowerAt(at(2)), 0);
  assert.equal(computeSolarGenerationPowerAt(at(13)), SOLAR_GENERATION_PROFILE_KW[13]);

  const afternoon = computeSolarGenerationPowerAt(at(13, 30));
  assert.ok(
    afternoon <= SOLAR_GENERATION_PROFILE_KW[13]! && afternoon >= SOLAR_GENERATION_PROFILE_KW[14]!,
    "13:30 should fall between the 13:00 and 14:00 samples"
  );
});
