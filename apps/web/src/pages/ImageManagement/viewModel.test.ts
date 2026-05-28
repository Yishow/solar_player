import assert from "node:assert/strict";
import test from "node:test";
import type { ImageAsset } from "@solar-display/shared";
import {
  buildImageManagementDraftSaveTarget,
  buildImageManagementViewModel,
  hasSelectedImageManagementDraftChanges,
  normalizeManagementPlaylistAssetId,
  resolveImageManagementDraftSession,
  resolvePlaylistRuntimeInclusion
} from "./viewModel";

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

test("buildImageManagementViewModel keeps asset-library metadata separate when no playlist row exists yet", () => {
  const model = buildImageManagementViewModel({
    assets,
    errorMessage: "",
    isDeleting: false,
    isSaving: false,
    isUploading: false,
    message: "圖片庫已同步。",
    playlistEntries: [],
    selectedImageId: 3,
    storageUsage: {
      fileCount: 2,
      usedBytes: 2.5 * 1024 * 1024 * 1024,
      usedMB: 2560
    }
  });

  assert.deepEqual(model.library[0]?.badges, ["未配置 Playlist", "封面"]);
  assert.deepEqual(model.selection?.badges, ["未配置 Playlist", "封面"]);
  assert.equal(model.selection?.includedInSlideshow, null);
  assert.match(model.selection?.playlistRuntimeStatus ?? "", /未建立|未配置/);
  assert.equal(model.summary.slideshowCount, 0);
  assert.equal(resolvePlaylistRuntimeInclusion([], 3), null);
});

test("buildImageManagementViewModel matches playlist runtime fields by string asset id", () => {
  const model = buildImageManagementViewModel({
    assets,
    errorMessage: "",
    isDeleting: false,
    isSaving: false,
    isUploading: false,
    message: "圖片庫已同步。",
    playlistEntries: [
      {
        area: "首頁 Hero",
        assetId: 3,
        capturedAt: "2026/05/10 14:32",
        description: "首頁封面展示最新太陽能陣列成果。",
        displayOrder: 1,
        durationSeconds: 25,
        enabled: true,
        entryId: "IMG-01",
        fallbackMode: "use-cover",
        tags: ["封面", "太陽能"],
        title: "太陽能板鳥瞰"
      }
    ],
    selectedImageId: 3,
    storageUsage: {
      fileCount: 2,
      usedBytes: 2.5 * 1024 * 1024 * 1024,
      usedMB: 2560
    }
  });

  assert.deepEqual(model.library[0]?.badges, ["輪播中", "封面"]);
  assert.equal(model.selection?.playlistEntryId, "IMG-01");
  assert.equal(model.selection?.playlistDisplayOrder, 1);
  assert.equal(model.selection?.playlistDurationSeconds, 25);
  assert.equal(model.selection?.playlistFallbackMode, "use-cover");
  assert.equal(model.selection?.playlistArea, "首頁 Hero");
  assert.deepEqual(model.selection?.playlistTags, ["封面", "太陽能"]);
  assert.match(model.selection?.playlistRuntimeStatus ?? "", /正常播放|runtime/);
});

