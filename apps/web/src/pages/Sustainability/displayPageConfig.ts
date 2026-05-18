import type { DisplayPageMediaBinding } from "@solar-display/shared";
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
