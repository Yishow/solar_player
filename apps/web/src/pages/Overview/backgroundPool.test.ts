import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayPageMediaBinding } from "@solar-display/shared";
import { pickOverviewBackground } from "./backgroundPool";

function makePool(size: number): DisplayPageMediaBinding[] {
  return Array.from({ length: size }, (_, index) => ({
    sourceMode: "seed-default" as const,
    src: `/overview-bg-${index + 1}.png`
  }));
}

test("pickOverviewBackground returns null for an empty pool", () => {
  assert.equal(pickOverviewBackground([]), null);
});

test("pickOverviewBackground always returns the only candidate for a single-item pool", () => {
  const pool = makePool(1);
  assert.equal(pickOverviewBackground(pool, () => 0), pool[0]);
  assert.equal(pickOverviewBackground(pool, () => 0.99), pool[0]);
});

// Spec Example: Deterministic selection
for (const { poolSize, randomValue, selectedIndex } of [
  { poolSize: 4, randomValue: 0.0, selectedIndex: 0 },
  { poolSize: 4, randomValue: 0.5, selectedIndex: 2 },
  { poolSize: 1, randomValue: 0.99, selectedIndex: 0 }
]) {
  test(`pickOverviewBackground selects index ${selectedIndex} for pool ${poolSize} / random ${randomValue}`, () => {
    const pool = makePool(poolSize);
    assert.equal(pickOverviewBackground(pool, () => randomValue), pool[selectedIndex]);
  });
}

test("pickOverviewBackground clamps out-of-range random values into the pool bounds", () => {
  const pool = makePool(4);
  assert.equal(pickOverviewBackground(pool, () => 1), pool[3]);
  assert.equal(pickOverviewBackground(pool, () => 1.5), pool[3]);
  assert.equal(pickOverviewBackground(pool, () => -0.2), pool[0]);
});