test("buildImageManagementViewModel edits the first ordered playlist row when one asset appears multiple times", () => {
  const model = buildImageManagementViewModel({
    assets,
    errorMessage: "",
    isDeleting: false,
    isSaving: false,
    isUploading: false,
    message: "圖片庫已同步。",
    playlistEntries: [
      {
        area: "備援輪播",
        assetId: 3,
        capturedAt: "",
        description: "",
        displayOrder: 2,
        durationSeconds: 12,
        enabled: true,
        entryId: "IMG-02",
        fallbackMode: "skip",
        tags: [],
        title: ""
      },
      {
        area: "首頁 Hero",
        assetId: 3,
        capturedAt: "2026/05/10 14:32",
        description: "首頁封面展示最新太陽能陣列成果。",
        displayOrder: 1,
        durationSeconds: 25,
        enabled: false,
        entryId: "IMG-01",
        fallbackMode: "use-cover",
        tags: ["封面", "太陽能"],
        title: "太陽能板鳥瞰"
      }
    ],
    selectedImageId: 3,
    storageUsage: {
      fileCount: 2,
      usedBytes: 2.5 * 1024 * 1024 * 1024,
      usedMB: 2560
    }
  });

  assert.equal(model.selection?.playlistEntryCount, 2);
  assert.equal(model.selection?.playlistEntryId, "IMG-01");
  assert.equal(model.selection?.playlistDisplayOrder, 1);
  assert.deepEqual(model.library[0]?.badges, ["輪播中", "封面"]);
  assert.deepEqual(model.selection?.badges, ["輪播中", "封面"]);
  assert.equal(model.selection?.includedInSlideshow, true);
  assert.equal(model.summary.slideshowCount, 1);
  assert.equal(model.selection?.playlistEnabled, false);
  assert.match(model.selection?.playlistRuntimeStatus ?? "", /停用|degraded/);
  assert.equal(resolvePlaylistRuntimeInclusion(model.selection ? [
    {
      area: "備援輪播",
      assetId: 3,
      capturedAt: "",
      description: "",
      displayOrder: 2,
      durationSeconds: 12,
      enabled: true,
      entryId: "IMG-02",
      fallbackMode: "skip",
      tags: [],
      title: ""
    },
    {
      area: "首頁 Hero",
      assetId: 3,
      capturedAt: "2026/05/10 14:32",
      description: "首頁封面展示最新太陽能陣列成果。",
      displayOrder: 1,
      durationSeconds: 25,
      enabled: false,
      entryId: "IMG-01",
      fallbackMode: "use-cover",
      tags: ["封面", "太陽能"],
      title: "太陽能板鳥瞰"
    }
  ] : undefined, 3), true);
});

test("buildImageManagementViewModel exposes one-to-many playlist governance and scopes fields to the selected row", () => {
  const model = buildImageManagementViewModel({
    assets,
    errorMessage: "",
    isDeleting: false,
    isSaving: false,
    isUploading: false,
    message: "圖片庫已同步。",
    playlistEntries: [
      {
        area: "備援輪播",
        assetId: 3,
        capturedAt: "",
        description: "",
        displayOrder: 2,
        durationSeconds: 12,
        enabled: true,
        entryId: "IMG-02",
        fallbackMode: "skip",
        tags: ["備援"],
        title: "備援圖"
      },
      {
        area: "首頁 Hero",
        assetId: 3,
        capturedAt: "2026/05/10 14:32",
        description: "首頁封面展示最新太陽能陣列成果。",
        displayOrder: 1,
        durationSeconds: 25,
        enabled: false,
        entryId: "IMG-01",
        fallbackMode: "use-cover",
        tags: ["封面", "太陽能"],
        title: "太陽能板鳥瞰"
      }
    ],
    selectedImageId: 3,
    selectedPlaylistEntryId: "IMG-02",
    storageUsage: {
      fileCount: 2,
      usedBytes: 2.5 * 1024 * 1024 * 1024,
      usedMB: 2560
    }
  });

  assert.equal(model.selection?.playlistEntryCount, 2);
  assert.equal(model.selection?.playlistEntryId, "IMG-02");
  assert.equal(model.selection?.playlistDisplayOrder, 2);
  assert.equal(model.selection?.playlistDurationSeconds, 12);
  assert.equal(model.selection?.playlistFallbackMode, "skip");
  assert.equal(model.selection?.playlistEnabled, true);
  assert.deepEqual(
    model.selection?.playlistEntryRows,
    [
      {
        area: "首頁 Hero",
        displayOrder: 1,
        durationSeconds: 25,
        entryId: "IMG-01",
        fallbackMode: "use-cover",
        isEnabled: false,
        isSelected: false,
        runtimeLabel: "停用",
        title: "太陽能板鳥瞰"
      },
      {
        area: "備援輪播",
        displayOrder: 2,
        durationSeconds: 12,
        entryId: "IMG-02",
        fallbackMode: "skip",
        isEnabled: true,
        isSelected: true,
        runtimeLabel: "啟用中",
        title: "備援圖"
      }
    ]
  );
});

