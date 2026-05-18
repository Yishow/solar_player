import type { DisplayPageMediaBinding } from "@solar-display/shared";
import type { DisplayEditorRegionSchema } from "../../../../../packages/shared/src/displayEditorSchema";
import {
  sustainabilityHeroLayout,
  sustainabilityHighlightRailLayout,
  sustainabilityKpiLayout,
  sustainabilityStatLayout
} from "./layout";

export type SustainabilityDisplayRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type SustainabilityDisplayPageConfig = {
  hero: {
    copyEnLines: [string, string, string];
    copyZhLines: [string, string];
    eyebrow: string;
    subtitle: string;
    title: [string, string];
  };
  heroMedia: SustainabilityDisplayRect & DisplayPageMediaBinding;
  highlightRail: {
    container: SustainabilityDisplayRect;
    items: Array<{
      label: string;
      unit: string;
      value: string;
    }>;
  };
  kpiCards: Record<"annualSaving" | "totalCo2" | "totalGeneration", SustainabilityDisplayRect>;
  statCards: Record<"esg" | "procure" | "trees", SustainabilityDisplayRect>;
};

export function createSustainabilityDisplayPageSeedConfig(
  heroSrc = "/brand-logo.png",
  heroAlt = "國瑞汽車永續成果場域"
): SustainabilityDisplayPageConfig {
  return {
    hero: {
      copyEnLines: [
        "Kuozui Motors is committed to green manufacturing and",
        "environmental stewardship, steadily advancing sustainable",
        "practices to create a better future for our planet and society."
      ],
      copyZhLines: [
        "國瑞汽車致力推動綠色製造，落實環境管理與資源循環，",
        "以行動實踐企業永續承諾，與社會共創更美好的未來。"
      ],
      eyebrow: "綠能驅動・永續未來",
      subtitle: "Sustainability in Action",
      title: ["永續成果", "持續累積"]
    },
    heroMedia: {
      ...sustainabilityHeroLayout,
      alignX: 0.5,
      alignY: 0.48,
      alt: heroAlt,
      fitMode: "cover",
      focusX: 0.5,
      focusY: 0.48,
      src: heroSrc
    },
    highlightRail: {
      container: { ...sustainabilityHighlightRailLayout },
      items: [
        { label: "本月減碳", unit: "tCO₂e", value: "38.4" },
        { label: "年度節電", unit: "MWh", value: "214" },
        { label: "綠電自用", unit: "%", value: "71" },
        { label: "等效植樹", unit: "株", value: "25,600" }
      ]
    },
    kpiCards: {
      annualSaving: { ...sustainabilityKpiLayout.annualSaving },
      totalCo2: { ...sustainabilityKpiLayout.totalCo2 },
      totalGeneration: { ...sustainabilityKpiLayout.totalGeneration }
    },
    statCards: {
      esg: { ...sustainabilityStatLayout.esg },
      procure: { ...sustainabilityStatLayout.procure },
      trees: { ...sustainabilityStatLayout.trees }
    }
  };
}

