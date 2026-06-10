import assert from "node:assert/strict";
import test from "node:test";
import type { BrandProfile } from "@solar-display/shared";
import {
  pickFields,
  resolveBrandAssetsRefreshModel,
  resolveInitialBrandAssetsModel
} from "./loadModel";

function createProfile(overrides: Partial<BrandProfile> = {}): BrandProfile {
  return {
    brandNameEn: "KUOZUI",
    brandNameZh: "國瑞汽車",
    createdAt: "2026-06-10T00:00:00.000Z",
    id: 1,
    isActive: true,
    logoFileSize: null,
    logoFilename: null,
    logoHeight: null,
    logoMimeType: null,
    logoUrl: null,
    logoWidth: null,
    name: "Default",
    productTitleEn: "GREEN ENERGY DISPLAY",
    productTitleZh: "綠能展示播放器",
    sloganEn: "Sustainability Starts with Us",
    sloganZh: "永續，從現在開始",
    updatedAt: "2026-06-10T00:00:00.000Z",
    ...overrides
  };
}

test("resolveInitialBrandAssetsModel uses cached active profile as the first visible state", () => {
  const cached = [
    createProfile({ id: 1, isActive: false, name: "Old" }),
    createProfile({ id: 2, isActive: true, name: "Active", productTitleZh: "快取首屏標題" })
  ];

  const model = resolveInitialBrandAssetsModel(cached);

  assert.equal(model.selectedId, 2);
  assert.equal(model.draft?.productTitleZh, "快取首屏標題");
  assert.equal(model.profiles.length, 2);
});

test("resolveBrandAssetsRefreshModel updates selected draft after clean background refresh", () => {
  const refreshed = createProfile({ id: 3, isActive: true, name: "Refreshed" });

  const model = resolveBrandAssetsRefreshModel({
    currentDraft: null,
    currentSelectedId: null,
    dirty: false,
    pendingAction: false,
    preferredId: undefined,
    profiles: [refreshed]
  });

  assert.equal(model.selectedId, 3);
  assert.deepEqual(model.draft, pickFields(refreshed));
});

test("resolveBrandAssetsRefreshModel preserves dirty local edits and pending action during background refresh", () => {
  const selected = createProfile({ id: 7, isActive: true, productTitleZh: "伺服器標題" });
  const localDraft = {
    ...pickFields(selected),
    productTitleZh: "本機未儲存標題"
  };

  const dirtyModel = resolveBrandAssetsRefreshModel({
    currentDraft: localDraft,
    currentSelectedId: selected.id,
    dirty: true,
    pendingAction: false,
    preferredId: undefined,
    profiles: [selected]
  });
  const pendingActionModel = resolveBrandAssetsRefreshModel({
    currentDraft: localDraft,
    currentSelectedId: selected.id,
    dirty: false,
    pendingAction: true,
    preferredId: undefined,
    profiles: [selected]
  });

  assert.equal(dirtyModel.selectedId, selected.id);
  assert.deepEqual(dirtyModel.draft, localDraft);
  assert.equal(pendingActionModel.selectedId, selected.id);
  assert.deepEqual(pendingActionModel.draft, localDraft);
});