test("buildImageManagementViewModel groups references and delete blockers into structured triage surfaces", () => {
  const model = buildImageManagementViewModel({
    assetReferences: {
      assetId: 3,
      blockingIssues: [
        {
          assetId: 3,
          code: "live-reference",
          message: "Solar live 頁面仍引用這張圖。",
          pageId: "solar",
          severity: "blocking"
        }
      ],
      draftCount: 1,
      liveCount: 2,
      references: [
        {
          bindingId: "live-solar",
          kind: "display-page",
          message: "Solar live hero 使用中。",
          pageId: "solar",
          stage: "live",
          targetLabel: "Solar Hero"
        },
        {
          bindingId: "draft-overview",
          kind: "page-object",
          message: "Overview draft banner 準備改用這張圖。",
          pageId: "overview",
          stage: "draft",
          targetLabel: "Overview Banner"
        },
        {
          bindingId: "playlist-01",
          kind: "slideshow",
          message: "圖片輪播第 1 筆仍啟用。",
          pageId: null,
          stage: "live",
          targetLabel: "Slideshow Runtime"
        }
      ]
    },
    assets,
    errorMessage: "",
    isDeleting: false,
    isSaving: false,
    isUploading: false,
    message: "圖片庫已同步。",
    playlistEntries: [],
    selectedImageId: 3,
    storageUsage: {
      fileCount: 2,
      usedBytes: 2.5 * 1024 * 1024 * 1024,
      usedMB: 2560
    }
  });

  assert.deepEqual(
    model.selection?.referenceTriageGroups,
    [
      {
        items: [
          {
            key: "live-solar",
            message: "Solar live hero 使用中。",
            targetLabel: "Solar Hero"
          }
        ],
        summary: "2 live references",
        title: "Live Runtime"
      },
      {
        items: [
          {
            key: "draft-overview",
            message: "Overview draft banner 準備改用這張圖。",
            targetLabel: "Overview Banner"
          }
        ],
        summary: "1 draft reference",
        title: "Draft Configuration"
      },
      {
        items: [
          {
            key: "playlist-01",
            message: "圖片輪播第 1 筆仍啟用。",
            targetLabel: "Slideshow Runtime"
          }
        ],
        summary: "1 slideshow binding",
        title: "Slideshow Governance"
      }
    ]
  );
  assert.deepEqual(model.selection?.deleteBlockers, [
    {
      message: "Solar live 頁面仍引用這張圖。",
      severity: "blocking"
    }
  ]);
});

test("resolveImageManagementDraftSession keeps one selected asset and playlist row authoritative", () => {
  const session = resolveImageManagementDraftSession({
    assets,
    playlistEntries: [
      {
        area: "備援輪播",
        assetId: 3,
        capturedAt: "",
        description: "",
        displayOrder: 2,
        durationSeconds: 12,
        enabled: true,
        entryId: "IMG-02",
        fallbackMode: "skip",
        tags: [],
        title: ""
      },
      {
        area: "首頁 Hero",
        assetId: 3,
        capturedAt: "2026/05/10 14:32",
        description: "首頁封面展示最新太陽能陣列成果。",
        displayOrder: 1,
        durationSeconds: 25,
        enabled: false,
        entryId: "IMG-01",
        fallbackMode: "use-cover",
        tags: ["封面", "太陽能"],
        title: "太陽能板鳥瞰"
      }
    ],
    selectedImageId: 3
  });

  assert.deepEqual(session, {
    assetId: 3,
    playlistEntryId: "IMG-01"
  });
});

