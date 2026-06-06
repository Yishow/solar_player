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
  createAssetImageIconSource,
  type DisplayPageIconSource
} from "../shared/displayIconSourceConfig";
import {
  buildFlowConnectorTreatmentFields,
  buildFlowNodeTreatmentFields,
  createFlowConnectorTreatmentConfig,
  createFlowNodeTreatmentConfig,
  type FlowConnectorTreatmentConfig,
  type FlowNodeTreatmentConfig
} from "../shared/displayPageFlowTreatmentConfig";
import {
  createSupportedDisplayPageMediaEffectSurface,
  solarHeroDefaultMediaEffects
} from "../shared/displayPageMediaEffectConfig";
import {
  solarConnectorLayout,
  solarFlowNodeLayout,
  solarHeroLayout,
  solarKpiLayout
} from "./layout";

export type SolarDisplayRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type SolarConnectorKey = "inverterToCo2" | "inverterToFactory" | "solarToInverter";
export type SolarFlowNodeKey = "co2" | "factory" | "inverter" | "solar";

export type SolarDisplayPageConfig = {
  cardStyles: Record<
    "co2" | "efficiency" | "generation" | "selfConsumption" | "totalCo2",
    DisplayCardStyleConfig
  >;
  chrome: {
    heroTypography: HeroTypographyConfig;
    ornaments: {
      goldLine: GoldLineChromeConfig;
      leaf: LeafOrnamentChromeConfig;
    };
  };
  connectorTreatments: Record<SolarConnectorKey, FlowConnectorTreatmentConfig>;
  connectors: Record<SolarConnectorKey, SolarDisplayRect>;
  flowNodeTreatments: Record<SolarFlowNodeKey, FlowNodeTreatmentConfig>;
  flowNodes: Record<SolarFlowNodeKey, SolarDisplayRect>;
  heroContainer: SolarDisplayRect;
  heroCopy: {
    eyebrow: string;
    subtitleLines: [string, string];
    titleLines: [string, string];
  };
  heroMedia: DisplayPageMediaBinding;
  iconSources: {
    flowNodes: Record<SolarFlowNodeKey, DisplayPageIconSource>;
    kpiCards: Record<
      "co2" | "efficiency" | "generation" | "selfConsumption" | "totalCo2",
      DisplayPageIconSource
    >;
  };
  kpiCards: Record<"co2" | "efficiency" | "generation" | "selfConsumption" | "totalCo2", SolarDisplayRect>;
};

export type SolarIconAssetSources = {
  flowNodes: Record<"co2" | "factory" | "inverter" | "solar", string>;
  kpiCards: Record<"co2" | "efficiency" | "generation" | "selfConsumption" | "totalCo2", string>;
};

const defaultSolarIconAssetSources: SolarIconAssetSources = {
  flowNodes: {
    co2: "/display-assets/solar/carbon-reduction-display-source.png",
    factory: "/display-assets/solar/factory-consumption-display-source.png",
    inverter: "/display-assets/solar/inverter-display-source.png",
    solar: "/display-assets/solar/solar-panel-display-source.png"
  },
  kpiCards: {
    co2: "/display-assets/solar/metric-co2-today-source.png",
    efficiency: "/display-assets/solar/metric-efficiency-source.png",
    generation: "/display-assets/solar/metric-generation-sun-source.png",
    selfConsumption: "/display-assets/solar/metric-self-consumption-source.png",
    totalCo2: "/display-assets/solar/metric-co2-total-source.png"
  }
};

