import type { ResolvedImagePlaylistEntry } from "@solar-display/shared";

const imagesHeroReference = new URL("./assets/images-hero-reference.png", import.meta.url).href;
const imagesThumb1Reference = new URL("./assets/images-thumb-1-reference.png", import.meta.url).href;
const imagesThumb2Reference = new URL("./assets/images-thumb-2-reference.png", import.meta.url).href;
const imagesThumb3Reference = new URL("./assets/images-thumb-3-reference.png", import.meta.url).href;
const imagesThumb4Reference = new URL("./assets/images-thumb-4-reference.png", import.meta.url).href;
const imagesLeftOrnamentReference = new URL("./assets/images-left-ornament-reference.png", import.meta.url).href;

export const imagesAssetRuntimeMap = {
  leftOrnament: imagesLeftOrnamentReference,
  main: imagesHeroReference,
  thumbs: [imagesThumb1Reference, imagesThumb2Reference, imagesThumb3Reference, imagesThumb4Reference]
} as const;

function createImagesReferencePlaylistEntry(
  index: number,
  overrides: Pick<ResolvedImagePlaylistEntry, "assetSource" | "infoPanel" | "title">
): ResolvedImagePlaylistEntry {
  return {
    area: overrides.infoPanel.area,
    assetId: `images-reference-${index}`,
    assetSource: overrides.assetSource,
    capturedAt: overrides.infoPanel.capturedAt,
    description: overrides.infoPanel.description,
    displayOrder: index,
    durationSeconds: 15,
    enabled: true,
    entryId: `IMG-${String(index).padStart(2, "0")}`,
    fallbackActive: false,
    fallbackMode: "display-placeholder",
    fallbackReason: null,
    hasAsset: true,
    infoPanel: overrides.infoPanel,
    isPlayable: true,
    resolution: index === 3 ? "1292x622" : "256x118",
    tags: overrides.infoPanel.tags,
    title: overrides.title
  };
}

export const imagesReferencePlaylistEntries: ResolvedImagePlaylistEntry[] = [
  createImagesReferencePlaylistEntry(1, {
    assetSource: imagesThumb1Reference,
    infoPanel: {
      area: "國瑞中壢廠區",
      capturedAt: "2025/05/26",
      description: "廠區建築與植栽保留完整綠色動線，作為展示頁的現場影像素材。",
      tags: ["廠區", "綠化"],
      title: "廠區綠能入口"
    },
    title: "廠區綠能入口"
  }),
  createImagesReferencePlaylistEntry(2, {
    assetSource: imagesThumb2Reference,
    infoPanel: {
      area: "國瑞中壢廠區",
      capturedAt: "2025/05/26",
      description: "產線與節能設備共同構成綠色製造流程，呈現廠區日常運作。",
      tags: ["產線", "節能"],
      title: "綠色製造產線"
    },
    title: "綠色製造產線"
  }),
  createImagesReferencePlaylistEntry(3, {
    assetSource: imagesHeroReference,
    infoPanel: {
      area: "國瑞中壢廠區",
      capturedAt: "2025/05/26",
      description: "廠區屋頂與停車棚設置太陽能光電板，透過綠電發電供應廠區用電，減少碳排放，實踐綠色製造。",
      tags: ["太陽能", "光電"],
      title: "太陽能光電系統"
    },
    title: "太陽能光電系統"
  }),
  createImagesReferencePlaylistEntry(4, {
    assetSource: imagesThumb4Reference,
    infoPanel: {
      area: "國瑞中壢廠區",
      capturedAt: "2025/05/26",
      description: "廠區水岸與植栽影像呈現環境保育與工作場域的平衡。",
      tags: ["景觀", "永續"],
      title: "廠區生態景觀"
    },
    title: "廠區生態景觀"
  }),
  createImagesReferencePlaylistEntry(5, {
    assetSource: imagesThumb1Reference,
    infoPanel: {
      area: "國瑞中壢廠區",
      capturedAt: "2025/05/26",
      description: "展示廠區綠地與建築立面，延續綠能現場影像的展示節奏。",
      tags: ["廠區", "展示"],
      title: "廠區綠地巡禮"
    },
    title: "廠區綠地巡禮"
  }),
  createImagesReferencePlaylistEntry(6, {
    assetSource: imagesThumb2Reference,
    infoPanel: {
      area: "國瑞中壢廠區",
      capturedAt: "2025/05/26",
      description: "以產線視角模擬現場影像輪播，補足尚未接入實拍圖庫前的展示內容。",
      tags: ["模擬", "產線"],
      title: "產線節能巡檢"
    },
    title: "產線節能巡檢"
  }),
  createImagesReferencePlaylistEntry(7, {
    assetSource: imagesHeroReference,
    infoPanel: {
      area: "國瑞中壢廠區",
      capturedAt: "2025/05/26",
      description: "以太陽能板與廠區主建築作為主視覺，維持展示播放的現場感。",
      tags: ["太陽能", "主視覺"],
      title: "綠電供應現場"
    },
    title: "綠電供應現場"
  }),
  createImagesReferencePlaylistEntry(8, {
    assetSource: imagesThumb4Reference,
    infoPanel: {
      area: "國瑞中壢廠區",
      capturedAt: "2025/05/26",
      description: "保留園區自然景觀作為收尾影像，讓輪播回到永續主題。",
      tags: ["自然", "永續"],
      title: "永續園區景觀"
    },
    title: "永續園區景觀"
  })
];
