import type { DisplayEditorRegionSchema } from "../../../../../packages/shared/src/displayEditorSchema";
import {
  buildGoldLineFields,
  buildHeroTypographyFields,
  buildLeafOrnamentFields,
  buildStatusBlockChromeFields,
  createGoldLineChromeConfig,
  createHeroTypographyConfig,
  createLeafOrnamentChromeConfig,
  createStatusBlockChromeConfig,
  type GoldLineChromeConfig,
  type HeroTypographyConfig,
  type LeafOrnamentChromeConfig,
  type StatusBlockChromeConfig
} from "../shared/displayPageChromeConfig";
import {
  buildDisplayPageIconSourceFields,
  createPageIconKeySource,
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
  buildFactoryLoadRowRhythmFields,
  createFactoryLoadRowRhythmConfig,
  type FactoryLoadRowRhythmConfig
} from "../shared/displayPageFhdRhythmConfig";
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

export type FactoryCircuitConnectorKey = "inverterToBoard" | "solarToInverter";
export type FactoryCircuitNodeKey = "board" | "inverter" | "solar";

export type FactoryCircuitDisplayPageConfig = {
  chrome: {
    heroTypography: HeroTypographyConfig;
    modules: {
      statusBlock: StatusBlockChromeConfig;
    };
    ornaments: {
      goldLine: GoldLineChromeConfig;
      leaf: LeafOrnamentChromeConfig;
    };
  };
  connectorTreatments: Record<FactoryCircuitConnectorKey, FlowConnectorTreatmentConfig>;
  connectors: Record<FactoryCircuitConnectorKey, FactoryCircuitDisplayRect>;
  hero: {
    copyEnLines: [string, string, string, string];
    copyZhLines: [string, string, string];
    eyebrow: string;
    subtitle: string;
    title: string;
  };
  iconSources: {
    kpiCards: Record<"flow" | "peak" | "selfConsumption" | "solarShare" | "totalPower", DisplayPageIconSource>;
    loadRows: Record<
      "ev" | "hvac" | "infrastructure" | "lighting" | "office" | "production",
      DisplayPageIconSource
    >;
    nodes: Record<FactoryCircuitNodeKey, DisplayPageIconSource>;
  };
  kpiCards: Record<"flow" | "peak" | "selfConsumption" | "solarShare" | "totalPower", FactoryCircuitDisplayRect>;
  loadPanel: FactoryCircuitDisplayRect;
  loadRows: Record<
    "ev" | "hvac" | "infrastructure" | "lighting" | "office" | "production",
    FactoryCircuitDisplayRect
  >;
  nodeTreatments: Record<FactoryCircuitNodeKey, FlowNodeTreatmentConfig>;
  nodes: Record<FactoryCircuitNodeKey, FactoryCircuitDisplayRect>;
  rhythm: {
    factoryLoadRows: FactoryLoadRowRhythmConfig;
  };
  statusBlock: FactoryCircuitDisplayRect;
  textBlocks: {
    copy: FactoryCircuitDisplayRect;
  };
};

