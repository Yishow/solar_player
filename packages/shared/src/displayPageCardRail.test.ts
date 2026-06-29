import assert from "node:assert/strict";
import test from "node:test";
import {
  createMetricHighlightCard,
  isDisplayPageCardRail,
  resolveDisplayPageCardStatus,
  type DisplayPageCardRail
} from "./displayPageCardRail.js";

const frame = { height: 64, left: 0, top: 0, width: 120 };

function buildRail(overrides: Partial<Record<string, unknown>> = {}): DisplayPageCardRail {
  const card = {
    ...createMetricHighlightCard({
      displayOrder: 1,
      frame,
      id: "summary-1",
      label: "今日發電量",
      unit: "kWh",
      value: "100"
    }),
    ...overrides
  };

  return {
    cards: [card],
    container: frame
  } as DisplayPageCardRail;
}

test("resolveDisplayPageCardStatus treats an omitted status as normal", () => {
  assert.equal(resolveDisplayPageCardStatus({}), "normal");
  assert.equal(resolveDisplayPageCardStatus(undefined), "normal");
  assert.equal(resolveDisplayPageCardStatus(null), "normal");
});

test("resolveDisplayPageCardStatus preserves an explicit configuring status", () => {
  assert.equal(resolveDisplayPageCardStatus({ status: "configuring" }), "configuring");
});

test("resolveDisplayPageCardStatus normalizes an explicit normal status", () => {
  assert.equal(resolveDisplayPageCardStatus({ status: "normal" }), "normal");
});

test("isDisplayPageCardRail accepts a card without a status field", () => {
  assert.equal(isDisplayPageCardRail(buildRail()), true);
});

test("isDisplayPageCardRail accepts a card with a valid configuring status", () => {
  assert.equal(isDisplayPageCardRail(buildRail({ status: "configuring" })), true);
});

test("isDisplayPageCardRail rejects a card with an unknown status value", () => {
  assert.equal(isDisplayPageCardRail(buildRail({ status: "maintenance" })), false);
});
