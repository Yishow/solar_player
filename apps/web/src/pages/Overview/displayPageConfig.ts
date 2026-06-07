import type { DisplayPageMediaBinding } from "@solar-display/shared";
import type { DisplayEditorRegionSchema } from "../../../../../packages/shared/src/displayEditorSchema";
import {
  buildDisplayCardStyleFields,
  createDisplayCardStyleConfig,
  type DisplayCardStyleConfig
} from "../shared/displayCardStyleConfig";
import {
  buildGoldLineFields,
  buildHeroTypographyFields,
  buildLeafOrnamentFields,
  createGoldLineChromeConfig,
  createHeroTypographyConfig,
  createLeafOrnamentChromeConfig,
  type GoldLineChromeConfig,
  type HeroTypographyConfig,
  type LeafOrnamentChromeConfig
} from "../shared/displayPageChromeConfig";
import {
  buildDisplayPageIconSourceFields,
  createReferenceGlyphIconSource,
  type DisplayPageIconSource
} from "../shared/displayIconSourceConfig";
import {
  createSupportedDisplayPageMediaEffectSurface,
  overviewHeroDefaultMediaEffects
} from "../shared/displayPageMediaEffectConfig";
import { overviewHeroLayout, overviewKpiLayout } from "./layout";

const overviewMetricCardStyle = {
  cornerRadius: 22,
  footerPaddingTop: 10,
  headerGap: 12,
  iconBoxSize: 48,
  paddingBottom: 16,
  paddingLeft: 22,
  paddingRight: 22,
  paddingTop: 18,
  shadowStrength: 1.3,
  subtitleFontSize: 12,
  surfaceBlur: 16,
  surfaceOpacity: 0.66,
  titleFontSize: 17,
  unitFontSize: 17,
  unitPaddingBottom: 6,
  valueFontSize: 58,
  valueMarginTop: 12,
  valueRowAlign: "center"
} as const;

const legacyOverviewHeroCopyLayout = {
  left: 86,
  top: 172,
  width: 642
} as const;

const legacyOverviewHeroContainers = [
  {
    height: 700,
    left: 430,
    top: 146,
    width: 1490
  },
  {
    height: 820,
    left: 430,
    top: 140,
    width: 1490
  }
] as const;

const legacyOverviewKpiLayout = {
  co2Today: { height: 220, left: 1156, top: 760, width: 352 },
  co2Total: { height: 220, left: 1528, top: 760, width: 352 },
  power: { height: 220, left: 40, top: 760, width: 352 },
  today: { height: 220, left: 412, top: 760, width: 352 },
  total: { height: 220, left: 784, top: 760, width: 352 }
} as const;

const legacyOverviewCardStyleVariants = [
  {
    cornerRadius: 26,
    footerPaddingTop: 18,
    headerGap: 16,
    iconBoxSize: 58,
    paddingBottom: 18,
    paddingLeft: 22,
    paddingRight: 22,
    paddingTop: 20,
    subtitleFontSize: 14,
    titleFontSize: 20,
    unitFontSize: 16,
    unitPaddingBottom: 6,
    valueFontSize: 54,
    valueMarginTop: 28,
    valueRowAlign: "center"
  },
  {
    cornerRadius: 26,
    footerPaddingTop: 18,
    headerGap: 16,
    iconBoxSize: 58,
    paddingBottom: 18,
    paddingLeft: 22,
    paddingRight: 22,
    paddingTop: 20,
    subtitleFontSize: 14,
    titleFontSize: 20,
    unitFontSize: 18,
    unitPaddingBottom: 6,
    valueFontSize: 72,
    valueMarginTop: 28,
    valueRowAlign: "center"
  }
] as const;

const legacyOverviewHeroTypography = {
  eyebrowFontSize: 26,
  eyebrowLetterSpacing: 5,
  eyebrowMarginBottom: 20,
  subtitleFontSize: 26,
  subtitleLineHeight: 1.35,
  subtitleMarginTop: 30,
  titleEmphasisWeight: 900,
  titleFontSize: 84,
  titleLetterSpacing: 4,
  titleLineHeight: 1.15
} as const;

