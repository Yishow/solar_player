import type {
  ImagePlaylistAssetInput,
  ImagePlaylistEntryInput
} from "@solar-display/shared";
import {
  resolveActiveImagePlaylistEntry,
  resolveImagePlaylistEntries
} from "@solar-display/shared";

type BuildImagesViewModelArgs = {
  activeIndex: number;
  assets: ImagePlaylistAssetInput[];
  coverAssetSource?: string | null;
  entries: ImagePlaylistEntryInput[];
};

function padCounter(value: number) {
  return value.toString().padStart(2, "0");
}

export function buildImagesViewModel({
  activeIndex,
  assets,
  coverAssetSource,
  entries
}: BuildImagesViewModelArgs) {
  const thumbnails = resolveImagePlaylistEntries({
    assets,
    coverAssetSource,
    entries
  });
  const active = resolveActiveImagePlaylistEntry(thumbnails, activeIndex);
  const activeIndexResolved =
    active === null ? 0 : thumbnails.findIndex((entry) => entry.entryId === active.entryId);

  return {
    active: active === null
      ? {
          assetSource: null,
          durationSeconds: 15,
          entryId: "IMG-00",
          fallbackMode: "display-placeholder" as const,
          fallbackReason: null,
          hasAsset: false,
          infoPanel: {
            area: "Playback Gallery",
            capturedAt: "尚未同步",
            description: "尚未提供圖片說明",
            tags: [],
            title: "等待圖片素材"
          },
          placeholderLabel: "目前沒有可播放圖片，保留版型等待素材同步",
          resolution: "1920x1080",
          title: "等待圖片素材"
        }
      : {
          ...active,
          durationSeconds: active.durationSeconds,
          entryId: active.entryId,
          placeholderLabel: active.fallbackReason === "asset-pending"
            ? "等待圖片素材，先顯示完整播放版型"
            : active.fallbackReason === "asset-missing"
              ? "圖片缺漏，維持播放版型並保留說明資訊"
              : "已同步可播放圖片",
          title: active.infoPanel.title
        },
    counter: {
      current: padCounter(activeIndexResolved + 1),
      total: padCounter(Math.max(thumbnails.length, 1))
    },
    hero: {
      copyLines: ["記錄國瑞汽車廠區內的綠能設施、", "綠色環境與永續實踐，見證我們", "每天為地球做出的努力。"],
      eyebrow: "綠能驅動・永續未來",
      subtitle: "Green Energy in Action",
      title: "綠能現場影像"
    },
    thumbnails: thumbnails.map((entry, index) => ({
      ...entry,
      isActive: entry.entryId === active?.entryId,
      orderLabel: padCounter(index + 1)
    }))
  };
}
