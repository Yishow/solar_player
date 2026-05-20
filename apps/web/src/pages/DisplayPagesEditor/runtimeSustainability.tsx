import { Sustainability } from "../Sustainability";
import { sustainabilityAssetMap } from "../Sustainability/assets";
import {
  createSustainabilityDisplayPageSeedConfig,
  type SustainabilityDisplayPageConfig
} from "../Sustainability/displayPageConfig";
import type { DisplayEditorPageDefinition, DisplayEditorRegion } from "./index";
import {
  mediaPlacementFields,
  numberField,
  textField,
  toContentTop,
  type UpdatePath
} from "./runtimeFieldBuilders";

function buildSustainabilityRegions(
  config: Record<string, unknown>,
  updatePath: UpdatePath
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
        textField("sustainability-eyebrow", "Eyebrow", typedConfig.hero.eyebrow, ["hero", "eyebrow"], updatePath),
        textField("sustainability-title-1", "Title Line 1", typedConfig.hero.title[0], ["hero", "title", 0], updatePath),
        textField("sustainability-title-2", "Title Line 2", typedConfig.hero.title[1], ["hero", "title", 1], updatePath),
        textField("sustainability-subtitle", "Subtitle", typedConfig.hero.subtitle, ["hero", "subtitle"], updatePath),
        textField("sustainability-copy-zh-1", "Copy Zh 1", typedConfig.hero.copyZhLines[0], ["hero", "copyZhLines", 0], updatePath),
        textField("sustainability-copy-zh-2", "Copy Zh 2", typedConfig.hero.copyZhLines[1], ["hero", "copyZhLines", 1], updatePath)
      ]
    },
    {
      id: "sustainability-hero-media",
      label: "Sustainability Hero Media",
      description: "調整 hero 圖片、容器 geometry 與 placement controls。",
      rect: {
        ...typedConfig.heroMedia,
        top: toContentTop(typedConfig.heroMedia.top)
      },
      fields: [
        textField("sustainability-hero-src", "Image Source", typedConfig.heroMedia.src ?? "", ["heroMedia", "src"], updatePath),
        textField("sustainability-hero-alt", "Image Alt", typedConfig.heroMedia.alt ?? "", ["heroMedia", "alt"], updatePath),
        ...mediaPlacementFields("sustainability-hero", ["heroMedia"], typedConfig.heroMedia, updatePath),
        numberField("sustainability-hero-left", "Left", typedConfig.heroMedia.left, ["heroMedia", "left"], updatePath),
        numberField("sustainability-hero-top", "Top", typedConfig.heroMedia.top, ["heroMedia", "top"], updatePath),
        numberField("sustainability-hero-width", "Width", typedConfig.heroMedia.width, ["heroMedia", "width"], updatePath),
        numberField("sustainability-hero-height", "Height", typedConfig.heroMedia.height, ["heroMedia", "height"], updatePath)
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
        numberField("highlight-left", "Left", typedConfig.highlightRail.container.left, ["highlightRail", "container", "left"], updatePath),
        numberField("highlight-top", "Top", typedConfig.highlightRail.container.top, ["highlightRail", "container", "top"], updatePath),
        numberField("highlight-width", "Width", typedConfig.highlightRail.container.width, ["highlightRail", "container", "width"], updatePath),
        numberField("highlight-height", "Height", typedConfig.highlightRail.container.height, ["highlightRail", "container", "height"], updatePath),
        textField("highlight-1-label", "Item 1 Label", typedConfig.highlightRail.items[0]?.label ?? "", ["highlightRail", "items", 0, "label"], updatePath),
        textField("highlight-1-value", "Item 1 Value", typedConfig.highlightRail.items[0]?.value ?? "", ["highlightRail", "items", 0, "value"], updatePath)
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
        numberField(`${key}-left`, "Left", rect.left, ["kpiCards", key, "left"], updatePath),
        numberField(`${key}-top`, "Top", rect.top, ["kpiCards", key, "top"], updatePath),
        numberField(`${key}-width`, "Width", rect.width, ["kpiCards", key, "width"], updatePath),
        numberField(`${key}-height`, "Height", rect.height, ["kpiCards", key, "height"], updatePath)
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
        numberField(`${key}-left`, "Left", rect.left, ["statCards", key, "left"], updatePath),
        numberField(`${key}-top`, "Top", rect.top, ["statCards", key, "top"], updatePath),
        numberField(`${key}-width`, "Width", rect.width, ["statCards", key, "width"], updatePath),
        numberField(`${key}-height`, "Height", rect.height, ["statCards", key, "height"], updatePath)
      ]
    }))
  ];
}

export const sustainabilityRuntimePageDefinition: DisplayEditorPageDefinition = {
  id: "sustainability",
  label: "Sustainability",
  renderPage: (pageId) => <Sustainability pageId={pageId} />,
  templateKey: "sustainability",
  buildEditableRegions: (config, helpers) => buildSustainabilityRegions(config, helpers.updatePath),
  createSeedConfig: () =>
    createSustainabilityDisplayPageSeedConfig(sustainabilityAssetMap.hero.src) as Record<string, unknown>,
  renderPreview: (config) => <Sustainability config={config as SustainabilityDisplayPageConfig} />
};