function matchesRecord(
  candidate: Record<string, unknown>,
  expected: Record<string, unknown>
) {
  return Object.entries(expected).every(([key, value]) => candidate[key] === value);
}

function matchesAnyRecord(
  candidate: Record<string, unknown>,
  expectedRecords: readonly Record<string, unknown>[]
) {
  return expectedRecords.some((expected) => matchesRecord(candidate, expected));
}

export type OverviewDisplayRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type OverviewDisplayTextRect = {
  left: number;
  top: number;
  width: number;
};

export type OverviewKpiCardConfig = OverviewDisplayRect & {
  visible: boolean;
};

export type OverviewDashboardWidgetKey =
  | "alertNotifications"
  | "generationTrend"
  | "phasePower"
  | "weather";

export type OverviewDashboardWidgetConfig = OverviewDisplayRect & {
  visible: boolean;
};

export function shouldRenderOverviewKpiCard(card: OverviewDisplayRect & { visible?: boolean }) {
  return card.visible !== false;
}

export function shouldRenderOverviewDashboardWidget(widget: OverviewDisplayRect & { visible?: boolean }) {
  return widget.visible === true;
}

export type OverviewDisplayPageConfig = {
  cardStyles: Record<
    "co2Today" | "co2Total" | "power" | "summary" | "today" | "total",
    DisplayCardStyleConfig
  >;
  chrome: {
    heroTypography: HeroTypographyConfig;
    ornaments: {
      goldLine: GoldLineChromeConfig;
      leaf: LeafOrnamentChromeConfig;
    };
  };
  backgroundPool: {
    sources: DisplayPageMediaBinding[];
  };
  heroContainer: OverviewDisplayRect;
  heroCopy: {
    eyebrow: string;
    subtitleLines: [string, string];
    titleLines: [string, string];
  };
  heroCopyLayout: OverviewDisplayTextRect;
  heroMedia: DisplayPageMediaBinding;
  dashboardWidgets: Record<OverviewDashboardWidgetKey, OverviewDashboardWidgetConfig>;
  iconSources: Record<
    "co2Today" | "co2Total" | "power" | "today" | "total",
    DisplayPageIconSource
  >;
  kpiCards: Record<"co2Today" | "co2Total" | "power" | "today" | "total", OverviewKpiCardConfig>;
  summaryCard: OverviewDisplayTextRect;
};