export function createSolarDisplayPageSeedConfig(
  heroSrc = "/brand-logo.png",
  heroAlt = "太陽能車棚與綠能展示場域",
  iconAssetSources: SolarIconAssetSources = defaultSolarIconAssetSources
): SolarDisplayPageConfig {
  return {
    cardStyles: {
      co2: createDisplayCardStyleConfig({ valueRowAlign: "center" }),
      efficiency: createDisplayCardStyleConfig({ valueRowAlign: "center" }),
      generation: createDisplayCardStyleConfig({ valueRowAlign: "center" }),
      selfConsumption: createDisplayCardStyleConfig({ valueRowAlign: "center" }),
      totalCo2: createDisplayCardStyleConfig({ valueRowAlign: "center" })
    },
    chrome: {
      heroTypography: createHeroTypographyConfig({
        subtitleFontSize: 22
      }),
      ornaments: {
        goldLine: createGoldLineChromeConfig({
          opacity: 0.8
        }),
        leaf: createLeafOrnamentChromeConfig({
          opacity: 0.36
        })
      }
    },
    connectorTreatments: {
      inverterToCo2: createFlowConnectorTreatmentConfig({ strokeWidth: 4 }),
      inverterToFactory: createFlowConnectorTreatmentConfig({ strokeWidth: 6 }),
      solarToInverter: createFlowConnectorTreatmentConfig({ strokeWidth: 6 })
    },
    connectors: {
      inverterToCo2: { ...solarConnectorLayout.inverterToCo2 },
      inverterToFactory: { ...solarConnectorLayout.inverterToFactory },
      solarToInverter: { ...solarConnectorLayout.solarToInverter }
    },
    flowNodeTreatments: {
      co2: createFlowNodeTreatmentConfig(),
      factory: createFlowNodeTreatmentConfig(),
      inverter: createFlowNodeTreatmentConfig(),
      solar: createFlowNodeTreatmentConfig()
    },
    flowNodes: {
      co2: { ...solarFlowNodeLayout.co2 },
      factory: { ...solarFlowNodeLayout.factory },
      inverter: { ...solarFlowNodeLayout.inverter },
      solar: { ...solarFlowNodeLayout.solar }
    },
    heroContainer: {
      ...solarHeroLayout
    },
    heroCopy: {
      eyebrow: "綠能驅動・永續未來",
      subtitleLines: ["乾淨的太陽能，為工廠注入綠色動能", "Clean solar energy powers our factory"],
      titleLines: ["太陽能驅動", "製造新能量"]
    },
    heroMedia: {
      alignX: 0.5,
      alignY: 0.52,
      alt: heroAlt,
      fitMode: "cover",
      focusX: 0.5,
      focusY: 0.52,
      sourceMode: "seed-default",
      src: heroSrc,
      effects: solarHeroDefaultMediaEffects
    },
    iconSources: {
      flowNodes: {
        co2: createAssetImageIconSource(iconAssetSources.flowNodes.co2, "減碳效益"),
        factory: createAssetImageIconSource(iconAssetSources.flowNodes.factory, "工廠用電"),
        inverter: createAssetImageIconSource(iconAssetSources.flowNodes.inverter, "變流器"),
        solar: createAssetImageIconSource(iconAssetSources.flowNodes.solar, "太陽能板")
      },
      kpiCards: {
        co2: createAssetImageIconSource(iconAssetSources.kpiCards.co2, "今日減碳量"),
        efficiency: createAssetImageIconSource(iconAssetSources.kpiCards.efficiency, "系統效率"),
        generation: createAssetImageIconSource(iconAssetSources.kpiCards.generation, "今日發電量"),
        selfConsumption: createAssetImageIconSource(iconAssetSources.kpiCards.selfConsumption, "自發自用比例"),
        totalCo2: createAssetImageIconSource(iconAssetSources.kpiCards.totalCo2, "累積減碳量")
      }
    },
    kpiCards: {
      co2: { ...solarKpiLayout.co2 },
      efficiency: { ...solarKpiLayout.efficiency },
      generation: { ...solarKpiLayout.generation },
      selfConsumption: { ...solarKpiLayout.selfConsumption },
      totalCo2: { ...solarKpiLayout.totalCo2 }
    }
  };
}

