import assert from "node:assert/strict";
import test from "node:test";
import {
  sustainabilityAssetMap,
  sustainabilityContentTopOffset,
  sustainabilityHeroLayout,
  sustainabilityHighlightRailLayout,
  sustainabilityStatLayout,
  sustainabilityTitleLayout
} from "./layout";

test("sustainability layout centralizes the storytelling reference geometry and assets", () => {
  assert.equal(sustainabilityContentTopOffset, 110);
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
    height: 232,
    left: 970,
    top: 704,
    width: 282
  });
  assert.deepEqual(sustainabilityStatLayout.esg, {
    height: 232,
    left: 1268,
    top: 704,
    width: 282
  });
  assert.deepEqual(sustainabilityStatLayout.trees, {
    height: 232,
    left: 1568,
    top: 704,
    width: 304
  });
  assert.deepEqual(sustainabilityHighlightRailLayout, {
    height: 108,
    left: 68,
    top: 578,
    width: 470
  });
  assert.match(sustainabilityAssetMap.hero.src, /sustainability-hero-reference\.png$/);
});