export function createOverviewDisplayPageSeedConfig(
  heroSrc = "/brand-logo.png",
  heroAlt = "國瑞汽車中廠綠能展示場域",
  backgroundSrcs: readonly string[] = []
): OverviewDisplayPageConfig {
  return {
    backgroundPool: {
      sources: backgroundSrcs.map((src, index) => ({
        alt: `Overview 背景候選 ${index + 1}`,
        fitMode: "cover",
        sourceMode: "seed-default",
        src
      }))
    },
    cardStyles: {
      co2Today: createDisplayCardStyleConfig(overviewMetricCardStyle),
      co2Total: createDisplayCardStyleConfig(overviewMetricCardStyle),
      power: createDisplayCardStyleConfig(overviewMetricCardStyle),
      summary: createDisplayCardStyleConfig({
        cornerRadius: 18,
        paddingBottom: 14,
        paddingLeft: 18,
        paddingRight: 18,
        paddingTop: 14,
        titleFontSize: 13
      }),
      today: createDisplayCardStyleConfig(overviewMetricCardStyle),
      total: createDisplayCardStyleConfig(overviewMetricCardStyle)
    },
    chrome: {
      heroTypography: createHeroTypographyConfig({
        eyebrowFontSize: 24,
        eyebrowLetterSpacing: 6,
        eyebrowMarginBottom: 22,
        subtitleFontSize: 24,
        subtitleLineHeight: 1.4,
        subtitleMarginTop: 28,
        titleEmphasisWeight: 900,
        titleFontSize: 92,
        titleLetterSpacing: 4
      }),
      ornaments: {
        goldLine: createGoldLineChromeConfig({
          opacity: 0.78
        }),
        leaf: createLeafOrnamentChromeConfig({
          opacity: 0.44,
          scale: 1.5
        })
      }
    },
    heroContainer: {
      ...overviewHeroLayout
    },
    heroCopy: {
      eyebrow: "綠能驅動・永續未來",
      subtitleLines: ["Driving a Better Future with", "Green Manufacturing"],
      titleLines: ["以綠色製造", "驅動美好生活"]
    },
    heroCopyLayout: {
      left: 86,
      top: 196,
      width: 620
    },
    heroMedia: {
      alignX: 1,
      alignY: 0,
      alt: heroAlt,
      effects: overviewHeroDefaultMediaEffects,
      fitMode: "contain",
      focusX: 1,
      focusY: 0,
      sourceMode: "seed-default",
      src: heroSrc
    },
    dashboardWidgets: {
      alertNotifications: {
        height: 196,
        left: 1435,
        top: 874,
        visible: true,
        width: 445
      },
      generationTrend: {
        height: 196,
        left: 970,
        top: 874,
        visible: true,
        width: 445
      },
      phasePower: {
        height: 196,
        left: 505,
        top: 874,
        visible: true,
        width: 445
      },
      weather: {
        height: 196,
        left: 40,
        top: 874,
        visible: true,
        width: 445
      }
    },
    iconSources: {
      co2Today: createReferenceGlyphIconSource("co2"),
      co2Total: createReferenceGlyphIconSource("leaf"),
      power: createReferenceGlyphIconSource("bolt"),
      today: createReferenceGlyphIconSource("sun"),
      total: createReferenceGlyphIconSource("bars")
    },
    kpiCards: {
      co2Today: { ...overviewKpiLayout.co2Today, visible: true },
      co2Total: { ...overviewKpiLayout.co2Total, visible: true },
      power: { ...overviewKpiLayout.power, visible: true },
      today: { ...overviewKpiLayout.today, visible: true },
      total: { ...overviewKpiLayout.total, visible: true }
    },
    summaryCard: {
      left: 88,
      top: 430,
      width: 520
    }
  };
}

export function resolveOverviewModernDefaultConfig(
  config: OverviewDisplayPageConfig,
  seedConfig: OverviewDisplayPageConfig
): OverviewDisplayPageConfig {
  const persistedDashboardWidgets = (
    (config as Partial<OverviewDisplayPageConfig>).dashboardWidgets ?? {}
  ) as Partial<Record<OverviewDashboardWidgetKey, Partial<OverviewDashboardWidgetConfig>>>;
  const dashboardWidgets = Object.fromEntries(
    Object.entries(seedConfig.dashboardWidgets).map(([key, seedWidget]) => {
      const value = persistedDashboardWidgets[key as OverviewDashboardWidgetKey] ?? seedWidget;
      return [
        key,
        {
          ...seedWidget,
          ...value,
          visible: value.visible === true
        }
      ];
    })
  ) as OverviewDisplayPageConfig["dashboardWidgets"];
  const kpiCards = Object.fromEntries(
    Object.entries(config.kpiCards).map(([key, value]) => [
      key,
      matchesRecord(value, legacyOverviewKpiLayout[key as keyof typeof legacyOverviewKpiLayout])
        ? { ...seedConfig.kpiCards[key as keyof OverviewDisplayPageConfig["kpiCards"]] }
        : { ...value, visible: value.visible !== false }
    ])
  ) as OverviewDisplayPageConfig["kpiCards"];
  const cardStyles = Object.fromEntries(
    Object.entries(config.cardStyles).map(([key, value]) => [
      key,
      key !== "summary" && matchesAnyRecord(value, legacyOverviewCardStyleVariants)
        ? { ...seedConfig.cardStyles[key as keyof OverviewDisplayPageConfig["cardStyles"]] }
        : value
    ])
  ) as OverviewDisplayPageConfig["cardStyles"];

  const persistedBackgroundPoolSources = (config as Partial<OverviewDisplayPageConfig>).backgroundPool?.sources;
  const backgroundPool = Array.isArray(persistedBackgroundPoolSources)
    ? { sources: persistedBackgroundPoolSources }
    : seedConfig.backgroundPool;

  return {
    ...config,
    backgroundPool,
    cardStyles,
    chrome: {
      ...config.chrome,
      heroTypography: matchesRecord(config.chrome.heroTypography, legacyOverviewHeroTypography)
        ? { ...seedConfig.chrome.heroTypography }
        : config.chrome.heroTypography
    },
    heroContainer: matchesAnyRecord(config.heroContainer, legacyOverviewHeroContainers)
      ? { ...seedConfig.heroContainer }
      : config.heroContainer,
    heroCopyLayout: matchesRecord(config.heroCopyLayout, legacyOverviewHeroCopyLayout)
      ? { ...seedConfig.heroCopyLayout }
      : config.heroCopyLayout,
    dashboardWidgets,
    kpiCards
  };
}

