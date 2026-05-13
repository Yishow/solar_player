import assert from "node:assert/strict";
import test from "node:test";
import { imageMocks } from "../../mocks/images";
import { buildImagesViewModel } from "./viewModel";

test("buildImagesViewModel preserves thumbnails and placeholder state when an asset is missing", () => {
  const model = buildImagesViewModel({
    activeIndex: 4,
    assetSources: ["hero.jpg", "thumb-1.jpg", "thumb-2.jpg", "thumb-3.jpg", null],
    slides: imageMocks
  });

  assert.equal(model.counter.current, "05");
  assert.equal(model.thumbnails.length, 5);
  assert.equal(model.active.hasAsset, false);
  assert.match(model.active.placeholderLabel, /等待圖片素材/);
});
