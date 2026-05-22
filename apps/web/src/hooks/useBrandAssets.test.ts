import assert from "node:assert/strict";
import test from "node:test";
import {
  BRAND_VIEW_STORAGE_KEY,
  defaultBrandView,
  profileToView,
  readCachedBrandView,
  resolveLoaderBrandView,
  resolveDocumentTitle,
  resolveInitialBrandView,
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

test("defaultBrandView keeps the aligned default product title", () => {
  assert.equal(defaultBrandView.productTitleZh, "國瑞汽車綠能展示播放器");
});

test("resolveInitialBrandView prefers the loader bootstrap brand over cache and defaults", () => {
  const bootstrapped = {
    ...defaultBrandView,
    productTitleZh: "Loader 首屏標題"
  };

  const storage = new Map<string, string>([
    [BRAND_VIEW_STORAGE_KEY, JSON.stringify({ ...defaultBrandView, productTitleZh: "快取標題" })]
  ]);

  const view = resolveInitialBrandView(bootstrapped, {
    getItem: (key) => storage.get(key) ?? null,
    removeItem: (key) => {
      storage.delete(key);
    },
    setItem: (key, value) => {
      storage.set(key, value);
    }
  });

  assert.equal(view.productTitleZh, "Loader 首屏標題");
});

test("resolveInitialBrandView falls back to cached brand when no loader bootstrap is present", () => {
  const cached = {
    ...defaultBrandView,
    productTitleZh: "快取首屏標題"
  };

  const storage = new Map<string, string>([[BRAND_VIEW_STORAGE_KEY, JSON.stringify(cached)]]);

  const view = resolveInitialBrandView(undefined, {
    getItem: (key) => storage.get(key) ?? null,
    removeItem: (key) => {
      storage.delete(key);
    },
    setItem: (key, value) => {
      storage.set(key, value);
    }
  });

  assert.equal(view.productTitleZh, "快取首屏標題");
});

test("resolveLoaderBrandView falls back to cached brand when bootstrap refresh fails", async () => {
  const cached = {
    ...defaultBrandView,
    productTitleZh: "快取品牌首標"
  };
  const storage = new Map<string, string>([[BRAND_VIEW_STORAGE_KEY, JSON.stringify(cached)]]);

  const view = await resolveLoaderBrandView(
    async () => {
      throw new Error("bootstrap failed");
    },
    {
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => {
        storage.delete(key);
      },
      setItem: (key, value) => {
        storage.set(key, value);
      }
    }
  );

  assert.equal(view.productTitleZh, "快取品牌首標");
});

test("readCachedBrandView ignores malformed cache payloads", () => {
  const storage = new Map<string, string>([[BRAND_VIEW_STORAGE_KEY, "{not-json"]]);

  const view = readCachedBrandView({
    getItem: (key) => storage.get(key) ?? null,
    removeItem: (key) => {
      storage.delete(key);
    },
    setItem: (key, value) => {
      storage.set(key, value);
    }
  });

  assert.equal(view, null);
  assert.equal(storage.has(BRAND_VIEW_STORAGE_KEY), false);
});

test("resolveDocumentTitle prefers runtime product title and falls back to a neutral shell title", () => {
  assert.equal(resolveDocumentTitle({ ...defaultBrandView, productTitleZh: "目前品牌標題" }), "目前品牌標題");
  assert.equal(resolveDocumentTitle({ ...defaultBrandView, productTitleZh: "" }), "綠能展示播放器");
  assert.equal(resolveDocumentTitle(undefined), "綠能展示播放器");
});
