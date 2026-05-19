import type { DisplayPageMediaBinding } from "@solar-display/shared";
import type { DisplayEditorRegionSchema } from "../../../../../packages/shared/src/displayEditorSchema";
import {
  buildDisplayCardStyleFields,
  createDisplayCardStyleConfig,
  type DisplayCardStyleConfig
} from "../shared/displayCardStyleConfig";
import {
  buildArrowChromeFields,
  buildCounterChromeFields,
  buildGoldLineFields,
  buildHeroTypographyFields,
  createArrowChromeConfig,
  createCounterChromeConfig,
  createGoldLineChromeConfig,
  createHeroTypographyConfig,
  type ArrowChromeConfig,
  type CounterChromeConfig,
  type GoldLineChromeConfig,
  type HeroTypographyConfig
} from "../shared/displayPageChromeConfig";
import {
  buildDisplayPageIconSourceFields,
  createReferenceGlyphIconSource,
  type DisplayPageIconSource
} from "../shared/displayIconSourceConfig";
import {
  imagesArrowLayout,
  imagesCopyLayout,
  imagesInfoLayout,
  imagesMainLayout,
  imagesThumbLayout,
  imagesThumbSize
} from "./layout";

export type ImagesDisplayRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type ImagesDisplayPageConfig = {
  arrows: Record<"left" | "right", ImagesDisplayRect>;
  cardStyles: Record<"infoPanel", DisplayCardStyleConfig>;
  chrome: {
    heroTypography: HeroTypographyConfig;
    modules: {
      arrows: ArrowChromeConfig;
      counter: CounterChromeConfig;
    };
    ornaments: {
      goldLine: GoldLineChromeConfig;
    };
  };
  hero: {
    copyLines: [string, string, string];
    eyebrow: string;
    subtitle: string;
    title: string;
  };
  iconSources: {
    infoPanel: DisplayPageIconSource;
    mainStagePlaceholder: DisplayPageIconSource;
    thumbnailSlots: Record<"thumb1" | "thumb2" | "thumb3" | "thumb4", DisplayPageIconSource>;
  };
  infoPanel: ImagesDisplayRect;
  mainStage: ImagesDisplayRect & DisplayPageMediaBinding;
  thumbnailSlots: Record<"thumb1" | "thumb2" | "thumb3" | "thumb4", ImagesDisplayRect>;
  textBlocks: {
    copy: {
      left: number;
      top: number;
      width: number;
    };
  };
};

export function createImagesDisplayPageSeedConfig(
  mainStageSrc = "/brand-logo.png",
  mainStageAlt = "綠能現場影像主舞台"
): ImagesDisplayPageConfig {
  return {
    arrows: {
      left: {
        height: 64,
        left: imagesArrowLayout.left.left,
        top: imagesArrowLayout.left.top,
        width: 64
      },
      right: {
        height: 64,
        left: imagesArrowLayout.right.left,
        top: imagesArrowLayout.right.top,
        width: 64
      }
    },
    cardStyles: {
      infoPanel: createDisplayCardStyleConfig({
        cornerRadius: 22,
        footerPaddingTop: 16,
        paddingBottom: 30,
        paddingLeft: 30,
        paddingRight: 30,
        paddingTop: 34,
        titleFontSize: 28
      })
    },
    chrome: {
      heroTypography: createHeroTypographyConfig({
        subtitleMarginTop: 20
      }),
      modules: {
        arrows: createArrowChromeConfig(),
        counter: createCounterChromeConfig()
      },
      ornaments: {
        goldLine: createGoldLineChromeConfig({
          opacity: 0.88
        })
      }
    },
    hero: {
      copyLines: [
        "記錄國瑞汽車廠區內的綠能設施、",
        "綠色環境與永續實踐，見證我們",
        "每天為地球做出的努力。"
      ],
      eyebrow: "綠能驅動・永續未來",
      subtitle: "Green Energy in Action",
      title: "綠能現場影像"
    },
    iconSources: {
      infoPanel: createReferenceGlyphIconSource("image"),
      mainStagePlaceholder: createReferenceGlyphIconSource("image"),
      thumbnailSlots: {
        thumb1: createReferenceGlyphIconSource("image"),
        thumb2: createReferenceGlyphIconSource("image"),
        thumb3: createReferenceGlyphIconSource("image"),
        thumb4: createReferenceGlyphIconSource("image")
      }
    },
    infoPanel: { ...imagesInfoLayout },
    mainStage: {
      ...imagesMainLayout,
      alignX: 0.5,
      alignY: 0.52,
      alt: mainStageAlt,
      fitMode: "cover",
      focusX: 0.5,
      focusY: 0.52,
      sourceMode: "seed-default",
      src: mainStageSrc
    },
    textBlocks: {
      copy: { ...imagesCopyLayout }
    },
    thumbnailSlots: {
      thumb1: { ...imagesThumbLayout[0], ...imagesThumbSize },
      thumb2: { ...imagesThumbLayout[1], ...imagesThumbSize },
      thumb3: { ...imagesThumbLayout[2], ...imagesThumbSize },
      thumb4: { ...imagesThumbLayout[3], ...imagesThumbSize }
    }
  };
}

