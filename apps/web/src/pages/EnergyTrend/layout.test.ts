import assert from "node:assert/strict";
import test from "node:test";
import { energyTrendCardKeys, energyTrendLayout } from "./layout";

test("energy trend layout centralizes title, tabs, refresh, and chart card geometry", () => {
  assert.deepEqual(energyTrendLayout.title, { left: 58, top: 24, width: 720 });
  assert.deepEqual(energyTrendLayout.copy, { left: 58, top: 136, width: 700 });
  assert.deepEqual(energyTrendLayout.leaf, {
    height: 188,
    left: 372,
    top: 60,
    width: 548
  });
  assert.deepEqual(energyTrendLayout.tabs, {
    height: 60,
    left: 1142,
    top: 88,
    width: 728
  });
  assert.deepEqual(energyTrendLayout.refresh, {
    height: 54,
    left: 1452,
    top: 18,
    width: 418
  });
  assert.deepEqual(energyTrendLayout.cards.card5, {
    height: 468,
    left: 1316,
    top: 270,
    width: 304
  });
  assert.deepEqual(energyTrendCardKeys, ["card1", "card2", "card3", "card4", "card5"]);
});

test("energy trend regions stack within content height 838 and avoid hard collisions", () => {
  // title bottom (h1 60px line-height 1.05 ≈ 63 + p subtitle 22 + margin 14 ≈ 99)
  // copy starts at 136 — clear of title ~123. OK.
  assert.ok(energyTrendLayout.copy.top > energyTrendLayout.title.top + 100, "copy clears title block");

  // cards start below copy + tabs
  const tabsBottom = energyTrendLayout.tabs.top + energyTrendLayout.tabs.height;
  assert.ok(energyTrendLayout.cards.card1.top > tabsBottom, "cards clear tabs row");
  assert.ok(energyTrendLayout.cards.card1.top > energyTrendLayout.copy.top + 32, "cards clear copy line");

  // total fits 838
  const cardsBottom = energyTrendLayout.cards.card1.top + energyTrendLayout.cards.card1.height;
  assert.ok(cardsBottom <= 838, "cards row fits within content height");
});