export const sustainabilityDisplayPageEditorRegions: DisplayEditorRegionSchema[] = [
  {
    id: "sustainability-hero-copy",
    label: "Sustainability Hero Copy",
    description: "調整 title、subtitle 與中英文 copy。",
    geometry: {
      fallbackHeight: 240,
      leftPath: ["heroMedia", "left"],
      minWidth: 180,
      resizeMode: "horizontal",
      topOffset: 146,
      topPath: ["heroMedia", "top"],
      widthPath: ["heroMedia", "width"]
    },
    fields: [
      { fieldType: "text", id: "sustainability-eyebrow", label: "Eyebrow", path: ["hero", "eyebrow"] },
      { fieldType: "text", id: "sustainability-title-1", label: "Title Line 1", path: ["hero", "title", 0] },
      { fieldType: "text", id: "sustainability-title-2", label: "Title Line 2", path: ["hero", "title", 1] },
      { fieldType: "text", id: "sustainability-subtitle", label: "Subtitle", path: ["hero", "subtitle"] },
      { fieldType: "text", id: "sustainability-copy-zh-1", label: "Copy Zh 1", path: ["hero", "copyZhLines", 0] },
      { fieldType: "text", id: "sustainability-copy-zh-2", label: "Copy Zh 2", path: ["hero", "copyZhLines", 1] }
    ],
    presetKey: "hero-copy"
  },
  {
    id: "sustainability-hero-media",
    label: "Sustainability Hero Media",
    description: "調整 hero 圖片、容器 geometry 與 placement controls。",
    geometry: {
      compatibilityKey: "hero-media-geometry",
      heightPath: ["heroMedia", "height"],
      leftPath: ["heroMedia", "left"],
      minHeight: 120,
      minWidth: 120,
      resizeMode: "both",
      topOffset: 146,
      topPath: ["heroMedia", "top"],
      widthPath: ["heroMedia", "width"]
    },
    fields: [
      { fieldType: "asset", id: "sustainability-hero-src", label: "Image Source", path: ["heroMedia", "src"] },
      { fieldType: "text", id: "sustainability-hero-alt", label: "Image Alt", path: ["heroMedia", "alt"] },
      {
        fieldType: "select",
        id: "sustainability-hero-fit-mode",
        label: "Fit Mode",
        options: [
          { label: "Contain", value: "contain" },
          { label: "Cover", value: "cover" }
        ],
        path: ["heroMedia", "fitMode"]
      },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "sustainability-hero-focus-x", label: "Focus X", path: ["heroMedia", "focusX"], step: 0.05 },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "sustainability-hero-focus-y", label: "Focus Y", path: ["heroMedia", "focusY"], step: 0.05 },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "sustainability-hero-align-x", label: "Align X", path: ["heroMedia", "alignX"], step: 0.05 },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "sustainability-hero-align-y", label: "Align Y", path: ["heroMedia", "alignY"], step: 0.05 },
      { constraints: { min: 0 }, fieldType: "number", id: "sustainability-hero-left", label: "Left", path: ["heroMedia", "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: "sustainability-hero-top", label: "Top", path: ["heroMedia", "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: "sustainability-hero-width", label: "Width", path: ["heroMedia", "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: "sustainability-hero-height", label: "Height", path: ["heroMedia", "height"] }
    ],
    presetKey: "hero-media"
  },
  {
    id: "sustainability-highlight-rail",
    label: "Sustainability Highlight Rail",
    description: "調整 highlight rail 容器與四個 highlight 文案。",
    geometry: {
      compatibilityKey: "sustainability-highlight-geometry",
      heightPath: ["highlightRail", "container", "height"],
      leftPath: ["highlightRail", "container", "left"],
      minHeight: 64,
      minWidth: 160,
      resizeMode: "both",
      topOffset: 146,
      topPath: ["highlightRail", "container", "top"],
      widthPath: ["highlightRail", "container", "width"]
    },
    fields: [
      { constraints: { min: 0 }, fieldType: "number", id: "highlight-left", label: "Left", path: ["highlightRail", "container", "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: "highlight-top", label: "Top", path: ["highlightRail", "container", "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: "highlight-width", label: "Width", path: ["highlightRail", "container", "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: "highlight-height", label: "Height", path: ["highlightRail", "container", "height"] },
      {
        fieldType: "array",
        id: "highlight-items",
        itemFields: [
          { fieldType: "text", id: "label", label: "Label", path: ["label"] },
          { fieldType: "text", id: "value", label: "Value", path: ["value"] },
          { fieldType: "text", id: "unit", label: "Unit", path: ["unit"] }
        ],
        itemLabel: "Highlight Item",
        label: "Highlight Items",
        path: ["highlightRail", "items"]
      }
    ],
    presetKey: "sustainability-highlight"
  },
  ...Object.keys(createSustainabilityDisplayPageSeedConfig().kpiCards).map<DisplayEditorRegionSchema>((key) => ({
    id: `sustainability-kpi-${key}`,
    label: `Sustainability KPI ${key}`,
    description: "調整 KPI card 幾何。",
    geometry: {
      compatibilityKey: "sustainability-kpi-geometry",
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
    presetKey: "sustainability-kpi"
  })),
  ...Object.keys(createSustainabilityDisplayPageSeedConfig().statCards).map<DisplayEditorRegionSchema>((key) => ({
    id: `sustainability-stat-${key}`,
    label: `Sustainability Stat ${key}`,
    description: "調整 stat card 幾何。",
    geometry: {
      compatibilityKey: "sustainability-stat-geometry",
      heightPath: ["statCards", key, "height"],
      leftPath: ["statCards", key, "left"],
      minHeight: 80,
      minWidth: 80,
      resizeMode: "both",
      topOffset: 146,
      topPath: ["statCards", key, "top"],
      widthPath: ["statCards", key, "width"]
    },
    fields: [
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["statCards", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["statCards", key, "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-width`, label: "Width", path: ["statCards", key, "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-height`, label: "Height", path: ["statCards", key, "height"] }
    ],
    presetKey: "sustainability-stat"
  }))
];
