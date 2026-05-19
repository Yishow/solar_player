import type { DisplayPageMediaBinding } from "@solar-display/shared";
import type { DisplayEditorRegionSchema } from "../../../../../packages/shared/src/displayEditorSchema";
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

export type SolarDisplayPageConfig = {
  connectors: Record<"inverterToCo2" | "inverterToFactory" | "solarToInverter", SolarDisplayRect>;
  flowNodes: Record<"co2" | "factory" | "inverter" | "solar", SolarDisplayRect>;
  heroContainer: SolarDisplayRect;
  heroCopy: {
    eyebrow: string;
    subtitleLines: [string, string];
    titleLines: [string, string];
  };
  heroMedia: DisplayPageMediaBinding;
  kpiCards: Record<"co2" | "efficiency" | "generation" | "selfConsumption" | "totalCo2", SolarDisplayRect>;
};

export function createSolarDisplayPageSeedConfig(
  heroSrc = "/brand-logo.png",
  heroAlt = "太陽能車棚與綠能展示場域"
): SolarDisplayPageConfig {
  return {
    connectors: {
      inverterToCo2: { ...solarConnectorLayout.inverterToCo2 },
      inverterToFactory: { ...solarConnectorLayout.inverterToFactory },
      solarToInverter: { ...solarConnectorLayout.solarToInverter }
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
      src: heroSrc
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
    presetKey: "hero-media"
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
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["kpiCards", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["kpiCards", key, "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-width`, label: "Width", path: ["kpiCards", key, "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-height`, label: "Height", path: ["kpiCards", key, "height"] }
    ],
    presetKey: "solar-kpi"
  }))
];
