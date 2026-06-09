export type ImagePlaylistFallbackMode = "display-placeholder" | "skip" | "use-cover";
export type ImagePlaylistFallbackReason =
  | "asset-missing"
  | "asset-pending"
  | "aspect-ratio-mismatch";

export type ImagePlaylistEntryInput = {
  area?: string | null;
  assetId: string | null;
  capturedAt?: string | null;
  description?: string | null;
  displayOrder: number;
  durationSeconds: number;
  enabled: boolean;
  entryId: string;
  expectedAspectRatio?: number | null;
  fallbackMode: ImagePlaylistFallbackMode;
  resolution?: string | null;
  tags: string[];
  title?: string | null;
};

export type ImagePlaylistAssetInput = {
  assetId: string;
  height: number | null;
  source: string | null;
  status: "missing" | "pending" | "ready";
  width: number | null;
};

export type ResolvedImagePlaylistEntry = ImagePlaylistEntryInput & {
  assetSource: string | null;
  fallbackActive: boolean;
  fallbackReason: ImagePlaylistFallbackReason | null;
  hasAsset: boolean;
  infoPanel: {
    area: string;
    capturedAt: string;
    description: string;
    tags: string[];
    title: string;
  };
  isPlayable: boolean;
  resolution: string;
};

export function resolveImagesPlaylistTotalDurationSeconds(
  entries: Array<Pick<ResolvedImagePlaylistEntry, "durationSeconds" | "enabled" | "isPlayable">>
) {
  let totalDurationSeconds = 0;

  for (const entry of entries) {
    if (!entry.enabled || !entry.isPlayable) {
      continue;
    }

    totalDurationSeconds += Math.max(1, Math.floor(entry.durationSeconds));
  }

  return totalDurationSeconds;
}

function createSeededRandom(seed: string) {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function resolveImagesPlaybackOrder(
  entries: Array<Pick<ResolvedImagePlaylistEntry, "displayOrder" | "enabled" | "entryId" | "isPlayable">>,
  options: {
    seed: string;
    shuffle: boolean;
  }
) {
  const playableEntries = entries
    .filter((entry) => entry.enabled && entry.isPlayable)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.entryId.localeCompare(right.entryId));

  if (!options.shuffle) {
    return playableEntries.map((entry) => entry.entryId);
  }

  const shuffled = playableEntries.map((entry) => entry.entryId);
  const random = createSeededRandom(options.seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }

  return shuffled;
}

function resolveAspectRatio(asset: ImagePlaylistAssetInput) {
  if (!asset.width || !asset.height || asset.height === 0) {
    return null;
  }

  return asset.width / asset.height;
}

function buildInfoPanel(entry: ImagePlaylistEntryInput) {
  return {
    area: entry.area?.trim() ? entry.area : "未標註區域",
    capturedAt: entry.capturedAt?.trim() ? entry.capturedAt : "未提供拍攝日期",
    description: entry.description?.trim() ? entry.description : "尚未提供圖片說明",
    tags: entry.tags.filter((tag) => tag.trim().length > 0),
    title: entry.title?.trim() ? entry.title : "未命名影像"
  };
}

function resolveFallbackReason(entry: ImagePlaylistEntryInput, asset: ImagePlaylistAssetInput | null) {
  if (asset?.status === "pending") {
    return "asset-pending" satisfies ImagePlaylistFallbackReason;
  }

  if (!asset || asset.status === "missing" || asset.source === null) {
    return "asset-missing" satisfies ImagePlaylistFallbackReason;
  }

  if (entry.expectedAspectRatio && resolveAspectRatio(asset) !== null) {
    const delta = Math.abs(resolveAspectRatio(asset)! - entry.expectedAspectRatio);
    if (delta > 0.02) {
      return "aspect-ratio-mismatch" satisfies ImagePlaylistFallbackReason;
    }
  }

  return null;
}

function resolveAssetSource(args: {
  asset: ImagePlaylistAssetInput | null;
  coverAssetSource?: string | null;
  fallbackMode: ImagePlaylistFallbackMode;
  fallbackReason: ImagePlaylistFallbackReason | null;
}) {
  if (args.fallbackReason === null) {
    return args.asset?.source ?? null;
  }

  if (args.fallbackMode === "use-cover") {
    return args.coverAssetSource ?? null;
  }

  return null;
}

export function resolveImagePlaylistEntries(args: {
  assets: ImagePlaylistAssetInput[];
  coverAssetSource?: string | null;
  entries: ImagePlaylistEntryInput[];
  includeDisabled?: boolean;
}) {
  const assetMap = new Map(args.assets.map((asset) => [asset.assetId, asset]));

  return args.entries
    .filter((entry) => args.includeDisabled === true || entry.enabled)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.entryId.localeCompare(right.entryId))
    .map((entry) => {
      const asset = entry.assetId ? assetMap.get(entry.assetId) ?? null : null;
      const fallbackReason = resolveFallbackReason(entry, asset);
      const assetSource = resolveAssetSource({
        asset,
        coverAssetSource: args.coverAssetSource,
        fallbackMode: entry.fallbackMode,
        fallbackReason
      });

      return {
        ...entry,
        assetSource,
        fallbackActive: fallbackReason !== null,
        fallbackReason,
        hasAsset: fallbackReason === null && assetSource !== null,
        infoPanel: buildInfoPanel(entry),
        isPlayable: entry.enabled && (fallbackReason === null || entry.fallbackMode !== "skip"),
        resolution:
          asset?.width && asset.height
            ? `${asset.width}x${asset.height}`
            : entry.resolution?.trim() || "解析度未提供"
      } satisfies ResolvedImagePlaylistEntry;
    });
}

export function resolveActiveImagePlaylistEntry(
  entries: ResolvedImagePlaylistEntry[],
  activeIndex: number
) {
  if (entries.length === 0) {
    return null;
  }

  const safeIndex = Math.min(Math.max(activeIndex, 0), entries.length - 1);
  const candidate = entries[safeIndex]!;

  if (candidate.isPlayable) {
    return candidate;
  }

  for (let offset = 1; offset < entries.length; offset += 1) {
    const next = entries[(safeIndex + offset) % entries.length];
    if (next?.isPlayable) {
      return next;
    }
  }

  return candidate;
}
