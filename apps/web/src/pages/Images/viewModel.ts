import type { ImageMock } from "../../mocks/images";

type BuildImagesViewModelArgs = {
  activeIndex: number;
  assetSources: Array<string | null>;
  slides: ImageMock[];
};

function padCounter(value: number) {
  return value.toString().padStart(2, "0");
}

export function buildImagesViewModel({
  activeIndex,
  assetSources,
  slides
}: BuildImagesViewModelArgs) {
  const safeIndex = slides.length === 0 ? 0 : Math.min(Math.max(activeIndex, 0), slides.length - 1);
  const activeSlide = slides[safeIndex] ?? null;
  const activeAsset = assetSources[safeIndex] ?? null;

  return {
    active:
      activeSlide === null
        ? {
            area: "Playback Gallery",
            assetSource: null,
            durationSec: 15,
            hasAsset: false,
            id: "IMG-00",
            placeholderLabel: "目前沒有可播放圖片，保留版型等待素材同步",
            resolution: "1920x1080",
            title: "等待圖片素材",
            updatedAt: "尚未同步"
          }
        : {
            ...activeSlide,
            assetSource: activeAsset,
            hasAsset: activeAsset !== null,
            placeholderLabel:
              activeAsset === null ? "等待圖片素材，先顯示完整播放版型" : "已同步可播放圖片"
          },
    counter: {
      current: padCounter(safeIndex + 1),
      total: padCounter(Math.max(slides.length, 1))
    },
    hero: {
      copyLines: ["記錄國瑞汽車廠區內的綠能設施、", "綠色環境與永續實踐，見證我們", "每天為地球做出的努力。"],
      eyebrow: "綠能驅動・永續未來",
      subtitle: "Green Energy in Action",
      title: "綠能現場影像"
    },
    thumbnails: slides.map((slide, index) => ({
      ...slide,
      assetSource: assetSources[index] ?? null,
      hasAsset: assetSources[index] !== null,
      isActive: index === safeIndex,
      orderLabel: padCounter(index + 1)
    }))
  };
}
