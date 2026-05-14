import assert from "node:assert/strict";
import test from "node:test";
import {
  imagesAssetMap,
  imagesCounterLayout,
  imagesInfoLayout,
  imagesMainLayout,
  imagesThumbLayout,
  imagesThumbSize,
  imagesTitleLayout
} from "./layout";

test("images layout centralizes title, media stage, and thumbnail geometry", () => {
  assert.deepEqual(imagesTitleLayout, {
    left: 78,
    top: 192,
    width: 560
  });
  assert.deepEqual(imagesCounterLayout, {
    height: 170,
    left: 82,
    top: 704,
    width: 408
  });
  assert.deepEqual(imagesMainLayout, {
    height: 622,
    left: 584,
    top: 148,
    width: 1292
  });
  assert.deepEqual(imagesInfoLayout, {
    height: 376,
    left: 1470,
    top: 414,
    width: 374
  });
  assert.deepEqual(imagesThumbSize, {
    height: 118,
    width: 256
  });
  assert.deepEqual(imagesThumbLayout[2], {
    left: 1206,
    top: 804
  });
});

test("images asset map keeps provisional gallery assets page-local", () => {
  assert.match(imagesAssetMap.main.src, /images-main-ref\.jpg$/);
  assert.match(imagesAssetMap.thumbs[0]?.src ?? "", /thumb-factory-solar\.jpg$/);
  assert.match(imagesAssetMap.thumbs[3]?.src ?? "", /thumb-showroom\.jpg$/);
});