const overviewDashboardWidgetRegions = [
  {
    description: "調整天氣卡 widget geometry 與顯示狀態。",
    id: "overview-widget-weather",
    key: "weather",
    label: "Overview Widget Weather"
  },
  {
    description: "調整三相電力表 widget geometry 與顯示狀態。",
    id: "overview-widget-phasePower",
    key: "phasePower",
    label: "Overview Widget Phase Power"
  },
  {
    description: "調整發電趨勢 widget geometry 與顯示狀態。",
    id: "overview-widget-generationTrend",
    key: "generationTrend",
    label: "Overview Widget Generation Trend"
  },
  {
    description: "調整警示通知 widget geometry 與顯示狀態。",
    id: "overview-widget-alertNotifications",
    key: "alertNotifications",
    label: "Overview Widget Alert Notifications"
  }
] as const;

export const overviewDisplayPageEditorRegions: DisplayEditorRegionSchema[] = [
  {
    id: "overview-hero-copy",
    label: "Overview Hero Copy",
    description: "調整三段 slogan 與 title/subtitle copy，並可微調標題區塊位置。",
    geometry: {
      fallbackHeight: 244,
      leftPath: ["heroCopyLayout", "left"],
      minWidth: 200,
      resizeMode: "horizontal",
      topOffset: 146,
      topPath: ["heroCopyLayout", "top"],
      widthPath: ["heroCopyLayout", "width"]
    },
    fields: [
      ...buildHeroTypographyFields({
        idPrefix: "overview",
        path: ["chrome", "heroTypography"]
      }),
      { fieldType: "text", id: "eyebrow", label: "Eyebrow", path: ["heroCopy", "eyebrow"] },
      { fieldType: "text", id: "title-line-1", label: "Title Line 1", path: ["heroCopy", "titleLines", 0] },
      { fieldType: "text", id: "title-line-2", label: "Title Line 2", path: ["heroCopy", "titleLines", 1] },
      { fieldType: "text", id: "subtitle-line-1", label: "Subtitle Line 1", path: ["heroCopy", "subtitleLines", 0] },
      { fieldType: "text", id: "subtitle-line-2", label: "Subtitle Line 2", path: ["heroCopy", "subtitleLines", 1] },
      { constraints: { min: 0 }, fieldType: "number", id: "hero-copy-left", label: "Left", path: ["heroCopyLayout", "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: "hero-copy-top", label: "Top", path: ["heroCopyLayout", "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: "hero-copy-width", label: "Width", path: ["heroCopyLayout", "width"] }
    ],
    presetKey: "hero-copy"
  },
  {
    id: "overview-hero-media",
    label: "Overview Hero Media",
    description: "切換 hero image、alt 文案，以及 placement 與 effect controls。",
    geometry: {
      compatibilityKey: "hero-media-geometry",
      heightPath: ["heroContainer", "height"],
      leftPath: ["heroContainer", "left"],
      minHeight: 120,
      minWidth: 120,
      resizeMode: "both",
      topOffset: 146,
      topPath: ["heroContainer", "top"],
      widthPath: ["heroContainer", "width"]
    },
    fields: [
      {
        fieldType: "select",
        id: "hero-source-mode",
        label: "Source Mode",
        options: [
          { label: "Managed Asset", value: "managed-asset" },
          { label: "Direct Src", value: "direct-src" },
          { label: "Seed Default", value: "seed-default" }
        ],
        path: ["heroMedia", "sourceMode"]
      },
      {
        constraints: { required: true },
        fieldType: "asset",
        id: "hero-managed-asset",
        label: "Managed Asset Ref",
        path: ["heroMedia", "assetId"],
        placeholder: "image_assets.id",
        visibleWhen: {
          equals: "managed-asset",
          path: ["heroMedia", "sourceMode"]
        }
      },
      {
        constraints: { required: true },
        fieldType: "text",
        id: "hero-src",
        label: "Image Source",
        path: ["heroMedia", "src"],
        visibleWhen: {
          equals: "direct-src",
          path: ["heroMedia", "sourceMode"]
        }
      },
      { fieldType: "text", id: "hero-alt", label: "Image Alt", path: ["heroMedia", "alt"] },
      {
        fieldType: "select",
        id: "hero-fit-mode",
        label: "Fit Mode",
        options: [
          { label: "Contain", value: "contain" },
          { label: "Cover", value: "cover" }
        ],
        path: ["heroMedia", "fitMode"]
      },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "hero-focus-x", label: "Focus X", path: ["heroMedia", "focusX"], step: 0.05 },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "hero-focus-y", label: "Focus Y", path: ["heroMedia", "focusY"], step: 0.05 },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "hero-align-x", label: "Align X", path: ["heroMedia", "alignX"], step: 0.05 },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "hero-align-y", label: "Align Y", path: ["heroMedia", "alignY"], step: 0.05 }
    ],
    mediaEffectSurface: createSupportedDisplayPageMediaEffectSurface(["heroMedia"]),
    presetKey: "hero-media"
  },
  {
    id: "overview-summary",
    label: "Overview Summary",
    description: "調整摘要卡片位置與 card appearance。",
    geometry: {
      fallbackHeight: 140,
      leftPath: ["summaryCard", "left"],
      minWidth: 180,
      resizeMode: "horizontal",
      topOffset: 146,
      topPath: ["summaryCard", "top"],
      widthPath: ["summaryCard", "width"]
    },
    fields: [
      ...buildDisplayCardStyleFields({
        idPrefix: "overview-summary",
        path: ["cardStyles", "summary"]
      }),
      { constraints: { min: 0 }, fieldType: "number", id: "summary-left", label: "Left", path: ["summaryCard", "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: "summary-top", label: "Top", path: ["summaryCard", "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: "summary-width", label: "Width", path: ["summaryCard", "width"] }
    ],
    presetKey: "overview-summary"
  },
  {
    id: "overview-hero-container",
    label: "Overview Hero Container",
    description: "調整 hero 畫布容器幾何。",
    geometry: {
      compatibilityKey: "hero-container-geometry",
      heightPath: ["heroContainer", "height"],
      leftPath: ["heroContainer", "left"],
      minHeight: 120,
      minWidth: 120,
      resizeMode: "both",
      topOffset: 146,
      topPath: ["heroContainer", "top"],
      widthPath: ["heroContainer", "width"]
    },
    fields: [
      { constraints: { min: 0 }, fieldType: "number", id: "hero-left", label: "Left", path: ["heroContainer", "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: "hero-top", label: "Top", path: ["heroContainer", "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: "hero-width", label: "Width", path: ["heroContainer", "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: "hero-height", label: "Height", path: ["heroContainer", "height"] }
    ],
    presetKey: "hero-container"
  },
  {
    id: "overview-ornament-gold-line",
    label: "Overview Gold Line",
    description: "調整 hero gold line chrome appearance。",
    fields: buildGoldLineFields({
      idPrefix: "overview",
      path: ["chrome", "ornaments", "goldLine"]
    }),
    presetKey: "overview-gold-line"
  },
  {
    id: "overview-ornament-leaf",
    label: "Overview Leaf Ornament",
    description: "調整 leaf ornament chrome appearance。",
    fields: buildLeafOrnamentFields({
      idPrefix: "overview",
      path: ["chrome", "ornaments", "leaf"]
    }),
    presetKey: "overview-leaf"
  },
  {
    id: "overview-background-pool",
    label: "Overview Background Pool",
    description: "管理 Overview 滿版背景候選圖池，可新增/移除候選並指定來源；輪播進入時隨機選一張，池空時回退 hero。",
    fields: [
      {
        fieldType: "array",
        id: "background-pool-sources",
        itemFields: [
          {
            constraints: { required: true },
            fieldType: "asset",
            id: "src",
            label: "Image Source",
            path: ["src"],
            placeholder: "/uploads/images/overview-bg.png"
          },
          { fieldType: "text", id: "alt", label: "Image Alt", path: ["alt"] }
        ],
        itemLabel: "Background Candidate",
        label: "Background Candidates",
        path: ["backgroundPool", "sources"]
      }
    ],
    presetKey: "overview-background-pool"
  },
  ...overviewDashboardWidgetRegions.map<DisplayEditorRegionSchema>(({ description, id, key, label }) => ({
    id,
    label,
    description,
    geometry: {
      compatibilityKey: "overview-dashboard-widget-geometry",
      heightPath: ["dashboardWidgets", key, "height"],
      leftPath: ["dashboardWidgets", key, "left"],
      minHeight: 120,
      minWidth: 180,
      resizeMode: "proportional",
      topOffset: 146,
      topPath: ["dashboardWidgets", key, "top"],
      widthPath: ["dashboardWidgets", key, "width"]
    },
    fields: [
      { fieldType: "toggle", id: `${key}-visible`, label: "顯示", path: ["dashboardWidgets", key, "visible"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["dashboardWidgets", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["dashboardWidgets", key, "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-width`, label: "Width", path: ["dashboardWidgets", key, "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-height`, label: "Height", path: ["dashboardWidgets", key, "height"] }
    ],
    presetKey: "overview-dashboard-widget"
  })),
  ...Object.keys(createOverviewDisplayPageSeedConfig().kpiCards).map<DisplayEditorRegionSchema>((key) => ({
    id: `overview-kpi-${key}`,
    label: `Overview KPI ${key}`,
    description: "調整 KPI card geometry。",
    geometry: {
      compatibilityKey: "overview-kpi-geometry",
      heightPath: ["kpiCards", key, "height"],
      leftPath: ["kpiCards", key, "left"],
      minHeight: 80,
      minWidth: 80,
      resizeMode: "proportional",
      topOffset: 146,
      topPath: ["kpiCards", key, "top"],
      widthPath: ["kpiCards", key, "width"]
    },
    fields: [
      ...buildDisplayCardStyleFields({
        idPrefix: key,
        path: ["cardStyles", key]
      }),
      ...buildDisplayPageIconSourceFields({
        idPrefix: key,
        path: ["iconSources", key]
      }),
      { fieldType: "toggle", id: `${key}-visible`, label: "顯示", path: ["kpiCards", key, "visible"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["kpiCards", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["kpiCards", key, "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-width`, label: "Width", path: ["kpiCards", key, "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-height`, label: "Height", path: ["kpiCards", key, "height"] }
    ],
    presetKey: "overview-kpi"
  }))
];
