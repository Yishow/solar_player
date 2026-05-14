import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAspectRatioLabel,
  formatAspectRatioChoice,
  parseAspectRatioChoice
} from "./aspectRatio";

test("formatAspectRatioChoice maps supported ratios to stable control values", () => {
  assert.equal(formatAspectRatioChoice(16 / 9), "16:9");
  assert.equal(formatAspectRatioChoice(4 / 3), "4:3");
  assert.equal(formatAspectRatioChoice(1), "1:1");
  assert.equal(formatAspectRatioChoice(null), "auto");
  assert.equal(formatAspectRatioChoice(1.81), "custom");
});

test("parseAspectRatioChoice maps control values back to persisted ratios", () => {
  assert.equal(parseAspectRatioChoice("auto"), null);
  assert.equal(parseAspectRatioChoice("16:9"), 16 / 9);
  assert.equal(parseAspectRatioChoice("4:3"), 4 / 3);
  assert.equal(parseAspectRatioChoice("1:1"), 1);
  assert.equal(parseAspectRatioChoice("custom", 1.81), 1.81);
  assert.equal(parseAspectRatioChoice("unexpected", 1.81), 1.81);
});

test("formatAspectRatioLabel keeps null and custom ratios visible to the operator", () => {
  assert.equal(formatAspectRatioLabel(null), "原始比例 Auto");
  assert.equal(formatAspectRatioLabel(16 / 9), "16:9");
  assert.equal(formatAspectRatioLabel(1.81), "1.81 : 1");
});