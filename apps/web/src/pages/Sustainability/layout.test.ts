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
    left: 68,
    top: 176,
    width: 470
  });
  assert.deepEqual(sustainabilityHeroLayout, {
    height: 560,
    left: 574,
    top: 146,
    width: 1346
  });
  assert.deepEqual(sustainabilityStatLayout.esg, {
    height: 232,
    left: 1330,
    top: 706,
    width: 304
  });
  assert.deepEqual(sustainabilityHighlightRailLayout, {
    height: 108,
    left: 68,
    top: 578,
    width: 470
  });
  assert.match(sustainabilityAssetMap.hero.src, /sustain-hero-ref\.jpg$/);
});