export const solarDisplayPageEditorRegions: DisplayEditorRegionSchema[] = [
  {
    id: "solar-hero-copy",
    label: "Solar Hero Copy",
    description: "調整 Solar 標題、eyebrow 與雙語 subtitle。",
    geometry: {
      fallbackHeight: 220,
      leftPath: ["heroContainer", "left"],
      minWidth: 180,
      resizeMode: "horizontal",
      topOffset: 146,
      topPath: ["heroContainer", "top"],
      widthPath: ["heroContainer", "width"]
    },
    fields: [
      ...buildHeroTypographyFields({
        idPrefix: "solar",
        path: ["chrome", "heroTypography"]
      }),
      { fieldType: "text", id: "solar-eyebrow", label: "Eyebrow", path: ["heroCopy", "eyebrow"] },
      { fieldType: "text", id: "solar-title-line-1", label: "Title Line 1", path: ["heroCopy", "titleLines", 0] },
      { fieldType: "text", id: "solar-title-line-2", label: "Title Line 2", path: ["heroCopy", "titleLines", 1] },
      { fieldType: "text", id: "solar-subtitle-line-1", label: "Subtitle Line 1", path: ["heroCopy", "subtitleLines", 0] },
      { fieldType: "text", id: "solar-subtitle-line-2", label: "Subtitle Line 2", path: ["heroCopy", "subtitleLines", 1] }
    ],
    presetKey: "hero-copy"
  },
  {
    id: "solar-hero-media",
    label: "Solar Hero Media",
    description: "切換 Solar hero image、容器與 placement controls。",
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
        id: "solar-hero-source-mode",
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
        id: "solar-hero-asset-id",
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
        id: "solar-hero-src",
        label: "Image Source",
        path: ["heroMedia", "src"],
        visibleWhen: {
          equals: "direct-src",
          path: ["heroMedia", "sourceMode"]
        }
      },
      { fieldType: "text", id: "solar-hero-alt", label: "Image Alt", path: ["heroMedia", "alt"] },
      {
        fieldType: "select",
        id: "solar-hero-fit-mode",
        label: "Fit Mode",
        options: [
          { label: "Contain", value: "contain" },
          { label: "Cover", value: "cover" }
        ],
        path: ["heroMedia", "fitMode"]
      },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "solar-hero-focus-x", label: "Focus X", path: ["heroMedia", "focusX"], step: 0.05 },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "solar-hero-focus-y", label: "Focus Y", path: ["heroMedia", "focusY"], step: 0.05 },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "solar-hero-align-x", label: "Align X", path: ["heroMedia", "alignX"], step: 0.05 },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "solar-hero-align-y", label: "Align Y", path: ["heroMedia", "alignY"], step: 0.05 },
      { constraints: { min: 0 }, fieldType: "number", id: "solar-hero-left", label: "Left", path: ["heroContainer", "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: "solar-hero-top", label: "Top", path: ["heroContainer", "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: "solar-hero-width", label: "Width", path: ["heroContainer", "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: "solar-hero-height", label: "Height", path: ["heroContainer", "height"] }
    ],
    mediaEffectSurface: createSupportedDisplayPageMediaEffectSurface(["heroMedia"]),
    presetKey: "hero-media"
  },
  {
    id: "solar-ornament-gold-line",
    label: "Solar Gold Line",
    description: "調整 gold line chrome appearance。",
    fields: buildGoldLineFields({
      idPrefix: "solar",
      path: ["chrome", "ornaments", "goldLine"]
    }),
    presetKey: "solar-gold-line"
  },
  {
    id: "solar-ornament-leaf",
    label: "Solar Leaf Ornament",
    description: "調整 leaf ornament chrome appearance。",
    fields: buildLeafOrnamentFields({
      idPrefix: "solar",
      path: ["chrome", "ornaments", "leaf"]
    }),
    presetKey: "solar-leaf"
  },
  ...Object.keys(createSolarDisplayPageSeedConfig().flowNodes).map<DisplayEditorRegionSchema>((key) => ({
    id: `solar-flow-${key}`,
    label: `Solar Flow ${key}`,
    description: "調整 flow node 幾何位置。",
    geometry: {
      compatibilityKey: "solar-flow-geometry",
      heightPath: ["flowNodes", key, "height"],
      leftPath: ["flowNodes", key, "left"],
      minHeight: 64,
      minWidth: 64,
      resizeMode: "both",
      topOffset: 146,
      topPath: ["flowNodes", key, "top"],
      widthPath: ["flowNodes", key, "width"]
    },
    fields: [
      ...buildDisplayPageIconSourceFields({
        idPrefix: key,
        path: ["iconSources", "flowNodes", key]
      }),
      ...buildFlowNodeTreatmentFields({
        idPrefix: `solar-${key}`,
        path: ["flowNodeTreatments", key]
      }),
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["flowNodes", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["flowNodes", key, "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-width`, label: "Width", path: ["flowNodes", key, "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-height`, label: "Height", path: ["flowNodes", key, "height"] }
    ],
    presetKey: "solar-flow"
  })),
  ...Object.keys(createSolarDisplayPageSeedConfig().connectors).map<DisplayEditorRegionSchema>((key) => ({
    id: `solar-connector-${key}`,
    label: `Solar Connector ${key}`,
    description: "調整 connector 幾何位置。",
    geometry: {
      compatibilityKey: "solar-connector-geometry",
      fallbackHeight: 16,
      leftPath: ["connectors", key, "left"],
      minWidth: 24,
      resizeMode: "horizontal",
      topOffset: 146,
      topPath: ["connectors", key, "top"],
      widthPath: ["connectors", key, "width"]
    },
    fields: [
      ...buildFlowConnectorTreatmentFields({
        idPrefix: `solar-${key}`,
        path: ["connectorTreatments", key]
      }),
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["connectors", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["connectors", key, "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-width`, label: "Width", path: ["connectors", key, "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-height`, label: "Height", path: ["connectors", key, "height"] }
    ],
    presetKey: "solar-connector"
  })),
  ...Object.keys(createSolarDisplayPageSeedConfig().kpiCards).map<DisplayEditorRegionSchema>((key) => ({
    id: `solar-kpi-${key}`,
    label: `Solar KPI ${key}`,
    description: "調整 KPI card 幾何。",
    geometry: {
      compatibilityKey: "solar-kpi-geometry",
      heightPath: ["kpiCards", key, "height"],
      leftPath: ["kpiCards", key, "left"],
      minHeight: 80,
      minWidth: 80,
      resizeMode: "both",
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
        path: ["iconSources", "kpiCards", key]
      }),
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["kpiCards", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["kpiCards", key, "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-width`, label: "Width", path: ["kpiCards", key, "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-height`, label: "Height", path: ["kpiCards", key, "height"] }
    ],
    presetKey: "solar-kpi"
  }))
];
