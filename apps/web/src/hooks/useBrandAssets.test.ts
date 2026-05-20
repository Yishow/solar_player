import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultBrandView,
  profileToView,
  refreshRuntimeBrandView,
  resolveRuntimeBrandView,
  shouldRefreshBrandForDisplaySync
} from "./useBrandAssets";

test("resolveRuntimeBrandView maps the active runtime brand payload into the playback header view", async () => {
  const view = await resolveRuntimeBrandView(async () => ({
    brandNameZh: "測試品牌",
    brandNameEn: "TEST BRAND",
    logoUrl: "/uploads/brand/test.png",
    productTitleZh: "測試中文標題",
    productTitleEn: "TEST PRODUCT",
    sloganZh: "測試中文標語",
    sloganEn: "TEST SLOGAN"
  }));

  assert.deepEqual(view, profileToView({
    brandNameZh: "測試品牌",
    brandNameEn: "TEST BRAND",
    logoUrl: "/uploads/brand/test.png",
    productTitleZh: "測試中文標題",
    productTitleEn: "TEST PRODUCT",
    sloganZh: "測試中文標語",
    sloganEn: "TEST SLOGAN"
  }));
});

test("resolveRuntimeBrandView falls back to the default playback brand when the runtime bootstrap fails", async () => {
  const view = await resolveRuntimeBrandView(async () => {
    throw new Error("denied");
  });

  assert.deepEqual(view, defaultBrandView);
});

test("refreshRuntimeBrandView keeps the previous playback brand view when a refresh fails", async () => {
  const previous = {
    logoSrc: "/uploads/brand/live.png",
    brandNameZh: "既有品牌",
    brandNameEn: "LIVE BRAND",
    productTitleZh: "既有標題",
    productTitleEn: "LIVE PRODUCT",
    sloganZh: "既有標語",
    sloganEn: "LIVE SLOGAN"
  };

  const view = await refreshRuntimeBrandView(previous, async () => {
    throw new Error("network");
  });

  assert.deepEqual(view, previous);
});

test("brand invalidation only reacts to display-sync brand scope", () => {
  assert.equal(shouldRefreshBrandForDisplaySync({ scope: "brand" }), true);
  assert.equal(shouldRefreshBrandForDisplaySync({ scope: "mqtt" }), false);
});
