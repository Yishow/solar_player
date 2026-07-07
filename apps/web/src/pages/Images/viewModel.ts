import type {
  ImagePlaylistAssetInput,
  ImagePlaylistEntryInput,
  ResolvedImagePlaylistEntry
} from "@solar-display/shared";
import {
  resolveActiveImagePlaylistEntry,
  resolveImagePlaylistEntries
} from "@solar-display/shared";

type BuildImagesViewModelArgs = {
  activeEntry?: ResolvedImagePlaylistEntry | null;
  activeIndex: number;
  assets: ImagePlaylistAssetInput[];
  coverAssetSource?: string | null;
  entries: Array<ImagePlaylistEntryInput | ResolvedImagePlaylistEntry>;
};

type ResolveImagesActiveViewModelArgs = {
  activeEntry?: ResolvedImagePlaylistEntry | null;
  activeIndex: number;
  thumbnails: ImagesViewModelThumbnail[];
};

type ResolveVisibleImagesThumbnailsArgs = {
  activeEntryId?: string | null;
  activeIndex: number;
  thumbnails: ImagesViewModelThumbnail[];
  windowSize?: number;
};

export type ImagesViewModelThumbnail = ResolvedImagePlaylistEntry & {
  orderLabel: string;
};

function padCounter(value: number) {
  return value.toString().padStart(2, "0");
}

function isResolvedImagePlaylistEntry(
  entry: ImagePlaylistEntryInput | ResolvedImagePlaylistEntry
): entry is ResolvedImagePlaylistEntry {
  return "infoPanel" in entry && "isPlayable" in entry;
}

export function resolveImagesViewModelEntries({
  assets,
  coverAssetSource,
  entries
}: Omit<BuildImagesViewModelArgs, "activeEntry" | "activeIndex">): ImagesViewModelThumbnail[] {
  const thumbnails = entries.every(isResolvedImagePlaylistEntry)
    ? entries
        .filter((entry) => entry.enabled)
        .sort((left, right) => left.displayOrder - right.displayOrder || left.entryId.localeCompare(right.entryId))
    : resolveImagePlaylistEntries({
        assets,
        coverAssetSource,
        entries
      });

  return thumbnails.map((entry, index) => ({
    ...entry,
    orderLabel: padCounter(index + 1)
  }));
}

function buildImagesPlaceholderActive() {
  return {
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
  };
}

function resolveImagesActiveEntry(active: ResolvedImagePlaylistEntry | null) {
  if (active === null) {
    return buildImagesPlaceholderActive();
  }

  return {
    ...active,
    durationSeconds: active.durationSeconds,
    entryId: active.entryId,
    placeholderLabel: active.fallbackReason === "asset-pending"
      ? "等待圖片素材，先顯示完整播放版型"
      : active.fallbackReason === "asset-missing"
        ? "圖片缺漏，維持播放版型並保留說明資訊"
        : "已同步可播放圖片",
    title: active.infoPanel.title
  };
}

export function resolveImagesActiveViewModel({
  activeEntry,
  activeIndex,
  thumbnails
}: ResolveImagesActiveViewModelArgs) {
  const active = activeEntry ?? resolveActiveImagePlaylistEntry(thumbnails, activeIndex);
  const activeIndexResolved =
    active === null ? 0 : thumbnails.findIndex((entry) => entry.entryId === active.entryId);
  const safeActiveIndex = Math.max(activeIndexResolved, 0);

  return {
    activeIndex: safeActiveIndex,
    active: resolveImagesActiveEntry(active),
    counter: {
      current: padCounter(safeActiveIndex + 1),
      total: padCounter(Math.max(thumbnails.length, 1))
    }
  };
}

export function resolveVisibleImagesThumbnails({
  activeEntryId,
  activeIndex,
  thumbnails,
  windowSize = 4
}: ResolveVisibleImagesThumbnailsArgs) {
  const safeWindowSize = Math.max(1, Math.floor(windowSize));
  const visibleStart = Math.min(
    Math.floor(activeIndex / safeWindowSize) * safeWindowSize,
    Math.max(thumbnails.length - safeWindowSize, 0)
  );
  const resolvedActiveEntryId = activeEntryId ?? thumbnails[activeIndex]?.entryId ?? null;

  return {
    visibleStart,
    visibleThumbnails: thumbnails.slice(visibleStart, visibleStart + safeWindowSize).map((entry) => ({
      ...entry,
      isActive: entry.entryId === resolvedActiveEntryId
    }))
  };
}

export function buildImagesViewModel({
  activeEntry,
  activeIndex,
  assets,
  coverAssetSource,
  entries
}: BuildImagesViewModelArgs) {
  const thumbnails = resolveImagesViewModelEntries({
    assets,
    coverAssetSource,
    entries
  });
  const activeViewModel = resolveImagesActiveViewModel({
    activeEntry,
    activeIndex,
    thumbnails
  });

  return {
    ...activeViewModel,
    hero: {
      copyLines: ["記錄國瑞汽車廠區內的綠能設施、", "綠色環境與永續實踐，見證我們", "每天為地球做出的努力。"],
      eyebrow: "綠能驅動・永續未來",
      subtitle: "Green Energy in Action",
      title: "綠能現場影像"
    },
    thumbnails: thumbnails.map((entry) => ({
      ...entry,
      isActive: entry.entryId === activeViewModel.active.entryId
    }))
  };
}