export function createFactoryCircuitDisplayPageSeedConfig(): FactoryCircuitDisplayPageConfig {
  return {
    chrome: {
      heroTypography: createHeroTypographyConfig({
        subtitleMarginTop: 20
      }),
      modules: {
        statusBlock: createStatusBlockChromeConfig()
      },
      ornaments: {
        goldLine: createGoldLineChromeConfig({
          thickness: 2,
          opacity: 1
        }),
        leaf: createLeafOrnamentChromeConfig({
          opacity: 0.38
        })
      }
    },
    connectorTreatments: {
      inverterToBoard: createFlowConnectorTreatmentConfig({ strokeWidth: 16, zIndex: 9 }),
      solarToInverter: createFlowConnectorTreatmentConfig({ strokeWidth: 16, zIndex: 9 })
    },
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
    iconSources: {
      kpiCards: {
        flow: createPageIconKeySource("factory-circuit", "leaf"),
        peak: createPageIconKeySource("factory-circuit", "bars"),
        selfConsumption: createPageIconKeySource("factory-circuit", "sun"),
        solarShare: createPageIconKeySource("factory-circuit", "pie"),
        totalPower: createPageIconKeySource("factory-circuit", "bolt")
      },
      loadRows: {
        ev: createPageIconKeySource("factory-circuit", "ev"),
        hvac: createPageIconKeySource("factory-circuit", "hvac"),
        infrastructure: createPageIconKeySource("factory-circuit", "infrastructure"),
        lighting: createPageIconKeySource("factory-circuit", "lighting"),
        office: createPageIconKeySource("factory-circuit", "office"),
        production: createPageIconKeySource("factory-circuit", "production-line")
      },
      nodes: {
        board: createPageIconKeySource("factory-circuit", "switchboard"),
        inverter: createPageIconKeySource("factory-circuit", "inverter"),
        solar: createPageIconKeySource("factory-circuit", "solar")
      }
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
    nodeTreatments: {
      board: createFlowNodeTreatmentConfig(),
      inverter: createFlowNodeTreatmentConfig(),
      solar: createFlowNodeTreatmentConfig()
    },
    nodes: {
      board: { ...factoryCircuitNodeLayout.board },
      inverter: { ...factoryCircuitNodeLayout.inverter },
      solar: { ...factoryCircuitNodeLayout.solar }
    },
    rhythm: {
      factoryLoadRows: createFactoryLoadRowRhythmConfig()
    },
    statusBlock: { ...factoryCircuitStatusLayout, height: 126 },
    textBlocks: {
      copy: { ...factoryCircuitCopyLayout, height: 180 }
    }
  };
}

export const factoryCircuitDisplayPageEditorRegions: DisplayEditorRegionSchema[] = [
  {
    id: "factory-circuit-hero",
    label: "Factory Circuit Hero",
    description: "調整 title、subtitle 與主文案。",
    geometry: {
      fallbackHeight: 220,
      leftPath: ["textBlocks", "copy", "left"],
      minWidth: 180,
      resizeMode: "horizontal",
      topOffset: 146,
      topPath: ["textBlocks", "copy", "top"],
      widthPath: ["textBlocks", "copy", "width"]
    },
    fields: [
      ...buildHeroTypographyFields({
        idPrefix: "factory",
        path: ["chrome", "heroTypography"]
      }),
      { fieldType: "text", id: "factory-eyebrow", label: "Eyebrow", path: ["hero", "eyebrow"] },
      { fieldType: "text", id: "factory-title", label: "Title", path: ["hero", "title"] },
      { fieldType: "text", id: "factory-subtitle", label: "Subtitle", path: ["hero", "subtitle"] },
      { fieldType: "text", id: "factory-copy-zh-1", label: "Copy Zh 1", path: ["hero", "copyZhLines", 0] },
      { fieldType: "text", id: "factory-copy-zh-2", label: "Copy Zh 2", path: ["hero", "copyZhLines", 1] },
      { fieldType: "text", id: "factory-copy-zh-3", label: "Copy Zh 3", path: ["hero", "copyZhLines", 2] }
    ],
    presetKey: "factory-hero-copy"
  },
  {
    id: "factory-circuit-copy-layout",
    label: "Factory Circuit Copy Layout",
    description: "調整 copy block 與 status block 幾何。",
    geometry: {
      compatibilityKey: "factory-copy-layout",
      fallbackHeight: 180,
      leftPath: ["textBlocks", "copy", "left"],
      minWidth: 120,
      resizeMode: "horizontal",
      topOffset: 146,
      topPath: ["textBlocks", "copy", "top"],
      widthPath: ["textBlocks", "copy", "width"]
    },
    fields: [
      { constraints: { min: 0 }, fieldType: "number", id: "factory-copy-left", label: "Copy Left", path: ["textBlocks", "copy", "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: "factory-copy-top", label: "Copy Top", path: ["textBlocks", "copy", "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: "factory-copy-width", label: "Copy Width", path: ["textBlocks", "copy", "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: "factory-status-left", label: "Status Left", path: ["statusBlock", "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: "factory-status-top", label: "Status Top", path: ["statusBlock", "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: "factory-status-width", label: "Status Width", path: ["statusBlock", "width"] }
    ],
    presetKey: "factory-copy-layout"
  },
  {
    id: "factory-status-block",
    label: "Factory Status Block",
    description: "調整 status block chrome appearance。",
    fields: buildStatusBlockChromeFields({
      idPrefix: "factory",
      path: ["chrome", "modules", "statusBlock"]
    }),
    presetKey: "factory-status-block"
  },
  {
    id: "factory-ornament-gold-line",
    label: "Factory Gold Line",
    description: "調整 gold line chrome appearance。",
    fields: buildGoldLineFields({
      idPrefix: "factory",
      path: ["chrome", "ornaments", "goldLine"]
    }),
    presetKey: "factory-gold-line"
  },
  {
    id: "factory-ornament-leaf",
    label: "Factory Leaf Ornament",
    description: "調整 leaf ornament chrome appearance。",
    fields: buildLeafOrnamentFields({
      idPrefix: "factory",
      path: ["chrome", "ornaments", "leaf"]
    }),
    presetKey: "factory-leaf"
  },
  ...Object.keys(createFactoryCircuitDisplayPageSeedConfig().nodes).map<DisplayEditorRegionSchema>((key) => ({
    id: `factory-node-${key}`,
    label: `Factory Node ${key}`,
    description: "調整 node 幾何位置。",
    geometry: {
      compatibilityKey: "factory-node-geometry",
      heightPath: ["nodes", key, "height"],
      leftPath: ["nodes", key, "left"],
      minHeight: 64,
      minWidth: 64,
      resizeMode: "both",
      topOffset: 146,
      topPath: ["nodes", key, "top"],
      widthPath: ["nodes", key, "width"]
    },
    fields: [
      ...buildDisplayPageIconSourceFields({
        idPrefix: key,
        path: ["iconSources", "nodes", key]
      }),
      ...buildFlowNodeTreatmentFields({
        idPrefix: `factory-${key}`,
        path: ["nodeTreatments", key]
      }),
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["nodes", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["nodes", key, "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-width`, label: "Width", path: ["nodes", key, "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-height`, label: "Height", path: ["nodes", key, "height"] }
    ],
    presetKey: "factory-node"
  })),
  ...Object.keys(createFactoryCircuitDisplayPageSeedConfig().connectors).map<DisplayEditorRegionSchema>((key) => ({
    id: `factory-connector-${key}`,
    label: `Factory Connector ${key}`,
    description: "調整 connector 幾何位置。",
    geometry: {
      compatibilityKey: "factory-connector-geometry",
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
        idPrefix: `factory-${key}`,
        path: ["connectorTreatments", key]
      }),
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["connectors", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["connectors", key, "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-width`, label: "Width", path: ["connectors", key, "width"] }
    ],
    presetKey: "factory-connector"
  })),
  {
    id: "factory-load-panel",
    label: "Factory Load Panel",
    description: "調整負載面板容器幾何。",
    geometry: {
      compatibilityKey: "factory-load-panel-geometry",
      heightPath: ["loadPanel", "height"],
      leftPath: ["loadPanel", "left"],
      minHeight: 120,
      minWidth: 120,
      resizeMode: "both",
      topOffset: 146,
      topPath: ["loadPanel", "top"],
      widthPath: ["loadPanel", "width"]
    },
    fields: [
      ...buildFactoryLoadRowRhythmFields({
        idPrefix: "factory",
        path: ["rhythm", "factoryLoadRows"]
      }),
      { constraints: { min: 0 }, fieldType: "number", id: "load-panel-left", label: "Left", path: ["loadPanel", "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: "load-panel-top", label: "Top", path: ["loadPanel", "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: "load-panel-width", label: "Width", path: ["loadPanel", "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: "load-panel-height", label: "Height", path: ["loadPanel", "height"] }
    ],
    presetKey: "factory-load-panel"
  },
  ...Object.keys(createFactoryCircuitDisplayPageSeedConfig().loadRows).map<DisplayEditorRegionSchema>((key) => ({
    id: `factory-load-row-${key}`,
    label: `Factory Load Row ${key}`,
    description: "調整 load row 幾何位置。",
    geometry: {
      compatibilityKey: "factory-load-row-geometry",
      heightPath: ["loadRows", key, "height"],
      leftPath: ["loadRows", key, "left"],
      minHeight: 32,
      minWidth: 120,
      resizeMode: "both",
      topOffset: 146,
      topPath: ["loadRows", key, "top"],
      widthPath: ["loadRows", key, "width"]
    },
    fields: [
      ...buildDisplayPageIconSourceFields({
        idPrefix: key,
        path: ["iconSources", "loadRows", key]
      }),
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["loadRows", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["loadRows", key, "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-width`, label: "Width", path: ["loadRows", key, "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-height`, label: "Height", path: ["loadRows", key, "height"] }
    ],
    presetKey: "factory-load-row"
  })),
  ...Object.keys(createFactoryCircuitDisplayPageSeedConfig().kpiCards).map<DisplayEditorRegionSchema>((key) => ({
    id: `factory-kpi-${key}`,
    label: `Factory KPI ${key}`,
    description: "調整 KPI 幾何位置。",
    geometry: {
      compatibilityKey: "factory-kpi-geometry",
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
      ...buildDisplayPageIconSourceFields({
        idPrefix: key,
        path: ["iconSources", "kpiCards", key]
      }),
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["kpiCards", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["kpiCards", key, "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-width`, label: "Width", path: ["kpiCards", key, "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-height`, label: "Height", path: ["kpiCards", key, "height"] }
    ],
    presetKey: "factory-kpi"
  }))
];