test("hasSelectedImageManagementDraftChanges stays scoped to the current selected session", () => {
  const changedAssets = assets.map((asset) =>
    asset.id === 7 ? { ...asset, title: "綠色校園 2" } : asset
  );
  const changedPlaylistEntries = [
    {
      area: "首頁 Hero",
      assetId: 3,
      capturedAt: "2026/05/10 14:32",
      description: "首頁封面展示最新太陽能陣列成果。",
      displayOrder: 1,
      durationSeconds: 25,
      enabled: true,
      entryId: "IMG-01",
      fallbackMode: "use-cover" as const,
      tags: ["封面", "太陽能"],
      title: "太陽能板鳥瞰"
    },
    {
      area: "校園入口",
      assetId: 7,
      capturedAt: "",
      description: "",
      displayOrder: 2,
      durationSeconds: 30,
      enabled: true,
      entryId: "IMG-07",
      fallbackMode: "skip" as const,
      tags: [],
      title: ""
    }
  ];
  const syncedPlaylistEntries = changedPlaylistEntries.map((entry) =>
    entry.entryId === "IMG-07" ? { ...entry, durationSeconds: 18 } : entry
  );

  assert.equal(
    hasSelectedImageManagementDraftChanges({
      assets: changedAssets,
      lastSyncedAssets: assets,
      lastSyncedPlaylistEntries: syncedPlaylistEntries,
      playlistEntries: changedPlaylistEntries,
      selectedImageId: 3
    }),
    false
  );

  assert.equal(
    hasSelectedImageManagementDraftChanges({
      assets: changedAssets,
      lastSyncedAssets: assets,
      lastSyncedPlaylistEntries: syncedPlaylistEntries,
      playlistEntries: changedPlaylistEntries,
      selectedImageId: 7
    }),
    true
  );
});

test("buildImageManagementDraftSaveTarget saves the authoritative selected asset session only", () => {
  const target = buildImageManagementDraftSaveTarget({
    assets,
    playlistEntries: [
      {
        area: "備援輪播",
        assetId: 3,
        capturedAt: "",
        description: "",
        displayOrder: 2,
        durationSeconds: 12,
        enabled: true,
        entryId: "IMG-02",
        fallbackMode: "skip",
        tags: [],
        title: ""
      },
      {
        area: "首頁 Hero",
        assetId: 3,
        capturedAt: "2026/05/10 14:32",
        description: "首頁封面展示最新太陽能陣列成果。",
        displayOrder: 1,
        durationSeconds: 25,
        enabled: false,
        entryId: "IMG-01",
        fallbackMode: "use-cover",
        tags: ["封面", "太陽能"],
        title: "太陽能板鳥瞰"
      }
    ],
    selectedImageId: 3
  });

  assert.deepEqual(target, {
    asset: {
      aspectRatio: 16 / 9,
      description: "工廠太陽能板與綠能設施",
      id: 3,
      title: "綠色工廠"
    },
    playlistEntry: {
      area: "首頁 Hero",
      assetId: 3,
      capturedAt: "2026/05/10 14:32",
      description: "首頁封面展示最新太陽能陣列成果。",
      displayOrder: 1,
      durationSeconds: 25,
      enabled: false,
      entryId: "IMG-01",
      fallbackMode: "use-cover",
      tags: ["封面", "太陽能"],
      title: "太陽能板鳥瞰"
    }
  });
});

test("normalizeManagementPlaylistAssetId accepts only fully numeric shared asset ids", () => {
  assert.equal(normalizeManagementPlaylistAssetId("3", "IMG-01"), 3);
  assert.equal(normalizeManagementPlaylistAssetId(null, "IMG-02"), null);
  assert.throws(
    () => normalizeManagementPlaylistAssetId("12abc", "IMG-03"),
    /IMG-03/
  );
});
