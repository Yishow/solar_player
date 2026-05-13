import assert from "node:assert/strict";
import test from "node:test";
import type { ImageAsset } from "@solar-display/shared";
import { buildImageManagementViewModel } from "./viewModel";

const assets: ImageAsset[] = [
  {
    aspectRatio: 16 / 9,
    description: "以綠色製造，驅動美好生活",
    displayDuration: 12,
    displayOrder: 2,
    fileSize: 2 * 1024 * 1024,
    filename: "green-campus.jpg",
    height: 1080,
    id: 7,
    includedInSlideshow: false,
    isCover: false,
    mimeType: "image/jpeg",
    originalName: "green-campus.jpg",
    title: "綠色校園",
    width: 1920
  },
  {
    aspectRatio: 16 / 9,
    description: "工廠太陽能板與綠能設施",
    displayDuration: 10,
    displayOrder: 1,
    fileSize: 3 * 1024 * 1024,
    filename: "factory-solar.jpg",
    height: 1080,
    id: 3,
    includedInSlideshow: true,
    isCover: true,
    mimeType: "image/jpeg",
    originalName: "factory-solar.jpg",
    title: "綠色工廠",
    width: 1920
  }
];

test("buildImageManagementViewModel maps storage and slideshow state into readable cards", () => {
  const model = buildImageManagementViewModel({
    assets,
    errorMessage: "",
    isDeleting: false,
    isSaving: false,
    isUploading: false,
    message: "圖片庫已同步。",
    selectedImageId: 999,
    storageUsage: {
      fileCount: 2,
      usedBytes: 2.5 * 1024 * 1024 * 1024,
      usedMB: 2560
    }
  });

  assert.equal(model.summary.totalImages, 2);
  assert.equal(model.summary.slideshowCount, 1);
  assert.equal(model.summary.usedSpaceLabel, "2.50 GB / 5.00 GB");
  assert.equal(model.summary.usagePercent, 50);
  assert.equal(model.library[0]?.id, 3);
  assert.deepEqual(model.library[0]?.badges, ["輪播中", "封面"]);
  assert.equal(model.selection?.id, 3);
  assert.match(model.selection?.previewUrl ?? "", /\/uploads\/images\/factory-solar\.jpg$/);
  assert.equal(model.actionBanner.tone, "ready");
});

test("buildImageManagementViewModel keeps an empty-state contract when no assets exist", () => {
  const model = buildImageManagementViewModel({
    assets: [],
    errorMessage: "",
    isDeleting: false,
    isSaving: false,
    isUploading: false,
    message: "圖片庫已同步。",
    selectedImageId: null,
    storageUsage: {
      fileCount: 0,
      usedBytes: 0,
      usedMB: 0
    }
  });

  assert.equal(model.summary.totalImages, 0);
  assert.equal(model.selection, null);
  assert.equal(model.library.length, 0);
  assert.match(model.emptyState?.title ?? "", /尚未上傳圖片/);
});
