import { overviewAssetRuntimeMap } from "../Overview/assets";
import {
  createOverviewDisplayPageSeedConfig,
  type OverviewDisplayPageConfig
} from "../Overview/displayPageConfig";
import { Overview } from "../Overview";
import type { DisplayEditorPageDefinition, DisplayEditorRegion } from "./index";
import {
  mediaPlacementFields,
  numberField,
  textField,
  toContentTop,
  type UpdatePath
} from "./runtimeFieldBuilders";

function buildOverviewRegions(
  config: Record<string, unknown>,
  updatePath: UpdatePath
): DisplayEditorRegion[] {
  const typedConfig = config as OverviewDisplayPageConfig;

  return [
    {
      id: "overview-hero-copy",
      label: "Overview Hero Copy",
      description: "調整三段 slogan 與 title/subtitle copy，並可微調標題區塊位置。",
      rect: {
        height: 244,
        left: typedConfig.heroCopyLayout.left,
        top: toContentTop(typedConfig.heroCopyLayout.top),
        width: typedConfig.heroCopyLayout.width
      },
      fields: [
        textField("eyebrow", "Eyebrow", typedConfig.heroCopy.eyebrow, ["heroCopy", "eyebrow"], updatePath),
        textField("title-line-1", "Title Line 1", typedConfig.heroCopy.titleLines[0], ["heroCopy", "titleLines", 0], updatePath),
        textField("title-line-2", "Title Line 2", typedConfig.heroCopy.titleLines[1], ["heroCopy", "titleLines", 1], updatePath),
        textField("subtitle-line-1", "Subtitle Line 1", typedConfig.heroCopy.subtitleLines[0], ["heroCopy", "subtitleLines", 0], updatePath),
        textField("subtitle-line-2", "Subtitle Line 2", typedConfig.heroCopy.subtitleLines[1], ["heroCopy", "subtitleLines", 1], updatePath),
        numberField("hero-copy-left", "Left", typedConfig.heroCopyLayout.left, ["heroCopyLayout", "left"], updatePath),
        numberField("hero-copy-top", "Top", typedConfig.heroCopyLayout.top, ["heroCopyLayout", "top"], updatePath),
        numberField("hero-copy-width", "Width", typedConfig.heroCopyLayout.width, ["heroCopyLayout", "width"], updatePath)
      ]
    },
    {
      id: "overview-hero-media",
      label: "Overview Hero Media",
      description: "切換 hero image、alt 文案與 placement controls。",
      rect: {
        ...typedConfig.heroContainer,
        top: toContentTop(typedConfig.heroContainer.top)
      },
      fields: [
        textField("hero-src", "Image Source", typedConfig.heroMedia.src ?? "", ["heroMedia", "src"], updatePath),
        textField("hero-alt", "Image Alt", typedConfig.heroMedia.alt ?? "", ["heroMedia", "alt"], updatePath),
        ...mediaPlacementFields("overview-hero", ["heroMedia"], typedConfig.heroMedia, updatePath)
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
        numberField("hero-left", "Left", typedConfig.heroContainer.left, ["heroContainer", "left"], updatePath),
        numberField("hero-top", "Top", typedConfig.heroContainer.top, ["heroContainer", "top"], updatePath),
        numberField("hero-width", "Width", typedConfig.heroContainer.width, ["heroContainer", "width"], updatePath),
        numberField("hero-height", "Height", typedConfig.heroContainer.height, ["heroContainer", "height"], updatePath)
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
        numberField(`${key}-left`, "Left", rect.left, ["kpiCards", key, "left"], updatePath),
        numberField(`${key}-top`, "Top", rect.top, ["kpiCards", key, "top"], updatePath),
        numberField(`${key}-width`, "Width", rect.width, ["kpiCards", key, "width"], updatePath),
        numberField(`${key}-height`, "Height", rect.height, ["kpiCards", key, "height"], updatePath)
      ]
    }))
  ];
}

export const overviewRuntimePageDefinition: DisplayEditorPageDefinition = {
  id: "overview",
  label: "Overview",
  renderPage: (pageId) => <Overview pageId={pageId} />,
  templateKey: "overview",
  buildEditableRegions: (config, helpers) => buildOverviewRegions(config, helpers.updatePath),
  createSeedConfig: () =>
    createOverviewDisplayPageSeedConfig(overviewAssetRuntimeMap.hero) as Record<string, unknown>,
  renderPreview: (config) => <Overview config={config as OverviewDisplayPageConfig} />
};
