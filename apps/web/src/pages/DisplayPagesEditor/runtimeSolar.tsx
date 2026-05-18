import { solarAssetRuntimeMap } from "../Solar/assets";
import {
  createSolarDisplayPageSeedConfig,
  type SolarDisplayPageConfig
} from "../Solar/displayPageConfig";
import { Solar } from "../Solar";
import type { DisplayEditorPageDefinition, DisplayEditorRegion } from "./index";
import {
  mediaPlacementFields,
  numberField,
  textField,
  toContentTop,
  type UpdatePath
} from "./runtimeFieldBuilders";

function buildSolarRegions(
  config: Record<string, unknown>,
  updatePath: UpdatePath
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
        textField("solar-eyebrow", "Eyebrow", typedConfig.heroCopy.eyebrow, ["heroCopy", "eyebrow"], updatePath),
        textField("solar-title-line-1", "Title Line 1", typedConfig.heroCopy.titleLines[0], ["heroCopy", "titleLines", 0], updatePath),
        textField("solar-title-line-2", "Title Line 2", typedConfig.heroCopy.titleLines[1], ["heroCopy", "titleLines", 1], updatePath),
        textField("solar-subtitle-line-1", "Subtitle Line 1", typedConfig.heroCopy.subtitleLines[0], ["heroCopy", "subtitleLines", 0], updatePath),
        textField("solar-subtitle-line-2", "Subtitle Line 2", typedConfig.heroCopy.subtitleLines[1], ["heroCopy", "subtitleLines", 1], updatePath)
      ]
    },
    {
      id: "solar-hero-media",
      label: "Solar Hero Media",
      description: "切換 Solar hero image、容器與 placement controls。",
      rect: {
        ...typedConfig.heroContainer,
        top: toContentTop(typedConfig.heroContainer.top)
      },
      fields: [
        textField("solar-hero-src", "Image Source", typedConfig.heroMedia.src ?? "", ["heroMedia", "src"], updatePath),
        textField("solar-hero-alt", "Image Alt", typedConfig.heroMedia.alt ?? "", ["heroMedia", "alt"], updatePath),
        ...mediaPlacementFields("solar-hero", ["heroMedia"], typedConfig.heroMedia, updatePath),
        numberField("solar-hero-left", "Left", typedConfig.heroContainer.left, ["heroContainer", "left"], updatePath),
        numberField("solar-hero-top", "Top", typedConfig.heroContainer.top, ["heroContainer", "top"], updatePath),
        numberField("solar-hero-width", "Width", typedConfig.heroContainer.width, ["heroContainer", "width"], updatePath),
        numberField("solar-hero-height", "Height", typedConfig.heroContainer.height, ["heroContainer", "height"], updatePath)
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
        numberField(`${key}-left`, "Left", rect.left, ["flowNodes", key, "left"], updatePath),
        numberField(`${key}-top`, "Top", rect.top, ["flowNodes", key, "top"], updatePath),
        numberField(`${key}-width`, "Width", rect.width, ["flowNodes", key, "width"], updatePath),
        numberField(`${key}-height`, "Height", rect.height, ["flowNodes", key, "height"], updatePath)
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
        numberField(`${key}-left`, "Left", rect.left, ["connectors", key, "left"], updatePath),
        numberField(`${key}-top`, "Top", rect.top, ["connectors", key, "top"], updatePath),
        numberField(`${key}-width`, "Width", rect.width, ["connectors", key, "width"], updatePath),
        numberField(`${key}-height`, "Height", rect.height, ["connectors", key, "height"], updatePath)
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
        numberField(`${key}-left`, "Left", rect.left, ["kpiCards", key, "left"], updatePath),
        numberField(`${key}-top`, "Top", rect.top, ["kpiCards", key, "top"], updatePath),
        numberField(`${key}-width`, "Width", rect.width, ["kpiCards", key, "width"], updatePath),
        numberField(`${key}-height`, "Height", rect.height, ["kpiCards", key, "height"], updatePath)
      ]
    }))
  ];
}

export const solarRuntimePageDefinition: DisplayEditorPageDefinition = {
  id: "solar",
  label: "Solar",
  buildEditableRegions: (config, helpers) => buildSolarRegions(config, helpers.updatePath),
  createSeedConfig: () =>
    createSolarDisplayPageSeedConfig(solarAssetRuntimeMap.hero) as Record<string, unknown>,
  renderPreview: (config) => <Solar config={config as SolarDisplayPageConfig} />
};
