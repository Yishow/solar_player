import assert from "node:assert/strict";
import test from "node:test";
import { energyTrendCardKeys, energyTrendLayout } from "./layout";

test("energy trend layout centralizes title, tabs, refresh, and chart card geometry", () => {
  assert.deepEqual(energyTrendLayout.title, { left: 58, top: 28, width: 720 });
  assert.deepEqual(energyTrendLayout.copy, { left: 58, top: 112, width: 760 });
  assert.deepEqual(energyTrendLayout.leaf, {
    height: 172,
    left: 386,
    top: 52,
    width: 520
  });
  assert.deepEqual(energyTrendLayout.tabs, {
    height: 58,
    left: 1168,
    top: 86,
    width: 702
  });
  assert.deepEqual(energyTrendLayout.refresh, {
    height: 46,
    left: 1440,
    top: 28,
    width: 430
  });
  assert.deepEqual(energyTrendLayout.cards.card5, {
    height: 562,
    left: 1514,
    top: 204,
    width: 352
  });
  assert.deepEqual(energyTrendCardKeys, ["card1", "card2", "card3", "card4", "card5"]);
});

test("energy trend regions stack within content height 838 and avoid hard collisions", () => {
  assert.ok(energyTrendLayout.copy.top > energyTrendLayout.title.top + 70, "copy clears title block");

  // cards start below copy + tabs
  const tabsBottom = energyTrendLayout.tabs.top + energyTrendLayout.tabs.height;
  assert.ok(energyTrendLayout.cards.card1.top > tabsBottom, "cards clear tabs row");
  assert.ok(energyTrendLayout.cards.card1.top > energyTrendLayout.copy.top + 32, "cards clear copy line");

  // total fits 838
  const cardsBottom = energyTrendLayout.cards.card1.top + energyTrendLayout.cards.card1.height;
  assert.ok(cardsBottom <= 838, "cards row fits within content height");
});
