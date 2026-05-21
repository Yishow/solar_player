import assert from "node:assert/strict";
import test from "node:test";
import {
  createMetricHighlightCard,
  upgradeLegacyMetricHighlightRail,
  type DisplayPageMetricHighlightCard,
  type LegacyDisplayPageMetricHighlightRail
} from "../src/displayPageCardRail.js";

test("createMetricHighlightCard detaches the returned frame from the caller input", () => {
  const frame = {
    height: 180,
    left: 24,
    top: 12,
    width: 320
  };
  const card = createMetricHighlightCard({
    displayOrder: 1,
    frame,
    id: "summary-1",
    label: "總發電量",
    unit: "kWh",
    value: "1200"
  });

  frame.left = 999;

  assert.equal(card.frame.left, 24);
});

test("upgradeLegacyMetricHighlightRail keeps payload, frame, and container detached from legacy inputs", () => {
  const legacyRail = {
    container: {
      height: 240,
      left: 0,
      top: 0,
      width: 960
    },
    items: [
      {
        label: "總發電量",
        provenance: {
          freshnessState: "fresh"
        },
        unit: "kWh",
        value: "1200"
      }
    ]
  } satisfies LegacyDisplayPageMetricHighlightRail;
  const fallbackCards = [
    createMetricHighlightCard({
      displayOrder: 2,
      frame: {
        height: 120,
        left: 16,
        top: 18,
        width: 300
      },
      id: "fallback-1",
      label: "原始 fallback",
      unit: "kWh",
      value: "900"
    })
  ];
  const upgraded = upgradeLegacyMetricHighlightRail(legacyRail, fallbackCards);
  const firstCard = upgraded.cards[0] as DisplayPageMetricHighlightCard;

  legacyRail.container.left = 48;
  legacyRail.items[0]!.label = "已被污染";
  legacyRail.items[0]!.provenance = {
    freshnessState: "fallback"
  };
  fallbackCards[0]!.frame.left = 99;

  assert.equal(upgraded.container.left, 0);
  assert.equal(firstCard.contentSource.payload.label, "總發電量");
  assert.equal(firstCard.contentSource.payload.provenance?.freshnessState, "fresh");
  assert.equal(firstCard.frame.left, 16);
});
