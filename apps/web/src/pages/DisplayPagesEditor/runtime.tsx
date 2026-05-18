import { FactoryCircuit } from "../FactoryCircuit";
import {
  createFactoryCircuitDisplayPageSeedConfig,
  type FactoryCircuitDisplayPageConfig
} from "../FactoryCircuit/displayPageConfig";
import { Images } from "../Images";
import { imagesAssetRuntimeMap } from "../Images/assets";
import {
  createImagesDisplayPageSeedConfig,
  type ImagesDisplayPageConfig
} from "../Images/displayPageConfig";
import { Overview } from "../Overview";
import { overviewAssetRuntimeMap } from "../Overview/assets";
import {
  createOverviewDisplayPageSeedConfig,
  type OverviewDisplayPageConfig
} from "../Overview/displayPageConfig";
import { Solar } from "../Solar";
import { solarAssetRuntimeMap } from "../Solar/assets";
import {
  createSolarDisplayPageSeedConfig,
  type SolarDisplayPageConfig
} from "../Solar/displayPageConfig";
import { Sustainability } from "../Sustainability";
import { sustainabilityAssetMap } from "../Sustainability/assets";
import {
  createSustainabilityDisplayPageSeedConfig,
  type SustainabilityDisplayPageConfig
} from "../Sustainability/displayPageConfig";
import {
  DisplayPagesEditor,
  type DisplayEditorPageDefinition,
  type DisplayEditorRegion
} from "./index";

const CONTENT_TOP_OFFSET = 146;

function toContentTop(value: number) {
  return value - CONTENT_TOP_OFFSET;
}

