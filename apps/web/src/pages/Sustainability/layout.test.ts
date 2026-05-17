import assert from "node:assert/strict";
import test from "node:test";
import {
  sustainabilityAssetMap,
  sustainabilityHeroLayout,
  sustainabilityHighlightRailLayout,
  sustainabilityStatLayout,
  sustainabilityTitleLayout
} from "./layout";

test("sustainability layout centralizes the storytelling reference geometry and assets", () => {
  assert.deepEqual(sustainabilityTitleLayout, {
    left: 88,
    top: 166,
    width: 470
  });
  assert.deepEqual(sustainabilityHeroLayout, {
    height: 560,
    left: 574,
    top: 146,
    width: 1346
  });
  assert.deepEqual(sustainabilityStatLayout.procure, {
    height: 220,
    left: 1008,
    top: 760,
    width: 304
  });
  assert.deepEqual(sustainabilityStatLayout.esg, {
    height: 220,
    left: 1330,
    top: 760,
    width: 304
  });
  assert.deepEqual(sustainabilityStatLayout.trees, {
    height: 220,
    left: 1652,
    top: 760,
    width: 236
  });
  assert.deepEqual(sustainabilityHighlightRailLayout, {
    height: 108,
    left: 68,
    top: 578,
    width: 470
  });
  assert.match(sustainabilityAssetMap.hero.src, /sustain-hero-ref\.jpg$/);
});
