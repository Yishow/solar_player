import type { ManagedAssetCategory, ManagedAssetUsageScope } from "@solar-display/shared";

export type DisplaySeedAssetManifestEntry = {
  category: ManagedAssetCategory;
  description?: string;
  key: string;
  mimeType?: string;
  sourcePath: string;
  targetFilename: string;
  title: string;
  usageScope: ManagedAssetUsageScope;
};

export const displaySeedAssetManifest: DisplaySeedAssetManifestEntry[] = [
  {
    category: "background",
    description: "Overview 頁目前使用的 hero 背景。",
    key: "overview.hero",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/clean/factory-bg.png",
    targetFilename: "display-seed-overview-hero.png",
    title: "Overview Hero Seed",
    usageScope: "page-only"
  },
  {
    category: "background",
    description: "Solar 頁目前使用的主視覺車棚圖。",
    key: "solar.hero",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/solar-carport-hero.png",
    targetFilename: "display-seed-solar-hero.png",
    title: "Solar Hero Seed",
    usageScope: "page-only"
  },
  {
    category: "icon",
    description: "Solar flow node 目前使用的太陽能板圖示。",
    key: "solar.flow.solar-panel",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/solar-panel-display-source.png",
    targetFilename: "display-seed-solar-flow-solar-panel.png",
    title: "Solar Panel Flow Seed",
    usageScope: "page-only"
  },
  {
    category: "icon",
    description: "Solar flow node 目前使用的 inverter 圖示。",
    key: "solar.flow.inverter",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/inverter-display-source.png",
    targetFilename: "display-seed-solar-flow-inverter.png",
    title: "Inverter Flow Seed",
    usageScope: "page-only"
  },
  {
    category: "icon",
    description: "Solar KPI 目前使用的發電量圖示。",
    key: "solar.kpi.generation",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/metric-generation-sun-source.png",
    targetFilename: "display-seed-solar-kpi-generation.png",
    title: "Solar Generation KPI Seed",
    usageScope: "page-only"
  },
  {
    category: "icon",
    description: "Solar KPI 目前使用的自用率圖示。",
    key: "solar.kpi.self-consumption",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/metric-self-consumption-source.png",
    targetFilename: "display-seed-solar-kpi-self-consumption.png",
    title: "Self Consumption KPI Seed",
    usageScope: "page-only"
  },
  {
    category: "background",
    description: "Images 頁目前使用的主舞台圖。",
    key: "images.main-stage",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/images-main-ref.jpg",
    targetFilename: "display-seed-images-main-stage.jpg",
    title: "Images Main Stage Seed",
    usageScope: "page-only"
  },
  {
    category: "object",
    description: "Images 頁目前使用的 factory solar thumbnail。",
    key: "images.thumbnail.factory-solar",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/thumb-factory-solar.jpg",
    targetFilename: "display-seed-images-thumb-factory-solar.jpg",
    title: "Factory Solar Thumbnail Seed",
    usageScope: "page-only"
  },
  {
    category: "object",
    description: "Images 頁目前使用的 green trees thumbnail。",
    key: "images.thumbnail.green-trees",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/thumb-green-trees.jpg",
    targetFilename: "display-seed-images-thumb-green-trees.jpg",
    title: "Green Trees Thumbnail Seed",
    usageScope: "page-only"
  },
  {
    category: "object",
    description: "Images 頁目前使用的 solar aerial thumbnail。",
    key: "images.thumbnail.solar-aerial",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/thumb-solar-aerial.jpg",
    targetFilename: "display-seed-images-thumb-solar-aerial.jpg",
    title: "Solar Aerial Thumbnail Seed",
    usageScope: "page-only"
  },
  {
    category: "object",
    description: "Images 頁目前使用的 showroom thumbnail。",
    key: "images.thumbnail.showroom",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/thumb-showroom.jpg",
    targetFilename: "display-seed-images-thumb-showroom.jpg",
    title: "Showroom Thumbnail Seed",
    usageScope: "page-only"
  },
  {
    category: "background",
    description: "Sustainability 頁目前使用的 hero 背景。",
    key: "sustainability.hero",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/sustain-hero-ref.jpg",
    targetFilename: "display-seed-sustainability-hero.jpg",
    title: "Sustainability Hero Seed",
    usageScope: "page-only"
  },
  {
    category: "object",
    description: "播放設定目前使用的 Overview preview thumbnail。",
    key: "slideshow.preview.overview",
    sourcePath: "apps/web/src/assets/playback/slide-overview.jpg",
    targetFilename: "display-seed-slideshow-overview.jpg",
    title: "Overview Slideshow Preview Seed",
    usageScope: "both"
  },
  {
    category: "object",
    description: "播放設定目前使用的 Solar preview thumbnail。",
    key: "slideshow.preview.solar",
    sourcePath: "apps/web/src/assets/playback/slide-solar.jpg",
    targetFilename: "display-seed-slideshow-solar.jpg",
    title: "Solar Slideshow Preview Seed",
    usageScope: "both"
  },
  {
    category: "icon",
    description: "Shared shell/page ornament fallback logo。",
    key: "ornament.logo-k-green",
    sourcePath: "docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/logo-k-green.png",
    targetFilename: "display-seed-ornament-logo-k-green.png",
    title: "K Green Ornament Seed",
    usageScope: "shell-only"
  }
];