function buildOverviewRegions(
  config: Record<string, unknown>,
  updatePath: (path: Array<number | string>, value: unknown) => void
): DisplayEditorRegion[] {
  const typedConfig = config as OverviewDisplayPageConfig;

  return [
    {
      id: "overview-hero-copy",
      label: "Overview Hero Copy",
      description: "調整三段 slogan 與 title/subtitle copy。",
      rect: {
        height: typedConfig.heroContainer.height,
        left: 86,
        top: toContentTop(172),
        width: 642
      },
      fields: [
        {
          id: "eyebrow",
          label: "Eyebrow",
          onChange: (value) => updatePath(["heroCopy", "eyebrow"], value),
          type: "text",
          value: typedConfig.heroCopy.eyebrow
        },
        {
          id: "title-line-1",
          label: "Title Line 1",
          onChange: (value) => updatePath(["heroCopy", "titleLines", 0], value),
          type: "text",
          value: typedConfig.heroCopy.titleLines[0]
        },
        {
          id: "title-line-2",
          label: "Title Line 2",
          onChange: (value) => updatePath(["heroCopy", "titleLines", 1], value),
          type: "text",
          value: typedConfig.heroCopy.titleLines[1]
        },
        {
          id: "subtitle-line-1",
          label: "Subtitle Line 1",
          onChange: (value) => updatePath(["heroCopy", "subtitleLines", 0], value),
          type: "text",
          value: typedConfig.heroCopy.subtitleLines[0]
        },
        {
          id: "subtitle-line-2",
          label: "Subtitle Line 2",
          onChange: (value) => updatePath(["heroCopy", "subtitleLines", 1], value),
          type: "text",
          value: typedConfig.heroCopy.subtitleLines[1]
        }
      ]
    },
    {
      id: "overview-hero-media",
      label: "Overview Hero Media",
      description: "切換 hero image 與 alt 文案。",
      rect: {
        ...typedConfig.heroContainer,
        top: toContentTop(typedConfig.heroContainer.top)
      },
      fields: [
        {
          id: "hero-src",
          label: "Image Source",
          onChange: (value) => updatePath(["heroMedia", "src"], value),
          type: "text",
          value: typedConfig.heroMedia.src
        },
        {
          id: "hero-alt",
          label: "Image Alt",
          onChange: (value) => updatePath(["heroMedia", "alt"], value),
          type: "text",
          value: typedConfig.heroMedia.alt
        }
      ]
    },
    {
      id: "overview-hero-container",
      label: "Overview Hero Container",
      description: "調整 hero 畫布容器幾何。",
      rect: {
        ...typedConfig.heroContainer,
        top: toContentTop(typedConfig.heroContainer.top)
      },
      fields: [
        {
          id: "hero-left",
          label: "Left",
          onChange: (value) => updatePath(["heroContainer", "left"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.heroContainer.left
        },
        {
          id: "hero-top",
          label: "Top",
          onChange: (value) => updatePath(["heroContainer", "top"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.heroContainer.top
        },
        {
          id: "hero-width",
          label: "Width",
          onChange: (value) => updatePath(["heroContainer", "width"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.heroContainer.width
        },
        {
          id: "hero-height",
          label: "Height",
          onChange: (value) => updatePath(["heroContainer", "height"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.heroContainer.height
        }
      ]
    },
    ...Object.entries(typedConfig.kpiCards).map(([key, rect]) => ({
      id: `overview-kpi-${key}`,
      label: `Overview KPI ${key}`,
      description: "調整 KPI card geometry。",
      rect: {
        ...rect,
        top: toContentTop(rect.top)
      },
      fields: [
        {
          id: `${key}-left`,
          label: "Left",
          onChange: (value: string) => updatePath(["kpiCards", key, "left"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.left
        },
        {
          id: `${key}-top`,
          label: "Top",
          onChange: (value: string) => updatePath(["kpiCards", key, "top"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.top
        },
        {
          id: `${key}-width`,
          label: "Width",
          onChange: (value: string) => updatePath(["kpiCards", key, "width"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.width
        },
        {
          id: `${key}-height`,
          label: "Height",
          onChange: (value: string) => updatePath(["kpiCards", key, "height"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.height
        }
      ]
    }))
  ];
}

function buildSolarRegions(
  config: Record<string, unknown>,
  updatePath: (path: Array<number | string>, value: unknown) => void
): DisplayEditorRegion[] {
  const typedConfig = config as SolarDisplayPageConfig;

  return [
    {
      id: "solar-hero-copy",
      label: "Solar Hero Copy",
      description: "調整 Solar 標題、eyebrow 與雙語 subtitle。",
      rect: {
        left: 88,
        top: toContentTop(166),
        width: 650
      },
      fields: [
        {
          id: "solar-eyebrow",
          label: "Eyebrow",
          onChange: (value) => updatePath(["heroCopy", "eyebrow"], value),
          type: "text",
          value: typedConfig.heroCopy.eyebrow
        },
        {
          id: "solar-title-line-1",
          label: "Title Line 1",
          onChange: (value) => updatePath(["heroCopy", "titleLines", 0], value),
          type: "text",
          value: typedConfig.heroCopy.titleLines[0]
        },
        {
          id: "solar-title-line-2",
          label: "Title Line 2",
          onChange: (value) => updatePath(["heroCopy", "titleLines", 1], value),
          type: "text",
          value: typedConfig.heroCopy.titleLines[1]
        },
        {
          id: "solar-subtitle-line-1",
          label: "Subtitle Line 1",
          onChange: (value) => updatePath(["heroCopy", "subtitleLines", 0], value),
          type: "text",
          value: typedConfig.heroCopy.subtitleLines[0]
        },
        {
          id: "solar-subtitle-line-2",
          label: "Subtitle Line 2",
          onChange: (value) => updatePath(["heroCopy", "subtitleLines", 1], value),
          type: "text",
          value: typedConfig.heroCopy.subtitleLines[1]
        }
      ]
    },
    {
      id: "solar-hero-media",
      label: "Solar Hero Media",
      description: "切換 Solar hero image 與畫面容器。",
      rect: {
        ...typedConfig.heroContainer,
        top: toContentTop(typedConfig.heroContainer.top)
      },
      fields: [
        {
          id: "solar-hero-src",
          label: "Image Source",
          onChange: (value) => updatePath(["heroMedia", "src"], value),
          type: "text",
          value: typedConfig.heroMedia.src
        },
        {
          id: "solar-hero-alt",
          label: "Image Alt",
          onChange: (value) => updatePath(["heroMedia", "alt"], value),
          type: "text",
          value: typedConfig.heroMedia.alt
        },
        {
          id: "solar-hero-left",
          label: "Left",
          onChange: (value) => updatePath(["heroContainer", "left"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.heroContainer.left
        },
        {
          id: "solar-hero-top",
          label: "Top",
          onChange: (value) => updatePath(["heroContainer", "top"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.heroContainer.top
        },
        {
          id: "solar-hero-width",
          label: "Width",
          onChange: (value) => updatePath(["heroContainer", "width"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.heroContainer.width
        },
        {
          id: "solar-hero-height",
          label: "Height",
          onChange: (value) => updatePath(["heroContainer", "height"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.heroContainer.height
        }
      ]
    },
    ...Object.entries(typedConfig.flowNodes).map(([key, rect]) => ({
      id: `solar-flow-${key}`,
      label: `Solar Flow ${key}`,
      description: "調整 flow node 幾何位置。",
      rect: {
        ...rect,
        top: toContentTop(rect.top)
      },
      fields: [
        {
          id: `${key}-left`,
          label: "Left",
          onChange: (value: string) => updatePath(["flowNodes", key, "left"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.left
        },
        {
          id: `${key}-top`,
          label: "Top",
          onChange: (value: string) => updatePath(["flowNodes", key, "top"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.top
        },
        {
          id: `${key}-width`,
          label: "Width",
          onChange: (value: string) => updatePath(["flowNodes", key, "width"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.width
        },
        {
          id: `${key}-height`,
          label: "Height",
          onChange: (value: string) => updatePath(["flowNodes", key, "height"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.height
        }
      ]
    })),
    ...Object.entries(typedConfig.connectors).map(([key, rect]) => ({
      id: `solar-connector-${key}`,
      label: `Solar Connector ${key}`,
      description: "調整 connector 幾何位置。",
      rect: {
        ...rect,
        top: toContentTop(rect.top)
      },
      fields: [
        {
          id: `${key}-left`,
          label: "Left",
          onChange: (value: string) => updatePath(["connectors", key, "left"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.left
        },
        {
          id: `${key}-top`,
          label: "Top",
          onChange: (value: string) => updatePath(["connectors", key, "top"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.top
        },
        {
          id: `${key}-width`,
          label: "Width",
          onChange: (value: string) => updatePath(["connectors", key, "width"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.width
        },
        {
          id: `${key}-height`,
          label: "Height",
          onChange: (value: string) => updatePath(["connectors", key, "height"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.height
        }
      ]
    })),
    ...Object.entries(typedConfig.kpiCards).map(([key, rect]) => ({
      id: `solar-kpi-${key}`,
      label: `Solar KPI ${key}`,
      description: "調整 KPI card 幾何。",
      rect: {
        ...rect,
        top: toContentTop(rect.top)
      },
      fields: [
        {
          id: `${key}-left`,
          label: "Left",
          onChange: (value: string) => updatePath(["kpiCards", key, "left"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.left
        },
        {
          id: `${key}-top`,
          label: "Top",
          onChange: (value: string) => updatePath(["kpiCards", key, "top"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.top
        },
        {
          id: `${key}-width`,
          label: "Width",
          onChange: (value: string) => updatePath(["kpiCards", key, "width"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.width
        },
        {
          id: `${key}-height`,
          label: "Height",
          onChange: (value: string) => updatePath(["kpiCards", key, "height"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.height
        }
      ]
    }))
  ];
}

function buildFactoryCircuitRegions(
  config: Record<string, unknown>,
  updatePath: (path: Array<number | string>, value: unknown) => void
): DisplayEditorRegion[] {
  const typedConfig = config as FactoryCircuitDisplayPageConfig;

  return [
    {
      id: "factory-circuit-hero",
      label: "Factory Circuit Hero",
      description: "調整 title、subtitle 與主文案。",
      rect: {
        left: 78,
        top: toContentTop(166),
        width: 590
      },
      fields: [
        {
          id: "factory-eyebrow",
          label: "Eyebrow",
          onChange: (value) => updatePath(["hero", "eyebrow"], value),
          type: "text",
          value: typedConfig.hero.eyebrow
        },
        {
          id: "factory-title",
          label: "Title",
          onChange: (value) => updatePath(["hero", "title"], value),
          type: "text",
          value: typedConfig.hero.title
        },
        {
          id: "factory-subtitle",
          label: "Subtitle",
          onChange: (value) => updatePath(["hero", "subtitle"], value),
          type: "text",
          value: typedConfig.hero.subtitle
        },
        {
          id: "factory-copy-zh-1",
          label: "Copy Zh 1",
          onChange: (value) => updatePath(["hero", "copyZhLines", 0], value),
          type: "text",
          value: typedConfig.hero.copyZhLines[0]
        },
        {
          id: "factory-copy-zh-2",
          label: "Copy Zh 2",
          onChange: (value) => updatePath(["hero", "copyZhLines", 1], value),
          type: "text",
          value: typedConfig.hero.copyZhLines[1]
        },
        {
          id: "factory-copy-zh-3",
          label: "Copy Zh 3",
          onChange: (value) => updatePath(["hero", "copyZhLines", 2], value),
          type: "text",
          value: typedConfig.hero.copyZhLines[2]
        }
      ]
    },
    {
      id: "factory-circuit-copy-layout",
      label: "Factory Circuit Copy Layout",
      description: "調整 copy block 與 status block 幾何。",
      rect: {
        ...typedConfig.textBlocks.copy,
        top: toContentTop(typedConfig.textBlocks.copy.top)
      },
      fields: [
        {
          id: "factory-copy-left",
          label: "Copy Left",
          onChange: (value) => updatePath(["textBlocks", "copy", "left"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.textBlocks.copy.left
        },
        {
          id: "factory-copy-top",
          label: "Copy Top",
          onChange: (value) => updatePath(["textBlocks", "copy", "top"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.textBlocks.copy.top
        },
        {
          id: "factory-copy-width",
          label: "Copy Width",
          onChange: (value) => updatePath(["textBlocks", "copy", "width"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.textBlocks.copy.width
        },
        {
          id: "factory-status-left",
          label: "Status Left",
          onChange: (value) => updatePath(["statusBlock", "left"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.statusBlock.left
        },
        {
          id: "factory-status-top",
          label: "Status Top",
          onChange: (value) => updatePath(["statusBlock", "top"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.statusBlock.top
        },
        {
          id: "factory-status-width",
          label: "Status Width",
          onChange: (value) => updatePath(["statusBlock", "width"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.statusBlock.width
        }
      ]
    },
    ...Object.entries(typedConfig.nodes).map(([key, rect]) => ({
      id: `factory-node-${key}`,
      label: `Factory Node ${key}`,
      description: "調整 node 幾何位置。",
      rect: {
        ...rect,
        top: toContentTop(rect.top)
      },
      fields: [
        {
          id: `${key}-left`,
          label: "Left",
          onChange: (value: string) => updatePath(["nodes", key, "left"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.left
        },
        {
          id: `${key}-top`,
          label: "Top",
          onChange: (value: string) => updatePath(["nodes", key, "top"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.top
        },
        {
          id: `${key}-width`,
          label: "Width",
          onChange: (value: string) => updatePath(["nodes", key, "width"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.width
        },
        {
          id: `${key}-height`,
          label: "Height",
          onChange: (value: string) => updatePath(["nodes", key, "height"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.height
        }
      ]
    })),
    ...Object.entries(typedConfig.connectors).map(([key, rect]) => ({
      id: `factory-connector-${key}`,
      label: `Factory Connector ${key}`,
      description: "調整 connector 幾何位置。",
      rect: {
        ...rect,
        height: 16,
        top: toContentTop(rect.top)
      },
      fields: [
        {
          id: `${key}-left`,
          label: "Left",
          onChange: (value: string) => updatePath(["connectors", key, "left"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.left
        },
        {
          id: `${key}-top`,
          label: "Top",
          onChange: (value: string) => updatePath(["connectors", key, "top"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.top
        },
        {
          id: `${key}-width`,
          label: "Width",
          onChange: (value: string) => updatePath(["connectors", key, "width"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.width
        }
      ]
    })),
    {
      id: "factory-load-panel",
      label: "Factory Load Panel",
      description: "調整負載面板容器幾何。",
      rect: {
        ...typedConfig.loadPanel,
        top: toContentTop(typedConfig.loadPanel.top)
      },
      fields: [
        {
          id: "load-panel-left",
          label: "Left",
          onChange: (value) => updatePath(["loadPanel", "left"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.loadPanel.left
        },
        {
          id: "load-panel-top",
          label: "Top",
          onChange: (value) => updatePath(["loadPanel", "top"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.loadPanel.top
        },
        {
          id: "load-panel-width",
          label: "Width",
          onChange: (value) => updatePath(["loadPanel", "width"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.loadPanel.width
        },
        {
          id: "load-panel-height",
          label: "Height",
          onChange: (value) => updatePath(["loadPanel", "height"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.loadPanel.height
        }
      ]
    },
    ...Object.entries(typedConfig.loadRows).map(([key, rect]) => ({
      id: `factory-load-row-${key}`,
      label: `Factory Load Row ${key}`,
      description: "調整 load row 幾何位置。",
      rect: {
        ...rect,
        top: toContentTop(rect.top)
      },
      fields: [
        {
          id: `${key}-left`,
          label: "Left",
          onChange: (value: string) => updatePath(["loadRows", key, "left"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.left
        },
        {
          id: `${key}-top`,
          label: "Top",
          onChange: (value: string) => updatePath(["loadRows", key, "top"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.top
        },
        {
          id: `${key}-width`,
          label: "Width",
          onChange: (value: string) => updatePath(["loadRows", key, "width"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.width
        },
        {
          id: `${key}-height`,
          label: "Height",
          onChange: (value: string) => updatePath(["loadRows", key, "height"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.height
        }
      ]
    }))
  ];
}

function buildImagesRegions(
  config: Record<string, unknown>,
  updatePath: (path: Array<number | string>, value: unknown) => void
): DisplayEditorRegion[] {
  const typedConfig = config as ImagesDisplayPageConfig;

  return [
    {
      id: "images-hero-copy",
      label: "Images Hero Copy",
      description: "調整 title、subtitle 與三行 copy。",
      rect: {
        left: 82,
        top: toContentTop(166),
        width: 560
      },
      fields: [
        {
          id: "images-eyebrow",
          label: "Eyebrow",
          onChange: (value) => updatePath(["hero", "eyebrow"], value),
          type: "text",
          value: typedConfig.hero.eyebrow
        },
        {
          id: "images-title",
          label: "Title",
          onChange: (value) => updatePath(["hero", "title"], value),
          type: "text",
          value: typedConfig.hero.title
        },
        {
          id: "images-subtitle",
          label: "Subtitle",
          onChange: (value) => updatePath(["hero", "subtitle"], value),
          type: "text",
          value: typedConfig.hero.subtitle
        },
        {
          id: "images-copy-1",
          label: "Copy Line 1",
          onChange: (value) => updatePath(["hero", "copyLines", 0], value),
          type: "text",
          value: typedConfig.hero.copyLines[0]
        },
        {
          id: "images-copy-2",
          label: "Copy Line 2",
          onChange: (value) => updatePath(["hero", "copyLines", 1], value),
          type: "text",
          value: typedConfig.hero.copyLines[1]
        },
        {
          id: "images-copy-3",
          label: "Copy Line 3",
          onChange: (value) => updatePath(["hero", "copyLines", 2], value),
          type: "text",
          value: typedConfig.hero.copyLines[2]
        }
      ]
    },
    {
      id: "images-copy-layout",
      label: "Images Copy Layout",
      description: "調整 copy block 幾何。",
      rect: {
        ...typedConfig.textBlocks.copy,
        height: 148,
        top: toContentTop(typedConfig.textBlocks.copy.top)
      },
      fields: [
        {
          id: "images-copy-left",
          label: "Left",
          onChange: (value) => updatePath(["textBlocks", "copy", "left"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.textBlocks.copy.left
        },
        {
          id: "images-copy-top",
          label: "Top",
          onChange: (value) => updatePath(["textBlocks", "copy", "top"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.textBlocks.copy.top
        },
        {
          id: "images-copy-width",
          label: "Width",
          onChange: (value) => updatePath(["textBlocks", "copy", "width"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.textBlocks.copy.width
        }
      ]
    },
    {
      id: "images-main-stage",
      label: "Images Main Stage",
      description: "調整主舞台 geometry 與預設備援素材。",
      rect: {
        ...typedConfig.mainStage,
        top: toContentTop(typedConfig.mainStage.top)
      },
      fields: [
        {
          id: "images-stage-src",
          label: "Fallback Src",
          onChange: (value) => updatePath(["mainStage", "src"], value),
          type: "text",
          value: typedConfig.mainStage.src
        },
        {
          id: "images-stage-alt",
          label: "Image Alt",
          onChange: (value) => updatePath(["mainStage", "alt"], value),
          type: "text",
          value: typedConfig.mainStage.alt
        },
        {
          id: "images-stage-left",
          label: "Left",
          onChange: (value) => updatePath(["mainStage", "left"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.mainStage.left
        },
        {
          id: "images-stage-top",
          label: "Top",
          onChange: (value) => updatePath(["mainStage", "top"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.mainStage.top
        },
        {
          id: "images-stage-width",
          label: "Width",
          onChange: (value) => updatePath(["mainStage", "width"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.mainStage.width
        },
        {
          id: "images-stage-height",
          label: "Height",
          onChange: (value) => updatePath(["mainStage", "height"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.mainStage.height
        }
      ]
    },
    {
      id: "images-info-panel",
      label: "Images Info Panel",
      description: "調整資訊欄 geometry。",
      rect: {
        ...typedConfig.infoPanel,
        top: toContentTop(typedConfig.infoPanel.top)
      },
      fields: [
        {
          id: "images-info-left",
          label: "Left",
          onChange: (value) => updatePath(["infoPanel", "left"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.infoPanel.left
        },
        {
          id: "images-info-top",
          label: "Top",
          onChange: (value) => updatePath(["infoPanel", "top"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.infoPanel.top
        },
        {
          id: "images-info-width",
          label: "Width",
          onChange: (value) => updatePath(["infoPanel", "width"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.infoPanel.width
        },
        {
          id: "images-info-height",
          label: "Height",
          onChange: (value) => updatePath(["infoPanel", "height"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.infoPanel.height
        }
      ]
    },
    ...Object.entries(typedConfig.arrows).map(([key, rect]) => ({
      id: `images-arrow-${key}`,
      label: `Images Arrow ${key}`,
      description: "調整左右箭頭位置。",
      rect: {
        ...rect,
        top: toContentTop(rect.top)
      },
      fields: [
        {
          id: `${key}-left`,
          label: "Left",
          onChange: (value: string) => updatePath(["arrows", key, "left"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.left
        },
        {
          id: `${key}-top`,
          label: "Top",
          onChange: (value: string) => updatePath(["arrows", key, "top"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.top
        }
      ]
    })),
    ...Object.entries(typedConfig.thumbnailSlots).map(([key, rect]) => ({
      id: `images-thumb-${key}`,
      label: `Images Thumb ${key}`,
      description: "調整 thumb slot 幾何位置。",
      rect: {
        ...rect,
        top: toContentTop(rect.top)
      },
      fields: [
        {
          id: `${key}-left`,
          label: "Left",
          onChange: (value: string) => updatePath(["thumbnailSlots", key, "left"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.left
        },
        {
          id: `${key}-top`,
          label: "Top",
          onChange: (value: string) => updatePath(["thumbnailSlots", key, "top"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.top
        },
        {
          id: `${key}-width`,
          label: "Width",
          onChange: (value: string) => updatePath(["thumbnailSlots", key, "width"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.width
        },
        {
          id: `${key}-height`,
          label: "Height",
          onChange: (value: string) => updatePath(["thumbnailSlots", key, "height"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.height
        }
      ]
    }))
  ];
}

function buildSustainabilityRegions(
  config: Record<string, unknown>,
  updatePath: (path: Array<number | string>, value: unknown) => void
): DisplayEditorRegion[] {
  const typedConfig = config as SustainabilityDisplayPageConfig;

  return [
    {
      id: "sustainability-hero-copy",
      label: "Sustainability Hero Copy",
      description: "調整 title、subtitle 與中英文 copy。",
      rect: {
        left: 68,
        top: toContentTop(166),
        width: 522
      },
      fields: [
        {
          id: "sustainability-eyebrow",
          label: "Eyebrow",
          onChange: (value) => updatePath(["hero", "eyebrow"], value),
          type: "text",
          value: typedConfig.hero.eyebrow
        },
        {
          id: "sustainability-title-1",
          label: "Title Line 1",
          onChange: (value) => updatePath(["hero", "title", 0], value),
          type: "text",
          value: typedConfig.hero.title[0]
        },
        {
          id: "sustainability-title-2",
          label: "Title Line 2",
          onChange: (value) => updatePath(["hero", "title", 1], value),
          type: "text",
          value: typedConfig.hero.title[1]
        },
        {
          id: "sustainability-subtitle",
          label: "Subtitle",
          onChange: (value) => updatePath(["hero", "subtitle"], value),
          type: "text",
          value: typedConfig.hero.subtitle
        },
        {
          id: "sustainability-copy-zh-1",
          label: "Copy Zh 1",
          onChange: (value) => updatePath(["hero", "copyZhLines", 0], value),
          type: "text",
          value: typedConfig.hero.copyZhLines[0]
        },
        {
          id: "sustainability-copy-zh-2",
          label: "Copy Zh 2",
          onChange: (value) => updatePath(["hero", "copyZhLines", 1], value),
          type: "text",
          value: typedConfig.hero.copyZhLines[1]
        }
      ]
    },
    {
      id: "sustainability-hero-media",
      label: "Sustainability Hero Media",
      description: "調整 hero 圖片與容器 geometry。",
      rect: {
        ...typedConfig.heroMedia,
        top: toContentTop(typedConfig.heroMedia.top)
      },
      fields: [
        {
          id: "sustainability-hero-src",
          label: "Image Source",
          onChange: (value) => updatePath(["heroMedia", "src"], value),
          type: "text",
          value: typedConfig.heroMedia.src
        },
        {
          id: "sustainability-hero-alt",
          label: "Image Alt",
          onChange: (value) => updatePath(["heroMedia", "alt"], value),
          type: "text",
          value: typedConfig.heroMedia.alt
        },
        {
          id: "sustainability-hero-left",
          label: "Left",
          onChange: (value) => updatePath(["heroMedia", "left"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.heroMedia.left
        },
        {
          id: "sustainability-hero-top",
          label: "Top",
          onChange: (value) => updatePath(["heroMedia", "top"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.heroMedia.top
        },
        {
          id: "sustainability-hero-width",
          label: "Width",
          onChange: (value) => updatePath(["heroMedia", "width"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.heroMedia.width
        },
        {
          id: "sustainability-hero-height",
          label: "Height",
          onChange: (value) => updatePath(["heroMedia", "height"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.heroMedia.height
        }
      ]
    },
    {
      id: "sustainability-highlight-rail",
      label: "Sustainability Highlight Rail",
      description: "調整 highlight rail 容器與四個 highlight 文案。",
      rect: {
        ...typedConfig.highlightRail.container,
        top: toContentTop(typedConfig.highlightRail.container.top)
      },
      fields: [
        {
          id: "highlight-left",
          label: "Left",
          onChange: (value) => updatePath(["highlightRail", "container", "left"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.highlightRail.container.left
        },
        {
          id: "highlight-top",
          label: "Top",
          onChange: (value) => updatePath(["highlightRail", "container", "top"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.highlightRail.container.top
        },
        {
          id: "highlight-width",
          label: "Width",
          onChange: (value) => updatePath(["highlightRail", "container", "width"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.highlightRail.container.width
        },
        {
          id: "highlight-height",
          label: "Height",
          onChange: (value) => updatePath(["highlightRail", "container", "height"], Number(value)),
          step: 1,
          type: "number",
          value: typedConfig.highlightRail.container.height
        },
        {
          id: "highlight-1-label",
          label: "Item 1 Label",
          onChange: (value) => updatePath(["highlightRail", "items", 0, "label"], value),
          type: "text",
          value: typedConfig.highlightRail.items[0]?.label ?? ""
        },
        {
          id: "highlight-1-value",
          label: "Item 1 Value",
          onChange: (value) => updatePath(["highlightRail", "items", 0, "value"], value),
          type: "text",
          value: typedConfig.highlightRail.items[0]?.value ?? ""
        }
      ]
    },
    ...Object.entries(typedConfig.kpiCards).map(([key, rect]) => ({
      id: `sustainability-kpi-${key}`,
      label: `Sustainability KPI ${key}`,
      description: "調整 KPI card 幾何。",
      rect: {
        ...rect,
        top: toContentTop(rect.top)
      },
      fields: [
        {
          id: `${key}-left`,
          label: "Left",
          onChange: (value: string) => updatePath(["kpiCards", key, "left"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.left
        },
        {
          id: `${key}-top`,
          label: "Top",
          onChange: (value: string) => updatePath(["kpiCards", key, "top"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.top
        },
        {
          id: `${key}-width`,
          label: "Width",
          onChange: (value: string) => updatePath(["kpiCards", key, "width"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.width
        },
        {
          id: `${key}-height`,
          label: "Height",
          onChange: (value: string) => updatePath(["kpiCards", key, "height"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.height
        }
      ]
    })),
    ...Object.entries(typedConfig.statCards).map(([key, rect]) => ({
      id: `sustainability-stat-${key}`,
      label: `Sustainability Stat ${key}`,
      description: "調整 stat card 幾何。",
      rect: {
        ...rect,
        top: toContentTop(rect.top)
      },
      fields: [
        {
          id: `${key}-left`,
          label: "Left",
          onChange: (value: string) => updatePath(["statCards", key, "left"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.left
        },
        {
          id: `${key}-top`,
          label: "Top",
          onChange: (value: string) => updatePath(["statCards", key, "top"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.top
        },
        {
          id: `${key}-width`,
          label: "Width",
          onChange: (value: string) => updatePath(["statCards", key, "width"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.width
        },
        {
          id: `${key}-height`,
          label: "Height",
          onChange: (value: string) => updatePath(["statCards", key, "height"], Number(value)),
          step: 1,
          type: "number" as const,
          value: rect.height
        }
      ]
    }))
  ];
}

const runtimePageDefinitions: DisplayEditorPageDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    buildEditableRegions: (config, helpers) => buildOverviewRegions(config, helpers.updatePath),
    createSeedConfig: () =>
      createOverviewDisplayPageSeedConfig(overviewAssetRuntimeMap.hero) as Record<string, unknown>,
    renderPreview: (config) => <Overview config={config as OverviewDisplayPageConfig} />
  },
  {
    id: "solar",
    label: "Solar",
    buildEditableRegions: (config, helpers) => buildSolarRegions(config, helpers.updatePath),
    createSeedConfig: () => createSolarDisplayPageSeedConfig(solarAssetRuntimeMap.hero) as Record<string, unknown>,
    renderPreview: (config) => <Solar config={config as SolarDisplayPageConfig} />
  },
  {
    id: "factory-circuit",
    label: "Factory Circuit",
    buildEditableRegions: (config, helpers) => buildFactoryCircuitRegions(config, helpers.updatePath),
    createSeedConfig: () => createFactoryCircuitDisplayPageSeedConfig() as Record<string, unknown>,
    renderPreview: (config) => <FactoryCircuit config={config as FactoryCircuitDisplayPageConfig} />
  },
  {
    id: "images",
    label: "Images",
    buildEditableRegions: (config, helpers) => buildImagesRegions(config, helpers.updatePath),
    createSeedConfig: () =>
      createImagesDisplayPageSeedConfig(imagesAssetRuntimeMap.main) as Record<string, unknown>,
    renderPreview: (config) => <Images config={config as ImagesDisplayPageConfig} />
  },
  {
    id: "sustainability",
    label: "Sustainability",
    buildEditableRegions: (config, helpers) =>
      buildSustainabilityRegions(config, helpers.updatePath),
    createSeedConfig: () =>
      createSustainabilityDisplayPageSeedConfig(sustainabilityAssetMap.hero.src) as Record<string, unknown>,
    renderPreview: (config) => <Sustainability config={config as SustainabilityDisplayPageConfig} />
  }
];

export function DisplayPagesEditorRoute() {
  return <DisplayPagesEditor pageDefinitions={runtimePageDefinitions} />;
}
