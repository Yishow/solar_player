import {
  factoryCircuitConnectorLayout,
  factoryCircuitCopyLayout,
  factoryCircuitKpiLayout,
  factoryCircuitLoadPanelLayout,
  factoryCircuitLoadRowLayout,
  factoryCircuitNodeLayout,
  factoryCircuitStatusLayout
} from "./layout";

export type FactoryCircuitDisplayRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type FactoryCircuitDisplayPageConfig = {
  connectors: Record<"inverterToBoard" | "solarToInverter", FactoryCircuitDisplayRect>;
  hero: {
    copyEnLines: [string, string, string, string];
    copyZhLines: [string, string, string];
    eyebrow: string;
    subtitle: string;
    title: string;
  };
  kpiCards: Record<"flow" | "peak" | "selfConsumption" | "solarShare" | "totalPower", FactoryCircuitDisplayRect>;
  loadPanel: FactoryCircuitDisplayRect;
  loadRows: Record<
    "ev" | "hvac" | "infrastructure" | "lighting" | "office" | "production",
    FactoryCircuitDisplayRect
  >;
  nodes: Record<"board" | "inverter" | "solar", FactoryCircuitDisplayRect>;
  statusBlock: FactoryCircuitDisplayRect;
  textBlocks: {
    copy: FactoryCircuitDisplayRect;
  };
};

export function createFactoryCircuitDisplayPageSeedConfig(): FactoryCircuitDisplayPageConfig {
  return {
    connectors: {
      inverterToBoard: { ...factoryCircuitConnectorLayout.inverterToBoard, height: 16 },
      solarToInverter: { ...factoryCircuitConnectorLayout.solarToInverter, height: 16 }
    },
    hero: {
      copyEnLines: [
        "Solar energy is converted into clean power and",
        "distributed through the switchboard to support",
        "factory operations, driving green manufacturing",
        "every day."
      ],
      copyZhLines: [
        "太陽能發電轉換為潔淨電力，",
        "經由配電系統分配至廠區各項用電設備，",
        "驅動製造運作，落實綠色生產。"
      ],
      eyebrow: "綠能驅動・永續未來",
      subtitle: "Factory Energy Circuit",
      title: "廠區用電迴路"
    },
    kpiCards: {
      flow: { ...factoryCircuitKpiLayout.flow },
      peak: { ...factoryCircuitKpiLayout.peak },
      selfConsumption: { ...factoryCircuitKpiLayout.selfConsumption },
      solarShare: { ...factoryCircuitKpiLayout.solarShare },
      totalPower: { ...factoryCircuitKpiLayout.totalPower }
    },
    loadPanel: { ...factoryCircuitLoadPanelLayout },
    loadRows: {
      production: { ...factoryCircuitLoadRowLayout[0] },
      hvac: { ...factoryCircuitLoadRowLayout[1] },
      lighting: { ...factoryCircuitLoadRowLayout[2] },
      office: { ...factoryCircuitLoadRowLayout[3] },
      ev: { ...factoryCircuitLoadRowLayout[4] },
      infrastructure: { ...factoryCircuitLoadRowLayout[5] }
    },
    nodes: {
      board: { ...factoryCircuitNodeLayout.board },
      inverter: { ...factoryCircuitNodeLayout.inverter },
      solar: { ...factoryCircuitNodeLayout.solar }
    },
    statusBlock: { ...factoryCircuitStatusLayout, height: 126 },
    textBlocks: {
      copy: { ...factoryCircuitCopyLayout, height: 180 }
    }
  };
}
