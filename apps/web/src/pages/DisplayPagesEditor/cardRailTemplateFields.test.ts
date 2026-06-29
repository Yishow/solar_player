import assert from "node:assert/strict";
import test from "node:test";
import {
  createMetricHighlightCard,
  createUnavailableHouseholdEquivalenceCard,
  type DisplayPageCardRailCard
} from "@solar-display/shared";
import { buildCardRailCardFields } from "./cardRailTemplateFields";

const frame = { height: 64, left: 0, top: 0, width: 120 };
const cardPath: Array<number | string> = ["highlightRail", "cards", 0];

const metricCard = createMetricHighlightCard({
  displayOrder: 1,
  frame,
  id: "summary-1",
  label: "今日發電量",
  unit: "kWh",
  value: "100"
}) as DisplayPageCardRailCard;

const householdCard = {
  contentSource: { mode: "static", payload: createUnavailableHouseholdEquivalenceCard("today") },
  displayOrder: 1,
  frame,
  id: "household-today",
  stylePreset: null,
  template: "household-equivalent",
  visible: true
} as DisplayPageCardRailCard;

for (const card of [metricCard, householdCard]) {
  test(`buildCardRailCardFields exposes a visibility toggle for ${card.template}`, () => {
    const fields = buildCardRailCardFields(card, cardPath);
    const visible = fields.find((field) => field.id === "card-visible");
    assert.ok(visible, "expected a card-visible field");
    assert.equal(visible?.fieldType, "toggle");
    assert.deepEqual(visible?.path, [...cardPath, "visible"]);
  });

  test(`buildCardRailCardFields exposes a status select for ${card.template}`, () => {
    const fields = buildCardRailCardFields(card, cardPath);
    const status = fields.find((field) => field.id === "card-status");
    assert.ok(status, "expected a card-status field");
    assert.equal(status?.fieldType, "select");
    assert.deepEqual(status?.path, [...cardPath, "status"]);
    assert.deepEqual(
      status && "options" in status ? status.options.map((option) => option.value) : [],
      ["normal", "configuring"]
    );
  });
}
