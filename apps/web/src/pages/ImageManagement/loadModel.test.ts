import assert from "node:assert/strict";
import test from "node:test";
import type {
  ImageAsset,
  ImagePlaylistEntryInput,
  ResolvedImagePlaylistEntry
} from "@solar-display/shared";
import type { ImageStorageUsage } from "../../services/api";
import {
  loadImageManagementLibraryModel,
  loadImageManagementModel,
  loadImageManagementPlaylistGovernanceModel,
  resolveBulkPlaylistDurationInput,
  resolveImageManagementModel
} from "./loadModel";

const asset: ImageAsset = {
  aspectRatio: null,
  category: "background",
  description: null,
  displayDuration: 18,
  displayOrder: 1,
  fileSize: 1024,
  filename: "/uploads/images/overview.jpg",
  height: 1080,
  id: 7,
  includedInSlideshow: true,
  isCover: false,
  mimeType: "image/jpeg",
  originalName: "overview.jpg",
  title: "Overview",
  usageScope: "both",
  width: 1920
};

const storageUsage: ImageStorageUsage = {
  fileCount: 1,
  usedBytes: 1024,
  usedMB: 0.001
};

const playlistEntry: ImagePlaylistEntryInput = {
  area: "A",
  assetId: "7",
  capturedAt: "",
  description: "",
  displayOrder: 1,
  durationSeconds: 18,
  enabled: true,
  entryId: "entry-7",
  fallbackMode: "display-placeholder",
  tags: ["hero"],
  title: "Overview"
};

const resolvedPlaylistEntry: ResolvedImagePlaylistEntry = {
  ...playlistEntry,
  assetSource: "/uploads/images/overview.jpg",
  fallbackActive: false,
  fallbackReason: null,
  hasAsset: true,
  infoPanel: {
    area: "A",
    capturedAt: "",
    description: "",
    tags: ["hero"],
    title: "Overview"
  },
  isPlayable: true,
  resolution: "1920x1080"
};

const playlist = {
  entries: [playlistEntry],
  generatedAt: "2026-06-10T00:00:00.000Z",
  hasPlaylistRows: true,
  resolvedEntries: [resolvedPlaylistEntry],
  settings: {
    shuffle: true
  }
};

test("loadImageManagementModel reads library, storage, and playlist governance through one model path", async () => {
  let imageReads = 0;
  let storageReads = 0;
  let playlistReads = 0;

  const model = await loadImageManagementModel({
    readImages: async () => {
      imageReads += 1;
      return [asset];
    },
    readPlaylistGovernance: async () => {
      playlistReads += 1;
      return { playlist };
    },
    readStorageUsage: async () => {
      storageReads += 1;
      return storageUsage;
    }
  });

  assert.equal(imageReads, 1);
  assert.equal(storageReads, 1);
  assert.equal(playlistReads, 1);
  assert.deepEqual(model.assets, [asset]);
  assert.equal(model.storageUsage, storageUsage);
  assert.equal(model.selectedImageId, 7);
  assert.equal(model.selectedPlaylistEntryId, "entry-7");
  assert.equal(model.playlistShuffle, true);
  assert.equal(model.playlistBulkDurationSeconds, 18);
  assert.equal(model.resolvedPlaylistEntries[0]?.isPlayable, true);
});

test("loadImageManagementLibraryModel refreshes library and storage without reading governance", async () => {
  let imageReads = 0;
  let storageReads = 0;

  const model = await loadImageManagementLibraryModel({
    readImages: async () => {
      imageReads += 1;
      return [asset];
    },
    readStorageUsage: async () => {
      storageReads += 1;
      return storageUsage;
    }
  });

  assert.equal(imageReads, 1);
  assert.equal(storageReads, 1);
  assert.deepEqual(model.assets, [asset]);
  assert.equal(model.lastSyncedAssets, model.assets);
  assert.equal(model.storageUsage, storageUsage);
});

test("loadImageManagementPlaylistGovernanceModel refreshes governance without reading library or storage", async () => {
  let playlistReads = 0;

  const model = await loadImageManagementPlaylistGovernanceModel({
    readPlaylistGovernance: async () => {
      playlistReads += 1;
      return { playlist };
    }
  });

  assert.equal(playlistReads, 1);
  assert.equal(model.playlistEntries[0]?.entryId, "entry-7");
  assert.equal(model.lastSyncedPlaylistEntries, model.playlistEntries);
  assert.equal(model.playlistShuffle, true);
  assert.equal(model.playlistBulkDurationSeconds, 18);
  assert.equal(model.resolvedPlaylistEntries[0]?.isPlayable, true);
});

test("resolveImageManagementModel preserves a valid preferred asset and selected playlist entry", () => {
  const model = resolveImageManagementModel({
    assets: [asset],
    currentSelectedEntryId: "entry-7",
    playlist,
    preferredImageId: 7,
    storageUsage
  });

  assert.equal(model.selectedImageId, 7);
  assert.equal(model.selectedPlaylistEntryId, "entry-7");
});

test("resolveBulkPlaylistDurationInput returns blank when playlist durations differ", () => {
  const model = resolveImageManagementModel({
    assets: [asset],
    playlist,
    storageUsage
  });
  const [entry] = model.playlistEntries;
  assert.ok(entry);

  assert.equal(resolveBulkPlaylistDurationInput([
    { ...entry, durationSeconds: 10 },
    { ...entry, durationSeconds: 12, entryId: "entry-8" }
  ]), "");
});
