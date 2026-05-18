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
  heroMedia: {
    alt: string;
    src: string;
  };
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
      alt: heroAlt,
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