export const imagesDisplayPageEditorRegions: DisplayEditorRegionSchema[] = [
  {
    id: "images-hero-copy",
    label: "Images Hero Copy",
    description: "調整 title、subtitle 與三行 copy。",
    geometry: {
      fallbackHeight: 180,
      leftPath: ["textBlocks", "copy", "left"],
      minWidth: 180,
      resizeMode: "horizontal",
      topOffset: 146,
      topPath: ["textBlocks", "copy", "top"],
      widthPath: ["textBlocks", "copy", "width"]
    },
    fields: [
      ...buildHeroTypographyFields({
        idPrefix: "images",
        path: ["chrome", "heroTypography"]
      }),
      { fieldType: "text", id: "images-eyebrow", label: "Eyebrow", path: ["hero", "eyebrow"] },
      { fieldType: "text", id: "images-title", label: "Title", path: ["hero", "title"] },
      { fieldType: "text", id: "images-subtitle", label: "Subtitle", path: ["hero", "subtitle"] },
      { fieldType: "text", id: "images-copy-1", label: "Copy Line 1", path: ["hero", "copyLines", 0] },
      { fieldType: "text", id: "images-copy-2", label: "Copy Line 2", path: ["hero", "copyLines", 1] },
      { fieldType: "text", id: "images-copy-3", label: "Copy Line 3", path: ["hero", "copyLines", 2] }
    ],
    presetKey: "images-hero-copy"
  },
  {
    id: "images-copy-layout",
    label: "Images Copy Layout",
    description: "調整 copy block 幾何。",
    geometry: {
      compatibilityKey: "images-copy-layout",
      fallbackHeight: 148,
      leftPath: ["textBlocks", "copy", "left"],
      minWidth: 120,
      resizeMode: "horizontal",
      topOffset: 146,
      topPath: ["textBlocks", "copy", "top"],
      widthPath: ["textBlocks", "copy", "width"]
    },
    fields: [
      { constraints: { min: 0 }, fieldType: "number", id: "images-copy-left", label: "Left", path: ["textBlocks", "copy", "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: "images-copy-top", label: "Top", path: ["textBlocks", "copy", "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: "images-copy-width", label: "Width", path: ["textBlocks", "copy", "width"] }
    ],
    presetKey: "images-copy-layout"
  },
  {
    id: "images-ornament-gold-line",
    label: "Images Gold Ornament",
    description: "調整 gold ornament chrome appearance。",
    fields: buildGoldLineFields({
      idPrefix: "images",
      path: ["chrome", "ornaments", "goldLine"]
    }),
    presetKey: "images-gold-ornament"
  },
  {
    id: "images-counter",
    label: "Images Counter",
    description: "調整 slide counter chrome appearance。",
    fields: buildCounterChromeFields({
      idPrefix: "images",
      path: ["chrome", "modules", "counter"]
    }),
    presetKey: "images-counter"
  },
  {
    id: "images-arrows-style",
    label: "Images Arrows",
    description: "調整 gallery arrow chrome appearance。",
    fields: buildArrowChromeFields({
      idPrefix: "images",
      path: ["chrome", "modules", "arrows"]
    }),
    presetKey: "images-arrows"
  },
  {
    id: "images-main-stage",
    label: "Images Main Stage",
    description: "調整主舞台 geometry、備援素材與 placement controls。",
    geometry: {
      compatibilityKey: "images-main-stage-geometry",
      heightPath: ["mainStage", "height"],
      leftPath: ["mainStage", "left"],
      minHeight: 120,
      minWidth: 120,
      resizeMode: "both",
      topOffset: 146,
      topPath: ["mainStage", "top"],
      widthPath: ["mainStage", "width"]
    },
    fields: [
      ...buildDisplayPageIconSourceFields({
        idPrefix: "main-stage",
        path: ["iconSources", "mainStagePlaceholder"]
      }),
      {
        fieldType: "select",
        id: "images-stage-source-mode",
        label: "Fallback Source Mode",
        options: [
          { label: "Managed Asset", value: "managed-asset" },
          { label: "Direct Src", value: "direct-src" },
          { label: "Seed Default", value: "seed-default" }
        ],
        path: ["mainStage", "sourceMode"]
      },
      {
        constraints: { required: true },
        fieldType: "asset",
        id: "images-stage-asset-id",
        label: "Fallback Asset Ref",
        path: ["mainStage", "assetId"],
        placeholder: "image_assets.id",
        visibleWhen: {
          equals: "managed-asset",
          path: ["mainStage", "sourceMode"]
        }
      },
      {
        constraints: { required: true },
        fieldType: "text",
        id: "images-stage-src",
        label: "Fallback Src",
        path: ["mainStage", "src"],
        visibleWhen: {
          equals: "direct-src",
          path: ["mainStage", "sourceMode"]
        }
      },
      { fieldType: "text", id: "images-stage-alt", label: "Image Alt", path: ["mainStage", "alt"] },
      {
        fieldType: "select",
        id: "images-stage-fit-mode",
        label: "Fit Mode",
        options: [
          { label: "Contain", value: "contain" },
          { label: "Cover", value: "cover" }
        ],
        path: ["mainStage", "fitMode"]
      },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "images-stage-focus-x", label: "Focus X", path: ["mainStage", "focusX"], step: 0.05 },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "images-stage-focus-y", label: "Focus Y", path: ["mainStage", "focusY"], step: 0.05 },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "images-stage-align-x", label: "Align X", path: ["mainStage", "alignX"], step: 0.05 },
      { constraints: { max: 1, min: 0 }, fieldType: "number", id: "images-stage-align-y", label: "Align Y", path: ["mainStage", "alignY"], step: 0.05 },
      { constraints: { min: 0 }, fieldType: "number", id: "images-stage-left", label: "Left", path: ["mainStage", "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: "images-stage-top", label: "Top", path: ["mainStage", "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: "images-stage-width", label: "Width", path: ["mainStage", "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: "images-stage-height", label: "Height", path: ["mainStage", "height"] }
    ],
    presetKey: "images-main-stage"
  },
  {
    id: "images-info-panel",
    label: "Images Info Panel",
    description: "調整資訊欄 geometry。",
    geometry: {
      compatibilityKey: "images-info-panel-geometry",
      heightPath: ["infoPanel", "height"],
      leftPath: ["infoPanel", "left"],
      minHeight: 120,
      minWidth: 120,
      resizeMode: "both",
      topOffset: 146,
      topPath: ["infoPanel", "top"],
      widthPath: ["infoPanel", "width"]
    },
    fields: [
      ...buildDisplayCardStyleFields({
        idPrefix: "info-panel",
        path: ["cardStyles", "infoPanel"]
      }),
      ...buildDisplayPageIconSourceFields({
        idPrefix: "info-panel",
        path: ["iconSources", "infoPanel"]
      }),
      { constraints: { min: 0 }, fieldType: "number", id: "images-info-left", label: "Left", path: ["infoPanel", "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: "images-info-top", label: "Top", path: ["infoPanel", "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: "images-info-width", label: "Width", path: ["infoPanel", "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: "images-info-height", label: "Height", path: ["infoPanel", "height"] }
    ],
    presetKey: "images-info-panel"
  },
  ...Object.keys(createImagesDisplayPageSeedConfig().arrows).map<DisplayEditorRegionSchema>((key) => ({
    id: `images-arrow-${key}`,
    label: `Images Arrow ${key}`,
    description: "調整左右箭頭位置。",
    geometry: {
      compatibilityKey: "images-arrow-geometry",
      fallbackHeight: 64,
      leftPath: ["arrows", key, "left"],
      minWidth: 32,
      resizeMode: "none",
      topOffset: 146,
      topPath: ["arrows", key, "top"],
      widthPath: ["arrows", key, "width"]
    },
    fields: [
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["arrows", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["arrows", key, "top"] }
    ],
    presetKey: "images-arrow"
  })),
  ...Object.keys(createImagesDisplayPageSeedConfig().thumbnailSlots).map<DisplayEditorRegionSchema>((key) => ({
    id: `images-thumb-${key}`,
    label: `Images Thumb ${key}`,
    description: "調整 thumb slot 幾何位置。",
    geometry: {
      compatibilityKey: "images-thumb-geometry",
      heightPath: ["thumbnailSlots", key, "height"],
      leftPath: ["thumbnailSlots", key, "left"],
      minHeight: 80,
      minWidth: 80,
      resizeMode: "both",
      topOffset: 146,
      topPath: ["thumbnailSlots", key, "top"],
      widthPath: ["thumbnailSlots", key, "width"]
    },
    fields: [
      ...buildDisplayPageIconSourceFields({
        idPrefix: key,
        path: ["iconSources", "thumbnailSlots", key]
      }),
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-left`, label: "Left", path: ["thumbnailSlots", key, "left"] },
      { constraints: { min: 146 }, fieldType: "number", id: `${key}-top`, label: "Top", path: ["thumbnailSlots", key, "top"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-width`, label: "Width", path: ["thumbnailSlots", key, "width"] },
      { constraints: { min: 0 }, fieldType: "number", id: `${key}-height`, label: "Height", path: ["thumbnailSlots", key, "height"] }
    ],
    presetKey: "images-thumb"
  }))
];
