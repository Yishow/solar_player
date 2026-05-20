import { imagesAssetRuntimeMap } from "../Images/assets";
import {
  createImagesDisplayPageSeedConfig,
  type ImagesDisplayPageConfig
} from "../Images/displayPageConfig";
import { Images } from "../Images";
import type { DisplayEditorPageDefinition, DisplayEditorRegion } from "./index";
import {
  mediaPlacementFields,
  numberField,
  textField,
  toContentTop,
  type UpdatePath
} from "./runtimeFieldBuilders";

function buildImagesRegions(
  config: Record<string, unknown>,
  updatePath: UpdatePath
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
        textField("images-eyebrow", "Eyebrow", typedConfig.hero.eyebrow, ["hero", "eyebrow"], updatePath),
        textField("images-title", "Title", typedConfig.hero.title, ["hero", "title"], updatePath),
        textField("images-subtitle", "Subtitle", typedConfig.hero.subtitle, ["hero", "subtitle"], updatePath),
        textField("images-copy-1", "Copy Line 1", typedConfig.hero.copyLines[0], ["hero", "copyLines", 0], updatePath),
        textField("images-copy-2", "Copy Line 2", typedConfig.hero.copyLines[1], ["hero", "copyLines", 1], updatePath),
        textField("images-copy-3", "Copy Line 3", typedConfig.hero.copyLines[2], ["hero", "copyLines", 2], updatePath)
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
        numberField("images-copy-left", "Left", typedConfig.textBlocks.copy.left, ["textBlocks", "copy", "left"], updatePath),
        numberField("images-copy-top", "Top", typedConfig.textBlocks.copy.top, ["textBlocks", "copy", "top"], updatePath),
        numberField("images-copy-width", "Width", typedConfig.textBlocks.copy.width, ["textBlocks", "copy", "width"], updatePath)
      ]
    },
    {
      id: "images-main-stage",
      label: "Images Main Stage",
      description: "調整主舞台 geometry、備援素材與 placement controls。",
      rect: {
        ...typedConfig.mainStage,
        top: toContentTop(typedConfig.mainStage.top)
      },
      fields: [
        textField("images-stage-src", "Fallback Src", typedConfig.mainStage.src ?? "", ["mainStage", "src"], updatePath),
        textField("images-stage-alt", "Image Alt", typedConfig.mainStage.alt ?? "", ["mainStage", "alt"], updatePath),
        ...mediaPlacementFields("images-stage", ["mainStage"], typedConfig.mainStage, updatePath),
        numberField("images-stage-left", "Left", typedConfig.mainStage.left, ["mainStage", "left"], updatePath),
        numberField("images-stage-top", "Top", typedConfig.mainStage.top, ["mainStage", "top"], updatePath),
        numberField("images-stage-width", "Width", typedConfig.mainStage.width, ["mainStage", "width"], updatePath),
        numberField("images-stage-height", "Height", typedConfig.mainStage.height, ["mainStage", "height"], updatePath)
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
        numberField("images-info-left", "Left", typedConfig.infoPanel.left, ["infoPanel", "left"], updatePath),
        numberField("images-info-top", "Top", typedConfig.infoPanel.top, ["infoPanel", "top"], updatePath),
        numberField("images-info-width", "Width", typedConfig.infoPanel.width, ["infoPanel", "width"], updatePath),
        numberField("images-info-height", "Height", typedConfig.infoPanel.height, ["infoPanel", "height"], updatePath)
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
        numberField(`${key}-left`, "Left", rect.left, ["arrows", key, "left"], updatePath),
        numberField(`${key}-top`, "Top", rect.top, ["arrows", key, "top"], updatePath)
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
        numberField(`${key}-left`, "Left", rect.left, ["thumbnailSlots", key, "left"], updatePath),
        numberField(`${key}-top`, "Top", rect.top, ["thumbnailSlots", key, "top"], updatePath),
        numberField(`${key}-width`, "Width", rect.width, ["thumbnailSlots", key, "width"], updatePath),
        numberField(`${key}-height`, "Height", rect.height, ["thumbnailSlots", key, "height"], updatePath)
      ]
    }))
  ];
}

export const imagesRuntimePageDefinition: DisplayEditorPageDefinition = {
  id: "images",
  label: "Images",
  renderPage: (pageId) => <Images pageId={pageId} />,
  templateKey: "images",
  buildEditableRegions: (config, helpers) => buildImagesRegions(config, helpers.updatePath),
  createSeedConfig: () =>
    createImagesDisplayPageSeedConfig(imagesAssetRuntimeMap.main) as Record<string, unknown>,
  renderPreview: (config) => <Images config={config as ImagesDisplayPageConfig} />
};
